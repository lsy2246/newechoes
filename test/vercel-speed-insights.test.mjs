import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const layoutSource = readFileSync("src/components/Layout.astro", "utf8");

test("Vercel Speed Insights is installed as a runtime dependency", () => {
  assert.ok(packageJson.dependencies["@vercel/speed-insights"]);
});

test("the shared Astro layout consumes platform observability config for Vercel Speed Insights", () => {
  assert.ok(layoutSource.includes('import VercelSpeedInsights from "@/components/VercelSpeedInsights.astro";'));
  assert.ok(layoutSource.includes("getPlatformObservability"));
  assert.ok(layoutSource.includes("showVercelInsights"));
  assert.ok(layoutSource.includes("observability.speedInsights && !import.meta.env.DEV"));
  assert.ok(layoutSource.includes("<VercelSpeedInsights />"));
});
