# Article Media Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible modal viewer that lets readers zoom and pan standalone article images and rendered Mermaid diagrams.

**Architecture:** Keep transform geometry in a pure TypeScript module and DOM/gesture behavior in a separate article viewer controller. Boot the controller from the article page and after Swup navigation, using the same cleanup discipline as the Mermaid runtime.

**Tech Stack:** Astro 6, TypeScript, native `<dialog>`, Pointer Events, CSS, Node test runner, Playwright smoke testing.

---

## File Structure

- Create `src/lib/article-media-transform.ts`: pure fit, zoom, and clamp calculations.
- Create `src/lib/article-media-viewer.ts`: media discovery, modal lifecycle, SVG cloning, gestures, and accessibility.
- Create `src/styles/articles-media-viewer.css`: article affordances and responsive modal presentation.
- Modify `src/styles/articles.css`: import the viewer stylesheet.
- Modify `src/pages/articles/[...id].astro`: boot the viewer on direct article loads.
- Modify `src/components/swup.js`: reboot the viewer after Swup article navigation.
- Create `test/article-media-transform.test.mjs`: geometry unit tests.
- Create `test/article-media-viewer.test.mjs`: integration contract tests.

### Task 1: Transform Geometry

**Files:**
- Create: `src/lib/article-media-transform.ts`
- Test: `test/article-media-transform.test.mjs`

- [ ] **Step 1: Write the failing geometry tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  clampMediaTransform,
  fitMediaToStage,
  zoomMediaAtPoint,
} from "../src/lib/article-media-transform.ts";

test("fitMediaToStage centers large media inside padded stage", () => {
  assert.deepEqual(
    fitMediaToStage({ width: 1000, height: 500 }, { width: 600, height: 400 }, 20),
    { scale: 0.56, x: 20, y: 60 },
  );
});

test("zoomMediaAtPoint preserves the media point under the cursor", () => {
  const next = zoomMediaAtPoint(
    { scale: 0.5, x: 50, y: 50 },
    { width: 1000, height: 1000 },
    { width: 600, height: 600 },
    { x: 100, y: 100 },
    1,
    0.25,
    4,
  );
  assert.deepEqual(next, { scale: 1, x: 0, y: 0 });
});

