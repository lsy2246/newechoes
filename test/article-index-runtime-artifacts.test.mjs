import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const astroBuildScript = readFileSync("scripts/astro-build.mjs", "utf8");
const searchModelsSource = readFileSync("wasm/search/src/models.rs", "utf8");
const filterModelsSource = readFileSync("wasm/article-filter/src/models.rs", "utf8");
const sharedModelsSource = readFileSync("wasm/utils-common/src/models.rs", "utf8");

test("stale prebuilt Linux article indexer artifacts are rejected before build", async () => {
  const { assertFreshPrebuiltArtifact } = await import("../src/plugins/article-index/integration.js");

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
  const { assertFreshPrebuiltArtifact } = await import("../src/plugins/article-index/integration.js");

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
  const { assertFreshPrebuiltArtifact } = await import("../src/plugins/article-index/integration.js");

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

test("astro build prepares index runtime artifacts before bundling client assets", () => {
  assert.match(
    astroBuildScript,
    /prepareArticleIndexRuntimeArtifacts\(\)/,
  );
  assert.match(
    astroBuildScript,
    /failed to prepare article index runtime artifacts/,
  );
});

test("cross-target serialized index models avoid usize fields", () => {
  assert.doesNotMatch(searchModelsSource, /\bHashSet<usize>\b/);
  assert.doesNotMatch(searchModelsSource, /\blevel: usize\b/);
  assert.doesNotMatch(searchModelsSource, /\bstart_position: usize\b/);
  assert.doesNotMatch(searchModelsSource, /\bend_position: usize\b/);
  assert.doesNotMatch(searchModelsSource, /\bcommon_terms: HashMap<String, usize>\b/);

  assert.doesNotMatch(filterModelsSource, /\bHashSet<usize>\b/);

  assert.doesNotMatch(sharedModelsSource, /\blevel: usize\b/);
  assert.doesNotMatch(sharedModelsSource, /\bposition: usize\b/);
  assert.doesNotMatch(sharedModelsSource, /\bend_position: Option<usize>\b/);
});

test("generateArticleIndex throws when index generation cannot complete", async () => {
  const { generateArticleIndex } = await import("../src/plugins/article-index/integration.js");

  await assert.rejects(
    () =>
      generateArticleIndex({
        buildDir: "/definitely/missing/build",
        outputDir: "/definitely/missing/output",
      }),
    /构建目录不存在|运行时产物准备失败/u,
  );
});
