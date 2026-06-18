import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const expectedComponentPaths = [
  "src/components/layout/Layout.astro",
  "src/components/layout/Header.astro",
  "src/components/layout/Footer.astro",
  "src/components/VercelSpeedInsights.astro",
  "src/components/theme-toggle/ThemeToggle.astro",
  "src/components/theme-toggle/runtime.ts",
  "src/components/theme-toggle/theme-toggle.css",
  "src/components/swup.js",
  "src/components/search/Search.tsx",
  "src/components/search/controller.ts",
  "src/components/search/client.ts",
  "src/components/search/lazy-mount.ts",
  "src/components/search/prewarm.ts",
  "src/components/search/runtime.js",
  "src/components/search/types.ts",
  "src/components/search/worker.ts",
  "src/components/article/ArticleExplorer.astro",
  "src/components/article/ArticleHistory.astro",
  "src/components/article/TimelineView.astro",
  "src/components/article/filter/ArticleFilter.tsx",
  "src/components/article/filter/client.ts",
  "src/components/article/filter/page-state.js",
  "src/components/article/filter/runtime.js",
  "src/components/article/filter/types.ts",
  "src/components/article/filter/worker.ts",
  "src/components/global-graph/GlobalGraphLauncher.astro",
  "src/components/global-graph/launcher.ts",
  "src/components/global-graph/modal.ts",
  "src/components/home/HomeDiorama.astro",
  "src/components/home/diorama.css",
  "src/components/home/diorama.ts",
  "src/components/home/homeDioramaBoot.js",
  "src/components/home/homeScreenStory.ts",
  "src/components/DoubanList.tsx",
  "src/components/WereadBookList.tsx",
  "src/components/GitProjects.tsx",
  "src/components/PhotoAlbumMasonry.tsx",
  "src/components/Countdown.tsx",
  "src/components/WorldHeatmap.tsx",
  "src/components/NotFoundIllustration.astro",
];

const legacyComponentPaths = [
  "src/components/Layout.astro",
  "src/components/Header.astro",
  "src/components/Footer.astro",
  "src/components/ThemeToggle.astro",
  "src/components/Search.tsx",
  "src/components/ArticleFilter.tsx",
  "src/components/Breadcrumb.astro",
  "src/components/TimelineView.astro",
  "src/components/views/ArticleDirectoryView.astro",
  "src/components/article/ArticleDirectoryView.astro",
  "src/components/article/Breadcrumb.astro",
  "src/components/article-filter",
  "src/components/navigation",
  "src/components/navigation/swup-init.js",
  "src/components/layout/VercelSpeedInsights.astro",
  "src/components/GlobalGraphLauncher.astro",
  "src/components/DoubanCollection.tsx",
  "src/components/GitProjectCollection.tsx",
  "src/components/collections",
  "src/components/collections/DoubanCollection.tsx",
  "src/components/collections/WereadBookList.tsx",
  "src/components/collections/GitProjectCollection.tsx",
  "src/components/collections/PhotoAlbumMasonry.tsx",
  "src/components/about",
  "src/components/about/Countdown.tsx",
  "src/components/about/WorldHeatmap.tsx",
  "src/components/not-found",
  "src/components/not-found/NotFoundIllustration.astro",
  "src/components/timeline",
  "src/components/timeline/TimelineView.astro",
  "src/lib/search",
  "src/lib/filter",
  "src/lib/global-graph",
  "src/lib/navigation",
  "src/lib/theme-toggle-runtime.ts",
  "src/lib/article",
  "src/lib/theme",
];

test("front-end components and UI runtimes live under component-owned directories", () => {
  for (const path of expectedComponentPaths) {
    assert.equal(existsSync(path), true, `${path} should exist`);
  }

  for (const path of legacyComponentPaths) {
    assert.equal(existsSync(path), false, `${path} should not exist`);
  }
});
