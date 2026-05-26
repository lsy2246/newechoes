import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const globalCss = readFileSync("src/styles/global.css", "utf8");
const articlesCss = readFileSync("src/styles/articles.css", "utf8");
const articlesCodeCss = readFileSync("src/styles/articles-code.css", "utf8");
const articleIndex = readFileSync("src/pages/articles/index.astro", "utf8");
const articleDirectoryRoute = readFileSync("src/pages/articles/[...path].astro", "utf8");
const articleDetail = readFileSync("src/pages/articles/[...id].astro", "utf8");
const filteredPage = readFileSync("src/pages/filtered.astro", "utf8");
const articleFilter = readFileSync("src/components/ArticleFilter.tsx", "utf8");
const timelinePath = "src/pages/timeline.astro";
const oldTimelinePath = "src/pages/articles/timeline.astro";
const timelinePage = existsSync(timelinePath)
  ? readFileSync(timelinePath, "utf8")
  : "";

const cssBlock = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

const cssBlocks = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...source.matchAll(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "g"))].map(
    (match) => match[1],
  );
};

const lastCssBlock = (source, selector) => cssBlocks(source, selector).at(-1) ?? "";
const hasCssBlock = (source, selector, pattern) =>
  cssBlocks(source, selector).some((block) => pattern.test(block));

