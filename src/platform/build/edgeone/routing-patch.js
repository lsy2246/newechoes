import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const EDGEONE_SLASH_REWRITE_SOURCE = "^/([^.]+[^/.])$";
const EDGEONE_SAFE_SLASH_REWRITE_SOURCE =
  "^/(?!api(?:/|$)|_image$|_server-islands(?:/|$))([^.]+[^/.])$";

function escapeRegexLiteral(value) {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");
}

function normalizeRelativePathForRoutes(relativeDir) {
  return relativeDir.split(path.sep).filter(Boolean).join("/");
}

function decodeRoutePathIfPossible(relativeDir) {
  try {
    return decodeURIComponent(relativeDir);
  } catch {
    return relativeDir;
  }
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

function buildEncodedArticleRouteEntries(articleRouteMirrors = []) {
  const routeEntries = [];
  const seen = new Set();

  for (const { encodedRelativeDir, relativeDir } of articleRouteMirrors) {
    const normalizedEncodedRelativeDir = normalizeRelativePathForRoutes(encodedRelativeDir);
    const normalizedDecodedRelativeDir = normalizeRelativePathForRoutes(
      decodeRoutePathIfPossible(relativeDir),
    );
    const destination = `/articles/${normalizedEncodedRelativeDir}/`;

    for (const sourcePath of [
      normalizedEncodedRelativeDir,
      normalizedDecodedRelativeDir,
    ]) {
      const source = `^/articles/${escapeRegexLiteral(sourcePath)}$`;
      const routeKey = `${source}->${destination}`;

      if (seen.has(routeKey)) {
        continue;
      }

      routeEntries.push({
        src: source,
        dest: destination,
        continue: true,
      });
      seen.add(routeKey);
    }
  }

  return routeEntries;
}

export function patchEdgeoneConfigText(configText, articleRouteMirrors = []) {
  const parsed = JSON.parse(configText);
  if (!Array.isArray(parsed.routes)) {
    return configText;
  }

  const encodedArticleRoutes = buildEncodedArticleRouteEntries(articleRouteMirrors);
  const hasExplicitArticleRoutes = encodedArticleRoutes.length > 0;

  if (hasExplicitArticleRoutes) {
    parsed.routes = parsed.routes.filter((route) => {
      if (!route?.src || !route?.dest || route.continue !== true) {
        return true;
      }

      return !encodedArticleRoutes.some(
        (articleRoute) => articleRoute.src === route.src && articleRoute.dest === route.dest,
      );
    });
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

  if (hasExplicitArticleRoutes) {
    const slashRewriteIndex = parsed.routes.findIndex(
      (route) => route?.dest === "/$1/" && route?.continue === true,
    );
    const insertionIndex = slashRewriteIndex >= 0 ? slashRewriteIndex : parsed.routes.length;
    parsed.routes.splice(insertionIndex, 0, ...encodedArticleRoutes);
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
  const articleRouteMirrors = await collectEdgeoneEncodedArticleRouteMirrors(assetsDir);
  const patchedConfig = patchEdgeoneConfigText(originalConfig, articleRouteMirrors);

  if (patchedConfig === originalConfig) {
    return false;
  }

  await fs.writeFile(configPath, patchedConfig, "utf8");
  return true;
}
