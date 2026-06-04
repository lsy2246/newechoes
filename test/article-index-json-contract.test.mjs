import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchComponent = readFileSync("src/components/Search.tsx", "utf8");
const articleFilter = readFileSync("src/components/ArticleFilter.tsx", "utf8");
const searchWorkerSource = readFileSync("src/lib/search/worker.ts", "utf8");
const filterWorkerSource = readFileSync("src/lib/filter/worker.ts", "utf8");
const searchClientSource = readFileSync("src/lib/search/client.ts", "utf8");
const filterClientSource = readFileSync("src/lib/filter/client.ts", "utf8");
const searchPrewarmSource = readFileSync("src/lib/search/prewarm.ts", "utf8");
const buildPluginSource = readFileSync("src/plugins/article-index/integration.js", "utf8");
const buildHelperSource = readFileSync("src/plugins/article-index/build.js", "utf8");

test("search and filter components initialize JSON index artifacts instead of binary wasm indexes", () => {
  assert.match(searchPrewarmSource, /assets\/index\/search_index\.json/);
  assert.match(articleFilter, /initFilterIndex\("\/assets\/index\/filter_index\.json"\)/);
  assert.doesNotMatch(searchComponent, /search_index\.bin/);
  assert.doesNotMatch(articleFilter, /filter_index\.bin/);
});

test("worker runtime no longer imports wasm glue bundles", () => {
  assert.doesNotMatch(searchWorkerSource, /search_wasm\.js/);
  assert.doesNotMatch(filterWorkerSource, /article_filter\.js/);
  assert.doesNotMatch(searchWorkerSource, /Uint8Array\(await response\.arrayBuffer\(\)\)/);
  assert.doesNotMatch(filterWorkerSource, /Uint8Array\(await response\.arrayBuffer\(\)\)/);
});

test("dedicated search and filter clients each own their worker contracts", () => {
  assert.match(searchClientSource, /new Worker\(new URL\("\.\/worker\.ts", import\.meta\.url\)/);
  assert.match(searchClientSource, /type: "initSearch"/);
  assert.match(searchClientSource, /type: "search"/);
  assert.match(searchClientSource, /type: "suggest"/);
  assert.match(filterClientSource, /new Worker\(new URL\("\.\/worker\.ts", import\.meta\.url\)/);
  assert.match(filterClientSource, /type: "initFilter"/);
  assert.match(filterClientSource, /type: "filter"/);
  assert.match(filterClientSource, /type: "getTags"/);
});

test("build pipeline emits JSON article indexes and does not require wasm runtime artifacts", () => {
  assert.match(buildHelperSource, /search_index\.json/);
  assert.match(buildHelperSource, /filter_index\.json/);
  assert.doesNotMatch(buildPluginSource, /search_index\.bin/);
  assert.doesNotMatch(buildPluginSource, /filter_index\.bin/);
  assert.doesNotMatch(buildPluginSource, /search_wasm_bg\.wasm/);
  assert.doesNotMatch(buildPluginSource, /article_filter_bg\.wasm/);
  assert.doesNotMatch(buildPluginSource, /article-indexer-cli/);
  assert.doesNotMatch(buildPluginSource, /cargo/);
});
