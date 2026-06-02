import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function getStaticOutputMirrorRoots() {
  const deployTarget = (process.env.DEPLOY_TARGET || "vercel").trim().toLowerCase();

  if (deployTarget === "edgeone") {
    return [path.join(process.cwd(), ".edgeone", "assets")];
  }

  if (deployTarget === "vercel") {
    return [path.join(process.cwd(), ".vercel", "output", "static")];
  }

  if (deployTarget === "cloudflare") {
    return [path.join(process.cwd(), "dist", "server")];
  }

  return [];
}

export function syncStaticGeneratedFileToPlatformOutputs(buildDirPath, generatedFilePath) {
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

  for (const rootDir of getStaticOutputMirrorRoots()) {
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
