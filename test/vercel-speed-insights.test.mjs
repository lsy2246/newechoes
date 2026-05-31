import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const layoutSource = readFileSync("src/components/Layout.astro", "utf8");

test("Vercel Speed Insights is installed as a runtime dependency", () => {
  assert.ok(packageJson.dependencies["@vercel/speed-insights"]);
});

test("the shared Astro layout renders Vercel Speed Insights on every page", () => {
  assert.ok(layoutSource.includes('@vercel/speed-insights/astro'));
  assert.ok(layoutSource.includes("<SpeedInsights"));
});
