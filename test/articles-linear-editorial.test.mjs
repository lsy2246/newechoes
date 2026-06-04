import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const normalizeNewlines = (source) => source.replace(/\r\n/g, "\n");

const globalCss = normalizeNewlines(readFileSync("src/styles/global.css", "utf8"));
const articlesCss = normalizeNewlines(readFileSync("src/styles/articles.css", "utf8"));
const articlesCodeCss = normalizeNewlines(readFileSync("src/styles/articles-code.css", "utf8"));
const articlesMermaidCss = normalizeNewlines(readFileSync("src/styles/articles-mermaid.css", "utf8"));
const articleIndex = readFileSync("src/pages/articles/index.astro", "utf8");
const articleDirectoryRoute = readFileSync("src/pages/articles/[...path].astro", "utf8");
const articleDetail = readFileSync("src/pages/articles/[...id].astro", "utf8");
const filteredPage = readFileSync("src/pages/filtered.astro", "utf8");
const articleFilter = readFileSync("src/components/ArticleFilter.tsx", "utf8");
const layoutSource = readFileSync("src/components/Layout.astro", "utf8");
const aboutPage = readFileSync("src/pages/about.astro", "utf8");
const countdown = readFileSync("src/components/Countdown.tsx", "utf8");
const constsSource = readFileSync("src/consts.ts", "utf8");
const articleHistorySource = readFileSync("src/lib/article-history/shared.js", "utf8");
const articleLinksSource = readFileSync("src/lib/article-links.ts", "utf8");
const timelinePath = "src/pages/timeline.astro";
const oldTimelinePath = "src/pages/articles/timeline.astro";
const timelinePage = existsSync(timelinePath)
  ? readFileSync(timelinePath, "utf8")
  : "";
