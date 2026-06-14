import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { resolveBuildDir } from "../mirrors.js";

function isAlreadyUriEncodedPath(relativeDir) {
  if (!relativeDir.includes("%")) {
    return false;
  }

  try {
    return decodeURIComponent(relativeDir) !== relativeDir;
  } catch {
    return false;
  }
}

function encodePathSegments(relativeDir) {
  return relativeDir
    .split(path.sep)
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join(path.sep);
}

async function collectArticleHtmlFiles(articlesDir, currentDir = articlesDir, result = []) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      await collectArticleHtmlFiles(articlesDir, sourcePath, result);
      continue;
    }

    if (!entry.name.endsWith(".html")) {
      continue;
    }

    result.push(sourcePath);
  }

  return result;
}

export async function collectEdgeoneEncodedArticleRouteMirrors(assetsDir) {
  const articlesDir = path.join(assetsDir, "articles");
  if (!existsSync(articlesDir)) {
    return [];
  }

  const sourceFiles = await collectArticleHtmlFiles(articlesDir);
  const mirrors = [];

  for (const sourceFile of sourceFiles) {
    const relativeFile = path.relative(articlesDir, sourceFile);
    if (isAlreadyUriEncodedPath(relativeFile)) {
      continue;
    }

    const encodedRelativeFile = encodePathSegments(relativeFile);

    if (!encodedRelativeFile || encodedRelativeFile === relativeFile) {
      continue;
    }

    mirrors.push({
      relativeFile,
      encodedRelativeFile,
    });
  }

  return mirrors;
}

export async function syncEdgeoneEncodedArticleAssetPaths(assetsDir) {
  const articlesDir = path.join(assetsDir, "articles");
  if (!existsSync(articlesDir)) {
    return [];
  }

  const routeMirrors = await collectEdgeoneEncodedArticleRouteMirrors(assetsDir);
  const mirroredPaths = [];

  for (const { relativeFile, encodedRelativeFile } of routeMirrors) {
    const sourceFile = path.join(articlesDir, relativeFile);
    const targetFile = path.join(articlesDir, encodedRelativeFile);
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.copyFile(sourceFile, targetFile);
    mirroredPaths.push(targetFile);
  }

  return mirroredPaths;
}

export function edgeoneRoutingIntegration() {
  return {
    name: "edgeone-routing-integration",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        if ((process.env.DEPLOY_TARGET || "").trim().toLowerCase() !== "edgeone") {
          return;
        }

        const candidateDirs = [
          resolveBuildDir(dir),
          path.join(process.cwd(), ".edgeone", "assets"),
        ];
        let mirroredCount = 0;

        for (const candidateDir of candidateDirs) {
          const mirroredArticlePaths = await syncEdgeoneEncodedArticleAssetPaths(candidateDir);
          mirroredCount += mirroredArticlePaths.length;
        }

        if (mirroredCount > 0) {
          console.log(`已补齐 EdgeOne 编码文章路径镜像: ${mirroredCount} 个`);
        }
      },
    },
  };
}
