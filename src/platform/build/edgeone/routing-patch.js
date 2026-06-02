import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const EDGEONE_SLASH_REWRITE_SOURCE = "^/([^.]+[^/.])$";
const EDGEONE_SAFE_SLASH_REWRITE_SOURCE =
  "^/(?!api(?:/|$)|_image$|_server-islands(?:/|$))([^.]+[^/.])$";

export function patchEdgeoneConfigText(configText) {
  const parsed = JSON.parse(configText);
  if (!Array.isArray(parsed.routes)) {
    return configText;
  }

  for (const route of parsed.routes) {
    if (
      route
      && route.src === EDGEONE_SLASH_REWRITE_SOURCE
      && route.dest === "/$1/"
      && route.continue === true
    ) {
      route.src = EDGEONE_SAFE_SLASH_REWRITE_SOURCE;
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

export async function syncEdgeoneEncodedArticleAssetPaths(assetsDir) {
  const articlesDir = path.join(assetsDir, "articles");
  if (!existsSync(articlesDir)) {
    return [];
  }

  const sourceDirs = await collectArticleDirectories(articlesDir);
  const mirroredPaths = [];

  for (const sourceDir of sourceDirs) {
    const relativeDir = path.relative(articlesDir, sourceDir);
    const encodedRelativeDir = encodePathSegments(relativeDir);

    if (!encodedRelativeDir || encodedRelativeDir === relativeDir) {
      continue;
    }

    const targetDir = path.join(articlesDir, encodedRelativeDir);
    await fs.mkdir(path.dirname(targetDir), { recursive: true });
    await fs.cp(sourceDir, targetDir, { recursive: true, force: true });
    mirroredPaths.push(path.join(targetDir, "index.html"));
  }

  return mirroredPaths;
}

export async function patchEdgeoneBuildConfig(rootDir = process.cwd()) {
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
