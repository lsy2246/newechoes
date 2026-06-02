import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDeployTarget } from "../shared/target.js";

export function resolveBuildDir(dir, { preferClient = true } = {}) {
  const baseDir = dir instanceof URL ? fileURLToPath(dir) : String(dir);
  const normalizedBaseDir = path.normalize(baseDir);

  if (preferClient) {
    const clientDir = path.join(normalizedBaseDir, "client");
    if (existsSync(clientDir)) {
      return clientDir;
    }
  }

  return normalizedBaseDir;
}

export function getStaticOutputMirrorRoots({ cwd = process.cwd(), env = process.env } = {}) {
  const deployTarget = getDeployTarget(env);

  if (deployTarget === "edgeone") {
    return [path.join(cwd, ".edgeone", "assets")];
  }

  if (deployTarget === "vercel") {
    return [path.join(cwd, ".vercel", "output", "static")];
  }

  return [];
}

export function syncStaticGeneratedFileToPlatformOutputs(buildDirPath, generatedFilePath, options) {
  if (!existsSync(generatedFilePath)) {
    return [];
  }

  const relativeGeneratedPath = path.relative(buildDirPath, generatedFilePath);
  if (
    !relativeGeneratedPath
    || relativeGeneratedPath.startsWith("..")
    || path.isAbsolute(relativeGeneratedPath)
  ) {
    return [];
  }

  const mirroredPaths = [];

  for (const rootDir of getStaticOutputMirrorRoots(options)) {
    if (!existsSync(rootDir)) {
      continue;
    }

    const targetPath = path.join(rootDir, relativeGeneratedPath);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    copyFileSync(generatedFilePath, targetPath);
    mirroredPaths.push(targetPath);
  }

  return mirroredPaths;
}
