import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const UPDATE_CONFIG_FILE = "update.json";

function toPosixPath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function resolveConfigPath(projectDir, configPath = UPDATE_CONFIG_FILE) {
  return path.join(projectDir, configPath);
}

function ensureStringArray(value, fieldName) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`update.json field "${fieldName}" must be an array of strings.`);
  }

  return value;
}

function escapeRegexCharacter(character) {
  return /[\\^$+?.()|[\]{}]/.test(character) ? `\\${character}` : character;
}

function compileGlob(pattern) {
  let expression = "";

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    const nextCharacter = pattern[index + 1];

    if (character === "*" && nextCharacter === "*") {
      expression += ".*";
      index += 1;
      continue;
    }

    if (character === "*") {
      expression += "[^/]*";
      continue;
    }

    expression += escapeRegexCharacter(character);
  }

  return new RegExp(`^${expression}$`);
}

function matchesAnyPattern(relativePath, patterns) {
  return patterns.some((pattern) => compileGlob(pattern).test(relativePath));
}

function readFileIfExists(filePath) {
  return existsSync(filePath) ? readFileSync(filePath) : null;
}

function isLikelyBinary(buffer) {
  return buffer.includes(0);
}

function normalizeTextBuffer(buffer) {
  return buffer.toString("utf8").replace(/\r\n/g, "\n");
}

function areFileContentsEquivalent(sourceBuffer, targetBuffer) {
  if (!targetBuffer) {
    return false;
  }

  if (Buffer.compare(sourceBuffer, targetBuffer) === 0) {
    return true;
  }

  if (isLikelyBinary(sourceBuffer) || isLikelyBinary(targetBuffer)) {
    return false;
  }

  return normalizeTextBuffer(sourceBuffer) === normalizeTextBuffer(targetBuffer);
}

export function loadUpdateConfig({ projectDir, configPath = UPDATE_CONFIG_FILE } = {}) {
  const resolvedProjectDir = projectDir || process.cwd();
  const resolvedConfigPath = resolveConfigPath(resolvedProjectDir, configPath);

  if (!existsSync(resolvedConfigPath)) {
    throw new Error(`Missing ${configPath}. Create it in ${resolvedProjectDir} before running the updater.`);
  }

  let parsed;

  try {
    parsed = JSON.parse(readFileSync(resolvedConfigPath, "utf8"));
  } catch (error) {
    throw new Error(
      `Failed to parse ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${configPath} must contain a JSON object.`);
  }

  if (typeof parsed.upstream !== "string" || parsed.upstream.trim() === "") {
    throw new Error(`update.json field "upstream" must be a non-empty string.`);
  }

  if (typeof parsed.branch !== "string" || parsed.branch.trim() === "") {
    throw new Error(`update.json field "branch" must be a non-empty string.`);
  }

  const protect = ensureStringArray(parsed.protect ?? [], "protect");
  const update = ensureStringArray(parsed.update ?? [], "update");

  return {
    upstream: parsed.upstream,
    branch: parsed.branch,
    protect,
    update,
  };
}

export function shouldUpdatePath(relativePath, config) {
  const normalizedPath = toPosixPath(relativePath);

  if (normalizedPath === UPDATE_CONFIG_FILE) {
    return false;
  }

  if (matchesAnyPattern(normalizedPath, config.update)) {
    return true;
  }

  if (matchesAnyPattern(normalizedPath, config.protect)) {
    return false;
  }

  return true;
}

export function planTemplateUpdate({ sourceDir, targetDir, trackedFiles, config }) {
  const update = [];
  const skip = [];
  const unchanged = [];

  for (const trackedFile of trackedFiles) {
    const relativePath = toPosixPath(trackedFile);

    if (!shouldUpdatePath(relativePath, config)) {
      skip.push(relativePath);
      continue;
    }

    const sourcePath = path.join(sourceDir, ...relativePath.split("/"));
    const targetPath = path.join(targetDir, ...relativePath.split("/"));
    const sourceBuffer = readFileSync(sourcePath);
    const targetBuffer = readFileIfExists(targetPath);

    if (areFileContentsEquivalent(sourceBuffer, targetBuffer)) {
      unchanged.push(relativePath);
      continue;
    }

    update.push(relativePath);
  }

  return { update, skip, unchanged };
}

