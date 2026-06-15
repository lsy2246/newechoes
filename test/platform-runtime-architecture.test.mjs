import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const astroConfigSource = readFileSync("astro.config.mjs", "utf8");
const articleHistoryBridgeSource = readFileSync("src/lib/article-history/index.js", "utf8");
const googlePhotosSource = readFileSync("src/lib/google-photos/node.ts", "utf8");
const platformTypesSource = readFileSync("src/platform/shared/types.ts", "utf8");
const serverRequestLogSource = readFileSync("src/lib/server/request-log.ts", "utf8");
const googlePhotosApiSource = readFileSync("src/server/api/google-photos.ts", "utf8");
const articlePageSource = readFileSync("src/pages/articles/[...id].astro", "utf8");
const timelinePageSource = readFileSync("src/pages/timeline.astro", "utf8");
const filteredPageSource = readFileSync("src/pages/filtered.astro", "utf8");
const buildArticleIndexSource = readFileSync("src/plugins/article-index/integration.js", "utf8");
const sitemapIntegrationSource = readFileSync("src/plugins/sitemap-integration.js", "utf8");
const rssIntegrationSource = readFileSync("src/plugins/rss-integration.js", "utf8");
const robotsIntegrationSource = readFileSync("src/plugins/robots-integration.js", "utf8");
const llmsIntegrationSource = readFileSync("src/plugins/llms-integration.js", "utf8");
const prebuiltHistorySource = readFileSync("src/lib/article-history/prebuilt.js", "utf8");

test("platform shared target helpers normalize and validate supported targets", async () => {
  const { normalizeDeployTarget, DEFAULT_DEPLOY_TARGET, getDeployTarget } = await import("../src/platform/shared/target.js");

  assert.equal(DEFAULT_DEPLOY_TARGET, "vercel");
  assert.equal(normalizeDeployTarget("edgeone"), "edgeone");
  assert.equal(normalizeDeployTarget("cloudflare"), "cloudflare");
  assert.equal(normalizeDeployTarget("unknown"), "vercel");
  assert.equal(getDeployTarget({ DEPLOY_TARGET: "edgeone" }), "edgeone");
});

test("legacy platform runtime bridge has been removed", () => {
  assert.equal(existsSync("src/lib/runtime/platform.ts"), false);
});

test("article history bridge keeps node-only helpers out of the public runtime entry", () => {
  assert.match(articleHistoryBridgeSource, /await import\("\.\/node\.js"\)/);
  assert.doesNotMatch(articleHistoryBridgeSource, /supportsArticleHistory/);
  assert.doesNotMatch(articleHistoryBridgeSource, /export\s*\{\s*parseGitHistoryLog\s*\}\s*from\s*"\.\/node\.js"/);
});

test("page consumers read prebuilt article history instead of invoking node git helpers directly", () => {
  for (const source of [articlePageSource, timelinePageSource, filteredPageSource]) {
    assert.match(source, /prebuilt/);
    assert.doesNotMatch(source, /SOURCE_REPOSITORY_CONFIG/);
    assert.doesNotMatch(source, /getArticleHistory\(/);
    assert.doesNotMatch(source, /getArticleHistoryMap\(/);
  }
});

test("prebuilt article history resolves from source-time artifacts instead of dist output only", () => {
  assert.match(prebuiltHistorySource, /\.astro",\s*"assets",\s*"index",\s*"article-history\.json"/);
  assert.match(prebuiltHistorySource, /fs\.existsSync\(sourceTimePath\)/);
  assert.match(prebuiltHistorySource, /article-history(?:-build)?\.json/);
});

test("google photos parser no longer depends on platform capability gates", () => {
  assert.doesNotMatch(googlePhotosSource, /supportsGooglePhotosParsing/);
  assert.doesNotMatch(googlePhotosSource, /未启用 Google Photos 服务端解析/);
  assert.doesNotMatch(googlePhotosApiSource, /supportsGooglePhotosParsing/);
  assert.doesNotMatch(googlePhotosApiSource, /platform\/runtime\/index\.js/);
});

test("platform shared types no longer expose generic capability flags", () => {
  assert.doesNotMatch(platformTypesSource, /PlatformCapabilities/);
});

test("platform registry capability layer has been removed", () => {
  assert.equal(existsSync("src/platform/shared/registry.js"), false);
  assert.equal(existsSync("src/platform/runtime/capabilities.js"), false);
});

test("server request log resolves platform runtime from the nested server directory", () => {
  assert.match(serverRequestLogSource, /from "\.\.\/\.\.\/platform\/shared\/target\.js"/);
  assert.doesNotMatch(serverRequestLogSource, /from "\.\.\/\.\.\/platform\/runtime\/index\.js"/);
});

test("astro config delegates platform-specific build behavior to platform build modules", () => {
  assert.doesNotMatch(astroConfigSource, /from "\.\/src\/platform\/build\/index\.js"/);
  assert.match(astroConfigSource, /from "\.\/src\/platform\/build\/astro-config\.js"/);
  assert.doesNotMatch(astroConfigSource, /edgeoneRoutingIntegration/);
  assert.match(astroConfigSource, /getPlatformIntegrations/);
  assert.doesNotMatch(astroConfigSource, /function edgeoneCompatPlugin/);
  assert.doesNotMatch(astroConfigSource, /function resolveAdapter/);
  assert.doesNotMatch(astroConfigSource, /function resolveImageConfig/);
  assert.doesNotMatch(astroConfigSource, /function resolveSsrConfig/);
});

test("legacy build-output bridge has been removed", () => {
  assert.equal(existsSync("src/plugins/build-output.js"), false);
});

test("generic build plugins route platform path logic through platform build helpers", () => {
  for (const source of [
    buildArticleIndexSource,
    sitemapIntegrationSource,
    rssIntegrationSource,
    robotsIntegrationSource,
    llmsIntegrationSource,
  ]) {
    assert.doesNotMatch(source, /platform\/build\/index\.js/);
    assert.match(source, /platform\/build|build-output/);
  }
});

test("platform build index bridge has been removed", () => {
  assert.equal(existsSync("src/platform/build/index.js"), false);
});
