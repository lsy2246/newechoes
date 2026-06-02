import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const astroConfig = readFileSync("astro.config.mjs", "utf8");
const buildConfigHelpers = readFileSync("src/platform/build/astro-config.js", "utf8");
const doubanApiSource = readFileSync("src/pages/api/douban.ts", "utf8");
const wereadApiSource = readFileSync("src/pages/api/weread.ts", "utf8");
const gitProjectsApiSource = readFileSync("src/pages/api/git-projects.ts", "utf8");
const gitProjectCollectionSource = readFileSync("src/components/GitProjectCollection.tsx", "utf8");

test("EdgeOne SSR keeps cheerio bundled instead of leaving a runtime bare import", () => {
  assert.match(astroConfig, /resolvePlatformSsrConfig/);
  assert.match(buildConfigHelpers, /noExternal:\s*\[[^\]]*"cheerio"/);
  assert.match(doubanApiSource, /from ['"]cheerio\/slim['"]/);
  assert.match(wereadApiSource, /from ['"]cheerio\/slim['"]/);
});

test("EdgeOne SSR endpoints do not import React component modules for shared git project enums", () => {
  assert.match(gitProjectsApiSource, /from ['"]@\/lib\/git-projects-shared['"]/);
  assert.doesNotMatch(gitProjectsApiSource, /from ['"]@\/components\/GitProjectCollection['"]/);
  assert.match(gitProjectCollectionSource, /from ['"]@\/lib\/git-projects-shared['"]/);
});
