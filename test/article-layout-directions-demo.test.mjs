import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const indexPage = readFileSync("src/pages/design/article-layout-directions.astro", "utf8");
const archivePage = readFileSync("src/pages/design/article-layout-directions/archive.astro", "utf8");
const articlePage = readFileSync("src/pages/design/article-layout-directions/article.astro", "utf8");
const archiveDemo = readFileSync("src/components/design/ArticleArchiveDirections.astro", "utf8");
const archivePagination = readFileSync("src/components/design/ArchivePaginationDemo.astro", "utf8");
const articleDemo = readFileSync("src/components/design/ArticleDetailDirections.astro", "utf8");
const articleBodySample = readFileSync("src/components/design/ArticleBodySample.astro", "utf8");
const articleRelatedFooter = readFileSync("src/components/design/ArticleRelatedFooter.astro", "utf8");
const archiveSurface = `${archivePage}\n${archiveDemo}\n${archivePagination}`;
const articleDetailSurface = `${articleDemo}\n${articleBodySample}\n${articleRelatedFooter}`;

test("design index links to separate archive and article demos", () => {
  assert.ok(indexPage.includes("/design/article-layout-directions/archive/"));
  assert.ok(indexPage.includes("/design/article-layout-directions/article/"));
  assert.ok(indexPage.includes("文章列表"));
  assert.ok(indexPage.includes("文章详情页"));
  assert.ok(!indexPage.includes("文章列表 + 筛选"));
});

test("archive demo offers genuinely different minimalist article card layouts", () => {
  const directionCount = (archiveDemo.match(/data-archive-direction=/g) || []).length;
  assert.ok(directionCount >= 5);
  for (const pageDirection of [
    "archive-card-grid",
    "archive-feature-cards",
    "archive-masonry-cards",
    "archive-compact-cards",
    "archive-month-cards",
  ]) {
    assert.ok(archiveDemo.includes(pageDirection), `${pageDirection} should be present`);
  }
  assert.ok(archiveSurface.includes("pagination-demo"));
  assert.ok(archiveSurface.includes("pageSize"));
  assert.ok(archiveSurface.includes("currentPageArticles"));
  assert.ok(archiveSurface.includes("archive-page-stage"));
  assert.ok(archiveSurface.includes("monthGroups"));
  assert.ok(archiveSurface.includes("featuredArticle"));
  assert.ok(archiveSurface.includes("article-card"));
  assert.ok(archiveSurface.includes("card-grid"));
  assert.ok(archiveSurface.includes("feature-card"));
  assert.ok(archiveSurface.includes("masonry-card"));
  assert.ok(archiveSurface.includes("compact-card"));
  assert.ok(archiveSurface.includes("month-card"));
  assert.ok(archiveSurface.includes("directions-bar"));
  assert.ok(archiveSurface.includes("weak-tags"));
  assert.ok(archiveSurface.includes("完整文章列表页"));
  assert.ok(!archiveSurface.includes("data-filter-tag"));
  assert.ok(!archiveSurface.includes("renderArchiveResults"));
  assert.ok(!archiveSurface.includes("搜索文章"));
  assert.ok(!archiveSurface.includes("筛选"));
  assert.ok(!archiveSurface.includes("minimal-section"));
  assert.ok(!archiveSurface.includes("section-head"));
  assert.ok(!archiveSurface.includes("page-shell"));
  assert.ok(!archiveSurface.includes("preview-label"));
  assert.ok(!archiveSurface.includes("stage-kicker"));
  assert.ok(!archiveSurface.includes("directions-intro"));
  assert.ok(!archiveSurface.includes("archive-page-nav"));
  assert.ok(!archiveSurface.includes("archive-page-foot"));
  for (const oldClass of [
    "archive-river-stream",
    "archive-cover-stack",
    "archive-month-map",
    "archive-compact-directory",
    "archive-offset-notes",
    "river-list",
    "cover-list",
    "month-map-grid",
    "directory-table",
    "offset-list",
    "archive-page-column",
    "archive-page-rail",
    "archive-page-ledger",
    "archive-page-bibliography",
    "archive-minimal-column",
    "archive-breathing-list",
    "archive-quiet-index",
    "archive-year-rail",
    "archive-reading-log",
    "archive-magazine-cover",
    "archive-reading-desk",
    "archive-note-stream",
    "archive-color-index",
    "archive-library-shelf",
    "archive-plain-list",
    "archive-date-rail",
    "archive-compact-list",
    "archive-month-ledger",
    "archive-numbered-log",
    "archive-split-summary",
    "archive-journal-stack",
    "archive-search-first",
    "archive-bento-index",
    "archive-catalog-board",
    "archive-calendar-ledger",
    "archive-filter-toolbar",
    "archive-folder-rail",
    "archive-command-panel",
    "archive-month-index",
    "archive-dense-table",
  ]) {
    assert.ok(!archiveDemo.includes(oldClass), `${oldClass} should be removed`);
  }
  for (const exaggeratedCue of [
    "Magazine",
    "Desk",
    "Shelf",
    "book-height",
    "writing-mode",
    "#f6df7d",
    "#d95d39",
  ]) {
    assert.ok(!archiveDemo.includes(exaggeratedCue), `${exaggeratedCue} should be removed`);
  }
});

