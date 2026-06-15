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
} from "../../platform/build/mirrors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const defaultBuildDir = path.resolve(rootDir, "dist");
const defaultContentDir = path.resolve(rootDir, "src", "content");
const indexDir = path.join(resolveBuildDir(defaultBuildDir), "assets", "index");
const INDEX_OUTPUT_FILES = ["search_index.json", "filter_index.json", "global_graph.json", "article-history.json"];

export function prepareArticleIndexRuntimeArtifacts() {
  if (process.env.ARTICLE_INDEX_RUNTIME_PREPARED === "true") {
    return;
  }

  console.log("[索引构建] 当前运行时产物:");
  console.log("- 运行时产物策略: pure-js");
  console.log("- article index runtime: Node.js source content scanner");
  process.env.ARTICLE_INDEX_RUNTIME_PREPARED = "true";
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function listContentFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const contentFiles = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const targetPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      contentFiles.push(...listContentFiles(targetPath));
      continue;
    }
    if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      contentFiles.push(targetPath);
    }
  }

  return contentFiles;
}

function replaceDirectoryContents(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return false;
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
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
    const copied = replaceDirectoryContents(outputDirPath, targetDir);
    if (copied) {
      mirroredDirs.push(targetDir);
    }
  }

  return mirroredDirs;
}

function getLatestSourceMtimeMs(contentRootDir) {
  return listContentFiles(contentRootDir).reduce((latestTime, filePath) => {
    const fileMtime = fs.statSync(filePath).mtimeMs;
    return Math.max(latestTime, fileMtime);
  }, 0);
}

function needsIndexRefresh(contentRootDir, outputDirPath) {
  for (const fileName of INDEX_OUTPUT_FILES) {
    const targetPath = path.join(outputDirPath, fileName);
    if (!fs.existsSync(targetPath)) {
      return true;
    }
  }

  const latestSourceMtime = getLatestSourceMtimeMs(contentRootDir);
  const oldestOutputMtime = INDEX_OUTPUT_FILES.reduce((oldestTime, fileName) => {
    const targetPath = path.join(outputDirPath, fileName);
    return Math.min(oldestTime, fs.statSync(targetPath).mtimeMs);
  }, Number.POSITIVE_INFINITY);

  return latestSourceMtime > oldestOutputMtime;
}

export function articleIndexerIntegration() {
  let devIndexBuildPromise = null;

  const ensureDevIndexes = async () => {
    if (!needsIndexRefresh(defaultContentDir, indexDir)) {
      return;
    }

    if (!devIndexBuildPromise) {
        devIndexBuildPromise = generateArticleIndex({
          buildDir: defaultBuildDir,
          contentDir: defaultContentDir,
          outputDir: indexDir,
        }).finally(() => {
          devIndexBuildPromise = null;
        });
    }

    await devIndexBuildPromise;
  };

  return {
    name: "article-indexer-integration",
    hooks: {
      "astro:server:setup": ({ server }) => {
        void ensureDevIndexes().catch((error) => {
          console.error("[索引构建] 开发态预生成索引失败:", error);
        });

        server.middlewares.use((req, res, next) => {
          if (!req.url.startsWith("/assets/index/") || req.method !== "GET") {
            next();
            return;
          }

          void ensureDevIndexes()
            .then(() => {
              const requestedFile = req.url.slice("/assets/index/".length);
              const filePath = path.join(indexDir, requestedFile);
              if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                res.statusCode = 404;
                res.end("索引文件未找到");
                return;
              }

              const stat = fs.statSync(filePath);
              const contentType = filePath.endsWith(".json")
                ? "application/json"
                : "application/octet-stream";
              res.setHeader("Content-Type", contentType);
              res.setHeader("Content-Length", stat.size);
              fs.createReadStream(filePath).pipe(res);
            })
            .catch((error) => {
              res.statusCode = 500;
              res.end(`索引生成失败: ${error instanceof Error ? error.message : String(error)}`);
            });
        });
      },
      "astro:build:done": async ({ dir }) => {
        console.log("Astro构建完成，开始生成文章索引...");
        const clientDirPath = resolveBuildDir(dir);
        const outputDirPath = path.join(clientDirPath, "assets", "index");
        await generateArticleIndex({
          buildDir: clientDirPath,
          contentDir: defaultContentDir,
          outputDir: outputDirPath,
        });
      },
    },
  };
}

export async function generateArticleIndex(options = {}) {
  console.log("开始生成文章索引...");

  const buildDirPath = options.buildDir || defaultBuildDir;
  const contentDirPath = options.contentDir || defaultContentDir;
  const outputDirPath = options.outputDir || indexDir;

  console.log(`内容目录: ${contentDirPath}`);
  console.log(`索引输出目录: ${outputDirPath}`);

  if (!fs.existsSync(contentDirPath)) {
    const error = new Error(`内容目录不存在: ${contentDirPath}`);
    console.error("生成文章索引时出错:", error.message);
    throw error;
  }

  prepareArticleIndexRuntimeArtifacts();
  ensureDirectory(buildDirPath);
  ensureDirectory(outputDirPath);

  const indexes = buildArticleIndexes(contentDirPath, options.repositoryConfig);
  if (indexes.articleCount === 0) {
    const error = new Error("没有找到有效文章");
    console.error("生成文章索引时出错:", error.message);
    throw error;
  }

  const written = writeArticleIndexes(outputDirPath, indexes);
  const mirroredDirs = syncIndexArtifactsToPlatformOutputs(buildDirPath, outputDirPath);

  console.log(
    `[索引构建] 已生成 ${indexes.articleCount} 篇文章的 JSON 索引: `
    + `${written.searchIndexPath}, ${written.filterIndexPath}, ${written.globalGraphIndexPath}`,
  );

  if (mirroredDirs.length > 0) {
    console.log(`[索引构建] 已同步索引产物到平台目录: ${mirroredDirs.join(", ")}`);
  } else {
    console.log("[索引构建] 未检测到额外的平台索引镜像目录，保留默认输出目录");
  }

  console.log("文章索引生成完成!");
  console.log(`索引文件保存在: ${outputDirPath}`);

  return {
    success: true,
    indexPath: outputDirPath,
    articleCount: indexes.articleCount,
  };
}
