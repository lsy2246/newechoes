import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const articleFilter = readFileSync("src/components/article/filter/ArticleFilter.tsx", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return globalCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("filter panel exposes a compact console model instead of disconnected controls", () => {
  assert.ok(articleFilter.includes("datePresets"));
  assert.ok(articleFilter.includes("selectableYears"));
  assert.ok(articleFilter.includes("selectableMonths"));
  assert.ok(articleFilter.includes("tagSearch"));
  assert.ok(articleFilter.includes("visibleSelectedTags"));
  assert.ok(articleFilter.includes("hiddenSelectedTagCount"));
  assert.ok(articleFilter.includes("filter-console-layout"));
  assert.ok(articleFilter.includes("filter-console"));
  assert.ok(articleFilter.includes("filter-control-grid"));
  assert.ok(articleFilter.includes("filter-control"));
  assert.ok(articleFilter.includes("filter-active-strip"));
  assert.ok(articleFilter.includes("filter-result-list"));
  assert.ok(articleFilter.includes("filter-result-link"));
  assert.ok(articleFilter.includes("filter-result-kind"));
  assert.ok(articleFilter.includes("filter-result-icon"));
  assert.ok(articleFilter.includes("filter-reset-button"));
  assert.ok(articleFilter.includes("filter-view-options"));
  assert.ok(articleFilter.includes("filter-tag-search"));
  assert.ok(articleFilter.includes("filter-date-groups"));
  assert.ok(articleFilter.includes("filter-date-months"));
  assert.ok(articleFilter.includes("最近 30 天"));
  assert.ok(articleFilter.includes("最近一年"));
  assert.ok(articleFilter.includes("最近修改"));
  assert.ok(articleFilter.includes("最早修改"));
  assert.ok(articleFilter.includes("updated_desc"));
  assert.ok(articleFilter.includes("updated_asc"));
  assert.ok(articleFilter.includes("articleUpdatedAt"));
  assert.ok(articleFilter.includes("updatedAtByUrl"));
  assert.ok(articleFilter.includes("isUpdatedSort"));
  assert.ok(articleFilter.includes("sortArticlesByUpdatedTime"));
  assert.ok(articleFilter.includes("document.addEventListener(\"pointerdown\""));
  assert.ok(articleFilter.includes("filterConsoleRef"));
  assert.ok(articleFilter.includes(".closest(\".filter-disclosure\")"));
  assert.ok(articleFilter.includes("setOpenFilterMenu(null)"));
  assert.ok(articleFilter.includes("每页"));
  assert.equal(articleFilter.includes("filter-rail"), false);
  assert.equal(articleFilter.includes("explorer-grid"), false);
  assert.equal(articleFilter.includes("node-kind"), false);
  assert.equal(articleFilter.includes("<select"), false);
  assert.equal(articleFilter.includes("filter-date-line"), false);
  assert.equal(articleFilter.includes("inputMode=\"numeric\""), false);
  assert.equal(articleFilter.includes('id="filter-start-date"'), false);
  assert.equal(articleFilter.includes("placeholder=\"开始日期\""), false);
  assert.equal(articleFilter.includes("filter-console-head"), false);
  assert.equal(articleFilter.includes("filter-console-kicker"), false);
  assert.equal(articleFilter.includes("filter-console-title"), false);
  assert.equal(articleFilter.includes("检索文章"), false);
});

test("filter panel CSS keeps console controls and dense results scannable", () => {
  assert.match(cssBlock(".filter-console-layout"), /display:\s*grid;/);
  assert.match(cssBlock(".filter-console-layout"), /gap:\s*clamp\(20px,\s*2\.4vw,\s*28px\)/);
  assert.doesNotMatch(cssBlock(".filter-console"), /border-top:/);
  assert.match(cssBlock(".filter-control-grid"), /grid-template-columns:\s*minmax\(0,\s*15rem\) minmax\(0,\s*13rem\) minmax\(0,\s*17rem\) auto/);
  assert.match(cssBlock(".filter-control"), /min-width:\s*0;/);
  assert.match(cssBlock(".line-select"), /border:\s*1px solid var\(--site-line\)/);
  assert.match(cssBlock(".line-select"), /font-size:\s*var\(--type-ui\);/);
  assert.match(cssBlock(".line-select"), /min-height:\s*42px;/);
  assert.match(cssBlock(".filter-reset-button"), /min-height:\s*42px;/);
  assert.match(cssBlock(".filter-reset-button"), /border:\s*1px solid var\(--site-line\)/);
  assert.match(cssBlock(".filter-option-grid"), /display:\s*grid;/);
  assert.match(cssBlock(".filter-date-groups"), /gap:\s*20px;/);
  assert.match(cssBlock(".filter-date-group"), /display:\s*grid;/);
  assert.match(cssBlock(".filter-tag-search"), /border-bottom:\s*1px solid var\(--site-line\)/);
  assert.match(cssBlock(".filter-tag-options"), /max-height:\s*min\(22rem,\s*calc\(100vh - 18rem\)\);/);
  assert.match(cssBlock(".filter-tag-option"), /grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
  assert.match(cssBlock(".filter-tag-summary"), /white-space:\s*nowrap;/);
  assert.match(cssBlock(".filter-result-list"), /display:\s*grid;/);
  assert.match(cssBlock(".filter-result-list"), /auto-fill,\s*minmax\(270px,\s*1fr\)/);
  assert.match(cssBlock(".filter-result-link"), /display:\s*flex;/);
  assert.match(cssBlock(".filter-result-link"), /flex-direction:\s*column;/);
  assert.match(cssBlock(".filter-result-link"), /border:\s*1px solid var\(--site-line\);/);
  assert.match(cssBlock(".filter-result-link"), /padding:\s*44px 18px 16px;/);
  assert.match(cssBlock(".filter-result-icon"), /position:\s*absolute;/);
  assert.match(cssBlock(".filter-result-title"), /overflow-wrap:\s*anywhere;/);
  assert.match(cssBlock(".filter-result-title"), /-webkit-line-clamp:\s*2;/);
  assert.match(cssBlock(".filter-result-summary"), /-webkit-line-clamp:\s*2;/);
});

test("filter dropdowns float above results instead of changing layout flow", () => {
  assert.match(cssBlock(".filter-disclosure"), /position:\s*relative;/);
  assert.match(cssBlock(".filter-disclosure[open]"), /z-index:\s*60;/);
  assert.match(cssBlock(".filter-drawer"), /position:\s*absolute;/);
  assert.match(cssBlock(".filter-drawer"), /top:\s*calc\(100% \+ 10px\);/);
  assert.match(cssBlock(".filter-drawer"), /z-index:\s*50;/);
  assert.match(cssBlock(".filter-drawer"), /box-shadow:/);
  assert.match(cssBlock(".filter-tag-disclosure .filter-drawer"), /width:\s*min\(30rem,\s*calc\(100vw - 2rem\)\);/);
  assert.match(cssBlock(".filter-view-disclosure .filter-drawer"), /right:\s*0;/);
});

test("filter sort menu exposes update-time ordering and closes on outside clicks", () => {
  assert.match(articleFilter, /updated_desc:\s*"最近修改"/);
  assert.match(articleFilter, /updated_asc:\s*"最早修改"/);
  assert.match(articleFilter, /sort:\s*isUpdatedSort\(nextFilters\.sort\)\s*\?\s*"newest"\s*:\s*nextFilters\.sort/);
  assert.match(articleFilter, /limit:\s*Math\.max\(total,\s*1\)/);
  assert.match(
    articleFilter,
    /sortArticlesByUpdatedTime\(\s*allArticles,\s*nextFilters\.sort,\s*updatedAtByUrl,\s*\)/,
  );
  assert.match(articleFilter, /document\.addEventListener\("pointerdown",\s*handlePointerDown/);
  assert.match(articleFilter, /filterConsoleRef\.current\.contains\(target\)/);
  assert.match(articleFilter, /targetElement\?\.closest\("\.filter-disclosure"\)/);
  assert.match(articleFilter, /document\.removeEventListener\("pointerdown",\s*handlePointerDown/);
});

test("filter console stacks controls and result rows on mobile", () => {
  assert.match(
    globalCss,
    /@media \(max-width:\s*720px\) \{[\s\S]*?\.filter-control-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;/,
  );
  assert.match(
    globalCss,
    /@media \(max-width:\s*720px\) \{[\s\S]*?\.filter-result-link\s*\{[\s\S]*?min-height:\s*168px;[\s\S]*?padding:\s*44px 18px 16px;/,
  );
  assert.match(
    globalCss,
    /@media \(max-width:\s*720px\) \{[\s\S]*?\.filter-result-cue\s*\{[\s\S]*?display:\s*none;/,
  );
});
