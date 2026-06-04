import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const astroConfigSource = readFileSync("astro.config.mjs", "utf8");
const articleHistoryBridgeSource = readFileSync("src/lib/article-history/index.js", "utf8");
const serverRequestLogSource = readFileSync("src/lib/server/request-log.ts", "utf8");
const buildArticleIndexSource = readFileSync("src/plugins/article-index/integration.js", "utf8");
const sitemapIntegrationSource = readFileSync("src/plugins/sitemap-integration.js", "utf8");
const rssIntegrationSource = readFileSync("src/plugins/rss-integration.js", "utf8");
const robotsIntegrationSource = readFileSync("src/plugins/robots-integration.js", "utf8");
const llmsIntegrationSource = readFileSync("src/plugins/llms-integration.js", "utf8");

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
  assert.doesNotMatch(articleHistoryBridgeSource, /export\s*\{\s*parseGitHistoryLog\s*\}\s*from\s*"\.\/node\.js"/);
});

test("server request log resolves platform runtime from the nested server directory", () => {
  assert.match(serverRequestLogSource, /from "\.\.\/\.\.\/platform\/runtime\/index\.js"/);
  assert.doesNotMatch(serverRequestLogSource, /from "\.\.\/platform\/runtime\/index\.js"/);
});

test("astro config delegates platform-specific build behavior to platform build modules", () => {
  assert.match(astroConfigSource, /from "\.\/src\/platform\/build\/index\.js"/);
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
    assert.match(source, /platform\/build|build-output/);
  }
});
