import assert from "node:assert/strict";
import test from "node:test";

test("filter page state treats out-of-range pages as a pagination correction instead of empty results", async () => {
  const { resolveFilterPageState } = await import("../src/components/article/filter/page-state.js");

  const state = resolveFilterPageState({
    requestedPage: 999,
    totalArticles: 74,
    totalPages: 7,
    pageArticles: [],
  });

  assert.deepEqual(state, {
    effectivePage: 7,
    shouldRefetch: true,
    shouldShowEmptyState: false,
  });
});

test("filter page state keeps true empty results as empty results", async () => {
  const { resolveFilterPageState } = await import("../src/components/article/filter/page-state.js");

  const state = resolveFilterPageState({
    requestedPage: 1,
    totalArticles: 0,
    totalPages: 1,
    pageArticles: [],
  });

  assert.deepEqual(state, {
    effectivePage: 1,
    shouldRefetch: false,
    shouldShowEmptyState: true,
  });
});
