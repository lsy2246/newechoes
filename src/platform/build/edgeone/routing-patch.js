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
