# Article Media Viewer Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing editor-like media viewer chrome with the approved minimal full-screen presentation while preserving zoom behavior and adapting to light/dark themes, touch input, safe areas, and short landscape viewports.

**Architecture:** Keep the existing transform helpers and controller lifecycle. Simplify only the dialog markup, make the dialog root the backdrop-click surface, add `visualViewport` resize handling, and replace the viewer stylesheet with transparent full-screen positioning and theme-derived on-backdrop tokens.

**Tech Stack:** Astro 6, TypeScript, native `<dialog>`, Pointer Events, CSS custom properties, Node test runner, Playwright browser smoke testing.

---

## File Structure

- Modify `test/article-media-viewer.test.mjs`: contract-test minimal chrome, theme tokens, safe areas, touch targets, compact viewports, and `visualViewport` handling.
- Modify `src/lib/article-media-viewer.ts`: remove shell/header/visible label markup and subscribe to mobile visual viewport resize.
- Modify `src/styles/articles-media-viewer.css`: implement the approved borderless overlay, bare controls, theme adaptation, safe-area layout, coarse-pointer targets, and short-viewport rules.
- Keep `src/lib/article-media-transform.ts` unchanged: fit, pan, and anchored zoom geometry already satisfies the approved behavior.

### Task 1: Lock the Minimal and Adaptive Contracts

**Files:**
- Modify: `test/article-media-viewer.test.mjs`
- Test: `test/article-media-viewer.test.mjs`

- [ ] **Step 1: Replace the existing final style test and add the resize contract**

Replace `viewer styles keep desktop controls compact and mobile controls reachable` with:

```js
test("viewer markup and styles use minimal full-screen chrome", () => {
  assert.equal(viewer.includes("article-media-viewer__shell"), false);
  assert.equal(viewer.includes("article-media-viewer__head"), false);
  assert.equal(viewer.includes("article-media-viewer__label"), false);
  assert.ok(viewer.includes("article-media-viewer__close"));
  assert.ok(viewer.includes("article-media-viewer__controls"));

  assert.match(
    styles,
    /\.article-media-viewer__stage\s*\{[^}]*background:\s*transparent;/s,
  );
  assert.equal(styles.includes("linear-gradient"), false);
  assert.equal(styles.includes("border-radius: 0.75rem"), false);
  assert.equal(styles.includes("box-shadow: 0 1.5rem 5rem"), false);
});

test("viewer styles adapt to themes, safe areas, touch, and short viewports", () => {
  assert.ok(styles.includes("--article-media-viewer-on-backdrop"));
  assert.ok(styles.includes('[data-theme="dark"] .article-media-viewer'));
  assert.ok(styles.includes("env(safe-area-inset-top)"));
  assert.ok(styles.includes("env(safe-area-inset-right)"));
  assert.ok(styles.includes("env(safe-area-inset-bottom)"));
  assert.ok(styles.includes("env(safe-area-inset-left)"));
  assert.match(styles, /min-width:\s*2\.75rem/);
  assert.match(styles, /height:\s*2\.75rem/);
  assert.ok(styles.includes("@media (pointer: coarse)"));
  assert.ok(styles.includes("@media (max-height: 32rem)"));
  assert.ok(styles.includes("touch-action: none"));
});

test("viewer refits when the mobile visual viewport changes", () => {
  assert.ok(
    viewer.includes(
      'window.visualViewport?.addEventListener("resize", resetTransform',
    ),
  );
});
```

- [ ] **Step 2: Run the focused test and verify it fails for the old chrome**

Run:

```powershell
node --experimental-strip-types --test test/article-media-viewer.test.mjs
```

Expected: FAIL because the current markup still contains shell/head/label elements, the stage still has a grid, safe-area coverage is incomplete, and no `visualViewport` listener exists.

### Task 2: Implement the Minimal Viewer

**Files:**
- Modify: `src/lib/article-media-viewer.ts`
- Modify: `src/styles/articles-media-viewer.css`
- Test: `test/article-media-viewer.test.mjs`

- [ ] **Step 1: Replace `VIEWER_MARKUP` with the shell-free structure**

Use:

