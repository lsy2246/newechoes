import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const launcher = readFileSync("src/components/GlobalGraphLauncher.astro", "utf8");
const headerCss = readFileSync("src/styles/header.css", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");
const runtime = readFileSync("src/lib/global-graph/modal.ts", "utf8");
const launcherRuntime = readFileSync("src/lib/global-graph/launcher.ts", "utf8");
const articleIndexBuild = readFileSync("src/plugins/article-index/build.js", "utf8");
const articleIndexIntegration = readFileSync("src/plugins/article-index/integration.js", "utf8");
const modal = launcherRuntime;
const tree = launcherRuntime;

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return headerCss.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("global graph removes the point legend and describes intentional interaction", () => {
  assert.equal(modal.includes("global-graph-legend"), false);
  assert.equal(modal.includes("legend-dot"), false);
  assert.match(modal, /拖动画布/);
  assert.match(modal, /拖动节点/);
  assert.match(modal, /点击节点进入文章/);
});

test("global graph launcher stays as one lightweight component while runtime lazy-renders the modal", () => {
  assert.equal(existsSync("src/components/GlobalGraphModal.astro"), false);
  assert.equal(existsSync("src/pages/api/global-graph.json.ts"), false);
  assert.match(launcher, /data-global-graph-root/);
  assert.match(launcher, /@\/lib\/global-graph\/launcher/);
  assert.equal(launcher.includes("GlobalGraphModal"), false);
  assert.equal(launcher.includes("data-global-graph-json"), false);
  assert.equal(launcher.includes('getCollection("articles")'), false);
  assert.match(launcherRuntime, /const GLOBAL_GRAPH_DATA_URL = "\/assets\/index\/global_graph\.json";/);
  assert.match(launcherRuntime, /function renderGlobalGraphModal/);
  assert.equal(launcherRuntime.includes("GLOBAL_GRAPH_FRAGMENT_PATH"), false);
  assert.equal(launcherRuntime.includes("global-graph-modal-fragment"), false);
  assert.match(articleIndexBuild, /global_graph\.json/);
  assert.match(articleIndexBuild, /function buildGlobalGraphIndex/);
  assert.match(articleIndexIntegration, /global_graph\.json/);
});

test("global graph launcher preloads on browser idle through the same cached controller path", () => {
  assert.match(launcher, /const GLOBAL_GRAPH_LAUNCHER_KEY = "__globalGraphLauncherModule";/);
  assert.match(launcher, /const GLOBAL_GRAPH_PRELOAD_KEY = "__globalGraphPreloadScheduled";/);
  assert.match(launcher, /const GLOBAL_GRAPH_CLICK_BOUND_KEY = "__globalGraphLauncherClickBound";/);
  assert.match(launcher, /interface GlobalGraphLauncherWindow extends Window/);
  assert.match(launcher, /const launcherWindow = window as GlobalGraphLauncherWindow;/);
  assert.match(launcher, /function loadGlobalGraphLauncher/);
  assert.match(launcher, /requestIdleCallback/);
  assert.match(launcher, /window\.addEventListener\("load"/);
  assert.match(launcher, /preloadGlobalGraph/);
  assert.match(launcherRuntime, /export async function preloadGlobalGraph\(\)/);
  assert.match(launcherRuntime, /await ensureGlobalGraphController\(\);/);
  assert.match(launcherRuntime, /preloadGlobalGraphRuntime/);
  assert.match(runtime, /function loadForceModule/);
  assert.match(runtime, /export async function preloadGlobalGraphRuntime\(\)/);
  assert.match(launcherRuntime, /graphDataPromise = null;/);
});

test("global graph tree uses compact file-sidebar styling", () => {
  assert.equal(headerCss.includes(".global-graph-legend"), false);
  assert.equal(headerCss.includes(".legend-dot"), false);
  assert.equal(globalCss.includes(".legend-dot"), false);
  assert.equal(headerCss.includes('content: "/";'), false);
  assert.equal(headerCss.includes("content: '/'"), false);

  assert.match(cssBlock(".global-graph-tree-shell"), /scrollbar-gutter:\s*stable;/);
  assert.match(cssBlock(".graph-tree-link"), /min-height:\s*2rem;/);
  assert.match(cssBlock(".graph-tree-link"), /padding:\s*0\.34rem 0\.45rem;/);
  assert.match(cssBlock(".graph-tree-link::before"), /width:\s*2px;/);
  assert.match(cssBlock(".graph-tree-link::before"), /background:\s*transparent;/);
  assert.match(cssBlock(".graph-tree-link:hover"), /box-shadow:\s*none;/);
  assert.match(cssBlock(".graph-tree-link.is-current"), /background:\s*color-mix\(in srgb,\s*var\(--graph-text\) 10%,\s*transparent\);/);
  assert.match(cssBlock(".graph-tree-link.is-current"), /outline:\s*1px solid color-mix\(in srgb,\s*var\(--graph-text\) 18%,\s*transparent\);/);
  assert.match(cssBlock(".graph-tree-link-section.is-current::before"), /background:\s*var\(--graph-accent\);/);
  assert.match(cssBlock(".graph-tree-link-article.is-current::before"), /background:\s*var\(--graph-accent\);/);
  assert.match(cssBlock(".graph-tree-count"), /border-radius:\s*9999px;/);
});

test("global graph section rows keep disclosure, label, and count aligned", () => {
  assert.match(cssBlock(".graph-tree-group"), /grid-template-columns:\s*1\.05rem minmax\(0,\s*1fr\) auto;/);
  assert.match(cssBlock(".graph-tree-summary"), /grid-row:\s*1;/);
  assert.match(cssBlock(".graph-tree-group > .graph-tree-link-section"), /grid-row:\s*1;/);
  assert.match(cssBlock(".graph-tree-count"), /grid-row:\s*1;/);
  assert.match(cssBlock(".graph-tree-children"), /grid-column:\s*2 \/ -1;/);
});

test("global graph text index expands only the current path", () => {
  assert.match(tree, /data-open="false"/);
  assert.match(runtime, /function syncTreeOpenState/);
  assert.equal(modal.includes("const open = level === 0"), false);
  assert.equal(modal.includes("active || level === 0"), false);
  assert.match(tree, /class="graph-tree-link graph-tree-link-article"/);
  assert.match(tree, /class="graph-tree-link graph-tree-link-section"/);
  assert.equal(modal.includes('${active ? " is-active" : ""}'), false);
  assert.equal(runtime.includes('element.classList.toggle("is-active"'), false);
  assert.equal(runtime.includes("element.open = active || !sectionPath.includes"), false);
});

test("global graph section summaries do not contain interactive links", () => {
  assert.match(tree, /data-tree-disclosure/);
  assert.match(tree, /class="graph-tree-summary"/);
  assert.match(tree, /class="graph-tree-link graph-tree-link-section"/);
});

test("global graph text index is lazy-rendered without extra Astro tree components", () => {
  assert.equal(existsSync("src/components/GlobalGraphTree.astro"), false);
  assert.equal(existsSync("src/components/GlobalGraphTreeSection.astro"), false);
  assert.equal(existsSync("src/components/GlobalGraphTreeArticle.astro"), false);
  assert.equal(existsSync("src/components/GlobalGraphModal.astro"), false);
  assert.match(launcherRuntime, /function renderGlobalGraphTree/);
  assert.match(launcherRuntime, /function renderSection/);
  assert.match(launcherRuntime, /function renderArticle/);
  assert.equal(existsSync("src/components/GlobalGraphTree.astro"), false);
  assert.equal(tree.includes("GlobalGraphTreeSection.astro"), false);
  assert.equal(tree.includes("GlobalGraphTreeArticle.astro"), false);
});

test("global graph text index separates article routes from title identities", () => {
  assert.match(articleIndexBuild, /identity:\s*article\.title/);
  assert.match(articleIndexBuild, /id:\s*article\.routeId/);
  assert.match(articleIndexBuild, /route:\s*getCanonicalArticleUrl\(article\.routeId\)/);
  assert.match(articleIndexBuild, /target:\s*`article:\$\{sourceArticle\.title\}`/);
  assert.match(launcherRuntime, /data-article-id="\$\{escapeHtml\(article\.id\)\}"/);
  assert.match(launcherRuntime, /data-node-target="\$\{nodeTarget\}"/);
  assert.match(launcherRuntime, /data\.structure\.articles\.map/);
  assert.equal(modal.includes("currentArticleId={currentArticle?.id}"), false);
});

test("global graph keeps the text index expanded after canvas navigation", () => {
  assert.match(runtime, /function syncTreeOpenState/);
  assert.match(runtime, /node\.sectionPath/);
  assert.match(runtime, /openSectionPaths/);
  assert.match(runtime, /group\.classList\.toggle\("is-open", isOpen\);/);
  assert.match(runtime, /children\.hidden = !isOpen;/);
  assert.match(runtime, /syncTreeOpenState\(currentNodeId\);/);
  assert.match(runtime, /applyCurrentInfo\(getNodeTargetByRoute\(payload\.nodes,\s*normalizedRoute\)\)/);
});

test("global graph shows current location inside the text index and centers it", () => {
  assert.equal(modal.includes("当前位置:"), false);
  assert.equal(modal.includes("data-current-location"), false);
  assert.equal(modal.includes("global-graph-current-link"), false);
  assert.match(runtime, /function syncTreeCurrentItem/);
  assert.match(runtime, /link\.classList\.toggle\("is-current",\s*linkNodeId === nodeId\);/);
  assert.match(runtime, /function centerTreeOnCurrentItem/);
  assert.match(runtime, /treeShell\.scrollTo\(\{/);
  assert.match(runtime, /behavior:\s*"smooth"/);
  assert.match(runtime, /syncTreeCurrentItem\(currentNodeId\);/);
  assert.match(runtime, /centerTreeOnCurrentItem\(\);/);
});

test("global graph runtime separates drag from click and adds subtle drift", () => {
  assert.match(runtime, /const GRAPH_CLICK_THRESHOLD_PX\s*=\s*3;/);
  assert.match(runtime, /const GRAPH_DRAG_THRESHOLD_PX\s*=\s*5;/);
  assert.match(runtime, /const GRAPH_NODE_HIT_PADDING_PX\s*=\s*12;/);
  assert.match(runtime, /hasDragged:\s*boolean;/);
  assert.match(runtime, /dragOffsetX:\s*number;/);
  assert.match(runtime, /dragOffsetY:\s*number;/);
  assert.match(runtime, /pointerDownState\.hasDragged\s*=\s*true;/);
  assert.match(runtime, /!pointerDownState\.hasDragged/);
  assert.match(runtime, /dragNode\.fx\s*=\s*pointer\.worldX\s*-\s*pointerDownState\.dragOffsetX;/);
  assert.match(runtime, /pointerMode\s*=\s*node\s*\?\s*"node"\s*:\s*"pan";/);
  assert.match(runtime, /createAmbientDriftForce/);
  assert.match(runtime, /\.force\(\s*"ambientDrift"/);
});

test("global graph keeps the first mobile framing on graph fit instead of forcing current-node recenter", () => {
  assert.equal(runtime.includes("centerOnNode(currentNodeId, true);"), false);
  assert.equal(runtime.includes("runtime.setCurrentNode(currentNodeId, true);"), false);
  assert.match(runtime, /currentNodeId = getCurrentNodeId\(\);\s*resize\(\);\s*render\(\);/);
  assert.match(runtime, /runtime\.setCurrentNode\(currentNodeId\);/);
  assert.match(runtime, /graphRuntime\?\.setCurrentNode\(currentNodeId\);/);
});

test("global graph canvas opts into touch-owned dragging on mobile", () => {
  assert.match(cssBlock(".global-graph-canvas"), /touch-action:\s*none;/);
  assert.match(cssBlock(".global-graph-canvas"), /overscroll-behavior:\s*contain;/);
  assert.match(runtime, /function finishPointerInteraction/);
  assert.match(runtime, /canvas\.addEventListener\("pointercancel", finishPointerInteraction\);/);
});

test("global graph hides floating node labels on mobile graph viewports", () => {
  assert.match(runtime, /const compactViewport = view\.width <= 900;/);
  assert.match(runtime, /node\.labelElement\.classList\.toggle\("is-visible", !compactViewport && showLabel\);/);
  assert.match(
    headerCss,
    /@media \(max-width: 900px\) \{[\s\S]*?\.global-graph-label-layer\s*\{[\s\S]*?display:\s*none;/
  );
  assert.equal(runtime.includes("function getLabelTransform"), false);
});

test("global graph runtime draws readable canvas links", () => {
  assert.match(runtime, /const GRAPH_LINK_ALPHA\s*=\s*\{/);
  assert.match(runtime, /structure:\s*0\.38/);
  assert.match(runtime, /reference:\s*0\.18/);
  assert.match(runtime, /focusStructure:\s*0\.9/);
  assert.match(runtime, /current:\s*0\.95/);
  assert.match(runtime, /const GRAPH_LINK_WIDTH\s*=\s*\{/);
  assert.match(runtime, /structure:\s*1\.35/);
  assert.match(runtime, /reference:\s*1\.1/);
  assert.match(runtime, /current:\s*2\.15/);
  assert.match(runtime, /Math\.max\(1,\s*Math\.sqrt\(view\.zoom\)\)/);
});

test("global graph avoids decorative purple glow and pulse effects", () => {
  assert.equal(runtime.includes("drawSignalLinks"), false);
  assert.equal(runtime.includes("createLinearGradient"), false);
  assert.equal(runtime.includes("setLineDash"), false);
  assert.equal(runtime.includes("performance.now()"), false);
  assert.equal(runtime.includes("accentGlow"), false);
  assert.equal(runtime.includes("shadowBlur"), false);
  assert.equal(headerCss.includes("radial-gradient(circle at 52% 48%"), false);
  assert.equal(headerCss.includes("--graph-accent-glow"), false);
  assert.equal(headerCss.includes("--graph-accent-soft"), false);
});

test("global graph runtime softens radial clusters into neural clouds", () => {
  assert.match(runtime, /const GRAPH_CLUSTER_ROW_SPACING/);
  assert.match(runtime, /const GRAPH_CLUSTER_CLOUD_JITTER/);
  assert.match(runtime, /const GRAPH_LINK_CURVE/);
  assert.match(runtime, /cloudAngle/);
  assert.match(runtime, /childDistance/);
  assert.match(runtime, /siblingOffset/);
});

test("global graph runtime supports arbitrary-depth recursive layout anchors", () => {
  assert.match(runtime, /depth:\s*number;/);
  assert.match(runtime, /parentId:\s*string\s*\|\s*null;/);
  assert.match(runtime, /siblingIndex:\s*number;/);
  assert.match(runtime, /siblingCount:\s*number;/);
  assert.match(runtime, /const GRAPH_RECURSIVE_LAYOUT/);
  assert.match(runtime, /assignRecursiveLayoutMetadata/);
  assert.match(runtime, /createRecursiveAnchors/);
  assert.match(runtime, /depthFalloff/);
  assert.match(runtime, /minBranchDistance/);
  assert.match(runtime, /childSpread/);
});

test("global graph force distances scale by recursive hierarchy instead of fixed tiers", () => {
  assert.match(runtime, /getStructureLinkDistance/);
  assert.match(runtime, /Math\.abs\(link\.source\.depth\s*-\s*link\.target\.depth\)/);
  assert.match(runtime, /link\.target\.siblingCount/);
  assert.equal(runtime.includes("link.source.type === \"root\" || link.target.type === \"root\""), false);
});

test("global graph keeps backlink references from tangling the structural layout", () => {
  assert.match(runtime, /structureLinks:\s*runtimeLinks\.filter/);
  assert.match(runtime, /referenceLinks:\s*runtimeLinks\.filter/);
  assert.match(runtime, /forceLink\(structureLinks\)/);
  assert.equal(runtime.includes("forceLink(runtimeLinks)"), false);
  assert.match(runtime, /drawReferenceLinks/);
  assert.match(runtime, /referenceLinks\.forEach/);
  assert.match(runtime, /ctx\.strokeStyle\s*=\s*palette\.reference;/);
});

test("global graph offsets reciprocal backlink curves so they do not overlap", () => {
  assert.match(runtime, /getReferencePairDirection/);
  assert.match(runtime, /const pairKey/);
  assert.match(runtime, /referencePairDirections/);
  assert.match(runtime, /link\.kind === "reference"/);
});

test("global graph keeps backlink references visible as a subtle purple accent", () => {
  assert.match(runtime, /reference:\s*isDark\s*\?\s*"rgba\(170,\s*138,\s*255,\s*0\.74\)"/);
  assert.match(runtime, /reference:\s*0\.18/);
  assert.match(runtime, /isCurrent\s*\?\s*GRAPH_LINK_ALPHA\.focusReference\s*:\s*isFocused\s*\?\s*GRAPH_LINK_ALPHA\.focusReference\s*:\s*GRAPH_LINK_ALPHA\.reference/);
  assert.match(runtime, /ctx\.strokeStyle\s*=\s*palette\.reference;/);
  assert.equal(runtime.includes("if (!isFocused && !isCurrent) return;"), false);
});

test("global graph styles keep the canvas neutral and non-glowy", () => {
  assert.match(cssBlock(".global-graph-dialog"), /--graph-accent:\s*var\(--graph-text\);/);
  assert.match(cssBlock("[data-theme=\"dark\"] .global-graph-dialog"), /--graph-accent:\s*var\(--graph-text\);/);
  assert.match(cssBlock(".global-graph-stage-canvas"), /background:\s*transparent;/);
});

test("global graph stacked mobile layout separates the 2D stage with a rule above the heading", () => {
  assert.match(
    headerCss,
    /@media \(max-width: 900px\) \{[\s\S]*?\.global-graph-stage\s*\{[\s\S]*?padding-top:\s*0\.95rem;/
  );
  assert.match(
    headerCss,
    /@media \(max-width: 900px\) \{[\s\S]*?\.global-graph-stage\s*\{[\s\S]*?border-top:\s*1px solid var\(--graph-border\);/
  );
});
