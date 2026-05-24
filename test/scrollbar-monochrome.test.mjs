import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalCss = readFileSync("src/styles/global.css", "utf8");
const articleCss = readFileSync("src/styles/articles.css", "utf8");

const cssBlock = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("global scrollbars use monochrome site tokens instead of old slate colors", () => {
  assert.doesNotMatch(
    globalCss,
    /--scrollbar-[^:]+:\s*#(?:f1f5f9|94a3b8|64748b|475569|1e293b);/i,
  );

  assert.match(globalCss, /--scrollbar-track:\s*transparent;/);
  assert.match(globalCss, /--scrollbar-dark-track:\s*transparent;/);
  assert.match(globalCss, /--scrollbar-thumb:\s*color-mix\(in oklab,\s*var\(--site-ink\)/);
  assert.match(globalCss, /--scrollbar-dark-thumb:\s*color-mix\(in oklab,\s*var\(--site-ink\)/);

  const thumbBlock = cssBlock(globalCss, "::-webkit-scrollbar-thumb");
  assert.match(thumbBlock, /background:\s*var\(--scrollbar-thumb\);/);
  assert.match(thumbBlock, /border:\s*2px solid transparent;/);
  assert.match(thumbBlock, /background-clip:\s*content-box;/);

  assert.match(
    cssBlock(articleCss, "#toc-content::-webkit-scrollbar-thumb"),
    /background-color:\s*var\(--article-line-strong\);/,
  );
});
