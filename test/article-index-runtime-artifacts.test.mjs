import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const astroBuildScript = readFileSync("scripts/astro-build.mjs", "utf8");
const buildArticleIndexSource = readFileSync("src/plugins/build-article-index.js", "utf8");
const searchComponentSource = readFileSync("src/components/Search.tsx", "utf8");
const articleFilterSource = readFileSync("src/components/ArticleFilter.tsx", "utf8");
const searchWorkerClientSource = readFileSync("src/lib/search-worker-client.ts", "utf8");
const filterWorkerClientSource = readFileSync("src/lib/filter-worker-client.ts", "utf8");

test("search and filter runtime no longer depend on frontend wasm artifacts or rust cli", () => {
  assert.doesNotMatch(buildArticleIndexSource, /search_wasm|article_filter|cargo|article-indexer-cli/);
  assert.match(searchComponentSource, /search_index\.json/);
  assert.match(articleFilterSource, /filter_index\.json/);
});

test("search and filter now use separate worker clients and retire the shared worker shell", () => {
  assert.match(searchComponentSource, /@\/lib\/search-worker-client/);
  assert.match(articleFilterSource, /@\/lib\/filter-worker-client/);
  assert.match(searchWorkerClientSource, /new URL\("\.\/search-worker\.ts"/);
  assert.match(filterWorkerClientSource, /new URL\("\.\/filter-worker\.ts"/);
  assert.equal(existsSync("src/lib/searchFilterWorkerClient.ts"), false);
  assert.equal(existsSync("src/lib/search-filter-worker.ts"), false);
});

test("astro build still prepares article index runtime before bundling client assets", () => {
  assert.match(astroBuildScript, /prepareArticleIndexRuntimeArtifacts\(\)/);
  assert.match(astroBuildScript, /failed to prepare article index runtime artifacts/);
});

test("generateArticleIndex writes json indexes from source content and clears legacy bin artifacts", async () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "article-index-"));
  const contentRoot = path.join(tempRoot, "src", "content");
  const buildRoot = path.join(tempRoot, "dist");
  const outputRoot = path.join(buildRoot, "assets", "index");

  try {
    mkdirSync(contentRoot, { recursive: true });
    mkdirSync(outputRoot, { recursive: true });
    writeFileSync(
      path.join(contentRoot, "demo.md"),
      `---
title: "Demo Article"
date: 2026-06-04T00:00:00Z
tags: ["demo", "test"]
summary: "Demo summary"
---

# Demo Article

WebAssembly migration notes for search and filter. Search remains fast with json indexes.

## Section One

Search worker now runs in pure javascript and scans headings too.
`,
      "utf8",
    );
    writeFileSync(path.join(outputRoot, "search_index.bin"), "legacy", "utf8");
    writeFileSync(path.join(outputRoot, "filter_index.bin"), "legacy", "utf8");

    const { generateArticleIndex } = await import("../src/plugins/build-article-index.js");
    const result = await generateArticleIndex({
      buildDir: buildRoot,
      contentDir: contentRoot,
      outputDir: outputRoot,
    });

    assert.equal(result.success, true);
    assert.equal(existsSync(path.join(outputRoot, "search_index.json")), true);
    assert.equal(existsSync(path.join(outputRoot, "filter_index.json")), true);
    assert.equal(existsSync(path.join(outputRoot, "search_index.bin")), false);
    assert.equal(existsSync(path.join(outputRoot, "filter_index.bin")), false);

    const searchIndex = JSON.parse(readFileSync(path.join(outputRoot, "search_index.json"), "utf8"));
    const filterIndex = JSON.parse(readFileSync(path.join(outputRoot, "filter_index.json"), "utf8"));

    assert.equal(searchIndex.articles.length, 1);
    assert.equal(filterIndex.articles.length, 1);
    assert.equal(searchIndex.articles[0].url, "/articles/Demo%20Article");
    assert.equal(searchIndex.articles[0].summary, "Demo summary");
    assert.ok(searchIndex.title_term_index.demo.includes(0));
    assert.ok(filterIndex.tag_index.demo.includes(0));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("generateArticleIndex throws when content directory is missing", async () => {
  const { generateArticleIndex } = await import("../src/plugins/build-article-index.js");

  await assert.rejects(
    () =>
      generateArticleIndex({
        buildDir: path.join(os.tmpdir(), "article-index-empty-build"),
        contentDir: "/definitely/missing/content",
        outputDir: "/definitely/missing/output",
      }),
    /内容目录不存在/u,
  );
});
