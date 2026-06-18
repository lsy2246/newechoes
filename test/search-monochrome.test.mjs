import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const search = readFileSync("src/components/search/Search.tsx", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return globalCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("search input and results use semantic monochrome surfaces", () => {
  assert.ok(search.includes("search-input-control"));
  assert.ok(search.includes("search-results-container"));
  assert.ok(search.includes("search-results-header"));
  assert.ok(search.includes("search-result-item"));
  assert.ok(search.includes("search-result-meta"));
  assert.ok(search.includes("search-mark-scope"));

  for (const staleClass of [
    "bg-white",
    "dark:bg-gray-800",
    "border-gray-300",
    "dark:border-gray-600",
    "shadow-xl",
    "[&_mark]:bg-yellow-200",
    "dark:[&_mark]:bg-yellow-800",
  ]) {
    assert.equal(search.includes(staleClass), false, `${staleClass} should not style search chrome`);
  }

  assert.match(cssBlock(".search-input-control"), /background:\s*transparent;/);
  assert.match(cssBlock(".search-input-control"), /color:\s*var\(--site-ink\);/);
  assert.match(cssBlock(".search-results-container"), /background:\s*var\(--site-bg\);/);
  assert.match(cssBlock(".search-results-container"), /border-color:\s*var\(--site-line\);/);
  assert.match(cssBlock('[data-theme="dark"] .search-results-container'), /background:\s*var\(--site-bg\);/);
  assert.doesNotMatch(cssBlock('[data-theme="dark"] .search-results-container'), /#1e293b|#0f172a|gray-800|slate/);
  assert.match(cssBlock(".search-mark-scope mark"), /background:\s*var\(--site-soft-strong\);/);
});
