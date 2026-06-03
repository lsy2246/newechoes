import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildArticleIndexes,
  writeArticleIndexes,
} from "./build.js";
import {
  getStaticOutputMirrorRoots,
  resolveBuildDir,
} from "../../platform/build/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const buildDir = path.resolve(rootDir, "dist");
const indexDir = path.join(resolveBuildDir(buildDir), "assets", "index");
const runtimeBuildStrategy = resolveRuntimeBuildStrategy();

function resolveRuntimeBuildStrategy() {
  const rawValue = (
    process.env.ARTICLE_INDEX_RUNTIME_BUILD
    || process.env.ARTICLE_INDEX_RUNTIME_STRATEGY
    || "prebuilt"
  ).trim().toLowerCase();

  if (rawValue === "always") {
    return "force";
  }

  if (rawValue === "prebuilt" || rawValue === "auto" || rawValue === "force") {
    return rawValue;
  }

  console.warn(`[索引构建] 未识别的运行时产物策略 "${rawValue}"，已回退到 prebuilt`);
  return "prebuilt";
}

export function isCiEnvironment(env = process.env) {
  const value = `${env.CI || ""}`.trim().toLowerCase();
  return value === "1" || value === "true";
}

export function assertFreshPrebuiltArtifact({
  artifactLabel,
  artifactPath,
  sourceLabel,
  sourcePath,
  strategy,
  runningInCi = isCiEnvironment(),
  missing,
  stale,
}) {
  if (strategy !== "prebuilt" || runningInCi || missing || !stale) {
    return;
  }

  throw new Error(
    `${artifactLabel} 预构建产物已过期，当前策略(prebuilt)不能继续使用旧产物。`
    + ` 请重新生成并提交更新后的产物。`
    + ` 产物: ${artifactPath}`
    + `；源码: ${sourceLabel} (${sourcePath})`,
  );
}

export function prepareArticleIndexRuntimeArtifacts() {
  if (process.env.ARTICLE_INDEX_RUNTIME_PREPARED === "true") {
    return;
  }

  console.log("[索引构建] 使用 JS + Worker 运行时生成 JSON 索引");
  console.log(`- 运行时产物策略: ${runtimeBuildStrategy}`);
  process.env.ARTICLE_INDEX_RUNTIME_PREPARED = "true";
}

function copyDirectoryContents(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return false;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryContents(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }

  return true;
}

function getPlatformIndexMirrorDirs(buildDirPath, outputDirPath) {
  const relativeIndexDir = path.relative(buildDirPath, outputDirPath);
  if (!relativeIndexDir || relativeIndexDir.startsWith("..")) {
    return [];
  }

  return getStaticOutputMirrorRoots({ cwd: rootDir })
    .filter((candidateRootDir) => fs.existsSync(candidateRootDir))
    .map((rootDirPath) => path.join(rootDirPath, relativeIndexDir));
}

function syncIndexArtifactsToPlatformOutputs(buildDirPath, outputDirPath) {
  const mirroredDirs = [];

  for (const targetDir of getPlatformIndexMirrorDirs(buildDirPath, outputDirPath)) {
    const copied = copyDirectoryContents(outputDirPath, targetDir);
    if (copied) {
      mirroredDirs.push(targetDir);
    }
  }

  return mirroredDirs;
}

export function articleIndexerIntegration() {
  return {
    name: "article-indexer-integration",
    hooks: {
      "astro:server:setup": ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith("/assets/index/") && req.method === "GET") {
            const requestedFile = req.url.slice("/assets/index/".length);
            const filePath = path.join(indexDir, requestedFile);

            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const stat = fs.statSync(filePath);
              res.setHeader(
                "Content-Type",
                filePath.endsWith(".json") ? "application/json" : "application/octet-stream",
              );
              res.setHeader("Content-Length", stat.size);
              fs.createReadStream(filePath).pipe(res);
              return;
            }

            res.statusCode = 404;
            res.end("索引文件未找到");
            return;
          }

          next();
        });
      },
      "astro:build:done": async ({ dir }) => {
        console.log("Astro构建完成，开始生成文章索引...");
        const clientDirPath = resolveBuildDir(dir);
        const outputDirPath = path.join(clientDirPath, "assets", "index");

        await generateArticleIndex({
          buildDir: clientDirPath,
          outputDir: outputDirPath,
        });
      },
    },
  };
}

export async function generateArticleIndex(options = {}) {
  console.log("开始生成文章索引...");

  try {
    prepareArticleIndexRuntimeArtifacts();

    const buildDirPath = options.buildDir || buildDir;
    const outputDirPath = options.outputDir || indexDir;

    console.log(`构建目录: ${buildDirPath}`);
    console.log(`索引输出目录: ${outputDirPath}`);

    if (!fs.existsSync(buildDirPath)) {
      throw new Error(`构建目录不存在: ${buildDirPath}`);
    }

    const indexes = buildArticleIndexes(buildDirPath);
    if (indexes.articleCount === 0) {
      throw new Error("没有找到有效文章");
    }

    const written = writeArticleIndexes(outputDirPath, indexes);
    const mirroredDirs = syncIndexArtifactsToPlatformOutputs(buildDirPath, outputDirPath);

    console.log(
      `[索引构建] 已生成 ${indexes.articleCount} 篇文章的 JSON 索引: `
      + `${written.searchIndexPath}, ${written.filterIndexPath}`,
    );

    if (mirroredDirs.length > 0) {
      console.log(`[索引构建] 已同步索引产物到平台目录: ${mirroredDirs.join(", ")}`);
    } else {
      console.log("[索引构建] 未检测到额外的平台索引镜像目录，保留默认输出目录");
    }

    console.log("文章索引生成完成!");
    return {
      success: true,
      indexPath: outputDirPath,
      articleCount: indexes.articleCount,
    };
  } catch (error) {
    console.error("生成文章索引时出错:", error.message);
    throw error;
  }
}
