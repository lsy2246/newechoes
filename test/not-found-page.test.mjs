import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page404 = readFileSync("src/pages/404.astro", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return globalCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("404 page uses the themed illustration layout", () => {
  assert.ok(page404.includes('import NotFoundIllustration from "@/components/NotFoundIllustration.astro";'));
  assert.ok(page404.includes("hideFooter={true}"));
  assert.ok(page404.includes("<NotFoundIllustration />"));
  assert.ok(page404.includes("404 Not Found"));
  assert.ok(page404.includes("返回首页"));
  assert.equal(page404.includes("浏览文章"), false);
  assert.equal(page404.includes("not-found-stage"), false);
});

test("404 illustration colors are theme controlled", () => {
  const illustration = readFileSync("src/components/NotFoundIllustration.astro", "utf8");

  assert.ok(illustration.includes("var(--not-found-ink)"));
  assert.ok(illustration.includes("var(--not-found-paper)"));
  assert.ok(illustration.includes('aria-hidden="true"'));
  assert.ok(illustration.includes('focusable="false"'));
  assert.equal(illustration.includes('fill="#000000"'), false);
  assert.equal(illustration.includes('fill="#ffffff"'), false);
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