test("clampMediaTransform keeps part of oversized media reachable", () => {
  assert.deepEqual(
    clampMediaTransform(
      { scale: 1, x: 300, y: -800 },
      { width: 1000, height: 1000 },
      { width: 600, height: 600 },
    ),
    { scale: 1, x: 48, y: -448 },
  );
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `node --experimental-strip-types --test test/article-media-transform.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `article-media-transform.ts`.

- [ ] **Step 3: Implement the pure geometry API**

```ts
export type MediaSize = { width: number; height: number };
export type MediaPoint = { x: number; y: number };
export type MediaTransform = { scale: number; x: number; y: number };

const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function clampMediaTransform(
  transform: MediaTransform,
  media: MediaSize,
  stage: MediaSize,
  visibleEdge = 48,
): MediaTransform {
  const displayedWidth = media.width * transform.scale;
  const displayedHeight = media.height * transform.scale;
  const x = displayedWidth <= stage.width
    ? (stage.width - displayedWidth) / 2
    : clamp(transform.x, stage.width - visibleEdge - displayedWidth, visibleEdge);
  const y = displayedHeight <= stage.height
    ? (stage.height - displayedHeight) / 2
    : clamp(transform.y, stage.height - visibleEdge - displayedHeight, visibleEdge);
  return { scale: round(transform.scale), x: round(x), y: round(y) };
}

export function fitMediaToStage(media: MediaSize, stage: MediaSize, padding = 24) {
  const scale = Math.min(
    Math.max(1, stage.width - padding * 2) / Math.max(1, media.width),
    Math.max(1, stage.height - padding * 2) / Math.max(1, media.height),
    1,
  );
  return clampMediaTransform({ scale, x: 0, y: 0 }, media, stage);
}

export function zoomMediaAtPoint(
  transform: MediaTransform,
  media: MediaSize,
  stage: MediaSize,
  point: MediaPoint,
  requestedScale: number,
  minimumScale: number,
  maximumScale: number,
) {
  const nextScale = clamp(requestedScale, minimumScale, maximumScale);
  const ratio = nextScale / transform.scale;
  return clampMediaTransform({
    scale: nextScale,
    x: point.x - (point.x - transform.x) * ratio,
    y: point.y - (point.y - transform.y) * ratio,
  }, media, stage);
}
```

- [ ] **Step 4: Run the geometry tests**

Run: `node --experimental-strip-types --test test/article-media-transform.test.mjs`

Expected: 3 tests pass.

### Task 2: Viewer Controller and Styling

**Files:**
- Create: `src/lib/article-media-viewer.ts`
- Create: `src/styles/articles-media-viewer.css`
- Modify: `src/styles/articles.css`
- Modify: `src/pages/articles/[...id].astro`
- Modify: `src/components/swup.js`
- Test: `test/article-media-viewer.test.mjs`

- [ ] **Step 1: Write failing integration contract tests**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const viewer = readFileSync("src/lib/article-media-viewer.ts", "utf8");
const styles = readFileSync("src/styles/articles-media-viewer.css", "utf8");
const articlePage = readFileSync("src/pages/articles/[...id].astro", "utf8");
const swup = readFileSync("src/components/swup.js", "utf8");

test("viewer targets standalone images and ready Mermaid diagrams", () => {
  assert.ok(viewer.includes('img:not(a img):not(button img)'));
  assert.ok(viewer.includes('pre.mermaid[data-mermaid-state="ready"]'));
  assert.ok(viewer.includes("closest(\"a, button\")"));
});

test("viewer exposes modal and keyboard controls", () => {
  assert.ok(viewer.includes('document.createElement("dialog")'));
  assert.ok(viewer.includes('event.key === "Enter"'));
  assert.ok(viewer.includes('event.key === "Escape"'));
  assert.ok(styles.includes(":focus-visible"));
});

test("viewer supports wheel, pointer gestures, and cleanup", () => {
  assert.ok(viewer.includes('addEventListener("wheel"'));
  assert.ok(viewer.includes('addEventListener("pointerdown"'));
  assert.ok(viewer.includes("__articleMediaViewerCleanup"));
  assert.ok(viewer.includes('swup:content:replace'));
});

test("article and Swup lifecycles boot the viewer", () => {
  assert.ok(articlePage.includes("initArticleMediaViewer"));
  assert.ok(swup.includes("scheduleArticleMediaViewerBoot"));
  assert.ok(swup.includes("import('../lib/article-media-viewer.ts')"));
});
```

- [ ] **Step 2: Run the contract test and verify the missing-file failure**

Run: `node --experimental-strip-types --test test/article-media-viewer.test.mjs`

Expected: FAIL because the viewer source and stylesheet do not exist.

- [ ] **Step 3: Implement the viewer controller**

Create a controller exporting `initArticleMediaViewer()`. It must build one native dialog with `.article-media-viewer__shell`, `.article-media-viewer__stage`, `.article-media-viewer__media`, zoom-out, percentage, zoom-in, reset, and close controls. It must decorate only standalone images and ready Mermaid diagrams, remove viewer-owned decoration when Mermaid leaves the ready state, clone Mermaid SVG IDs with an `article-media-viewer-<sequence>-` prefix, calculate fit after insertion, use `zoomMediaAtPoint()` for wheel and pinch gestures, use `clampMediaTransform()` for dragging, restore focus on close, close the dialog without teardown on `swup:visit:start`, and remove observers/listeners/dialog/scroll lock on `astro:before-swap`, `swup:content:replace`, or `beforeunload`.

- [ ] **Step 4: Add the monochrome responsive styles**

Import `articles-media-viewer.css` from `articles.css`. Style zoomable media with `cursor: zoom-in`; style the full-viewport dialog and backdrop; keep the toolbar at the top on desktop and move zoom controls to a safe-area bottom row below 640px; add visible focus rings and reduced-motion overrides.

- [ ] **Step 5: Wire initial and Swup boots**

Add this unconditional article-page module script after the Mermaid boot:

```astro
<script>
  import { initArticleMediaViewer } from "../../lib/article-media-viewer.ts";
  initArticleMediaViewer();
</script>
```

Add `scheduleArticleMediaViewerBoot()` beside the Mermaid scheduler in `swup.js`, dynamically import the controller only when `.article-prose` exists, and call it after `scheduleArticleMermaidBoot()` in the `page:view` hook.

- [ ] **Step 6: Run focused tests**

Run: `node --experimental-strip-types --test test/article-media-transform.test.mjs test/article-media-viewer.test.mjs test/mermaid-loading-contract.test.mjs`

Expected: all focused tests pass.

### Task 3: Full Verification and Browser Smoke Test

**Files:**
- Modify only files required by failures found during verification.

- [ ] **Step 1: Run the full test suite**

Run: `bun run test`

Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `bun run build`

Expected: Astro completes the static build without TypeScript, bundling, or route errors.

- [ ] **Step 3: Smoke-test the existing Mermaid article in a browser**

Run: `bun run dev`, then open the article containing the Mermaid example. Verify click and Enter open the viewer; wheel and buttons change the percentage; dragging moves zoomed content; reset refits; Escape and backdrop close; linked Vercel badge still navigates; and navigating away removes the dialog and scroll lock.

- [ ] **Step 4: Commit the implementation**

```bash
git add src/lib/article-media-transform.ts src/lib/article-media-viewer.ts src/styles/articles-media-viewer.css src/styles/articles.css src/pages/articles/[...id].astro src/components/swup.js test/article-media-transform.test.mjs test/article-media-viewer.test.mjs docs/superpowers/plans/2026-07-17-article-media-viewer.md
git commit -m "feat: add article media viewer"
```
