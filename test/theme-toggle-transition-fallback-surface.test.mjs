import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeToggleAstro = readFileSync("src/lib/theme-toggle-runtime.ts", "utf8").replace(/\r\n/g, "\n");
const themeToggleCss = readFileSync("src/styles/theme-toggle.css", "utf8").replace(/\r\n/g, "\n");

const cssBlock = (source, selector) => {
  const start = source.indexOf(`${selector} {`);
  if (start === -1) return "";
  const bodyStart = source.indexOf("{", start);
  const bodyEnd = source.indexOf("}", bodyStart);
  return source.slice(bodyStart + 1, bodyEnd);
};

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

test("theme transition keeps the live root on the destination theme while old snapshots keep the captured fallback", () => {
  const liveRootBlock = cssBlock(themeToggleCss, "html.theme-transition-active");
  const liveBodyBlock = cssBlock(themeToggleCss, "html.theme-transition-active body");
  const overflowLockBlock = cssBlock(
    themeToggleCss,
    "html.theme-transition-active,\nhtml.theme-transition-active body",
  );

  assert.doesNotMatch(liveRootBlock, /--theme-transition-fallback-bg/);
  assert.doesNotMatch(liveBodyBlock, /--theme-transition-fallback-bg/);
  assert.doesNotMatch(overflowLockBlock, /--theme-transition-fallback-bg/);

  assert.match(liveRootBlock, /background:\s*var\(--site-bg\)\s*!important;/);
  assert.match(liveBodyBlock, /background:\s*var\(--site-bg\)\s*!important;/);

  assert.match(
    cssBlock(themeToggleCss, "::view-transition-old(root)"),
    /background:\s*var\(--theme-transition-fallback-bg,\s*transparent\)\s*!important;/,
  );

  assert.doesNotMatch(
    themeToggleCss,
    /html\.theme-transition-active \.home-diorama-shell,\s*html\.theme-transition-active \.home-diorama-stage,\s*html\.theme-transition-active \.home-diorama/,
  );
});

test("theme transition no longer applies homepage-specific live surface overrides", () => {
  assert.doesNotMatch(
    themeToggleCss,
    /html\.theme-transition-active \.home-diorama\s*\{/,
  );
});
