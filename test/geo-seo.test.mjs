import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const constsSource = readFileSync("src/consts.ts", "utf8");
const astroConfig = readFileSync("astro.config.mjs", "utf8");
const layoutSource = readFileSync("src/components/Layout.astro", "utf8");
const articleDetail = readFileSync("src/pages/articles/[...id].astro", "utf8");
const articleIndex = readFileSync("src/pages/articles/index.astro", "utf8");
const sitemapIntegration = readFileSync("src/plugins/sitemap-integration.js", "utf8");
const rssIntegration = readFileSync("src/plugins/rss-integration.js", "utf8");
const robotsIntegration = readFileSync("src/plugins/robots-integration.js", "utf8");
const llmsIntegration = readFileSync("src/plugins/llms-integration.js", "utf8");

test("site metadata has one canonical source and removes legacy exports", () => {
  assert.match(constsSource, /export const SITE_META\s*=\s*\{/);
  assert.match(constsSource, /url:\s*"https:\/\/b\.u\.cd"/);
  assert.match(constsSource, /title:\s*"echoes"/);
  assert.match(constsSource, /author:/);

  assert.doesNotMatch(constsSource, /export const SITE_URL\b/);
  assert.doesNotMatch(constsSource, /export const SITE_TITLE\b/);
  assert.doesNotMatch(constsSource, /export const SITE_DESCRIPTION\b/);
  assert.ok(astroConfig.includes("SITE_META.url"));
});

test("layout emits GEO-friendly page metadata and JSON-LD", () => {
  assert.ok(layoutSource.includes("keywords?: string[]"));
  assert.ok(layoutSource.includes("robots?: string;"));
  assert.ok(layoutSource.includes('name="keywords"'));
  assert.ok(layoutSource.includes('name="robots"'));
  assert.ok(layoutSource.includes('robots = "index, follow"'));
  assert.ok(layoutSource.includes("content={robots}"));
  assert.ok(layoutSource.includes('type="application/ld+json"'));
  assert.ok(layoutSource.includes("JSON.stringify"));
  assert.ok(layoutSource.includes("SITE_META.title"));
  assert.ok(layoutSource.includes("siteJsonLd"));
  assert.ok(layoutSource.includes("personJsonLd"));
  assert.ok(layoutSource.includes('"@type": "WebSite"'));
  assert.ok(layoutSource.includes('"@type": "Person"'));
});

test("article pages pass Article and breadcrumb structured data", () => {
  assert.ok(articleDetail.includes("articleJsonLd"));
  assert.ok(articleDetail.includes('"@type": "BlogPosting"'));
  assert.ok(articleDetail.includes('"@type": "BreadcrumbList"'));
  assert.ok(articleDetail.includes("articleSection"));
  assert.ok(articleDetail.includes("keywords={article.data.tags}"));
  assert.ok(articleDetail.includes("jsonLd={[articleJsonLd, breadcrumbJsonLd]}"));
});

test("directory pages pass collection structured data", () => {
  assert.ok(articleIndex.includes("collectionJsonLd"));
  assert.ok(articleIndex.includes('"@type": "CollectionPage"'));
  assert.ok(articleIndex.includes('"@type": "ItemList"'));
  assert.ok(articleIndex.includes("jsonLd={[collectionJsonLd, itemListJsonLd]}"));
});

test("generated discovery files use SITE_META and expose freshness and AI index data", () => {
  for (const source of [sitemapIntegration, rssIntegration, robotsIntegration, llmsIntegration]) {
    assert.ok(source.includes("SITE_META"));
    assert.doesNotMatch(source, /\bSITE_URL\b/);
    assert.doesNotMatch(source, /\bSITE_TITLE\b/);
    assert.doesNotMatch(source, /\bSITE_DESCRIPTION\b/);
  }

  assert.ok(sitemapIntegration.includes("<lastmod>"));
  assert.ok(sitemapIntegration.includes("resolvePageLastmod"));
  assert.ok(sitemapIntegration.includes("article:modified_time"));
  assert.ok(rssIntegration.includes("<managingEditor>"));
  assert.ok(robotsIntegration.includes("Allow: /"));
  assert.ok(llmsIntegration.includes("llms.txt"));
  assert.equal(llmsIntegration.includes("astro:content"), false);
  assert.ok(llmsIntegration.includes("scanContentArticles"));
  assert.ok(llmsIntegration.includes("NAV_STRUCTURE"));
});
