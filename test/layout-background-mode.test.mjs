import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aboutPage = readFileSync("src/pages/about.astro", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");
const header = readFileSync("src/components/Header.astro", "utf8");
const layout = readFileSync("src/components/Layout.astro", "utf8");
const swupInit = readFileSync("src/lib/swup-init.js", "utf8");
const swupLifecycleFiles = [
  "src/lib/swup-init.js",
  "src/components/Layout.astro",
  "src/components/Header.astro",
  "src/components/Breadcrumb.astro",
  "src/components/home/HomeDiorama.astro",
  "src/components/home/diorama.ts",
  "src/lib/global-graph-modal.ts",
];

test("about page uses the normal monochrome page background", () => {
  assert.equal(aboutPage.includes('backgroundMode="starry"'), false);
  assert.equal(aboutPage.includes("starfield-bg.jpg"), false);
});

test("starry background does not change fixed header layout", () => {
  assert.equal(globalCss.includes('[data-theme="dark"] body.layout-bg-starry > header'), false);
  assert.ok(globalCss.includes('[data-theme="dark"] body.layout-bg-starry > #main-header'));
  assert.ok(globalCss.includes('[data-theme="dark"] body.layout-bg-starry > main'));
  assert.ok(globalCss.includes('[data-theme="dark"] body.layout-bg-starry > footer'));
  assert.ok(globalCss.includes("position: fixed;"));
  assert.ok(globalCss.includes("position: static;"));
});

test("starry background does not reposition the body during theme changes", () => {
  assert.equal(globalCss.includes("[data-theme=\"dark\"] body.layout-bg-starry {\n  position: relative;"), false);
  assert.equal(globalCss.includes("[data-theme=\"dark\"] body.layout-bg-starry::before"), false);
  assert.equal(globalCss.includes("[data-theme=\"dark\"] body.layout-bg-starry::after"), false);
});

test("home header does not opt into the shared frosted surface class", () => {
  assert.ok(header.includes("const headerBgClass ="));
  assert.ok(header.includes('normalizedPath === "/"'));
  assert.ok(header.includes('? "absolute inset-0"'));
  assert.ok(header.includes(': "header-bg-surface absolute inset-0";'));
  assert.match(header, /class=\{headerBgClass\}/);
});

test("swup head sync does not persist generated style tags", () => {
  assert.ok(swupInit.includes("new SwupHeadPlugin"));
  assert.equal(swupInit.includes('persistTags: \'link[rel="stylesheet"], style, meta\''), false);
  assert.equal(swupInit.includes('persistAssets: true'), false);
});

test("swup preserves current Vite dev styles instead of swapping in stale fetched styles", () => {
  assert.ok(swupInit.includes("preserveViteDevStylesForHeadSync"));
  assert.ok(swupInit.includes("style[data-vite-dev-id]"));
  assert.ok(swupInit.includes("data-swup-theme"));
  assert.ok(swupInit.includes("priority: -100"));
});

test("swup can sync page-level layout body classes from the replaced main element", () => {
  assert.ok(layout.includes("data-layout-page-type={pageType}"));
  assert.ok(layout.includes('data-layout-full-bleed={fullBleed ? "true" : "false"}'));
  assert.ok(layout.includes("data-layout-header-mode={headerMode}"));
  assert.ok(layout.includes('data-layout-card-preview={isCardPreview ? "true" : "false"}'));
  assert.ok(layout.includes('data-layout-hide-footer={hideFooter ? "true" : "false"}'));

  assert.ok(swupInit.includes("site-monochrome-page"));
  assert.ok(swupInit.includes("layout-article-page"));
  assert.ok(swupInit.includes("layout-directory-page"));
  assert.ok(swupInit.includes("layout-overlay-header"));
  assert.ok(swupInit.includes("layout-full-bleed"));
});

test("swup lifecycle scripts use v4 events instead of legacy document events", () => {
  const legacyEvents = [
    "swup:contentReplaced",
    "swup:fragmentReplaced",
    "swup:willReplaceContent",
  ];

  for (const file of swupLifecycleFiles) {
    const contents = readFileSync(file, "utf8");
    for (const eventName of legacyEvents) {
      assert.equal(
        contents.includes(eventName),
        false,
        `${file} still references ${eventName}`,
      );
    }
  }
});

test("swup exposes and tears down one shared instance for page scripts", () => {
  assert.ok(swupInit.includes("window.swup = swup"));
  assert.ok(swupInit.includes("delete window.swup"));
});

test("swup clears homepage-only html state when leaving home", () => {
  assert.ok(swupInit.includes("clearHomePageState"));
  assert.ok(swupInit.includes('removeAttribute("data-home-header-phase")'));
  assert.ok(swupInit.includes('removeProperty("--home-progress")'));
  assert.ok(swupInit.includes('removeProperty("--story-progress")'));
});

test("swup fully replaces the page shell when entering or leaving filter", () => {
  assert.ok(swupInit.includes("function isFilteredPageUrl"));
  assert.ok(swupInit.includes("const isFromFilterPage = isFilteredPageUrl(visit?.from?.url);"));
  assert.ok(swupInit.includes("const isToFilterPage = isFilteredPageUrl(visit?.to?.url);"));
  assert.match(
    swupInit,
    /if \(isFromFilterPage \|\| isToFilterPage\) \{\s*return \['main'\];\s*\}/,
  );
  assert.equal(swupInit.includes("from: ['/articles', '/filtered']"), false);
  assert.equal(swupInit.includes("to: ['/articles', '/filtered']"), false);
});

test("article grid and detail navigation use swup history instead of same-path replacement", () => {
  assert.ok(swupInit.includes("name: 'article-pages'"));
  assert.ok(swupInit.includes("from: ['/articles']"));
  assert.ok(swupInit.includes("to: ['/articles']"));
  assert.equal(swupInit.includes("replaceArticleMainWithoutUrlChange"), false);
  assert.equal(swupInit.includes("handleSamePathArticleNavigation"), false);
  assert.equal(swupInit.includes("article-same-path:"), false);
});