test("article surfaces use the graphite dark palette instead of pure black", () => {
  assert.match(cssBlock(globalCss, '[data-theme="dark"]'), /--site-bg:\s*#111315;/);
  assert.match(cssBlock(globalCss, '[data-theme="dark"]'), /--site-ink:\s*#f5f7fa;/);
  assert.match(cssBlock(globalCss, '[data-theme="dark"] .layout-directory-page'), /var\(--site-bg\)/);
  assert.match(cssBlock(articlesCss, '[data-theme="dark"]'), /--article-bg:\s*var\(--site-bg\);/);
  assert.match(cssBlock(articlesCss, '[data-theme="dark"]'), /--article-warning:\s*var\(--site-warning\);/);
});

test("grid and filter views use the same lightweight explorer node language", () => {
  assert.match(cssBlock(globalCss, ".explorer-grid"), /auto-fill,\s*minmax\(230px,\s*1fr\)/);
  assert.match(cssBlock(globalCss, ".node"), /grid-template-columns:\s*40px minmax\(0,\s*1fr\)/);
  assert.match(cssBlock(globalCss, ".node"), /min-height:\s*136px;/);
  assert.match(cssBlock(globalCss, ".node"), /border:\s*1px solid var\(--site-line\);/);
  assert.match(cssBlock(globalCss, ".node"), /border-radius:\s*6px;/);
  assert.match(cssBlock(globalCss, ".node-kind"), /position:\s*absolute;/);

  assert.ok(articleIndex.includes("article-topbar"));
  assert.ok(articleIndex.includes("article-index-topbar"));
  assert.ok(articleIndex.includes("article-breadcrumb"));
  assert.ok(articleIndex.includes('aria-current="page"'));
  assert.equal(articleIndex.includes('<div class="pathbar">'), false);
  assert.equal(articleIndex.includes('class="path"'), false);
  assert.match(cssBlock(globalCss, ".article-index-topbar"), /grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/);
  assert.match(cssBlock(globalCss, ".article-index-topbar"), /border-bottom:\s*1px solid var\(--site-line\);/);
  assert.match(cssBlock(globalCss, ".article-index-topbar .article-breadcrumb"), /overflow:\s*hidden;/);
  assert.ok(articleIndex.includes("explorer-grid"));
  assert.ok(articleIndex.includes("node-kind"));
  assert.ok(articleIndex.includes("node-icon"));
  assert.ok(articleIndex.includes("node-title"));
  assert.ok(articleIndex.includes("node-summary"));
  assert.ok(articleIndex.includes("node-meta"));
  assert.equal(articleIndex.includes("article-card"), false);
  assert.equal(articleIndex.includes("article-index-entry-grid"), false);
  assert.ok(articleDirectoryRoute.includes("props:"));
  assert.ok(articleDirectoryRoute.includes("path,"));
  assert.ok(articleDirectoryRoute.includes("<ArticlesPage"));

  assert.equal(filteredPage.includes("article-index-pathbar"), false);
  assert.ok(articleFilter.includes("filter-console-layout"));
  assert.ok(articleFilter.includes("filter-console"));
  assert.ok(articleFilter.includes("filter-control-grid"));
  assert.ok(articleFilter.includes("filter-control"));
  assert.ok(articleFilter.includes("filter-disclosure"));
  assert.ok(articleFilter.includes("filter-view-options"));
  assert.ok(articleFilter.includes("filter-tag-search"));
  assert.ok(articleFilter.includes("filter-option-grid"));
  assert.ok(articleFilter.includes("filter-tag-option"));
  assert.ok(articleFilter.includes("filter-clear-inline"));
  assert.ok(articleFilter.includes("filter-active-strip"));
  assert.ok(articleFilter.includes("filter-result-list"));
  assert.ok(articleFilter.includes("filter-result-link"));
  assert.ok(articleFilter.includes("filter-result-kind"));
  assert.ok(articleFilter.includes("filter-result-icon"));
  assert.ok(articleFilter.includes("filter-result-title"));
  assert.ok(articleFilter.includes("filter-result-summary"));
  assert.ok(articleFilter.includes("filter-status"));
  assert.equal(articleFilter.includes("filter-rail"), false);
  assert.equal(articleFilter.includes("filter-row"), false);
  assert.equal(articleFilter.includes("explorer-grid"), false);
  assert.equal(articleFilter.includes("node-kind"), false);
  assert.equal(articleFilter.includes("<select"), false);
  assert.equal(articleFilter.includes("results-head"), false);
  assert.equal(articleFilter.includes("result-count"), false);
  assert.equal(articleFilter.includes("article-card"), false);
  assert.equal(articleFilter.includes("filter-console-head"), false);
  assert.equal(articleFilter.includes("filter-console-title"), false);
  assert.equal(articleFilter.includes("检索文章"), false);
});

test("filter console and result list keep long text inside lightweight rows", () => {
  assert.match(cssBlock(globalCss, ".filter-console-layout"), /display:\s*grid;/);
  assert.match(cssBlock(globalCss, ".filter-control-grid"), /minmax\(0,\s*15rem\) minmax\(0,\s*13rem\) minmax\(0,\s*17rem\)/);
  assert.match(cssBlock(globalCss, ".filter-control"), /min-width:\s*0;/);
  assert.match(cssBlock(globalCss, ".line-select"), /border:\s*1px solid var\(--site-line\)/);
  assert.match(cssBlock(globalCss, ".filter-result-list"), /display:\s*grid;/);
  assert.match(cssBlock(globalCss, ".filter-result-list"), /auto-fill,\s*minmax\(270px,\s*1fr\)/);
  assert.match(cssBlock(globalCss, ".filter-result-link"), /display:\s*flex;/);
  assert.match(cssBlock(globalCss, ".filter-result-link"), /flex-direction:\s*column;/);
  assert.match(cssBlock(globalCss, ".filter-result-link"), /border:\s*1px solid var\(--site-line\);/);
  assert.match(cssBlock(globalCss, ".filter-result-title"), /overflow-wrap:\s*anywhere;/);
  assert.match(cssBlock(globalCss, ".filter-result-summary"), /overflow-wrap:\s*anywhere;/);
  assert.match(cssBlock(globalCss, ".filter-result-meta"), /min-width:\s*0;/);
  assert.match(cssBlock(globalCss, ".node > div"), /min-width:\s*0;/);
  assert.match(cssBlock(globalCss, ".node-title"), /overflow-wrap:\s*anywhere;/);
  assert.match(cssBlock(globalCss, ".node-summary"), /overflow-wrap:\s*anywhere;/);
  assert.match(cssBlock(globalCss, ".node-meta"), /min-width:\s*0;/);
  assert.match(cssBlock(globalCss, ".line-select"), /font-size:\s*14px;/);
  assert.match(cssBlock(globalCss, ".filter-date-groups"), /gap:\s*20px;/);
  assert.match(cssBlock(globalCss, ".filter-date-group"), /display:\s*grid;/);
  assert.match(cssBlock(globalCss, ".filter-tag"), /text-overflow:\s*ellipsis;/);
  assert.match(cssBlock(globalCss, ".filter-tag-options"), /max-height:\s*14rem;/);
  assert.match(cssBlock(globalCss, ".filter-status"), /position:\s*absolute;/);
});

test("article detail keeps tags once and renders related articles as a linear list", () => {
  assert.ok(articleDetail.includes("article-layout"));
  assert.ok(articleDetail.includes("article-main"));
  assert.ok(articleDetail.includes("article-topbar"));
  assert.ok(articleDetail.includes("article-breadcrumb"));
  assert.ok(articleDetail.includes("article-return-link"));
  assert.ok(articleDetail.includes("article-head"));
  assert.ok(articleDetail.includes("article-meta-line"));
  assert.ok(articleDetail.includes("article-date"));
  assert.ok(articleDetail.includes("article-tags"));
  assert.ok(articleDetail.includes("article-warning"));
  assert.ok(articleDetail.includes("article-side"));
  assert.ok(articleDetail.includes("article-relations"));
  assert.ok(articleDetail.includes("article-relation"));
  assert.ok(articleDetail.includes("article-relation-list"));
  assert.ok(articleDetail.includes("article-relation-link"));
  assert.ok(articleDetail.includes("related-list"));
  assert.ok(articleDetail.includes("related-item"));
  assert.ok(articleDetail.includes("related-index"));
  assert.ok(articleDetail.includes("article-relation-cue"));
  assert.equal(articleDetail.match(/article-tags/g)?.length, 1);
  assert.equal(articleDetail.includes("article-title-row"), false);

  const relatedSection = articleDetail.match(/<section class="article-relation related"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.notEqual(relatedSection, "");
  assert.equal(relatedSection.includes("article-card"), false);
});

test("article detail top path bar spans the reader grid with a return link", () => {
  const topbarBlock = articleDetail.match(/<nav class="article-topbar"[\s\S]*?<\/nav>/)?.[0] ?? "";

  assert.notEqual(topbarBlock, "");
  assert.ok(topbarBlock.includes('aria-label="文章路径"'));
  assert.ok(topbarBlock.includes('class="article-breadcrumb"'));
  assert.ok(topbarBlock.includes('href="/articles/"'));
  assert.ok(topbarBlock.includes("pathSegments.map"));
  assert.ok(topbarBlock.includes("article.data.title"));
  assert.ok(topbarBlock.includes('aria-current="page"'));
  assert.ok(topbarBlock.includes('class="article-return-link"'));
  assert.ok(topbarBlock.includes("← 返回文章列表"));

  assert.match(cssBlock(articlesCss, ".article-topbar"), /grid-column:\s*1 \/ -1;/);
  assert.match(cssBlock(articlesCss, ".article-topbar"), /grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/);
  assert.match(cssBlock(articlesCss, ".article-topbar"), /justify-content:\s*space-between;/);
  assert.match(cssBlock(articlesCss, ".article-topbar"), /border-bottom:\s*1px solid var\(--article-line\);/);
  assert.match(cssBlock(articlesCss, ".article-breadcrumb"), /overflow:\s*hidden;/);
  assert.match(cssBlock(articlesCss, ".article-return-link"), /white-space:\s*nowrap;/);
});

test("article detail aligns with the navigation container and keeps a tight side gap", () => {
  assert.match(
    cssBlock(articlesCss, ".layout-article-page > main"),
    /width:\s*100%;/,
  );
  assert.match(cssBlock(articlesCss, ".layout-article-page > main"), /max-width:\s*80rem;/);
  assert.match(cssBlock(articlesCss, ".layout-article-page > main"), /margin-left:\s*auto;/);
  assert.match(cssBlock(articlesCss, ".layout-article-page > main"), /margin-right:\s*auto;/);
  assert.match(cssBlock(articlesCss, ".article-layout"), /minmax\(170px,\s*220px\) minmax\(0,\s*1fr\)/);
  assert.match(cssBlock(articlesCss, ".article-layout"), /gap:\s*32px;/);
  assert.match(cssBlock(articlesCss, ".article-layout"), /padding:\s*38px 0 88px;/);
  assert.match(cssBlock(articlesCss, ".article-main"), /max-width:\s*none;/);
  assert.match(cssBlock(articlesCss, ".article-main"), /grid-column:\s*2;/);
  assert.match(cssBlock(articlesCss, ".article-side"), /grid-column:\s*1;/);
  assert.match(cssBlock(articlesCss, ".article-side"), /padding-right:\s*24px;/);
  assert.match(cssBlock(articlesCss, ".article-side"), /border-right:\s*1px solid var\(--article-line\);/);
  assert.doesNotMatch(cssBlock(articlesCss, ".article-side"), /border-left:/);
  assert.match(cssBlock(articlesCss, ".article-layout #toc-panel"), /position:\s*sticky;/);
  assert.match(cssBlock(articlesCss, ".article-layout #toc-panel"), /right:\s*auto;/);
  assert.match(cssBlock(articlesCss, ".article-layout #toc-panel"), /width:\s*auto;/);
  assert.match(cssBlock(articlesCss, ".article-title"), /font-size:\s*46px;/);
  assert.doesNotMatch(cssBlock(articlesCss, ".article-title"), /letter-spacing:\s*-/);
  assert.ok(hasCssBlock(articlesCss, ".article-prose", /font-size:\s*18px;/));
  assert.ok(hasCssBlock(articlesCss, ".article-prose", /line-height:\s*1\.78;/));
  assert.ok(hasCssBlock(articlesCss, ".article-prose h2", /font-size:\s*26px;/));
  assert.ok(hasCssBlock(articlesCss, ".article-prose h2", /padding-bottom:\s*0\.5rem;/));
  assert.ok(hasCssBlock(articlesCss, ".article-prose :where(p, li, td, th)", /font-size:\s*inherit;/));
  assert.ok(hasCssBlock(articlesCss, ".article-prose :where(p, li, td, th)", /line-height:\s*inherit;/));

  assert.match(
    articlesCss,
    /@media \(max-width: 1080px\) \{[\s\S]*?\.article-layout\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?padding-inline:\s*0;[\s\S]*?\.article-side\s*\{[\s\S]*?display:\s*none;/,
  );

  assert.match(
    articlesCss,
    /@media \(max-width: 720px\) \{[\s\S]*?\.article-layout\s*\{[\s\S]*?padding:\s*30px 0 56px;/,
  );

  assert.ok(
    cssBlocks(articlesCss, ".article-side").every((block) => !/grid-template-columns:\s*repeat/.test(block)),
  );
});

test("article backlinks render below the article and long lists can scroll", () => {
  assert.ok(articleDetail.includes("article-relations"));
  assert.ok(articleDetail.includes("backlinks-section"));
  assert.ok(articleDetail.includes("backlinks-count"));
  assert.ok(articleDetail.includes("backlink-index"));
  assert.ok(articleDetail.includes("backlink-copy"));
  assert.ok(articleDetail.includes("String(index + 1).padStart(2, \"0\")"));
  assert.equal(articleDetail.includes("↩"), false);
  assert.equal(articleDetail.includes("article-sidecard-badge"), false);
  assert.match(cssBlock(articlesCss, ".side-scroll"), /overflow-y:\s*auto;/);
  assert.match(cssBlock(articlesCss, ".article-relations"), /border-top:\s*1px solid var\(--article-line\);/);
  assert.match(cssBlock(articlesCss, ".backlinks-scroll"), /max-height:\s*16rem;/);
});

test("article sidebar wires backlink rows into the hover preview system", () => {
  const linkSelectorBlock = articleDetail.match(/const linkSelectors = \[[\s\S]*?\];/)?.[0] ?? "";

  assert.ok(linkSelectorBlock.includes('".backlink-link[href]"'));
});

test("article toc active row uses only a short marker without a slab highlight", () => {
  assert.ok(articleDetail.includes('".article-prose h1, .article-prose h2, .article-prose h3, .article-prose h4, .article-prose h5, .article-prose h6"'));
  assert.ok(articleDetail.includes("let currentHeading = headings[0] || null;"));
  assert.doesNotMatch(lastCssBlock(articlesCss, ".toc-link-active"), /border-left:/);
  assert.match(lastCssBlock(articlesCss, ".toc-link-active"), /background:\s*transparent;/);
  assert.match(lastCssBlock(articlesCss, ".toc-link-active"), /box-shadow:\s*none;/);
  assert.doesNotMatch(lastCssBlock(articlesCss, ".toc-link-active"), /text-indent:/);
  assert.match(
    articlesCss,
    /\.toc-link-active::before,\s*\[data-theme="dark"\] \.toc-link-active::before\s*\{[\s\S]*?width:\s*3px;/,
  );
  assert.match(
    articlesCss,
    /\.toc-link-active::before,\s*\[data-theme="dark"\] \.toc-link-active::before\s*\{[\s\S]*?height:\s*12px;/,
  );
  assert.match(
    lastCssBlock(articlesCss, ".toc-item[data-depth=\"0\"] > .toc-item-container > .toc-link"),
    /font-size:\s*15px;/,
  );
});

test("article toc uses the rail height and never shows horizontal scrolling", () => {
  assert.ok(articleDetail.includes("escapeHtmlAttribute"));
  assert.ok(articleDetail.includes('title="${titleText}"'));
  assert.match(cssBlock(articlesCss, ".article-side"), /overflow-x:\s*hidden;/);
  assert.match(cssBlock(articlesCss, ".article-layout #toc-panel"), /min-width:\s*0;/);
  assert.match(lastCssBlock(articlesCss, ".toc-list,\n.backlink-list"), /min-width:\s*0;/);
  assert.match(lastCssBlock(articlesCss, ".toc-item"), /min-width:\s*0;/);
  assert.match(lastCssBlock(articlesCss, ".side-scroll"), /overflow-x:\s*hidden;/);
  assert.match(lastCssBlock(articlesCss, "#toc-content.article-toc-content"), /max-height:\s*calc\(100svh - 170px\);/);
  assert.match(lastCssBlock(articlesCss, "#toc-content.article-toc-content"), /overflow-x:\s*hidden;/);
  assert.match(lastCssBlock(articlesCss, ".toc-link"), /min-width:\s*0;/);
  assert.match(articlesCss, /\.toc-link\s*\{[\s\S]*?white-space:\s*nowrap;/);
  assert.match(articlesCss, /\.toc-link\s*\{[\s\S]*?text-overflow:\s*ellipsis;/);
});

test("article back-to-top button keeps a visible compact arrow", () => {
  assert.match(lastCssBlock(articlesCss, ".article-back-to-top"), /width:\s*44px;/);
  assert.match(lastCssBlock(articlesCss, ".article-back-to-top"), /height:\s*44px;/);
  assert.match(lastCssBlock(articlesCss, ".article-back-to-top svg"), /width:\s*18px;/);
  assert.match(lastCssBlock(articlesCss, ".article-back-to-top svg"), /stroke:\s*currentColor;/);
});

test("article dark prose separates body copy from link and code highlights", () => {
  assert.match(
    cssBlock(articlesCss, '[data-theme="dark"]'),
    /--article-body:\s*color-mix\(in oklab,\s*var\(--site-ink\) 88%,\s*var\(--site-bg\)\);/,
  );
  assert.match(
    lastCssBlock(articlesCss, ".article-prose :where(p, li, td, th)"),
    /color:\s*var\(--article-body\);/,
  );
  assert.match(
    lastCssBlock(articlesCss, ".article-prose :where(strong, b)"),
    /color:\s*var\(--article-ink\);/,
  );
  assert.match(
    articlesCss,
    /\.article-prose a,\s*\.article-preview-link\s*\{[\s\S]*?color:\s*var\(--article-ink\);/,
  );
  assert.match(
    articlesCss,
    /\.article-prose a,\s*\.article-preview-link\s*\{[\s\S]*?text-decoration-line:\s*underline;/,
  );
  assert.match(
    articlesCss,
    /\.article-prose a,\s*\.article-preview-link\s*\{[\s\S]*?text-decoration-thickness:\s*1\.5px;/,
  );
  assert.match(
    articlesCss,
    /\.article-prose a,\s*\.article-preview-link\s*\{[\s\S]*?text-underline-offset:\s*0\.18em;/,
  );
  assert.match(
    articlesCss,
    /\.article-prose a,\s*\.article-preview-link\s*\{[\s\S]*?border-bottom:\s*0;/,
  );
  assert.match(
    articlesCss,
    /\[data-theme="dark"\] \.article-prose a,\s*\[data-theme="dark"\] \.article-preview-link\s*\{[\s\S]*?color:\s*var\(--article-ink\);/,
  );
  assert.match(
    articlesCss,
    /\[data-theme="dark"\] \.article-prose a,\s*\[data-theme="dark"\] \.article-preview-link\s*\{[\s\S]*?text-decoration-color:\s*color-mix\(in oklab,\s*var\(--article-ink\) 72%,\s*transparent\);/,
  );
  assert.match(lastCssBlock(articlesCss, ".article-prose :not(pre) > code"), /background:\s*var\(--article-soft-strong\);/);
  assert.match(lastCssBlock(articlesCss, ".article-prose :not(pre) > code"), /border:\s*0;/);
  assert.match(lastCssBlock(articlesCss, ".article-prose :not(pre) > code"), /border-radius:\s*0\.28rem;/);
  assert.match(lastCssBlock(articlesCss, ".article-prose :not(pre) > code"), /font-weight:\s*650;/);
});

test("article prose follows shadcn-style typography rhythm", () => {
  assert.match(
    lastCssBlock(articlesCss, ".article-prose :where(h1, h2, h3, h4, h5, h6)"),
    /scroll-margin-top:\s*7rem;/,
  );
  assert.match(
    lastCssBlock(articlesCss, ".article-prose :where(h1, h2, h3, h4, h5, h6)"),
    /text-wrap:\s*balance;/,
  );
  assert.match(lastCssBlock(articlesCss, ".article-prose :where(p, ul, ol, blockquote, .table-container, .code-block-container)"), /margin-top:\s*1\.5rem;/);
  assert.match(lastCssBlock(articlesCss, ".article-prose blockquote"), /padding:\s*0 0 0 1\.5rem;/);
  assert.match(lastCssBlock(articlesCss, ".article-prose blockquote"), /font-style:\s*italic;/);
  assert.match(lastCssBlock(articlesCss, ".article-prose :where(ul, ol) li"), /margin-top:\s*0\.5rem;/);
  assert.match(lastCssBlock(articlesCss, ".article-prose .table-container"), /overflow-x:\s*auto;/);
  assert.match(lastCssBlock(articlesCss, ".article-prose tbody td"), /white-space:\s*normal;/);
});

test("article inline code uses muted shadcn-like pills", () => {
  const inlineCodeBlock = lastCssBlock(articlesCss, ".article-prose :not(pre) > code");

  assert.match(inlineCodeBlock, /position:\s*relative;/);
  assert.match(inlineCodeBlock, /padding:\s*0\.2rem 0\.3rem;/);
  assert.match(inlineCodeBlock, /border:\s*0;/);
  assert.match(inlineCodeBlock, /border-radius:\s*0\.28rem;/);
  assert.match(inlineCodeBlock, /background:\s*var\(--article-soft-strong\);/);
  assert.match(inlineCodeBlock, /font-size:\s*0\.875em;/);
  assert.match(inlineCodeBlock, /font-weight:\s*650;/);
  assert.match(inlineCodeBlock, /overflow-wrap:\s*anywhere;/);
  assert.doesNotMatch(articlesCodeCss, /(^|\n)\s*code,\s*\n\s*pre,/);
});

test("article code blocks use a shadcn-like muted surface", () => {
  assert.match(cssBlock(articlesCss, ".code-block-container"), /border-radius:\s*0\.6rem;/);
  assert.match(cssBlock(articlesCss, ".code-block-container"), /background:\s*var\(--article-soft\);/);
  assert.match(lastCssBlock(articlesCss, '[data-theme="dark"] .code-block-container'), /background:\s*var\(--article-soft\);/);

  assert.match(
    articlesCss,
    /\.code-block-header,\s*\[data-theme="dark"\] \.code-block-header,\s*\.line-numbers-container,\s*\[data-theme="dark"\] \.line-numbers-container\s*\{[\s\S]*?background:\s*var\(--article-soft-strong\);/,
  );
  assert.match(lastCssBlock(articlesCss, ".code-block-header"), /padding:\s*0\.55rem 0\.7rem;/);
  assert.match(
    articlesCss,
    /\.code-block-content pre,\s*\.code-block-content pre code,[\s\S]*?\[data-theme="dark"\] \.code-block-content pre\.shiki\s*\{[\s\S]*?background-color:\s*transparent !important;/,
  );
});

test("article detail secondary text remains readable instead of hazy", () => {
  assert.match(lastCssBlock(articlesCss, ".article-topbar"), /color:\s*var\(--article-ink\);/);
  assert.match(lastCssBlock(articlesCss, ".article-breadcrumb"), /color:\s*inherit;/);
  assert.match(lastCssBlock(articlesCss, ".article-return-link"), /color:\s*inherit;/);

  assert.match(lastCssBlock(articlesCss, ".article-date"), /color:\s*var\(--article-body\);/);
  assert.match(lastCssBlock(articlesCss, ".article-tags"), /color:\s*var\(--article-body\);/);
  assert.match(lastCssBlock(articlesCss, ".article-tag"), /color:\s*var\(--article-body\);/);
  assert.ok(hasCssBlock(articlesCss, ".article-warning", /color:\s*var\(--article-body\);/));
  assert.match(
    articlesCss,
    /\.toc-list,\s*\.backlink-list\s*\{[\s\S]*?color:\s*var\(--article-muted\);/,
  );
  assert.match(
    articlesCss,
    /\.backlink-copy span,\s*\.article-relation-date,\s*\.backlinks-more,\s*\.backlinks-empty\s*\{[\s\S]*?color:\s*var\(--article-muted\);/,
  );
  assert.match(lastCssBlock(articlesCss, ".article-relation-copy strong"), /color:\s*var\(--article-ink\);/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-link:hover,\n.article-relation-link.is-preview-active"), /border-bottom-color:\s*var\(--article-line-strong\);/);
  assert.doesNotMatch(lastCssBlock(articlesCss, ".article-relation-link:hover,\n.article-relation-link.is-preview-active"), /background:\s*var\(--article-soft\);/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-copy strong"), /font-size:\s*15px;/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-copy strong"), /font-weight:\s*650;/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-copy span"), /color:\s*var\(--article-body\);/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-copy span"), /font-size:\s*12px;/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-date"), /color:\s*var\(--article-muted\);/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-index"), /color:\s*var\(--article-muted\);/);
});

test("timeline page exists and avoids heavy archive explanation blocks", () => {
  assert.equal(existsSync(timelinePath), true);
  assert.equal(existsSync(oldTimelinePath), false);
  assert.ok(timelinePage.includes("timeline-layout"));
  assert.ok(timelinePage.includes("year-index"));
  assert.ok(timelinePage.includes("timeline-year-strip"));
  assert.ok(timelinePage.includes("timeline-main"));
  assert.ok(timelinePage.includes("timeline-river"));
  assert.ok(timelinePage.includes("month-group"));
  assert.ok(timelinePage.includes("timeline-item"));
  assert.ok(timelinePage.includes("timeline-icon"));
  assert.equal(timelinePage.includes('aria-label="时间线路径"'), false);
  assert.equal(timelinePage.includes('<div class="pathbar">'), false);
  assert.match(cssBlock(globalCss, ".timeline-layout"), /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(cssBlock(globalCss, ".timeline-year-strip"), /position:\s*sticky/);
  assert.match(cssBlock(globalCss, ".timeline-river::before"), /left:\s*190px;/);
  assert.match(cssBlock(globalCss, ".timeline-year-heading"), /grid-template-columns:\s*150px minmax\(0,\s*1fr\)/);
  assert.match(cssBlock(globalCss, ".timeline-year-heading"), /gap:\s*80px;/);
  assert.match(cssBlock(globalCss, ".month-group"), /grid-template-columns:\s*150px minmax\(0,\s*1fr\)/);
  assert.match(cssBlock(globalCss, ".month-group"), /gap:\s*80px;/);
  assert.match(cssBlock(globalCss, ".timeline-year-links a"), /min-width:\s*5\.3rem;/);
  assert.ok(hasCssBlock(globalCss, ".timeline-year-links a", /min-width:\s*5\.75rem;/));
  assert.equal(cssBlock(globalCss, ".timeline-year-heading::after").trim(), "");
  assert.equal(cssBlock(globalCss, ".timeline-list::before").trim(), "");
  assert.ok(timelinePage.includes("data-timeline-year-link"));
  assert.ok(timelinePage.includes("data-timeline-year-section"));
  assert.ok(timelinePage.includes("aria-current"));
  assert.ok(timelinePage.includes("IntersectionObserver"));
  assert.ok(timelinePage.includes("timeline-year-index"));
  assert.equal(timelinePage.includes("inspector"), false);
  assert.equal(timelinePage.includes("归档规则"), false);
});
