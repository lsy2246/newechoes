import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeToggleAstro = readFileSync("src/components/theme-toggle/runtime.ts", "utf8").replace(/\r\n/g, "\n");

test("mobile menu theme toggles keep the same auto direction as desktop", () => {
  assert.match(
    themeToggleAstro,
    /if \(transitionMode === TRANSITION_MODES\.AUTO\) \{\s*return fromTheme === "light" && toTheme === "dark"\s*\?\s*TRANSITION_MODES\.EXPAND\s*:\s*TRANSITION_MODES\.SHRINK;\s*\}/,
  );

  assert.doesNotMatch(themeToggleAstro, /isMobileMenuToggle/);
});
