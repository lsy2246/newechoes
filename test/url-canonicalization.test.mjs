import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const astroConfig = readFileSync("astro.config.mjs", "utf8");
const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));
const edgeoneConfig = JSON.parse(readFileSync("edgeone.json", "utf8"));
const layoutSource = readFileSync("src/components/layout/Layout.astro", "utf8");
const articleLinksSource = readFileSync("src/lib/article-links.ts", "utf8");
const articleIndexSource = readFileSync("src/pages/articles/index.astro", "utf8");
const articleDetailSource = readFileSync("src/pages/articles/[...id].astro", "utf8");
const platformMirrorsSource = readFileSync("src/platform/build/mirrors.js", "utf8");
const sitemapIntegration = readFileSync("src/plugins/sitemap-integration.js", "utf8");
const rssIntegration = readFileSync("src/plugins/rss-integration.js", "utf8");
const robotsIntegration = readFileSync("src/plugins/robots-integration.js", "utf8");
const llmsIntegration = readFileSync("src/plugins/llms-integration.js", "utf8");

test("Astro and Vercel build canonical routes without trailing slashes", () => {
  assert.match(astroConfig, /trailingSlash:\s*"never"/);
  assert.match(astroConfig, /format:\s*"file"/);
  assert.equal(vercelConfig.buildCommand, "pnpm run build:vercel");
  assert.equal(vercelConfig.outputDirectory, "dist");
  assert.equal(edgeoneConfig.buildCommand, "pnpm run build:edgeone");
  assert.equal(edgeoneConfig.outputDirectory, "dist");
  assert.equal(vercelConfig.cleanUrls, true);
  assert.equal(vercelConfig.trailingSlash, false);
});

test("canonical and Open Graph URLs use the shared normalizer", () => {
  assert.ok(layoutSource.includes("createCanonicalUrl"));
  assert.ok(layoutSource.includes("normalizeCanonicalPath"));
  assert.match(layoutSource, /const canonicalHref\s*=/);
  assert.ok(layoutSource.includes("const canonicalHref = createCanonicalUrl(canonicalPath, Astro.site);"));
  assert.equal(layoutSource.includes("const canonicalHref = rssLink || createCanonicalUrl"), false);
  assert.ok(layoutSource.includes('property="og:url"'));
  assert.ok(layoutSource.includes("content={canonicalHref}"));
  assert.ok(layoutSource.includes('const ogType = pageType === "article" ? "article" : "website";'));
  assert.ok(layoutSource.includes("content={ogType}"));
});

test("article and directory links are emitted without trailing slashes", () => {
  assert.ok(articleLinksSource.includes("normalizeCanonicalPath"));
  assert.match(articleLinksSource, /return normalizeCanonicalPath\(`\/articles\/\$\{encodeURI\(articleId\)\}`\)/);

  assert.ok(articleIndexSource.includes('const parentHref = parentPath ? `/articles/${parentPath}` : "/articles";'));
  assert.ok(articleIndexSource.includes('const pagePath = currentPath ? `/articles/${currentPath}` : "/articles";'));
  assert.equal(articleIndexSource.includes('href={`/articles/${dirLink}/`}'), false);
  assert.equal(articleIndexSource.includes('href={`/articles/${segmentPath}/`}'), false);

  assert.ok(articleDetailSource.includes('new URL("/articles", SITE_META.url)'));
  assert.ok(articleDetailSource.includes('href={section ? `/articles/${section}` : "/articles"}'));
  assert.equal(articleDetailSource.includes('href={`/articles/${segmentPath}/`}'), false);
});

test("directory pages use unique SEO copy instead of repeated article-list text", () => {
  assert.ok(articleIndexSource.includes("createDirectorySeo"));
  assert.ok(articleIndexSource.includes("pageDescription"));
  assert.ok(articleIndexSource.includes("keywords={pageKeywords}"));
  assert.equal(articleIndexSource.includes('description="文章列表"'), false);
});

test("XML generators normalize URL output and resolve Astro HTML output paths", () => {
  for (const source of [sitemapIntegration, rssIntegration]) {
    assert.ok(source.includes("normalizeCanonicalPath"));
    assert.ok(source.includes("resolveHtmlPath"));
    assert.ok(source.includes("`${withoutLeading}.html`"));
    assert.ok(source.includes("existsSync(filePath)"));
    assert.ok(source.includes("path.join(buildDirPath, withoutLeading, 'index.html')"));
  }

  assert.match(sitemapIntegration, /new URL\(normalizeCanonicalPath\(page\.pathname\), SITE_META\.url\)/);
  assert.ok(rssIntegration.includes("createCanonicalUrl(page.pathname, SITE_META.url)"));
});

test("post-build metadata files mirror into platform static outputs", () => {
  assert.equal(existsSync("src/plugins/build-output.js"), false);
  assert.match(platformMirrorsSource, /export function syncStaticGeneratedFileToPlatformOutputs/);
  assert.match(platformMirrorsSource, /\.edgeone/);

  for (const source of [sitemapIntegration, rssIntegration, robotsIntegration, llmsIntegration]) {
    assert.match(source, /syncStaticGeneratedFileToPlatformOutputs/);
  }
});
