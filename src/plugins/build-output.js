import { existsSync } from "node:fs";
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
