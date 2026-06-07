import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeToggleAstro = readFileSync("src/components/ThemeToggle.astro", "utf8").replace(/\r\n/g, "\n");
const themeToggleCss = readFileSync("src/styles/theme-toggle.css", "utf8").replace(/\r\n/g, "\n");

test("theme toggle captures the outgoing surface color before activating the transition shell", () => {
  assert.match(
    themeToggleAstro,
    /const transitionFallbackSurface =\s*getComputedStyle\(document\.body\)\.backgroundColor\s*\|\|\s*getComputedStyle\(document\.documentElement\)\.backgroundColor;/,
  );

  assert.match(
    themeToggleAstro,
    /document\.documentElement\.style\.setProperty\(\s*"--theme-transition-fallback-bg",\s*transitionFallbackSurface,\s*\);/,
  );
});

test("theme toggle clears the temporary fallback surface after the transition completes", () => {
  assert.match(
    themeToggleAstro,
    /document\.documentElement\.style\.removeProperty\(\s*"--theme-transition-fallback-bg",?\s*\)/,
  );
});

test("theme transition keeps only the root surfaces pinned to the captured fallback surface", () => {
  assert.match(
    themeToggleCss,
    /html\.theme-transition-active,\s*html\.theme-transition-active body\s*\{[\s\S]*background:\s*var\(--theme-transition-fallback-bg,\s*transparent\)\s*!important;[\s\S]*\}/,
  );

  assert.doesNotMatch(
    themeToggleCss,
    /html\.theme-transition-active \.home-diorama-shell,\s*html\.theme-transition-active \.home-diorama-stage,\s*html\.theme-transition-active \.home-diorama/,
  );
});
