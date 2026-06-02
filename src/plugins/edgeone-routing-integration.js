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

export function edgeoneRoutingIntegration() {
  return {
    name: "edgeone-routing-integration",
    hooks: {
      "astro:build:done": async () => {
        if ((process.env.DEPLOY_TARGET || "").trim().toLowerCase() !== "edgeone") {
          return;
        }

        const configPath = path.join(
          process.cwd(),
          ".edgeone",
          "cloud-functions",
          "ssr-node",
          "config.json",
        );

        if (!existsSync(configPath)) {
          return;
        }

        const originalConfig = await fs.readFile(configPath, "utf8");
        const patchedConfig = patchEdgeoneConfigText(originalConfig);

        if (patchedConfig !== originalConfig) {
          await fs.writeFile(configPath, patchedConfig, "utf8");
          console.log("已修正 EdgeOne SSR 路由规则，避免 clean-url 重写误伤 API");
        }
      },
    },
  };
}
