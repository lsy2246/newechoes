import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const EDGEONE_SLASH_REWRITE_SOURCE = "^/([^.]+[^/.])$";
const EDGEONE_SAFE_SLASH_REWRITE_SOURCE =
  "^/(?!api(?:/|$)|_image$|_server-islands(?:/|$))([^.]+[^/.])$";
const EDGEONE_SLASH_REWRITE_DEST = "/$1/";
const EDGEONE_STATIC_INDEX_REWRITE_DEST = "/$1/index.html";

function normalizeRelativePathForRoutes(relativeDir) {
  return relativeDir.split(path.sep).filter(Boolean).join("/");
}

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

export function patchEdgeoneConfigText(configText) {
  const parsed = JSON.parse(configText);
  if (!Array.isArray(parsed.routes)) {
    return configText;
  }

  for (const route of parsed.routes) {
    if (
      route
      && route.src === EDGEONE_SLASH_REWRITE_SOURCE
      && route.dest === EDGEONE_SLASH_REWRITE_DEST
      && route.continue === true
    ) {
      route.src = EDGEONE_SAFE_SLASH_REWRITE_SOURCE;
      route.dest = EDGEONE_STATIC_INDEX_REWRITE_DEST;
    }
  }

  return `${JSON.stringify(parsed, null, 2)}\n`;
}

function encodePathSegments(relativeDir) {
  return relativeDir
    .split(path.sep)
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join(path.sep);
}

async function collectArticleDirectories(articlesDir, currentDir = articlesDir, result = []) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const sourceDir = path.join(currentDir, entry.name);
    result.push(sourceDir);
    await collectArticleDirectories(articlesDir, sourceDir, result);
  }

  return result;
}

export async function collectEdgeoneEncodedArticleRouteMirrors(assetsDir) {
  const articlesDir = path.join(assetsDir, "articles");
  if (!existsSync(articlesDir)) {
    return [];
  }

  const sourceDirs = await collectArticleDirectories(articlesDir);
  const mirrors = [];

  for (const sourceDir of sourceDirs) {
    const relativeDir = path.relative(articlesDir, sourceDir);
    if (isAlreadyUriEncodedPath(relativeDir)) {
      continue;
    }

    const encodedRelativeDir = encodePathSegments(relativeDir);

    if (!encodedRelativeDir || encodedRelativeDir === relativeDir) {
      continue;
    }

    mirrors.push({
      relativeDir,
      encodedRelativeDir,
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

  for (const { relativeDir, encodedRelativeDir } of routeMirrors) {
    const sourceDir = path.join(articlesDir, relativeDir);
    const targetDir = path.join(articlesDir, encodedRelativeDir);
    await fs.mkdir(path.dirname(targetDir), { recursive: true });
    await fs.cp(sourceDir, targetDir, { recursive: true, force: true });
    mirroredPaths.push(path.join(targetDir, "index.html"));
  }

  return mirroredPaths;
}

export async function patchEdgeoneBuildConfig(rootDir = process.cwd()) {
  const assetsDir = path.join(rootDir, ".edgeone", "assets");
  const configPath = path.join(
    rootDir,
    ".edgeone",
    "cloud-functions",
    "ssr-node",
    "config.json",
  );

  if (!existsSync(configPath)) {
    return false;
  }

  const originalConfig = await fs.readFile(configPath, "utf8");
  const patchedConfig = patchEdgeoneConfigText(originalConfig);

  if (patchedConfig === originalConfig) {
    return false;
  }

  await fs.writeFile(configPath, patchedConfig, "utf8");
  return true;
}