test("archive demo relies on site theme variables instead of adding colors", () => {
  for (const customColorToken of [
    "--page:",
    "--card:",
    "--card-soft:",
    "--ink:",
    "--body:",
    "--muted:",
    "--line:",
    "--accent:",
    "#fffaf2",
    "#d7c4ad",
  ]) {
    assert.ok(!archiveSurface.includes(customColorToken), `${customColorToken} should not be defined in archive demo`);
  }

  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(archiveSurface), "archive demo should not contain raw hex colors");
  assert.ok(!/\brgba?\(/.test(archiveSurface), "archive demo should not contain raw rgb/rgba colors");
  assert.ok(!/\bhsla?\(/.test(archiveSurface), "archive demo should not contain raw hsl/hsla colors");

  for (const siteToken of [
    "var(--site-bg)",
    "var(--site-ink)",
    "var(--site-body)",
    "var(--site-muted)",
    "var(--site-quiet)",
    "var(--site-line)",
    "var(--site-line-strong)",
    "var(--site-soft)",
  ]) {
    assert.ok(archiveSurface.includes(siteToken), `${siteToken} should be used`);
  }
});

test("archive card directions use distinct geometry instead of repeated lists", () => {
  assert.ok(archiveDemo.includes("grid-template-columns: repeat(12"), "card grid should use a wider grid system");
  assert.ok(archiveDemo.includes("grid-row: span 2"), "card grid should include taller feature cards");
  assert.ok(archiveDemo.includes("columns: 4 180px"), "masonry cards should use a different column rhythm");
  assert.ok(archiveDemo.includes(".masonry-card:nth-child(4n + 1)"), "masonry cards should vary their height rhythm");
  assert.ok(archiveDemo.includes("grid-template-columns: repeat(7"), "feature mini cards should form a compact row");
  assert.ok(archiveDemo.includes("grid-template-columns: repeat(6"), "compact cards should remain a dense matrix");
});

test("article demo offers multiple distinct detail-page directions", () => {
  const directionCount = (articleDemo.match(/data-article-direction=/g) || []).length;
  assert.ok(directionCount >= 5);
  assert.ok(articleDemo.includes("detail-split-notes"));
  assert.ok(articleDemo.includes("detail-compact-doc"));
  assert.ok(articleDemo.indexOf('data-article-direction="split-notes"') < articleDemo.indexOf('data-article-direction="compact-doc"'));
  assert.ok(articleDemo.includes("detail-margin-dossier"));
  assert.ok(articleDemo.includes("detail-paper-trail"));
  assert.ok(articleDemo.includes("detail-indexed-report"));
  assert.ok(!articleDemo.includes("detail-classic-column"));
  assert.ok(!articleDemo.includes("detail-reading-room"));
});

test("article detail directions keep real article information and body surfaces", () => {
  for (const text of [
    "目录",
    "标签",
    "反向链接",
    "相关文章",
    "更新时间",
    "参考链接",
    "代码块",
    "对照表格",
  ]) {
    assert.ok(articleDetailSurface.includes(text), `${text} should be present`);
  }
  assert.ok(articleDetailSurface.includes("article-data-table"));
  assert.ok(articleDetailSurface.includes("article-link-card"));
});

test("old grid filter timeline markdown demo routes stay removed", () => {
  assert.ok(!indexPage.includes("/design/article-layout-directions/grid/"));
  assert.ok(!indexPage.includes("/design/article-layout-directions/filter/"));
  assert.ok(!indexPage.includes("/design/article-layout-directions/timeline/"));
  assert.ok(!indexPage.includes("/design/article-layout-directions/markdown/"));
  assert.ok(!existsSync("src/pages/design/article-layout-directions/grid.astro"));
  assert.ok(!existsSync("src/pages/design/article-layout-directions/filter.astro"));
  assert.ok(!existsSync("src/pages/design/article-layout-directions/timeline.astro"));
  assert.ok(!existsSync("src/pages/design/article-layout-directions/markdown.astro"));
});

test("new demo routes render their dedicated components", () => {
  assert.ok(archivePage.includes("<ArticleArchiveDirections />"));
  assert.ok(archivePage.includes("hideHeader={true}"));
  assert.ok(articlePage.includes("<ArticleDetailDirections />"));
});
