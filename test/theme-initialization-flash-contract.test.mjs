import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const layout = readFileSync("src/components/Layout.astro", "utf8").replace(/\r\n/g, "\n");

test("layout restores the persisted theme before first paint instead of hardcoding light html state", () => {
  assert.equal(layout.includes('const initialTheme = "light";'), false);
  assert.equal(layout.includes("data-theme={initialTheme}"), false);
  assert.match(
    layout,
    /<script is:inline>[\s\S]*localStorage\.getItem\("theme"\)[\s\S]*window\.matchMedia\("\(prefers-color-scheme: dark\)"\)\.matches[\s\S]*document\.documentElement\.dataset\.theme = storedTheme \?\? systemTheme;/,
  );
});
