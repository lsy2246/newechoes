import assert from "node:assert/strict";
import test from "node:test";

test("stale prebuilt Linux article indexer artifacts are rejected before build", async () => {
  const { assertFreshPrebuiltArtifact } = await import("../src/plugins/build-article-index.js");

  assert.throws(
    () =>
      assertFreshPrebuiltArtifact({
        artifactLabel: "article-indexer",
        artifactPath: "/workspace/src/assets/article-index/article-indexer-cli",
        sourceLabel: "Rust sources",
        sourcePath: "/workspace/wasm/article-indexer",
        strategy: "prebuilt",
        runningInCi: false,
        missing: false,
        stale: true,
      }),
    /article-indexer.*预构建产物已过期/u,
  );
});

test("fresh prebuilt article indexer artifacts remain allowed", async () => {
  const { assertFreshPrebuiltArtifact } = await import("../src/plugins/build-article-index.js");

  assert.doesNotThrow(() =>
    assertFreshPrebuiltArtifact({
      artifactLabel: "article-indexer",
      artifactPath: "/workspace/src/assets/article-index/article-indexer-cli",
      sourceLabel: "Rust sources",
      sourcePath: "/workspace/wasm/article-indexer",
      strategy: "prebuilt",
      runningInCi: false,
      missing: false,
      stale: false,
    }),
  );
});

test("CI builds do not reject prebuilt artifacts solely because checkout mtimes look stale", async () => {
  const { assertFreshPrebuiltArtifact } = await import("../src/plugins/build-article-index.js");

  assert.doesNotThrow(() =>
    assertFreshPrebuiltArtifact({
      artifactLabel: "search-wasm wasm",
      artifactPath: "/workspace/src/assets/wasm/search",
      sourceLabel: "search-wasm",
      sourcePath: "/workspace/wasm/search",
      strategy: "prebuilt",
      runningInCi: true,
      missing: false,
      stale: true,
    }),
  );
});

test("generateArticleIndex throws when index generation cannot complete", async () => {
  const { generateArticleIndex } = await import("../src/plugins/build-article-index.js");

  await assert.rejects(
    () =>
      generateArticleIndex({
        buildDir: "/definitely/missing/build",
        outputDir: "/definitely/missing/output",
      }),
    /构建目录不存在|运行时产物准备失败/u,
  );
});
