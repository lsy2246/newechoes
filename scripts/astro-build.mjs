import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { normalizeDeployTarget } from "../src/platform/shared/target.js";

const target = normalizeDeployTarget(process.argv[2]?.trim() || process.env.DEPLOY_TARGET);

function runGitCommand(args) {
  return spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function ensureFullGitHistory() {
  const shallowCheck = runGitCommand(["rev-parse", "--is-shallow-repository"]);
  if (shallowCheck.status !== 0) {
    return;
  }

  if (shallowCheck.stdout.trim() !== "true") {
    return;
  }

  const unshallow = runGitCommand(["fetch", "--unshallow", "--tags", "origin"]);
  if (unshallow.status === 0) {
    return;
  }

  const deepenFallback = runGitCommand(["fetch", "--depth=1000", "--tags", "origin"]);
  if (deepenFallback.status !== 0) {
    const details = (unshallow.stderr || deepenFallback.stderr || "").trim();
    throw new Error(details || "failed to expand shallow git history");
  }
}

function clearAstroRenderedContentCache() {
  const cachePaths = [
    join(process.cwd(), ".astro", "data-store.json"),
    join(process.cwd(), "node_modules", ".astro", "data-store.json"),
  ];

  for (const cachePath of cachePaths) {
    rmSync(cachePath, { force: true });
  }
}

try {
  ensureFullGitHistory();
  clearAstroRenderedContentCache();
  const { prepareArticleIndexRuntimeArtifacts } = await import("../src/plugins/article-index/integration.js");
  prepareArticleIndexRuntimeArtifacts();
} catch (error) {
  console.error(
    `[astro-build] failed to prepare article index runtime artifacts for target "${target}":`,
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}

const env = {
  ...process.env,
  DEPLOY_TARGET: target,
};

const result = spawnSync("pnpm exec astro build", {
  env,
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(`[astro-build] failed to start Astro build for target "${target}":`, result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
