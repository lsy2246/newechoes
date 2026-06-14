import assert from "node:assert/strict";
import test from "node:test";

const deployTargetEnv = process.env.DEPLOY_TARGET;
const vercelEnv = process.env.VERCEL;
const cloudflareTokenEnv = process.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
const edgeoneTelemetrySrcEnv = process.env.PUBLIC_EDGEONE_TELEMETRY_SRC;
const edgeoneTelemetryIdEnv = process.env.PUBLIC_EDGEONE_TELEMETRY_ID;

async function loadPlatformModule() {
  return import(`../src/platform/runtime/observability.js?case=${Math.random()}`);
}

function restoreEnv() {
  if (deployTargetEnv === undefined) {
    delete process.env.DEPLOY_TARGET;
  } else {
    process.env.DEPLOY_TARGET = deployTargetEnv;
  }

  if (vercelEnv === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = vercelEnv;
  }

  if (cloudflareTokenEnv === undefined) {
    delete process.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  } else {
    process.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN = cloudflareTokenEnv;
  }

  if (edgeoneTelemetrySrcEnv === undefined) {
    delete process.env.PUBLIC_EDGEONE_TELEMETRY_SRC;
  } else {
    process.env.PUBLIC_EDGEONE_TELEMETRY_SRC = edgeoneTelemetrySrcEnv;
  }

  if (edgeoneTelemetryIdEnv === undefined) {
    delete process.env.PUBLIC_EDGEONE_TELEMETRY_ID;
  } else {
    process.env.PUBLIC_EDGEONE_TELEMETRY_ID = edgeoneTelemetryIdEnv;
  }
}

test.afterEach(() => {
  restoreEnv();
});

test("vercel keeps speed insights enabled and does not inject extra body scripts", async () => {
  process.env.DEPLOY_TARGET = "vercel";
  delete process.env.VERCEL;
  delete process.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  delete process.env.PUBLIC_EDGEONE_TELEMETRY_SRC;
  delete process.env.PUBLIC_EDGEONE_TELEMETRY_ID;

  const { getPlatformObservability } = await loadPlatformModule();
  const observability = getPlatformObservability();

  assert.equal(observability.provider, "vercel");
  assert.equal(observability.speedInsights, true);
  assert.deepEqual(observability.bodyScripts, []);
});

test("missing deploy target does not implicitly enable vercel speed insights", async () => {
  delete process.env.DEPLOY_TARGET;
  delete process.env.VERCEL;
  delete process.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  delete process.env.PUBLIC_EDGEONE_TELEMETRY_SRC;
  delete process.env.PUBLIC_EDGEONE_TELEMETRY_ID;

  const { getPlatformObservability } = await loadPlatformModule();
  const observability = getPlatformObservability();

  assert.equal(observability.provider, "vercel");
  assert.equal(observability.speedInsights, false);
  assert.deepEqual(observability.bodyScripts, []);
});

test("vercel runtime flag enables speed insights even when reading from an explicit env object", async () => {
  delete process.env.DEPLOY_TARGET;
  delete process.env.VERCEL;

  const { getPlatformObservability } = await loadPlatformModule();
  const observability = getPlatformObservability({
    DEPLOY_TARGET: "vercel",
    VERCEL: "1",
  });

  assert.equal(observability.provider, "vercel");
  assert.equal(observability.speedInsights, true);
});

test("cloudflare exposes a web analytics script slot when a token is provided", async () => {
  process.env.DEPLOY_TARGET = "cloudflare";
  delete process.env.VERCEL;
  process.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN = "cf-token";
  delete process.env.PUBLIC_EDGEONE_TELEMETRY_SRC;
  delete process.env.PUBLIC_EDGEONE_TELEMETRY_ID;

  const { getPlatformObservability } = await loadPlatformModule();
  const observability = getPlatformObservability();

  assert.equal(observability.provider, "cloudflare");
  assert.equal(observability.speedInsights, false);
  assert.equal(observability.bodyScripts.length, 1);
  assert.deepEqual(observability.bodyScripts[0], {
    src: "https://static.cloudflareinsights.com/beacon.min.js",
    defer: true,
    dataAttributes: {
      "cf-beacon": JSON.stringify({ token: "cf-token" }),
    },
  });
});

test("edgeone exposes a telemetry script slot when a telemetry source is provided", async () => {
  process.env.DEPLOY_TARGET = "edgeone";
  delete process.env.VERCEL;
  process.env.PUBLIC_EDGEONE_TELEMETRY_SRC = "https://edgeone.example.com/telemetry.js";
  process.env.PUBLIC_EDGEONE_TELEMETRY_ID = "edge-site";
  delete process.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;

  const { getPlatformObservability } = await loadPlatformModule();
  const observability = getPlatformObservability();

  assert.equal(observability.provider, "edgeone");
  assert.equal(observability.speedInsights, false);
  assert.equal(observability.bodyScripts.length, 1);
  assert.deepEqual(observability.bodyScripts[0], {
    src: "https://edgeone.example.com/telemetry.js",
    defer: true,
    dataAttributes: {
      "edgeone-id": "edge-site",
    },
  });
});
