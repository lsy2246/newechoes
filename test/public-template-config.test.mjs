import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const constsSource = readFileSync("src/consts.ts", "utf8");
const constsExampleSource = readFileSync("src/consts.example.ts", "utf8");
const astroConfig = readFileSync("astro.config.mjs", "utf8");
const layoutSource = readFileSync("src/components/layout/Layout.astro", "utf8");
const footerSource = readFileSync("src/components/layout/Footer.astro", "utf8");
const albumsPage = readFileSync("src/pages/albums.astro", "utf8");
const booksPage = readFileSync("src/pages/books.astro", "utf8");
const moviesPage = readFileSync("src/pages/movies.astro", "utf8");
const projectsPage = readFileSync("src/pages/projects.astro", "utf8");

test("public template keeps only required config in consts and documents optional config in the example", () => {
  assert.equal(constsSource.includes("export const FEATURE_FLAGS"), false);
  assert.equal(constsSource.includes("export const ARTICLE_EXPIRY_CONFIG"), false);
  assert.equal(constsSource.includes("export const ASSET_RELAY_URL"), false);
  assert.equal(constsSource.includes("export const SOURCE_REPOSITORY_CONFIG"), false);
  assert.equal(constsSource.includes("articleExpiryWarning"), false);
  assert.equal(constsSource.includes("sourceRepositoryLinks"), false);
  assert.equal(constsSource.includes("assetRelay"), false);
  assert.ok(constsExampleSource.includes("export const FEATURE_FLAGS"));
  assert.ok(constsExampleSource.includes("export const ARTICLE_EXPIRY_CONFIG"));
  assert.ok(constsExampleSource.includes("export const ASSET_RELAY_URL"));
  assert.equal(constsSource.includes("export const HOME_PROFILE"), false);
  assert.equal(constsExampleSource.includes("HOME_PROFILE"), false);
  assert.ok(constsExampleSource.includes("SOURCE_REPOSITORY_CONFIG"));
  assert.equal(existsSync("src/site-options.ts"), false);
});

test("collection pages keep demo ids at component call sites with Chinese notes", () => {
  assert.equal(constsSource.includes("export const COLLECTION_PROFILE"), false);
  assert.equal(constsExampleSource.includes("COLLECTION_PROFILE"), false);
  assert.ok(albumsPage.includes("将 shareId 改成自己的 Google Photos 分享 ID"));
  assert.ok(booksPage.includes("将 listId 改成自己的微信读书书单 ID"));
  assert.ok(moviesPage.includes("将 doubanId 改成自己的豆瓣 ID"));
  assert.ok(projectsPage.includes("将 username 改成自己的代码托管账号"));
  assert.ok(albumsPage.includes('shareId="M62Uxp4Uz2CUwie9A"'));
  assert.ok(booksPage.includes('listId="333895983_80fTRWHwy"'));
  assert.ok(moviesPage.includes('doubanId="lsy22"'));
  assert.ok(projectsPage.includes('username="lsy2246"'));
  assert.equal(existsSync("src/components/views/AlbumsView.astro"), false);
  assert.equal(existsSync("src/components/views/BooksView.astro"), false);
  assert.equal(existsSync("src/components/views/MoviesView.astro"), false);
  assert.equal(existsSync("src/components/views/ProjectsView.astro"), false);
  assert.equal(existsSync("src/components/views/ArticleFilterView.astro"), false);
});

test("seo and discovery integrations are gated by feature flags", () => {
  assert.ok(astroConfig.includes("DEFAULT_FEATURE_FLAGS"));
  assert.ok(astroConfig.includes("...DEFAULT_FEATURE_FLAGS"));
  assert.ok(astroConfig.includes("optionalSiteConfig.FEATURE_FLAGS"));
  assert.equal(astroConfig.includes("site-options"), false);
  assert.ok(astroConfig.includes("siteFeatureFlags.sitemap ? customSitemapIntegration() : null"));
  assert.ok(astroConfig.includes("siteFeatureFlags.robots ? robotsIntegration() : null"));
  assert.ok(astroConfig.includes("siteFeatureFlags.rss ? rssIntegration() : null"));
  assert.ok(astroConfig.includes("siteFeatureFlags.llms ? llmsIntegration() : null"));
  assert.ok(astroConfig.includes(".filter(Boolean)"));
  assert.ok(layoutSource.includes("siteFeatureFlags"));
  assert.ok(layoutSource.includes("siteFeatureFlags.seo"));
  assert.ok(layoutSource.includes("siteFeatureFlags.rss"));
  assert.equal(layoutSource.includes("site-options"), false);
  assert.ok(footerSource.includes("siteFeatureFlags"));
  assert.ok(footerSource.includes("siteFeatureFlags.sitemap"));
  assert.ok(footerSource.includes("siteFeatureFlags.rss"));
  assert.equal(footerSource.includes("site-options"), false);
});

test("public template content keeps only the guide article", () => {
  const files = [];
  const queue = ["src/content"];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
      } else if (/\.(md|mdx)$/.test(entry.name)) {
        files.push(entryPath.replace(/\\/g, "/"));
      }
    }
  }

  assert.deepEqual(files.sort(), ["src/content/echoes博客使用说明.md"]);
});
