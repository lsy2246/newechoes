import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const headerSource = readFileSync("src/components/Header.astro", "utf8");
const searchSource = readFileSync("src/components/Search.tsx", "utf8");
const filterSource = readFileSync("src/components/ArticleFilter.tsx", "utf8");

test("header search mounts lazily after page resources settle and still allows early acceleration", () => {
  assert.match(headerSource, /requestIdleCallback/);
  assert.match(headerSource, /window\.addEventListener\("load"/);
  assert.match(headerSource, /ensureSearchMounted\(slot,\s*\{\s*focus:\s*false/);
  assert.match(headerSource, /data-search-activate="desktop"/);
  assert.match(headerSource, /readonly/);
});

test("search component delegates runtime concerns to the search controller", () => {
  assert.match(searchSource, /useSearchController/);
  assert.match(searchSource, /@\/lib\/search\/controller/);
  assert.doesNotMatch(searchSource, /@\/lib\/wasmWorkerClient/);
  assert.doesNotMatch(searchSource, /initSearchIndex/);
});

test("filter component uses the dedicated filter client instead of the mixed worker client", () => {
  assert.match(filterSource, /@\/lib\/filter\/client/);
  assert.doesNotMatch(filterSource, /@\/lib\/wasmWorkerClient/);
});

test("search and filter responsibilities are split into dedicated lib files", () => {
  for (const path of [
    "src/lib/search/controller.ts",
    "src/lib/search/client.ts",
    "src/lib/search/worker.ts",
    "src/lib/search/prewarm.ts",
    "src/lib/search/types.ts",
    "src/lib/filter/client.ts",
    "src/lib/filter/worker.ts",
    "src/lib/filter/types.ts",
  ]) {
    assert.equal(existsSync(path), true, `${path} should exist`);
  }
});

test("legacy mixed worker compatibility files are fully removed", () => {
  for (const path of [
    "src/lib/wasmWorkerClient.ts",
    "src/lib/wasm-worker.ts",
    "src/lib/article-index-runtime.js",
  ]) {
    assert.equal(existsSync(path), false, `${path} should be removed`);
  }
});
