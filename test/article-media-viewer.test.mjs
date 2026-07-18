import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const readOptional = (path) =>
  existsSync(path) ? readFileSync(path, "utf8") : "";

const viewer = readOptional("src/lib/article-media-viewer.ts");
const styles = readOptional("src/styles/articles-media-viewer.css");
const articleStyles = readFileSync("src/styles/articles.css", "utf8");
const articlePage = readFileSync("src/pages/articles/[...id].astro", "utf8");
const swup = readFileSync("src/components/swup.js", "utf8");

test("viewer targets standalone images and ready Mermaid diagrams", () => {
  assert.ok(viewer.includes('querySelectorAll<HTMLImageElement>("img")'));
  assert.ok(
    viewer.includes('pre.mermaid[data-mermaid-state="ready"]'),
  );
  assert.ok(viewer.includes('querySelectorAll<HTMLPreElement>("pre.mermaid")'));
  assert.ok(viewer.includes('closest("a, button")'));
  assert.ok(viewer.includes("data-article-media-zoomable"));
  assert.ok(viewer.includes("restoreMediaDecoration"));
  assert.ok(viewer.includes("decorationStates"));
});

test("viewer exposes native modal and keyboard controls", () => {
  assert.ok(viewer.includes('document.createElement("dialog")'));
  assert.ok(viewer.includes('event.key === "Enter"'));
  assert.ok(viewer.includes('event.key === "Escape"'));
  assert.ok(viewer.includes('aria-label="放大"'));
  assert.ok(viewer.includes('aria-label="缩小"'));
  assert.ok(viewer.includes('aria-label="复位"'));
  assert.ok(viewer.includes('aria-label="关闭"'));
  assert.equal(viewer.includes('aria-live="polite"'), false);
  assert.ok(styles.includes(":focus-visible"));
  assert.ok(styles.includes("prefers-reduced-motion: reduce"));
});

test("viewer supports anchored wheel zoom and pointer gestures", () => {
  assert.match(viewer, /addEventListener\(\s*"wheel"/);
  assert.match(viewer, /addEventListener\(\s*"pointerdown"/);
  assert.match(viewer, /addEventListener\(\s*"pointermove"/);
  assert.ok(viewer.includes("zoomMediaAtPoint"));
  assert.ok(viewer.includes("clampMediaTransform"));
});

test("viewer rewrites cloned Mermaid ids and cleans navigation state", () => {
  assert.ok(viewer.includes("cloneMermaidSvg"));
  assert.ok(viewer.includes("rewriteSvgFragmentReferences"));
  assert.ok(viewer.includes("__articleMediaViewerCleanup"));
  assert.ok(viewer.includes('"astro:before-swap"'));
  assert.match(
    viewer,
    /addEventListener\(\s*"swup:visit:start",\s*closeViewerForNavigation/,
  );
  assert.ok(viewer.includes("restoreFocusAfterClose"));
  assert.match(
    viewer,
    /addEventListener\(\s*"swup:content:replace",\s*cleanup/,
  );
  assert.ok(viewer.includes("decoratedSources.forEach"));
  assert.ok(viewer.includes("observer.disconnect()"));
  assert.ok(viewer.includes("abortController.abort()"));
  assert.ok(viewer.includes("releasePageScrollLock"));
  assert.ok(viewer.includes("dialog.remove()"));
});

test("article and Swup lifecycles boot the viewer", () => {
  assert.ok(articlePage.includes("initArticleMediaViewer"));
  assert.ok(swup.includes("scheduleArticleMediaViewerBoot"));
  assert.ok(swup.includes("import('../lib/article-media-viewer.ts')"));
  assert.ok(articleStyles.includes('@import "./articles-media-viewer.css";'));
});

test("viewer markup and styles use minimal full-screen chrome", () => {
  assert.equal(viewer.includes("article-media-viewer__shell"), false);
  assert.equal(viewer.includes("article-media-viewer__head"), false);
  assert.equal(viewer.includes("article-media-viewer__label"), false);
  assert.ok(viewer.includes("article-media-viewer__close"));
  assert.ok(viewer.includes("article-media-viewer__controls"));
  assert.match(styles, /\.article-media-viewer__stage\s*\{[^}]*background:\s*transparent;/s);
  assert.equal(styles.includes("linear-gradient"), false);
  assert.equal(styles.includes("border-radius: 0.75rem"), false);
  assert.equal(styles.includes("box-shadow: 0 1.5rem 5rem"), false);
  assert.equal(viewer.includes("滚轮或双指缩放"), false);
  assert.equal(viewer.includes("article-media-viewer__hint"), false);
  assert.equal(styles.includes("article-media-viewer__hint"), false);
});

test("enlarged Mermaid diagrams keep a quiet theme background with breathing room", () => {
  assert.match(
    viewer,
    /document\.createElementNS\(\s*"http:\/\/www\.w3\.org\/2000\/svg",\s*"rect"/,
  );
  assert.ok(viewer.includes("article-media-viewer__mermaid-background"));
  assert.match(
    styles,
    /\.article-media-viewer__media\.mermaid\s*>\s*svg\s*\{[^}]*box-shadow:\s*0 0 0 1rem var\(--article-bg\);/s,
  );
  assert.match(
    styles,
    /\.article-media-viewer__mermaid-background\s*\{[^}]*fill:\s*var\(--article-bg\);/s,
  );
});

test("Mermaid zoom redraws the SVG instead of scaling a composited bitmap", () => {
  assert.ok(viewer.includes("mediaElement instanceof SVGSVGElement"));
  assert.ok(
    viewer.includes("mediaSize.width * transform.scale"),
  );
  assert.ok(
    viewer.includes("mediaSize.height * transform.scale"),
  );
  assert.ok(viewer.includes("mediaElement.style.left"));
  assert.ok(viewer.includes("mediaElement.style.top"));
  assert.ok(viewer.includes('mediaElement.style.transform = "none"'));
  assert.doesNotMatch(
    styles,
    /\.article-media-viewer__media\s*>\s*:is\(img, svg\)\s*\{[^}]*will-change:\s*transform;/s,
  );
  assert.match(
    styles,
    /\.article-media-viewer__media\s*>\s*img\s*\{[^}]*will-change:\s*transform;/s,
  );
});

test("viewer locks interaction without changing document scroll coordinates", () => {
  assert.ok(viewer.includes("acquirePageScrollLock"));
  assert.ok(viewer.includes("releasePageScrollLock"));
  assert.equal(viewer.includes('body.style.position = "fixed"'), false);
  assert.equal(viewer.includes("window.scrollTo"), false);
  assert.match(
    viewer,
    /class="article-media-viewer__stage"[^>]*autofocus/,
  );
  assert.match(
    styles,
    /\.article-media-viewer\s*\{[^}]*touch-action:\s*none;/s,
  );
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
  assert.ok(viewer.includes('window.visualViewport?.addEventListener("resize", resetTransform'));
});
