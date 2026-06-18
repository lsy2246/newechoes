import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "./helpers/ensure-generated-function-wrappers.mjs";

const buildConfigHelpers = readFileSync("src/platform/build/astro-config.js", "utf8");
const doubanApiSource = readFileSync("src/server/api/douban.ts", "utf8");
const wereadApiSource = readFileSync("src/server/api/weread.ts", "utf8");
const gitProjectsApiSource = readFileSync("src/server/api/git-projects.ts", "utf8");
const gitProjectCollectionSource = readFileSync("src/components/GitProjects.tsx", "utf8");
const edgeoneFunctionSource = readFileSync("cloud-functions/api/douban.ts", "utf8");

test("EdgeOne static build keeps shared node parsers in cloud-functions instead of Astro SSR", () => {
  assert.doesNotMatch(buildConfigHelpers, /resolvePlatformSsrConfig/);
  assert.match(doubanApiSource, /from ['"]cheerio\/slim['"]/);
  assert.match(wereadApiSource, /from ['"]cheerio\/slim['"]/);
  assert.match(edgeoneFunctionSource, /dispatchFunctionRequest/);
});

test("shared git-project handlers do not import React component modules for enums", () => {
  assert.match(gitProjectsApiSource, /git-projects-shared/);
  assert.doesNotMatch(gitProjectsApiSource, /from ['"]@\/components\/GitProjectCollection['"]/);
  assert.match(gitProjectCollectionSource, /from ['"]@\/lib\/git-projects-shared['"]/);
});
