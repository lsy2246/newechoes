import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const modal = readFileSync("src/components/GlobalGraphModal.astro", "utf8");
const headerCss = readFileSync("src/styles/header.css", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");
const runtime = readFileSync("src/lib/global-graph-modal.ts", "utf8");

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
  assert.match(cssBlock(".graph-tree-link.is-current"), /background:\s*transparent;/);
  assert.match(cssBlock(".graph-tree-link.is-current"), /box-shadow:\s*none;/);
  assert.match(cssBlock(".graph-tree-link-section.is-current::before"), /background:\s*transparent;/);
  assert.match(cssBlock(".graph-tree-link-article.is-current::before"), /background:\s*var\(--graph-accent\);/);
  assert.match(cssBlock(".graph-tree-count"), /border-radius:\s*9999px;/);
});

test("global graph runtime separates drag from click and adds subtle drift", () => {
  assert.match(runtime, /const GRAPH_CLICK_THRESHOLD_PX\s*=\s*4;/);
  assert.match(runtime, /const GRAPH_DRAG_THRESHOLD_PX\s*=\s*5;/);
  assert.match(runtime, /hasDragged:\s*boolean;/);
  assert.match(runtime, /pointerDownState\.hasDragged\s*=\s*true;/);
  assert.match(runtime, /!pointerDownState\.hasDragged/);
  assert.match(runtime, /createAmbientDriftForce/);
  assert.match(runtime, /\.force\(\s*"ambientDrift"/);
});

test("global graph runtime draws readable canvas links", () => {
  assert.match(runtime, /const GRAPH_LINK_ALPHA\s*=\s*\{/);
  assert.match(runtime, /structure:\s*0\.46/);
  assert.match(runtime, /reference:\s*0\.34/);
  assert.match(runtime, /focusStructure:\s*0\.9/);
  assert.match(runtime, /current:\s*0\.95/);
  assert.match(runtime, /const GRAPH_LINK_WIDTH\s*=\s*\{/);
  assert.match(runtime, /structure:\s*1\.35/);
  assert.match(runtime, /reference:\s*1\.1/);
  assert.match(runtime, /current:\s*2\.15/);
  assert.match(runtime, /Math\.max\(1,\s*Math\.sqrt\(view\.zoom\)\)/);
});
