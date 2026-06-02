import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("EdgeOne static architecture no longer depends on SSR route patching", () => {
  const edgeoneBuildHelpers = readFileSync("src/platform/build/edgeone/index.js", "utf8");
  assert.doesNotMatch(edgeoneBuildHelpers, /patchEdgeoneConfigText/);
  assert.doesNotMatch(edgeoneBuildHelpers, /config\.json/);
});

test("EdgeOne static article assets create encoded mirrors for unicode paths", async () => {
  const {
    collectEdgeoneEncodedArticleRouteMirrors,
    syncEdgeoneEncodedArticleAssetPaths,
  } = await import("../src/platform/build/edgeone/index.js");

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "edgeone-articles-"));
  try {
    const unicodeArticleFile = path.join(tempRoot, "articles", "vibe-codoing指南.html");
    await fs.mkdir(path.dirname(unicodeArticleFile), { recursive: true });
    await fs.writeFile(unicodeArticleFile, "<h1>ok</h1>", "utf8");

    const routeMirrors = await collectEdgeoneEncodedArticleRouteMirrors(tempRoot);
    const mirroredPaths = await syncEdgeoneEncodedArticleAssetPaths(tempRoot);
    const encodedArticleIndex = path.join(
      tempRoot,
      "articles",
      "vibe-codoing%E6%8C%87%E5%8D%97.html",
    );

    assert.deepEqual(routeMirrors, [
      {
        relativeFile: "vibe-codoing指南.html",
        encodedRelativeFile: "vibe-codoing%E6%8C%87%E5%8D%97.html",
      },
    ]);
    assert.equal(existsSync(encodedArticleIndex), true);
    assert.ok(mirroredPaths.includes(encodedArticleIndex));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