```ts
const VIEWER_MARKUP = `
  <button class="article-media-viewer__button article-media-viewer__close" type="button" aria-label="关闭" data-media-viewer-action="close">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
  </button>
  <div class="article-media-viewer__stage" tabindex="0" aria-label="可缩放媒体区域" data-media-viewer-stage>
    <div class="article-media-viewer__media" data-media-viewer-media></div>
    <p class="article-media-viewer__hint">滚轮或双指缩放 · 拖拽移动 · Esc 关闭</p>
  </div>
  <div class="article-media-viewer__controls" aria-label="缩放控制">
    <button class="article-media-viewer__button" type="button" aria-label="缩小" data-media-viewer-action="zoom-out">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
    </button>
    <output class="article-media-viewer__scale" data-media-viewer-scale>100%</output>
    <button class="article-media-viewer__button" type="button" aria-label="放大" data-media-viewer-action="zoom-in">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </button>
    <button class="article-media-viewer__button article-media-viewer__reset" type="button" aria-label="复位" data-media-viewer-action="reset">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6M20 20v-6h-6M5.8 15.5A7 7 0 0 0 17.7 18M18.2 8.5A7 7 0 0 0 6.3 6" /></svg>
      <span>复位</span>
    </button>
  </div>
`;
```

- [ ] **Step 2: Remove the obsolete label dependency**

Delete:

```ts
const label = dialog.querySelector<HTMLElement>("[data-media-viewer-label]");
```

Change the guard to:

```ts
if (!stage || !media || !scaleOutput || !controls) {
  dialog.remove();
  return;
}
```

Delete the `imageDescription` declaration and the `label.textContent = ...` assignment in `openViewer`. Keep the dynamic dialog `aria-label` assignment so screen readers still receive either “Mermaid 图表查看器” or “图片查看器”.

- [ ] **Step 3: Add mobile visual viewport resize handling**

Immediately after the existing window resize listener, add:

```ts
window.visualViewport?.addEventListener("resize", resetTransform, { signal });
```

The existing early return in `resetTransform` makes this safe while the dialog is closed, and aborting the controller signal removes both resize listeners during cleanup.

- [ ] **Step 4: Replace `articles-media-viewer.css` with the minimal adaptive stylesheet**

Use:

```css
.article-prose img[data-article-media-zoomable="true"],
.article-prose pre.mermaid[data-article-media-zoomable="true"] {
  cursor: zoom-in;
  transition:
    box-shadow 180ms ease,
    outline-color 180ms ease;
}

@media (hover: hover) {
  .article-prose img[data-article-media-zoomable="true"]:hover,
  .article-prose pre.mermaid[data-article-media-zoomable="true"]:hover {
    box-shadow: 0 0 0 1px var(--article-interactive-line);
  }
}

.article-prose img[data-article-media-zoomable="true"]:focus-visible,
.article-prose pre.mermaid[data-article-media-zoomable="true"]:focus-visible {
  outline: 2px solid var(--article-interactive-focus);
  outline-offset: 5px;
}

html.article-media-viewer-open,
html.article-media-viewer-open body {
  overflow: hidden;
  overscroll-behavior: none;
}

.article-media-viewer {
  --article-media-viewer-backdrop: color-mix(in oklab, #050505 80%, transparent);
  --article-media-viewer-on-backdrop: var(--article-bg);
  --article-media-viewer-on-backdrop-muted: color-mix(
    in oklab,
    var(--article-bg) 62%,
    transparent
  );
  position: fixed;
  inset: 0;
  box-sizing: border-box;
  width: 100vw;
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
  color: var(--article-media-viewer-on-backdrop);
  border: 0;
  background: transparent;
}

[data-theme="dark"] .article-media-viewer {
  --article-media-viewer-backdrop: color-mix(in oklab, #000 88%, transparent);
  --article-media-viewer-on-backdrop: var(--article-ink);
  --article-media-viewer-on-backdrop-muted: color-mix(
    in oklab,
    var(--article-ink) 62%,
    transparent
  );
}

.article-media-viewer[open] {
  display: block;
}

.article-media-viewer::backdrop {
  background: var(--article-media-viewer-backdrop);
  backdrop-filter: blur(2px);
}

.article-media-viewer__stage {
  position: absolute;
  inset:
    calc(env(safe-area-inset-top) + 3.25rem)
    max(calc(env(safe-area-inset-right) + 0.75rem), 2vw)
    calc(env(safe-area-inset-bottom) + 4.25rem)
    max(calc(env(safe-area-inset-left) + 0.75rem), 2vw);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  outline: none;
  background: transparent;
  overscroll-behavior: contain;
}

.article-media-viewer__stage.is-dragging {
  cursor: grabbing;
}

.article-media-viewer__stage:focus-visible {
  box-shadow: inset 0 0 0 2px var(--article-media-viewer-on-backdrop);
}

.article-media-viewer__media {
  position: absolute;
  inset: 0;
}

.article-media-viewer__media > :is(img, svg) {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  max-width: none !important;
  max-height: none !important;
  margin: 0;
  user-select: none;
  pointer-events: none;
  transform-origin: 0 0;
  will-change: transform;
}

.article-media-viewer__media > img {
  object-fit: contain;
}

.article-media-viewer__media.mermaid > svg {
  background: var(--article-bg);
}

.article-media-viewer__hint {
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 1;
  margin: 0;
  color: var(--article-media-viewer-on-backdrop-muted);
  font-family: var(--font-ui);
  font-size: 0.72rem;
  line-height: 1.2;
  pointer-events: none;
}

.article-media-viewer__controls {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom) + 0.4rem);
  left: 50%;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.15rem;
  transform: translateX(-50%);
}

.article-media-viewer__button {
  display: inline-flex;
  min-width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0 0.55rem;
  color: var(--article-media-viewer-on-backdrop);
  border: 0;
  border-radius: 0;
  background: transparent;
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1;
  cursor: pointer;
  opacity: 0.68;
  transition: opacity 160ms ease;
}

@media (hover: hover) {
  .article-media-viewer__button:hover {
    opacity: 1;
  }
}

.article-media-viewer__button:focus-visible {
  outline: 2px solid var(--article-media-viewer-on-backdrop);
  outline-offset: 1px;
  opacity: 1;
}

.article-media-viewer__button svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.article-media-viewer__close {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 0.45rem);
  right: calc(env(safe-area-inset-right) + 0.45rem);
  z-index: 2;
}

.article-media-viewer__scale {
  display: inline-grid;
  min-width: 3rem;
  height: 2.75rem;
  place-items: center;
  color: var(--article-media-viewer-on-backdrop-muted);
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

@media (pointer: coarse) {
  .article-media-viewer__button,
  .article-media-viewer__scale {
    min-height: 3rem;
  }

  .article-media-viewer__button {
    min-width: 3rem;
  }
}

@media (max-width: 640px) {
  .article-media-viewer__stage {
    inset:
      calc(env(safe-area-inset-top) + 3.25rem)
      calc(env(safe-area-inset-right) + 0.5rem)
      calc(env(safe-area-inset-bottom) + 4.5rem)
      calc(env(safe-area-inset-left) + 0.5rem);
  }

  .article-media-viewer__hint {
    display: none;
  }

  .article-media-viewer__controls {
    gap: 0;
  }
}

@media (max-height: 32rem) {
  .article-media-viewer__stage {
    inset:
      calc(env(safe-area-inset-top) + 2.75rem)
      calc(env(safe-area-inset-right) + 0.5rem)
      calc(env(safe-area-inset-bottom) + 3.75rem)
      calc(env(safe-area-inset-left) + 0.5rem);
  }

  .article-media-viewer__close {
    top: calc(env(safe-area-inset-top) + 0.15rem);
  }

  .article-media-viewer__controls {
    bottom: calc(env(safe-area-inset-bottom) + 0.1rem);
  }

  .article-media-viewer__hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .article-prose img[data-article-media-zoomable="true"],
  .article-prose pre.mermaid[data-article-media-zoomable="true"],
  .article-media-viewer__button {
    transition: none;
  }
}
```

