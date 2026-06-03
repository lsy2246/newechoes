import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const astroConfigSource = readFileSync("astro.config.mjs", "utf8");
const localDevPluginSource = readFileSync("src/plugins/local-dev-api-integration.js", "utf8");

test("astro dev registers a local API bridge for shared server handlers", async () => {
  const { DEV_API_ROUTE_MODULES } = await import("../src/plugins/local-dev-api-integration.js");

  assert.deepEqual(DEV_API_ROUTE_MODULES, {
    "/api/douban": "/src/server/api/douban.ts",
    "/api/weread": "/src/server/api/weread.ts",
    "/api/git-projects": "/src/server/api/git-projects.ts",
    "/api/google-photos": "/src/server/api/google-photos.ts",
  });

  assert.match(astroConfigSource, /localDevApiIntegration/);
  assert.match(astroConfigSource, /localDevApiIntegration\(\)/);
  assert.equal(packageJson.scripts.dev, "pnpm exec astro dev --host 127.0.0.1 --port 4321");
  assert.match(localDevPluginSource, /"astro:config:setup": \(\{ updateConfig \}\) => \{/);
  assert.match(localDevPluginSource, /configureServer\(server\)/);
  assert.match(localDevPluginSource, /server\.middlewares\.use\(async \(req, res, next\) => \{/);
});