const swupInit = readFileSync("src/lib/navigation/swup-init.js", "utf8");

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
const selectorRulePattern = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\n)${escaped}\\s*\\{`);
};

test("article surfaces use the graphite dark palette instead of pure black", () => {
  assert.match(cssBlock(globalCss, '[data-theme="dark"]'), /--site-bg:\s*#111315;/);
  assert.match(cssBlock(globalCss, '[data-theme="dark"]'), /--site-ink:\s*#f5f7fa;/);
  assert.match(cssBlock(globalCss, '[data-theme="dark"] .layout-directory-page'), /var\(--site-bg\)/);
  assert.match(cssBlock(articlesCss, '[data-theme="dark"]'), /--article-bg:\s*var\(--site-bg\);/);
  assert.match(cssBlock(articlesCss, '[data-theme="dark"]'), /--article-warning:\s*var\(--site-warning\);/);
});

test("grid and filter views use the same lightweight explorer node language", () => {
  assert.match(cssBlock(globalCss, ".article-index-shell"), /padding:\s*0;/);
  assert.match(cssBlock(globalCss, ".browser"), /display:\s*grid;/);
  assert.match(cssBlock(globalCss, ".browser"), /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(cssBlock(globalCss, ".browser"), /gap:\s*32px;/);
  assert.match(cssBlock(globalCss, ".browser"), /padding:\s*38px 0 88px;/);
  assert.equal(globalCss.includes(".browser-nested"), false);
  assert.match(cssBlock(globalCss, ".article-index-topbar"), /grid-column:\s*1 \/ -1;/);
  assert.match(cssBlock(globalCss, ".browser > #article-content"), /min-width:\s*0;/);
  assert.doesNotMatch(cssBlock(globalCss, ".browser > #article-content"), /grid-column:\s*2;/);
  assert.match(cssBlock(globalCss, ".explorer-grid"), /auto-fill,\s*minmax\(230px,\s*1fr\)/);
  assert.doesNotMatch(cssBlock(globalCss, ".explorer-grid"), /padding-top:/);
  assert.doesNotMatch(globalCss, selectorRulePattern(".node"));
  assert.match(cssBlock(globalCss, ".explorer-grid .node"), /grid-template-columns:\s*40px minmax\(0,\s*1fr\)/);
  assert.match(cssBlock(globalCss, ".explorer-grid .node"), /min-height:\s*136px;/);
  assert.match(cssBlock(globalCss, ".explorer-grid .node"), /border:\s*1px solid var\(--site-line\);/);
  assert.match(cssBlock(globalCss, ".explorer-grid .node"), /border-radius:\s*6px;/);
  assert.match(cssBlock(globalCss, ".explorer-grid .node-kind"), /position:\s*absolute;/);

  assert.ok(articleIndex.includes("article-topbar"));
  assert.ok(articleIndex.includes('import "@/styles/articles.css";'));
  assert.equal(articleIndex.includes("browser-nested"), false);
  assert.ok(articleIndex.includes("article-index-topbar"));
  assert.ok(articleIndex.includes("article-breadcrumb"));
  assert.ok(articleIndex.includes('aria-current="page"'));
  assert.equal(articleIndex.includes('<div class="pathbar">'), false);
  assert.equal(articleIndex.includes('class="path"'), false);
  assert.match(cssBlock(globalCss, ".article-index-topbar"), /grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/);
  assert.match(cssBlock(globalCss, ".article-index-topbar"), /border-bottom:\s*1px solid var\(--site-line\);/);
  assert.match(cssBlock(globalCss, ".article-index-topbar .article-breadcrumb"), /overflow:\s*hidden;/);
  assert.match(
    globalCss,
    /@media \(max-width: 1080px\) \{[\s\S]*?\.browser,\s*\.filter-layout,\s*\.timeline-layout\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\.article-index-topbar\s*\{[\s\S]*?grid-column:\s*1;/,
  );
  assert.match(
    globalCss,
    /@media \(max-width: 720px\) \{[\s\S]*?\.browser\s*\{[\s\S]*?padding:\s*30px 0 56px;/,
  );
  assert.ok(articleIndex.includes("explorer-grid"));
  assert.ok(articleIndex.includes("node-kind"));
  assert.ok(articleIndex.includes("node-icon"));
  assert.ok(articleIndex.includes("node-title"));
  assert.ok(articleIndex.includes("node-summary"));
  assert.ok(articleIndex.includes("node-meta"));
  assert.ok(articleIndex.includes("data-article-detail-link"));
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
  assert.match(cssBlock(globalCss, ".explorer-grid .node > div"), /min-width:\s*0;/);
  assert.match(cssBlock(globalCss, ".explorer-grid .node-title"), /overflow-wrap:\s*anywhere;/);
  assert.match(cssBlock(globalCss, ".explorer-grid .node-summary"), /overflow-wrap:\s*anywhere;/);
  assert.match(cssBlock(globalCss, ".explorer-grid .node-meta"), /min-width:\s*0;/);
  assert.match(cssBlock(globalCss, ".line-select"), /font-size:\s*var\(--type-ui\);/);
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
  assert.ok(articleDetail.includes("article-history"));
  assert.ok(articleDetail.includes("article-history-list"));
  assert.ok(articleDetail.includes("article-history-version"));
  assert.ok(articleDetail.includes("article-history-hash"));
  assert.ok(articleDetail.includes("article-history-snapshot"));
  assert.ok(articleDetail.includes("articleIdentity"));
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

test("article history keeps the snapshot link under the hash", () => {
  const historyItem =
    articleDetail.match(/<li class:list=\{\["article-history-item"[\s\S]*?<\/li>/)?.[0] ??
    "";

  assert.notEqual(historyItem, "");
  assert.ok(historyItem.includes('class="article-history-version"'));
  assert.ok(historyItem.indexOf('class="article-history-version"') < historyItem.indexOf('class="article-history-copy"'));

  const versionBlock =
    historyItem.match(/<span class="article-history-version">[\s\S]*?<\/span>\s*<span class="article-history-copy">/)?.[0] ??
    "";

  assert.notEqual(versionBlock, "");
  assert.ok(versionBlock.includes("article-history-hash"));
  assert.ok(versionBlock.includes("article-history-snapshot"));
  assert.ok(versionBlock.includes("历史快照"));
  assert.equal(versionBlock.includes("文件快照"), false);
  assert.match(cssBlock(articlesCss, ".article-history-hash,\n.article-history-snapshot"), /text-decoration-line:\s*underline;/);
  assert.match(cssBlock(articlesCss, ".article-history-hash,\n.article-history-snapshot"), /text-decoration-color:\s*var\(--article-line-strong\);/);
});

test("article history heading is localized and related reading has no extra top rule", () => {
  const historyHead = articleDetail.match(/<div class="article-history-head">[\s\S]*?<\/div>/)?.[0] ?? "";

  assert.notEqual(historyHead, "");
  assert.ok(historyHead.includes("<h2>历史版本</h2>"));
  assert.equal(historyHead.includes("<h2>History</h2>"), false);
  assert.doesNotMatch(cssBlock(articlesCss, ".article-relations"), /border-top:/);
});

test("article history move paths are displayed relative to content root", () => {
  assert.ok(articleDetail.includes("formatArticleHistoryPath(event.previousPath)"));
  assert.ok(articleDetail.includes("formatArticleHistoryPath(event.currentPath)"));
  assert.ok(timelinePage.includes("formatArticleHistoryPath(event.previousPath)"));
  assert.ok(timelinePage.includes("formatArticleHistoryPath(event.currentPath)"));
});

test("article history external links are controlled by a source repository config", () => {
  assert.match(constsSource, /export const SOURCE_REPOSITORY_CONFIG\s*=/);
  assert.match(constsSource, /url:\s*"https:\/\/github\.com\/lsy2246\/newechoes"/);
  assert.match(constsSource, /provider:\s*"github"/);
  assert.doesNotMatch(constsSource, /provider:\s*"auto"/);
  assert.ok(articleDetail.includes("SOURCE_REPOSITORY_CONFIG"));
  assert.ok(articleDetail.includes("getArticleHistory(article, SOURCE_REPOSITORY_CONFIG)"));
  assert.ok(timelinePage.includes("SOURCE_REPOSITORY_CONFIG"));
  assert.ok(timelinePage.includes("getArticleHistoryMap(articles, SOURCE_REPOSITORY_CONFIG)"));
  assert.ok(articleHistorySource.includes("repositoryConfig = {}"));
  assert.ok(articleHistorySource.includes("repositoryProvider"));
  assert.equal(articleHistorySource.includes('repositoryProvider = "auto"'), false);
  assert.equal(articleHistorySource.includes("readRepositoryUrl()"), false);
});

test("article pages expose git updated time for filter indexing", () => {
  assert.ok(articleDetail.includes("updatedDate={articleHistory.updatedAt ?? undefined}"));
  assert.ok(articleDetail.includes("articleHistory.updatedAt && ("));
  assert.ok(articleDetail.includes("article-updated-date"));
  assert.ok(layoutSource.includes("updatedDate?: Date"));
  assert.ok(layoutSource.includes('property="article:modified_time"'));
  assert.ok(layoutSource.includes("updatedDate.toISOString()"));
  assert.ok(filteredPage.includes("articleUpdatedAt"));
  assert.ok(filteredPage.includes("getArticleHistoryMap"));
  assert.ok(filteredPage.includes("getCanonicalArticleUrl(articleIdentity)"));
});

test("article expiry warning prefers updated time and uses matching copy", () => {
  assert.ok(articleDetail.includes("const articleWarningDate = articleHistory.updatedAt ?? article.data.date;"));
  assert.ok(articleDetail.includes("(currentDate.getTime() - articleWarningDate.getTime())"));
  assert.match(
    constsSource,
    /warningMessage:\s*'这篇文章最近一次更新距离现在已经超过一年了，内容可能已经过时，请谨慎参考。'/,
  );
});

test("article detail routes are generated only from title identities", () => {
  const articleRouteVariantsBlock =
    articleLinksSource.match(/export function getArticleRouteVariants[\s\S]*?\r?\n}\r?\n/)?.[0] ?? "";

  assert.ok(articleDetail.includes("params: { id: resolveArticleIdentity(article) }"));
  assert.equal(articleDetail.includes("possiblePaths"), false);
  assert.equal(articleDetail.includes("originalId"), false);
  assert.equal(articleDetail.includes("getSpecialPath(article.id)"), false);
  assert.notEqual(articleRouteVariantsBlock, "");
  assert.equal(articleRouteVariantsBlock.includes("getSpecialPath"), false);
  assert.ok(articleLinksSource.includes("getArticleReferenceVariants"));
  assert.ok(articleIndex.includes("resolveArticleIdentity"));
  assert.ok(articleIndex.includes("getArticleHref(article)"));
  assert.ok(timelinePage.includes("getArticleUrl(article)"));
  assert.equal(timelinePage.includes("getArticleUrl(article.id)"), false);
});

test("article detail top path bar spans the reader grid with a return link", () => {
  const topbarBlock = articleDetail.match(/<nav class="article-topbar"[\s\S]*?<\/nav>/)?.[0] ?? "";
  const topbarIndex = articleDetail.indexOf('<nav class="article-topbar"');
  const articleContentIndex = articleDetail.indexOf('id="article-content"');

  assert.notEqual(topbarBlock, "");
  assert.ok(topbarIndex >= 0);
  assert.ok(articleContentIndex >= 0);
  assert.ok(topbarIndex < articleContentIndex);
  assert.ok(topbarBlock.includes('aria-label="文章路径"'));
  assert.ok(topbarBlock.includes('class="article-breadcrumb"'));
  assert.ok(topbarBlock.includes('href="/articles"'));
  assert.ok(topbarBlock.includes("data-article-directory-link"));
  assert.ok(topbarBlock.includes("pathSegments.map"));
  assert.ok(topbarBlock.includes("article.data.title"));
  assert.ok(topbarBlock.includes('aria-current="page"'));
  assert.ok(topbarBlock.includes('class="article-return-link"'));
  assert.ok(topbarBlock.includes("← 返回文章列表"));
  assert.equal(articleDetail.includes("article-same-path:before-replace"), false);

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
  assert.ok(hasCssBlock(articlesCss, ".article-shell", /display:\s*grid;/));
  assert.ok(hasCssBlock(articlesCss, ".article-shell", /gap:\s*32px;/));
  assert.ok(hasCssBlock(articlesCss, ".article-shell", /padding:\s*38px 0 88px;/));
  assert.match(cssBlock(articlesCss, ".article-shell.article-shell-preview"), /padding:\s*0;/);
  assert.match(cssBlock(articlesCss, ".article-layout"), /minmax\(170px,\s*220px\) minmax\(0,\s*1fr\)/);
  assert.match(cssBlock(articlesCss, ".article-layout"), /gap:\s*32px;/);
  assert.match(cssBlock(articlesCss, ".article-layout"), /padding:\s*0;/);
  assert.match(cssBlock(articlesCss, ".article-main"), /max-width:\s*none;/);
  assert.match(cssBlock(articlesCss, ".article-main"), /grid-column:\s*2;/);
  assert.match(cssBlock(articlesCss, ".article-side"), /grid-column:\s*1;/);
  assert.match(cssBlock(articlesCss, ".article-side"), /grid-row:\s*1;/);
  assert.match(cssBlock(articlesCss, ".article-side"), /padding-right:\s*24px;/);
  assert.match(cssBlock(articlesCss, ".article-side"), /border-right:\s*1px solid var\(--article-line\);/);
  assert.doesNotMatch(cssBlock(articlesCss, ".article-side"), /border-left:/);
  assert.match(cssBlock(articlesCss, ".article-layout #toc-panel"), /position:\s*sticky;/);
  assert.match(cssBlock(articlesCss, ".article-layout #toc-panel"), /right:\s*auto;/);
  assert.match(cssBlock(articlesCss, ".article-layout #toc-panel"), /width:\s*auto;/);
  assert.match(cssBlock(articlesCss, ".article-title"), /font-size:\s*var\(--type-article-title\);/);
  assert.doesNotMatch(cssBlock(articlesCss, ".article-title"), /letter-spacing:\s*-/);
  assert.ok(hasCssBlock(articlesCss, ".article-prose", /font-size:\s*var\(--type-reader-body\);/));
  assert.ok(hasCssBlock(articlesCss, ".article-prose", /line-height:\s*1\.74;/));
  assert.ok(hasCssBlock(articlesCss, ".article-prose h2", /font-size:\s*var\(--type-reader-h2\);/));
  assert.ok(hasCssBlock(articlesCss, ".article-prose h2", /padding-bottom:\s*0\.5rem;/));
  assert.ok(hasCssBlock(articlesCss, ".article-prose :where(p, li, td, th)", /font-size:\s*inherit;/));
  assert.ok(hasCssBlock(articlesCss, ".article-prose :where(p, li, td, th)", /line-height:\s*inherit;/));

  assert.match(
    articlesCss,
    /@media \(max-width: 1080px\) \{[\s\S]*?\.article-layout\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?padding-inline:\s*0;[\s\S]*?\.article-side\s*\{[\s\S]*?display:\s*none;/,
  );

  assert.match(
    articlesCss,
    /@media \(max-width: 720px\) \{[\s\S]*?\.article-shell\s*\{[\s\S]*?padding:\s*30px 0 56px;[\s\S]*?\.article-layout\s*\{[\s\S]*?padding:\s*0;/,
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
  assert.doesNotMatch(cssBlock(articlesCss, ".article-relations"), /border-top:/);
  assert.match(cssBlock(articlesCss, ".backlinks-scroll"), /max-height:\s*16rem;/);
});

test("article detail keeps internal links canonical without hover previews", () => {
  assert.ok(articleDetail.includes("setupArticleReferenceLinks"));
  assert.ok(articleDetail.includes("data-article-link-index"));
  assert.equal(articleDetail.includes("setupArticleLinkPreviews"), false);
  assert.equal(articleDetail.includes("data-article-preview-index"), false);
  assert.equal(articleDetail.includes("article-link-preview"), false);
  assert.equal(articleDetail.includes("article-preview-link"), false);
  assert.equal(articleDetail.includes("is-preview-active"), false);
  assert.equal(articleDetail.includes("HTMLIFrameElement"), false);
  assert.equal(articleDetail.includes("mouseenter"), false);
  assert.equal(articlesCss.includes(".article-link-preview"), false);
  assert.equal(articlesCss.includes(".article-preview-link"), false);
  assert.equal(articlesCss.includes("is-preview-active"), false);
});

test("article links share a restrained text interaction system", () => {
  assert.match(cssBlock(articlesCss, ":root"), /--article-interactive-ink:\s*var\(--article-ink\);/);
  assert.match(cssBlock(articlesCss, ":root"), /--article-interactive-line:/);
  assert.match(cssBlock(articlesCss, ":root"), /--article-interactive-hover:\s*var\(--article-signal\);/);
  assert.match(cssBlock(articlesCss, ":root"), /--article-interactive-active:/);
  assert.match(cssBlock(articlesCss, ":root"), /--article-interactive-focus:/);

  const proseLink = cssBlock(articlesCss, ".article-prose a");
  assert.match(proseLink, /color:\s*var\(--article-interactive-ink\);/);
  assert.match(proseLink, /text-decoration-color:\s*var\(--article-interactive-line\);/);
  assert.match(proseLink, /transition:/);

  assert.match(cssBlock(articlesCss, ".article-prose a:hover"), /color:\s*var\(--article-interactive-hover\);/);
  assert.match(cssBlock(articlesCss, ".article-prose a:hover"), /text-decoration-color:\s*var\(--article-interactive-hover\);/);
  assert.match(cssBlock(articlesCss, ".article-prose a:active"), /color:\s*var\(--article-interactive-active\);/);
  assert.match(cssBlock(articlesCss, ".article-prose a:active"), /text-decoration-thickness:\s*2px;/);
  assert.match(cssBlock(articlesCss, ".article-prose a:focus-visible"), /outline:\s*2px solid var\(--article-interactive-focus\);/);
  assert.match(cssBlock(articlesCss, ".article-prose a:focus-visible"), /outline-offset:\s*3px;/);
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
    /font-size:\s*var\(--type-body\);/,
  );
});

test("global typography tokens drive secondary pages and countdown UI", () => {
  assert.match(cssBlock(globalCss, ":root"), /--type-page-title:\s*1\.375rem;/);
  assert.match(cssBlock(globalCss, ":root"), /--type-reader-body:\s*1rem;/);
  assert.match(cssBlock(globalCss, ".about-section-title"), /font-size:\s*var\(--type-page-title\);/);
  assert.match(cssBlock(globalCss, ".countdown-value"), /font-size:\s*var\(--type-display\);/);
  assert.match(cssBlock(globalCss, ".countdown-label"), /font-size:\s*var\(--type-meta\);/);
  assert.ok(aboutPage.includes("about-section-title"));
  assert.ok(aboutPage.includes("about-countdown-panel"));
  assert.ok(countdown.includes("countdown-value"));
  assert.ok(countdown.includes("countdown-label"));
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
  assert.match(cssBlock(articlesCss, ".article-prose a"), /color:\s*var\(--article-interactive-ink\);/);
  assert.match(cssBlock(articlesCss, ".article-prose a"), /text-decoration-line:\s*underline;/);
  assert.match(cssBlock(articlesCss, ".article-prose a"), /text-decoration-thickness:\s*1\.5px;/);
  assert.match(cssBlock(articlesCss, ".article-prose a"), /text-underline-offset:\s*0\.18em;/);
  assert.match(cssBlock(articlesCss, ".article-prose a"), /border-bottom:\s*0;/);
  assert.match(lastCssBlock(articlesCss, '[data-theme="dark"] .article-prose a'), /color:\s*var\(--article-interactive-ink\);/);
  assert.match(
    lastCssBlock(articlesCss, '[data-theme="dark"] .article-prose a'),
    /text-decoration-color:\s*color-mix\(in oklab,\s*var\(--article-ink\) 72%,\s*transparent\);/,
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
  assert.match(cssBlock(articlesCss, ".code-block-container"), /position:\s*relative;/);
  assert.doesNotMatch(lastCssBlock(articlesCss, ".code-block-content"), /padding-top:/);
  assert.match(lastCssBlock(articlesCss, ".code-block-lang"), /display:\s*none !important;/);
  assert.match(lastCssBlock(articlesCss, ".line-numbers-container"), /display:\s*grid;/);
  assert.match(lastCssBlock(articlesCss, ".line-numbers-container"), /align-content:\s*start;/);
  assert.match(lastCssBlock(articlesCss, ".code-block-copy"), /position:\s*absolute;/);
  assert.match(lastCssBlock(articlesCss, ".code-block-copy"), /opacity:\s*0;/);
  assert.match(articlesCss, /\.code-block-container:hover \.code-block-copy[\s\S]*?opacity:\s*1;/);
  assert.match(lastCssBlock(articlesCss, ".line-numbers-container"), /background:\s*transparent;/);
  assert.match(
    articlesCss,
    /\.code-block-content pre,\s*\.code-block-content pre code,[\s\S]*?\[data-theme="dark"\] \.code-block-content pre\.shiki\s*\{[\s\S]*?background-color:\s*transparent !important;/,
  );
});

test("article detail normalizes legacy code block markup before wiring copy interactions", () => {
  assert.ok(articleDetail.includes("function normalizeLegacyCodeBlocks()"));
  assert.ok(articleDetail.includes('const legacyHeader = container.querySelector(":scope > .code-block-header")'));
  assert.ok(articleDetail.includes('const content = container.querySelector(":scope > .code-block-content")'));
  assert.ok(articleDetail.includes("language.remove();"));
  assert.ok(articleDetail.includes("legacyHeader.remove();"));
  assert.ok(articleDetail.includes("normalizeLegacyCodeBlocks();"));
  assert.ok(articleDetail.indexOf("normalizeLegacyCodeBlocks();") < articleDetail.indexOf("setupCodeCopy();"));
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
  assert.ok(hasCssBlock(articlesCss, ".article-relation-copy strong", /color:\s*var\(--article-ink\);/));
  assert.match(lastCssBlock(articlesCss, ".article-relation-link:hover"), /border-bottom-color:\s*var\(--article-interactive-hover\);/);
  assert.doesNotMatch(lastCssBlock(articlesCss, ".article-relation-link:hover"), /background:\s*var\(--article-soft\);/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-link:hover .article-relation-copy strong"), /color:\s*var\(--article-interactive-hover\);/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-link:active .article-relation-copy strong"), /color:\s*var\(--article-interactive-active\);/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-link:focus-visible"), /outline:\s*2px solid var\(--article-interactive-focus\);/);
  assert.match(lastCssBlock(articlesCss, ".article-history-hash[href]:active,\n.article-history-snapshot:active"), /color:\s*var\(--article-interactive-active\);/);
  assert.ok(hasCssBlock(articlesCss, ".article-relation-copy strong", /font-size:\s*var\(--type-body\);/));
  assert.ok(hasCssBlock(articlesCss, ".article-relation-copy strong", /font-weight:\s*var\(--weight-strong\);/));
  assert.match(lastCssBlock(articlesCss, ".article-relation-copy span"), /color:\s*var\(--article-body\);/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-copy span"), /font-size:\s*var\(--type-meta\);/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-date"), /color:\s*var\(--article-muted\);/);
  assert.match(lastCssBlock(articlesCss, ".article-relation-index"), /color:\s*var\(--article-muted\);/);
});

test("article mermaid diagrams do not inherit explorer node hover or crop at svg bounds", () => {
  assert.match(cssBlock(articlesMermaidCss, ".article-prose pre.mermaid"), /overflow-x:\s*auto;/);
  assert.match(cssBlock(articlesMermaidCss, ".article-prose pre.mermaid"), /overflow-y:\s*visible;/);
  assert.match(cssBlock(articlesMermaidCss, ".article-prose pre.mermaid"), /scrollbar-gutter:\s*stable;/);
  assert.match(cssBlock(articlesMermaidCss, ".article-prose pre.mermaid svg"), /max-width:\s*none !important;/);
  assert.match(cssBlock(articlesMermaidCss, ".article-prose pre.mermaid svg"), /overflow:\s*visible !important;/);
  assert.doesNotMatch(globalCss, selectorRulePattern(".node:hover"));
  assert.match(cssBlock(globalCss, ".explorer-grid .node:hover"), /transform:\s*translateY\(-1px\);/);
});

test("timeline page exists and avoids heavy archive explanation blocks", () => {
  assert.equal(existsSync(timelinePath), true);
  assert.equal(existsSync(oldTimelinePath), false);
  assert.ok(timelinePage.includes("timeline-layout"));
  assert.ok(timelinePage.includes("timeline-view-switch"));
  assert.ok(timelinePage.includes("timeline-panel-published"));
  assert.ok(timelinePage.includes("timeline-panel-revisions"));
  assert.ok(timelinePage.includes("revisionGroups"));
  assert.ok(timelinePage.includes("revisionCommitGroups"));
  assert.ok(timelinePage.includes("revision-commit-group"));
  assert.ok(timelinePage.includes("revision-commit-head"));
  assert.ok(timelinePage.includes("revision-article-list"));
  assert.ok(timelinePage.includes("revision-article-item"));
  assert.ok(timelinePage.includes("getArticleHistoryMap"));
  assert.ok(timelinePage.includes("commit.commitUrl"));
  assert.ok(timelinePage.includes("event.snapshotUrl"));
  assert.ok(timelinePage.includes("data-timeline-view"));
  assert.ok(timelinePage.includes("发布时间轴"));
  assert.ok(timelinePage.includes("修订记录"));
  assert.ok(timelinePage.includes("历史快照"));
  assert.equal(timelinePage.includes(">文件<"), false);
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
  assert.match(cssBlock(globalCss, ".timeline-view-switch"), /display:\s*inline-flex;/);
  assert.match(cssBlock(globalCss, ".timeline-view-switch"), /grid-column:\s*1 \/ -1;/);
  assert.match(cssBlock(globalCss, ".revision-commit-head"), /grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/);
  assert.match(cssBlock(globalCss, ".revision-article-item"), /grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/);
  assert.ok(timelinePage.includes("revision-article-actions"));
  assert.ok(hasCssBlock(globalCss, ".timeline-year-links a", /min-width:\s*5\.75rem;/));
  assert.equal(cssBlock(globalCss, ".timeline-year-heading::after").trim(), "");
  assert.equal(cssBlock(globalCss, ".timeline-list::before").trim(), "");
  assert.ok(timelinePage.includes("data-timeline-year-link"));
  assert.ok(timelinePage.includes("data-timeline-year-section"));
  assert.ok(timelinePage.includes("aria-current"));
  assert.ok(swupInit.includes("IntersectionObserver"));
  assert.ok(swupInit.includes("timelineYearSpy"));
  assert.ok(timelinePage.includes("timeline-year-index"));
  assert.equal(timelinePage.includes("inspector"), false);
  assert.equal(timelinePage.includes("归档规则"), false);
  assert.match(cssBlock(globalCss, ".revision-hash,\n.revision-article-actions a"), /text-decoration-line:\s*underline;/);
  assert.match(cssBlock(globalCss, ".revision-hash,\n.revision-article-actions a"), /text-decoration-color:\s*var\(--site-line-strong\);/);
});
