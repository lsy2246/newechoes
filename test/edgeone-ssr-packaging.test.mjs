import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const astroConfig = readFileSync("astro.config.mjs", "utf8");
const buildConfigHelpers = readFileSync("src/platform/build/astro-config.js", "utf8");

test("EdgeOne SSR keeps cheerio bundled instead of leaving a runtime bare import", () => {
  assert.match(astroConfig, /resolvePlatformSsrConfig/);
  assert.match(buildConfigHelpers, /noExternal:\s*\[[^\]]*"cheerio"/);
});
