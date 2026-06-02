import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const astroConfigSource = readFileSync("astro.config.mjs", "utf8");
const legacyRuntimeBridgeSource = readFileSync("src/lib/runtime/platform.ts", "utf8");
const buildOutputBridgeSource = readFileSync("src/plugins/build-output.js", "utf8");
const edgeoneRoutingBridgeSource = readFileSync("src/plugins/edgeone-routing-integration.js", "utf8");
const buildArticleIndexSource = readFileSync("src/plugins/build-article-index.js", "utf8");
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

test("legacy runtime module is a thin bridge to the new platform runtime entrypoint", () => {
  assert.match(legacyRuntimeBridgeSource, /from "@\/platform\/shared\/types"/);
  assert.match(legacyRuntimeBridgeSource, /from "@\/platform\/runtime\/index\.js"/);
  assert.doesNotMatch(legacyRuntimeBridgeSource, /createCloudflareAnalyticsScripts/);
  assert.doesNotMatch(legacyRuntimeBridgeSource, /PLATFORM_CAPABILITIES/);
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

test("legacy build-output and edgeone routing files are compatibility bridges", () => {
  assert.match(buildOutputBridgeSource, /from "\.\.\/platform\/build\/mirrors\.js"|from "\.\/\.\.\/platform\/build\/mirrors\.js"|from "\.\.\/platform\/build\/mirrors\.js"/);
  assert.match(edgeoneRoutingBridgeSource, /from "\.\.\/platform\/build\/edgeone\/routing-patch\.js"|from "\.\/\.\.\/platform\/build\/edgeone\/routing-patch\.js"|from "\.\.\/platform\/build\/edgeone\/routing-patch\.js"/);
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