export function syncTemplateFiles({ sourceDir, targetDir, trackedFiles, config, plan }) {
  const resolvedPlan =
    plan ??
    planTemplateUpdate({
      sourceDir,
      targetDir,
      trackedFiles,
      config,
    });
  let updated = 0;

  for (const relativePath of resolvedPlan.update) {
    const sourcePath = path.join(sourceDir, ...relativePath.split("/"));
    const targetPath = path.join(targetDir, ...relativePath.split("/"));

    mkdirSync(path.dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
    updated += 1;
  }

  return {
    updated,
    skipped: resolvedPlan.skip.length,
    unchanged: resolvedPlan.unchanged.length,
  };
}

function cloneUpstreamTemplate({ upstream, branch }) {
  const tempDir = path.join(
    os.tmpdir(),
    `newechoes-update-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  execFileSync("git", ["clone", "--depth", "1", "--branch", branch, upstream, tempDir], {
    stdio: "pipe",
  });

  return tempDir;
}

function listTrackedFiles(rootDir) {
  const output = execFileSync("git", ["-C", rootDir, "ls-files", "-z"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return output
    .split("\0")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(toPosixPath);
}

export function parseUpdateCommandArgs(argv = []) {
  return {
    apply: argv.includes("--apply"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

export function runTemplateUpdate({
  projectDir = process.cwd(),
  configPath = UPDATE_CONFIG_FILE,
  apply = true,
} = {}) {
  const config = loadUpdateConfig({ projectDir, configPath });
  let sourceDir;

  try {
    sourceDir = cloneUpstreamTemplate(config);
    const trackedFiles = listTrackedFiles(sourceDir);
    const plan = planTemplateUpdate({
      sourceDir,
      targetDir: projectDir,
      trackedFiles,
      config,
    });
    const result = apply
      ? syncTemplateFiles({
          sourceDir,
          targetDir: projectDir,
          trackedFiles,
          config,
          plan,
        })
      : {
          updated: 0,
          skipped: plan.skip.length,
          unchanged: plan.unchanged.length,
        };

    return {
      ...result,
      plan,
      upstream: config.upstream,
      branch: config.branch,
      trackedFiles: trackedFiles.length,
    };
  } finally {
    if (sourceDir) {
      rmSync(sourceDir, { recursive: true, force: true });
    }
  }
}

function printUsage() {
  console.error("用法：bun run update");
  console.error("读取当前项目的 update.json，先预览模板同步结果，再确认是否写入。");
  console.error("使用 --apply 可以跳过确认，直接应用更新。");
}

export function formatPreviewSection(title, entries, limit = 20) {
  const lines = [`${title}：${entries.length}`];

  for (const entry of entries.slice(0, limit)) {
    lines.push(`  - ${entry}`);
  }

  if (entries.length > limit) {
    lines.push(`  ... 其余 ${entries.length - limit} 项省略`);
  }

  return lines;
}

export function formatPreviewSummary(result, limit = 20) {
  return [
    `模板来源：${result.upstream}#${result.branch}`,
    `已扫描跟踪文件：${result.trackedFiles}`,
    ...formatPreviewSection("已屏蔽", result.plan.skip, limit),
    ...formatPreviewSection("待更新", result.plan.update, limit),
  ];
}

function printSection(title, entries, limit = 20) {
  for (const line of formatPreviewSection(title, entries, limit)) {
    console.log(line);
  }
}

async function confirmApply() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    const answer = await rl.question("确认应用这些更新吗？[y/N] ");
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseUpdateCommandArgs(argv);

  if (args.help) {
    printUsage();
    return 0;
  }

  const result = runTemplateUpdate({ apply: false });
  for (const line of formatPreviewSummary(result, 20)) {
    console.log(line);
  }

  if (!args.apply) {
    const confirmed = await confirmApply();
    if (!confirmed) {
      console.log("已取消更新。");
      return 0;
    }
  }

  const applied = runTemplateUpdate({ apply: true });
  console.log(`已应用更新：${applied.updated}`);
  console.log(`已屏蔽：${applied.skipped}`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const exitCode = await main();
    process.exit(exitCode);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
