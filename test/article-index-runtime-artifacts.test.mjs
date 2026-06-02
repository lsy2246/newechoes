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
      missing: false,
      stale: false,
    }),
  );
});
