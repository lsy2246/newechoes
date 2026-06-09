import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const astroConfig = readFileSync("astro.config.mjs", "utf8");
const aboutPage = readFileSync("src/pages/about.astro", "utf8");
const header = readFileSync("src/components/Header.astro", "utf8");
const globalGraphLauncher = readFileSync("src/components/GlobalGraphLauncher.astro", "utf8");
const globalGraphLauncherModule = readFileSync("src/lib/global-graph/launcher.ts", "utf8");
const articleIndexBuild = readFileSync("src/plugins/article-index/build.js", "utf8");
const swupInit = readFileSync("src/lib/navigation/swup-init.js", "utf8");
const homeDiorama = readFileSync("src/components/home/HomeDiorama.astro", "utf8");
const homeDioramaBoot = readFileSync("src/components/home/homeDioramaBoot.js", "utf8");
const dioramaModule = readFileSync("src/components/home/diorama.ts", "utf8");
const filteredPage = readFileSync("src/pages/filtered.astro", "utf8");
const projectsPage = readFileSync("src/pages/projects.astro", "utf8");
const booksPage = readFileSync("src/pages/books.astro", "utf8");
const moviesPage = readFileSync("src/pages/movies.astro", "utf8");
const albumsPage = readFileSync("src/pages/albums.astro", "utf8");

test("three dependencies are split into smaller core and addon chunks", () => {
  assert.ok(astroConfig.includes('id.includes("node_modules/three/examples/")'));
  assert.ok(astroConfig.includes('return "vendor-three-addons"'));
  assert.ok(astroConfig.includes('id.includes("node_modules/three/")'));
  assert.ok(astroConfig.includes('return "vendor-three-core"'));
  assert.equal(astroConfig.includes('return "vendor-three";'), false);
});

test("about page delays the heavy world heatmap island until it is visible", () => {
  assert.ok(aboutPage.includes("client:visible"));
  assert.equal(aboutPage.includes('client:only="react"'), false);
});

test("header search stays code-split but mounts after load-time idle and still supports immediate acceleration", () => {
  assert.equal(header.includes("client:idle"), false);
  assert.ok(header.includes("data-search-activate"));
  assert.ok(header.includes("data-search-mount"));
  assert.ok(header.includes('import("@/lib/search/lazy")'));
  assert.ok(header.includes("requestIdleCallback"));
  assert.ok(header.includes('window.addEventListener("load"'));
});

test("global graph keeps one Astro component and preloads graph data plus modal DOM on idle", () => {
  assert.equal(existsSync("src/pages/global-graph-modal-fragment.astro"), false);
  assert.equal(existsSync("src/pages/api/global-graph.json.ts"), false);
  assert.equal(existsSync("src/components/GlobalGraphModal.astro"), false);
  assert.ok(globalGraphLauncher.includes("data-global-graph-root"));
  assert.equal(globalGraphLauncher.includes("GlobalGraphModal"), false);
  assert.equal(globalGraphLauncher.includes("data-global-graph-json"), false);
  assert.equal(globalGraphLauncher.includes("global-graph-tree-shell"), false);
  assert.ok(globalGraphLauncher.includes("requestIdleCallback"));
  assert.ok(globalGraphLauncher.includes("preloadGlobalGraph"));
  assert.ok(globalGraphLauncher.includes('window.addEventListener("load"'));
  assert.equal(globalGraphLauncherModule.includes("GLOBAL_GRAPH_FRAGMENT_PATH"), false);
  assert.ok(globalGraphLauncherModule.includes("export async function preloadGlobalGraph()"));
  assert.ok(globalGraphLauncherModule.includes("await ensureGlobalGraphController();"));
  assert.ok(globalGraphLauncherModule.includes('const GLOBAL_GRAPH_DATA_URL = "/assets/index/global_graph.json";'));
  assert.ok(globalGraphLauncherModule.includes("fetch(GLOBAL_GRAPH_DATA_URL"));
  assert.ok(globalGraphLauncherModule.includes("renderGlobalGraphModal"));
  assert.ok(articleIndexBuild.includes("global_graph.json"));
  assert.ok(articleIndexBuild.includes("buildGlobalGraphIndex"));
});

test("swup avoids preloading visible links but waits for route assets before reveal", () => {
  assert.equal(swupInit.includes("preloadVisibleLinks"), false);
  assert.ok(swupInit.includes("preloadHoveredLinks: true"));
  assert.ok(swupInit.includes("awaitAssets: true"));
  assert.ok(swupInit.includes("scheduleArticleMermaidBoot();"));
});

test("home diorama waits for the page load event before booting the heavy three scene", () => {
  assert.ok(homeDiorama.includes('import { mountHomeDioramaBoot } from "./homeDioramaBoot.js";'));
  assert.ok(homeDiorama.includes('data-home-visible="false"'));
  assert.ok(homeDiorama.includes('data-cue-mode="loading"'));
  assert.equal(homeDiorama.includes("requestIdleCallback"), false);
  assert.equal(homeDiorama.includes("cancelIdleCallback"), false);
  assert.equal(homeDiorama.includes("requestAnimationFrame(() => {"), false);

  assert.ok(homeDioramaBoot.includes('window.addEventListener("load", handleWindowLoad, { once: true });'));
  assert.ok(homeDioramaBoot.includes("window.setTimeout(startBoot, HOME_DIORAMA_BOOT_DELAY_MS)"));
  assert.ok(homeDioramaBoot.includes("document.addEventListener(\"click\", handleNavigationIntent, true);"));
  assert.ok(homeDioramaBoot.includes("window[HOME_DIORAMA_MODULE_KEY] ??= importDiorama();"));
  assert.ok(homeDioramaBoot.includes('document.querySelector("[data-home-scene]")'));
  assert.equal(homeDiorama.includes('import { initDiorama } from "./diorama";'), false);
});

test("home diorama cleanup removes pointer listeners with stable handler references", () => {
  assert.ok(dioramaModule.includes("const pointerLeaveHandler = () => {"));
  assert.ok(dioramaModule.includes('canvasEl.addEventListener("pointerleave", pointerLeaveHandler);'));
  assert.ok(dioramaModule.includes('canvasEl.removeEventListener("pointerleave", pointerLeaveHandler);'));
});

test("collection and filter pages keep static shells while deferring hydration to the second stage", () => {
  assert.ok(filteredPage.includes("client:idle"));
  assert.equal(filteredPage.includes("client:load"), false);

  assert.ok(projectsPage.includes("client:idle"));
  assert.equal(projectsPage.includes("requestJsonFromServerHandler"), false);
  assert.equal(projectsPage.includes("client:load"), false);

  assert.ok(booksPage.includes("client:idle"));
  assert.equal(booksPage.includes("requestJsonFromServerHandler"), false);
  assert.equal(booksPage.includes("client:load"), false);

  assert.ok(moviesPage.includes("client:idle"));
  assert.equal(moviesPage.includes("requestJsonFromServerHandler"), false);
  assert.equal(moviesPage.includes("client:load"), false);

  assert.ok(albumsPage.includes("client:idle"));
  assert.equal(albumsPage.includes("requestJsonFromServerHandler"), false);
  assert.equal(albumsPage.includes("client:load"), false);
});
