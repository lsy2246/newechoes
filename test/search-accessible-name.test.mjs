import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchSource = readFileSync("src/components/search/Search.tsx", "utf8");
const articleSource = readFileSync("src/pages/articles/[...id].astro", "utf8");

test("search icon-only controls expose accessible names", () => {
  assert.match(searchSource, /aria-label="清除搜索"/);
  assert.match(
    searchSource,
    /aria-label=\{inlineSuggestion\.type === "correction" \? "接受搜索纠正" : "接受搜索补全"\}/,
  );
});

test("article icon-only controls expose accessible names", () => {
  assert.match(articleSource, /id="back-to-top"[\s\S]*aria-label="回到顶部"/);
  assert.match(articleSource, /toc-toggle ml-1 p-1" aria-expanded="false" aria-label="\$\{item\.text\} 的子目录"/);
});