- [ ] **Step 5: Run focused viewer and transform tests**

Run:

```powershell
node --experimental-strip-types --test test/article-media-viewer.test.mjs test/article-media-transform.test.mjs
```

Expected: all viewer and transform tests pass.

- [ ] **Step 6: Commit the implementation**

```powershell
git add src/lib/article-media-viewer.ts src/styles/articles-media-viewer.css test/article-media-viewer.test.mjs
git commit -m "feat: simplify article media viewer"
```

### Task 3: Verify Themes, Devices, and Integration

**Files:**
- Modify only files required by a reproducible verification failure.

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
bun run test
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run Astro static checks**

Run:

```powershell
bunx astro check
```

Expected: zero errors. Existing non-blocking hints may remain.

- [ ] **Step 3: Run the production build**

Run:

```powershell
bun run build
```

Expected: exit code 0 and the demo article route is generated.

- [ ] **Step 4: Smoke-test the viewer in the browser matrix**

Start the existing feature worktree:

```powershell
bunx astro dev --host 127.0.0.1 --port 4322
```

Open `/articles/图文与-mermaid-放大查看` and verify both the raster image and Mermaid diagram in:

- Light and dark themes at 1440 by 900.
- Light and dark themes at 1024 by 768.
- Light and dark themes at 390 by 844 with touch emulation.
- Light and dark themes at 844 by 390 with touch emulation.

For every viewport, verify: click or Enter opens; initial media does not overlap close or zoom controls; wheel or pinch zoom works; pointer drag works; reset refits; Escape, explicit close, and outer backdrop close work; focus returns to the source; no control is clipped by safe areas; no horizontal page overflow appears; reduced-motion disables transitions.

- [ ] **Step 5: Review the final diff**

Run:

```powershell
git diff master...HEAD --check
git status --short
```

Expected: no whitespace errors and no uncommitted implementation files.
