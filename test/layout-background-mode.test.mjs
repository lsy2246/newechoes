import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aboutPage = readFileSync("src/pages/about.astro", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");
const swupTransitionsCss = readFileSync("src/styles/swup-transitions.css", "utf8");
const header = readFileSync("src/components/Header.astro", "utf8");
const layout = readFileSync("src/components/Layout.astro", "utf8");
const search = readFileSync("src/components/Search.tsx", "utf8");
const swupInit = readFileSync("src/lib/navigation/swup-init.js", "utf8");
const staticServer = readFileSync("tmp/static-server.mjs", "utf8");
const swupLifecycleFiles = [
  "src/lib/navigation/swup-init.js",
  "src/components/Layout.astro",
  "src/components/Header.astro",
  "src/components/Breadcrumb.astro",
  "src/components/home/HomeDiorama.astro",
  "src/components/home/diorama.ts",
  "src/lib/global-graph/modal.ts",
];

test("about page uses the normal monochrome page background", () => {
  assert.equal(aboutPage.includes('backgroundMode="starry"'), false);
  assert.equal(aboutPage.includes("starfield-bg.jpg"), false);
});

test("starry background does not change fixed header layout", () => {
  assert.equal(globalCss.includes('[data-theme="dark"] body.layout-bg-starry > header'), false);
  assert.ok(globalCss.includes('[data-theme="dark"] body.layout-bg-starry>#main-header'));
  assert.ok(globalCss.includes('[data-theme="dark"] body.layout-bg-starry>main'));
  assert.ok(globalCss.includes('[data-theme="dark"] body.layout-bg-starry>footer'));
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

test("swup keeps route stylesheets through head sync before cleaning stale ones", () => {
  assert.ok(swupInit.includes("const ROUTE_STYLESHEET_SELECTOR = 'link[rel=\"stylesheet\"][href]'"));
  assert.ok(swupInit.includes("prepareStylesheetPersistenceForHeadSync"));
  assert.ok(swupInit.includes("shouldPersistStylesheetDuringHeadSync"));
  assert.ok(swupInit.includes("cleanupPersistedStylesheetsForHeadSync"));
  assert.ok(swupInit.includes("data-swup-persisted-stylesheet"));
  assert.ok(swupInit.includes("persistTags: shouldPersistStylesheetDuringHeadSync"));
  assert.ok(swupInit.includes("tag.hasAttribute(PERSISTED_STYLESHEET_ATTRIBUTE)"));
  assert.match(
    swupInit,
    /swup\.hooks\.before\('content:replace', prepareStylesheetPersistenceForHeadSync,[\s\S]*priority: -110/,
  );
  assert.match(
    swupInit,
    /swup\.hooks\.on\('content:replace', cleanupPersistedStylesheetsForHeadSync/,
  );
});

test("swup preserves current Vite dev styles instead of swapping in stale fetched styles", () => {
  assert.ok(swupInit.includes("preserveViteDevStylesForHeadSync"));
  assert.ok(swupInit.includes("const VITE_DEV_STYLE_SELECTOR = 'style[data-vite-dev-id]'"));
  assert.ok(swupInit.includes("data-swup-theme"));
  assert.ok(swupInit.includes("priority: -100"));
  assert.ok(swupInit.includes("const currentStyleIds = new Set("));
  assert.ok(swupInit.includes(".map((style) => style.getAttribute('data-vite-dev-id'))"));
  assert.ok(swupInit.includes("if (!viteDevStyleId || !currentStyleIds.has(viteDevStyleId))"));
  assert.ok(swupInit.includes("style.remove();"));
});

test("swup can sync page-level layout body classes from the replaced main element", () => {
  assert.ok(layout.includes("data-layout-page-type={pageType}"));
  assert.ok(layout.includes('data-layout-content-layout={contentLayout}'));
  assert.ok(layout.includes("data-layout-header-mode={headerMode}"));
  assert.ok(layout.includes('data-layout-card-preview={isCardPreview ? "true" : "false"}'));
  assert.ok(layout.includes('data-layout-hide-footer={hideFooter ? "true" : "false"}'));
  assert.ok(layout.includes('data-layout-hide-header={hideHeader ? "true" : "false"}'));

  assert.ok(swupInit.includes("site-monochrome-page"));
  assert.ok(swupInit.includes("layout-article-page"));
  assert.ok(swupInit.includes("layout-directory-page"));
  assert.ok(swupInit.includes("layout-overlay-header"));
  assert.ok(swupInit.includes("layout-content-custom"));
  assert.ok(swupInit.includes("layout-no-header"));
});

test("swup syncs the persistent header surface after leaving home", () => {
  assert.ok(header.includes("const isHomeHeader = normalizedPath === \"/\";"));
  assert.ok(header.includes('data-home-header={isHomeHeader ? "true" : undefined}'));
  assert.ok(swupInit.includes("function syncHeaderShellState"));
  assert.ok(swupInit.includes("header.removeAttribute('data-home-header')"));
  assert.ok(swupInit.includes("headerBg.classList.toggle('header-bg-surface', !shellState.useHomeHeader)"));
});

test("home theme toggles keep the shared auto direction instead of homepage-only overrides", () => {
  assert.ok(header.includes("<ThemeToggle transitionDuration={700} />"));
  assert.match(
    header,
    /<ThemeToggle\s+width=\{14\}\s+height=\{14\}\s+className="group"\s+transitionDuration=\{700\}\s*\/>/,
  );
  assert.equal(header.includes('transitionMode={isHomeHeader ? "reverse-auto" : "auto"}'), false);
});

test("swup syncs header visibility from the replaced page shell", () => {
  assert.ok(layout.includes("<Header hidden={hideHeader} />"));
  assert.equal(layout.includes("!hideHeader && <Header"), false);
  assert.ok(header.includes("interface Props"));
  assert.ok(header.includes("hidden?: boolean"));
  assert.ok(header.includes('data-layout-header-hidden={hidden ? "true" : "false"}'));
  assert.ok(swupInit.includes("function syncLayoutHeaderVisibility"));
  assert.ok(swupInit.includes("const hideHeader = isCardPreview || readLayoutFlag(mainElement, 'data-layout-hide-header')"));
  assert.ok(swupInit.includes("const hideFooter = isCardPreview || readLayoutFlag(mainElement, 'data-layout-hide-footer', isHomeUrl(url))"));
  assert.ok(swupInit.includes("syncLayoutHeaderVisibility(shellState.hideHeader)"));
  assert.ok(swupInit.includes("header.hidden = hideHeader"));
  assert.ok(swupInit.includes("header.classList.toggle('hidden', hideHeader)"));
  assert.ok(swupInit.includes("header.setAttribute('data-layout-header-hidden', hideHeader ? 'true' : 'false')"));
});

test("header scroll state restores frosted navigation outside home", () => {
  assert.ok(swupInit.includes("function updateHeaderScrollState"));
  assert.ok(swupInit.includes("const shouldUseScrolledHeader = !shellState.useHomeHeader && window.scrollY > 8;"));
  assert.ok(swupInit.includes("headerBg.classList.toggle('scrolled', shouldUseScrolledHeader)"));
  assert.ok(swupInit.includes("window.addEventListener('scroll', updateHeaderScrollState, { passive: true })"));
  assert.ok(swupInit.includes("window.removeEventListener('scroll', updateHeaderScrollState, { passive: true })"));
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

test("swup bridges page:view to Astro lifecycle events for navigation-driven page scripts", () => {
  assert.ok(swupInit.includes("function dispatchAstroNavigationLifecycle"));
  assert.ok(swupInit.includes("dispatchAstroNavigationEvent('astro:after-swap', detail);"));
  assert.ok(swupInit.includes("dispatchAstroNavigationEvent('astro:page-load', detail);"));
  assert.match(
    swupInit,
    /swup\.hooks\.on\('page:view', \(visit\) => \{[\s\S]*dispatchAstroNavigationLifecycle\(visit\);/,
  );
});

test("persistent header navigation does not self-destruct during swup shell swaps", () => {
  assert.equal(header.includes('eventType: "astro:before-swap"'), false);
  assert.equal(header.includes('eventType: "page-transition"'), false);
  assert.equal(header.includes("function selfDestruct()"), false);
  assert.equal(header.includes("function registerCleanupEvents()"), false);
  assert.equal(header.includes("function setupHistoryMonitoring()"), false);
  assert.equal(header.includes("window.history.pushState = function()"), false);
  assert.equal(header.includes("window.history.replaceState = function()"), false);
});

test("persistent header navigation bootstraps as an idempotent singleton to avoid duplicate listeners", () => {
  assert.ok(header.includes('const HEADER_RUNTIME_KEY = "__PersistentHeaderRuntime";'));
  assert.ok(header.includes("if (headerWindow[HEADER_RUNTIME_KEY]) {"));
  assert.ok(header.includes("headerWindow[HEADER_RUNTIME_KEY]?.init();"));
  assert.ok(header.includes("headerWindow[HEADER_RUNTIME_KEY] = { init: initNavigation };"));
});

test("persistent header navigation refreshes from Astro lifecycle instead of direct swup document events", () => {
  assert.equal(header.includes("swup:content:replace"), false);
  assert.equal(header.includes("swup:animation:in:end"), false);
  assert.ok(header.includes("function refreshNavigationState"));
  assert.match(
    header,
    /addListener\(document,\s*'astro:after-swap',\s*\(\)\s*=>\s*\{[\s\S]*refreshNavigationState\(/,
  );
  assert.match(
    header,
    /addListener\(document,\s*'astro:page-load',\s*\(\)\s*=>\s*\{[\s\S]*refreshNavigationState\(/,
  );
});

test("swup owns timeline year spy lifecycle outside page inline scripts", () => {
  assert.ok(swupInit.includes("const timelineYearSpy ="));
  assert.ok(swupInit.includes("document.querySelectorAll('[data-timeline-year-link]')"));
  assert.ok(swupInit.includes("document.querySelectorAll('[data-timeline-year-section]')"));
  assert.ok(swupInit.includes("new IntersectionObserver(requestUpdate"));
  assert.ok(swupInit.includes("timelineYearSpy.cleanup?.()"));
  assert.ok(swupInit.includes("timelineYearSpy.init()"));
});

test("search closes transient panels during swup navigation", () => {
  assert.ok(search.includes('document.addEventListener("swup:visit:start", handlePageChange)'));
  assert.ok(search.includes('document.addEventListener("swup:page:view", handlePageChange)'));
  assert.ok(search.includes('document.removeEventListener("swup:visit:start", handlePageChange)'));
  assert.ok(search.includes('document.removeEventListener("swup:page:view", handlePageChange)'));
});

test("search hydrates early without blocking the initial navigation paint", () => {
  assert.equal(header.includes("<Search client:idle"), false);
  assert.equal(header.includes("<Search client:load"), false);
});

test("header nav clicks hand off immediately to swup navigation instead of only consuming the event", () => {
  assert.ok(header.includes("function navigateWithinSite(targetHref: string | null)"));
  assert.ok(header.includes("const swup = headerWindow.swup;"));
  assert.ok(header.includes("if (swup && typeof swup.navigate === 'function')"));
  assert.ok(header.includes("swup.navigate(targetHref);"));
  assert.ok(header.includes("window.location.href = targetHref;"));
  assert.match(
    header,
    /navItems\.forEach\(item => \{[\s\S]*e\.preventDefault\(\);[\s\S]*setActiveItem\(itemId\);[\s\S]*navigateWithinSite\(targetHref\);/,
  );
  assert.match(
    header,
    /navSubItems\.forEach\(item => \{[\s\S]*e\.preventDefault\(\);[\s\S]*setActiveSubItem\(subItemId\);[\s\S]*navigateWithinSite\(targetHref\);/,
  );
});

test("swup keeps early navigation active without aggressive first-paint preloading", () => {
  assert.ok(swupInit.includes("preloadHoveredLinks: false"));
  assert.ok(swupInit.includes("preloadInitialPage: false"));
  assert.ok(swupInit.includes("throttle: window.matchMedia('(max-width: 767px)').matches ? 1 : 2"));
});

test("swup clears homepage-only html state when leaving home", () => {
  assert.ok(swupInit.includes("clearHomePageState"));
  assert.ok(swupInit.includes('removeAttribute("data-home-header-phase")'));
  assert.ok(swupInit.includes('removeProperty("--home-progress")'));
  assert.ok(swupInit.includes('removeProperty("--story-progress")'));
});

test("swup route loader stays viewport centered for the tall homepage shell", () => {
  assert.ok(swupInit.includes("const LOADING_SPINNER_MIN_VISIBLE_MS = 0"));
  assert.ok(swupInit.includes("spinner.style.top = '50%'"));
  assert.ok(swupInit.includes("spinner.style.left = '50%'"));
  assert.ok(swupInit.includes("const hideDelay = Math.max(0, LOADING_SPINNER_MIN_VISIBLE_MS - visibleFor);"));
  assert.ok(swupInit.includes("setSwupLoadingState(true)"));
  assert.ok(swupInit.includes("setSwupLoadingState(false)"));
  assert.equal(swupInit.includes("const centerY = rect.top + rect.height / 2"), false);
  assert.match(
    swupTransitionsCss,
    /\.loading-spinner-container\s*\{[\s\S]*position:\s*fixed;/,
  );
  assert.match(
    swupTransitionsCss,
    /body\[data-swup-loading='true'\] \.home-diorama__loading \{\s*opacity:\s*0;/,
  );
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

test("filtered navigation does not reuse article-content transition state", () => {
  assert.ok(swupInit.includes("function isArticleTransitionPageUrl"));
  assert.ok(swupInit.includes("function isArticleTransitionPage()"));
  assert.equal(swupInit.includes("return isArticleShellPageUrl();"), false);
  assert.match(
    swupInit,
    /function getActiveElement\(\) \{\s*if \(isArticleTransitionPage\(\)\) \{\s*return document\.querySelector\('#article-content'\);\s*\}\s*return document\.querySelector\('main'\);\s*\}/,
  );
  assert.ok(swupInit.includes("const isTargetArticleTransitionPage = isArticleTransitionPageUrl(visit.to.url);"));
  assert.ok(swupInit.includes("const isCurrentArticleTransitionPage = isArticleTransitionPage();"));
  assert.equal(swupInit.includes("const isTargetArticlePage = isArticleShellPageUrl(visit.to.url);"), false);
});

test("swup does not hide incoming main content again after replacement", () => {
  assert.match(
    swupInit,
    /swup\.hooks\.on\('animation:out:start', \(\) => \{[\s\S]*setElementOpacity\(activeElement, 0\);[\s\S]*\}\);/,
  );
  assert.equal(
    /swup\.hooks\.on\('content:replace', \(\) => \{[\s\S]*setElementOpacity\(activeElement, 0\);[\s\S]*\}\);/.test(swupInit),
    false,
  );
});

test("theme toggle runtime is no longer duplicated inline inside every button instance", () => {
  assert.equal(readFileSync("src/components/ThemeToggle.astro", "utf8").includes("<script is:inline>"), false);
  assert.equal(readFileSync("src/components/ThemeToggle.astro", "utf8").includes('import "@/lib/theme-toggle-runtime"'), false);
  assert.match(layout, /<script>\s*import "\.\.\/lib\/theme-toggle-runtime\.ts";\s*<\/script>/);
});

test("local static server stubs the vercel speed insights script to avoid 404 noise during offline verification", () => {
  assert.ok(staticServer.includes("cleanPath === \"/_vercel/speed-insights/script.js\""));
  assert.ok(staticServer.includes("res.writeHead(204"));
  assert.ok(staticServer.includes("res.end(\"\")"));
});

test("local static server returns a harmless empty payload for google photos api requests during offline verification", () => {
  assert.ok(staticServer.includes("cleanPath === \"/api/google-photos\""));
  assert.ok(staticServer.includes('\"Content-Type\": \"application/json; charset=utf-8\"'));
  assert.ok(staticServer.includes('JSON.stringify({ album: { title: null }, photos: [], nextCursor: null })'));
});

test("article grid and detail navigation use swup history instead of same-path replacement", () => {
  assert.ok(swupInit.includes("name: 'article-pages'"));
  assert.ok(swupInit.includes("from: ['/articles']"));
  assert.ok(swupInit.includes("to: ['/articles']"));
  assert.equal(swupInit.includes("replaceArticleMainWithoutUrlChange"), false);
  assert.equal(swupInit.includes("handleSamePathArticleNavigation"), false);
  assert.equal(swupInit.includes("article-same-path:"), false);
});
