import assert from "node:assert/strict";
import test from "node:test";

import { shouldIncludeSitemapPage } from "../src/lib/sitemap-pages.js";

test("sitemap excludes non-public routes", () => {
  assert.equal(shouldIncludeSitemapPage({ pathname: "/404" }), false);
  assert.equal(shouldIncludeSitemapPage({ pathname: "/404/" }), false);
  assert.equal(shouldIncludeSitemapPage({ pathname: "/api/photos" }), false);
  assert.equal(shouldIncludeSitemapPage({ pathname: "/global-graph-modal-fragment" }), false);
});

test("sitemap keeps public pages and articles", () => {
  assert.equal(shouldIncludeSitemapPage({ pathname: "/" }), true);
  assert.equal(shouldIncludeSitemapPage({ pathname: "/articles" }), true);
  assert.equal(shouldIncludeSitemapPage({ pathname: "/articles/ai使用" }), true);
  assert.equal(shouldIncludeSitemapPage({ pathname: "/about" }), true);
});
