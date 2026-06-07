import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeToggleAstro = readFileSync("src/components/ThemeToggle.astro", "utf8").replace(/\r\n/g, "\n");

test("theme view transitions synchronously notify visual surfaces before capturing the new snapshot", () => {
  assert.match(
    themeToggleAstro,
    /set:\s*\(newTheme\)\s*=>\s*\{[\s\S]*?document\.documentElement\.dataset\.theme = newTheme;[\s\S]*?window\.dispatchEvent\([\s\S]*?new CustomEvent\("theme:changed",[\s\S]*?detail:\s*\{\s*theme:\s*newTheme\s*\}[\s\S]*?\)[\s\S]*?\);/,
  );

  assert.match(
    themeToggleAstro,
    /const safeCallback = \(\) => \{\s*try \{[\s\S]*?callback\(\);/,
  );

  assert.match(
    themeToggleAstro,
    /const safeThemeChangeCallback = \(\) => \{\s*try \{\s*theme\.set\(newTheme\);/,
  );

  assert.doesNotMatch(themeToggleAstro, /await waitForThemeVisualSync\(\)/);
});
