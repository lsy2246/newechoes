import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const astroConfigSource = readFileSync("astro.config.mjs", "utf8");

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
});
