import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page404 = readFileSync("src/pages/404.astro", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");
const layoutSource = readFileSync("src/components/Layout.astro", "utf8");
const illustrationSource = readFileSync("src/components/NotFoundIllustration.astro", "utf8");

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return globalCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("404 page uses the themed illustration layout", () => {
  assert.ok(page404.includes('import NotFoundIllustration from "@/components/NotFoundIllustration.astro";'));
  assert.ok(page404.includes("hideFooter={true}"));
  assert.ok(page404.includes('robots="noindex, nofollow"'));
  assert.ok(page404.includes("<NotFoundIllustration />"));
  assert.ok(page404.includes("404 Not Found"));
  assert.ok(page404.includes("返回首页"));
  assert.equal(page404.includes("浏览文章"), false);
  assert.equal(page404.includes("not-found-stage"), false);
});

test("404 illustration asset keeps white detail paths but removes only the full-frame background path", () => {
  assert.ok(illustrationSource.includes('preserveAspectRatio="xMidYMid meet"'));
  assert.ok(illustrationSource.includes('fill="var(--not-found-ink)"'));
  assert.ok(illustrationSource.includes('fill="var(--not-found-paper)"'));
  assert.equal(illustrationSource.includes("M0 640.50 l0 -640.50"), false);
  assert.ok(illustrationSource.includes("M722.99 1051.25"));
  assert.ok(illustrationSource.includes("M904.99 1049.39"));
  assert.ok(illustrationSource.includes("M1228.53 1004.64"));
  assert.ok(illustrationSource.includes('aria-hidden="true"'));
  assert.ok(illustrationSource.includes('focusable="false"'));
});

test("404 page inherits the global monochrome illustration variables", () => {
  const lightBlock = cssBlock(".not-found-shell");
  const darkBlock = cssBlock('[data-theme="dark"] .not-found-shell');

  assert.match(lightBlock, /--not-found-ink:\s*var\(--site-ink\);/);
  assert.match(lightBlock, /--not-found-paper:\s*var\(--site-bg\);/);
  assert.match(darkBlock, /--not-found-ink:\s*var\(--site-ink\);/);
  assert.match(darkBlock, /--not-found-paper:\s*var\(--site-bg\);/);
  assert.match(cssBlock(".not-found-illustration"), /aspect-ratio:\s*1647\s*\/\s*1281;/);
  assert.match(cssBlock(".not-found-action:focus-visible"), /outline:\s*2px solid currentColor;/);
});

test("layout supports per-page robots overrides for non-indexable routes", () => {
  assert.ok(layoutSource.includes("robots?: string;"));
  assert.ok(layoutSource.includes('robots = "index, follow"'));
  assert.ok(layoutSource.includes('name="robots"'));
  assert.ok(layoutSource.includes("content={robots}"));
});
