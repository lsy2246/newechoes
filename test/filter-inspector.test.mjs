import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const articleFilter = readFileSync("src/components/ArticleFilter.tsx", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return globalCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("filter panel exposes a compact inspector model instead of disconnected controls", () => {
  assert.ok(articleFilter.includes("datePresets"));
  assert.ok(articleFilter.includes("selectableYears"));
  assert.ok(articleFilter.includes("selectableMonths"));
  assert.ok(articleFilter.includes("tagSearch"));
  assert.ok(articleFilter.includes("visibleSelectedTags"));
  assert.ok(articleFilter.includes("hiddenSelectedTagCount"));
  assert.ok(articleFilter.includes("filter-view-options"));
  assert.ok(articleFilter.includes("filter-tag-search"));
  assert.ok(articleFilter.includes("filter-date-groups"));
  assert.ok(articleFilter.includes("filter-date-months"));
  assert.ok(articleFilter.includes("最近 30 天"));
  assert.ok(articleFilter.includes("最近一年"));
  assert.ok(articleFilter.includes("每页"));
  assert.equal(articleFilter.includes("<select"), false);
  assert.equal(articleFilter.includes("filter-date-line"), false);
  assert.equal(articleFilter.includes("inputMode=\"numeric\""), false);
  assert.equal(articleFilter.includes('id="filter-start-date"'), false);
  assert.equal(articleFilter.includes("placeholder=\"开始日期\""), false);
});

test("filter panel CSS keeps expanded choices linear and scannable", () => {
  assert.match(cssBlock(".filter-row"), /grid-template-columns:\s*72px minmax\(0,\s*1fr\)/);
  assert.match(cssBlock(".filter-row label"), /margin-top:\s*0\.35em;/);
  assert.match(cssBlock(".filter-option-grid"), /display:\s*grid;/);
  assert.match(cssBlock(".filter-date-groups"), /gap:\s*20px;/);
  assert.match(cssBlock(".filter-date-group"), /display:\s*grid;/);
  assert.match(cssBlock(".filter-tag-search"), /border-bottom:\s*1px solid var\(--site-line\)/);
  assert.match(cssBlock(".filter-tag-options"), /max-height:\s*14rem;/);
  assert.match(cssBlock(".filter-tag-option"), /grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
  assert.match(cssBlock(".filter-tag-summary"), /white-space:\s*nowrap;/);
});
