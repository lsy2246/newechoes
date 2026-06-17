import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("shared cache header policy renders Cloudflare, Vercel, and EdgeOne outputs", async () => {
  const {
    CACHE_HEADER_RULES,
    renderCloudflareHeadersFile,
    buildVercelHeaders,
    buildEdgeoneHeaders,
  } = await import("../src/platform/config/cache-headers.js");

  assert.equal(Array.isArray(CACHE_HEADER_RULES), true);
  assert.ok(CACHE_HEADER_RULES.length >= 5);
  assert.match(renderCloudflareHeadersFile(), /Cache-Control:/);
  assert.equal(buildVercelHeaders().length, CACHE_HEADER_RULES.length);
  assert.equal(buildEdgeoneHeaders().length, CACHE_HEADER_RULES.length);
});

test("platform config files stay in sync with shared cache header policy", async () => {
  const {
    renderCloudflareHeadersFile,
    buildVercelHeaders,
    buildEdgeoneHeaders,
  } = await import("../src/platform/config/cache-headers.js");

  const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));
  const edgeoneConfig = JSON.parse(readFileSync("edgeone.json", "utf8"));

  assert.equal(readFileSync("public/_headers", "utf8").trim(), renderCloudflareHeadersFile().trim());
  assert.deepEqual(vercelConfig.headers, buildVercelHeaders());
  assert.deepEqual(edgeoneConfig.headers, buildEdgeoneHeaders());
  assert.equal("public" in vercelConfig, false);
});
