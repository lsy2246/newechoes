import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("EdgeOne route patch rewrites clean URLs to static index files and excludes API/internal endpoints", async () => {
  const { patchEdgeoneConfigText } = await import("../src/platform/build/edgeone/index.js");

  const input = JSON.stringify({
    version: 3,
    conf: { redirects: [] },
    routes: [
      { src: "^/(.+)/$", headers: { Location: "/$1" }, status: 308 },
      { src: "^/([^.]+[^/.])$", dest: "/$1/", continue: true },
      { handle: "filesystem" },
      { src: "^/_server-islands/([^/]+?)$" },
      { src: "^/_image$" },
      { src: "^/api/google-photos$" },
      { src: "^/(.*)$" },
    ],
  });

  const output = patchEdgeoneConfigText(input);
  const parsed = JSON.parse(output);
  const slashRewriteRoute = parsed.routes.find(
    (route) => route.dest === "/$1/index.html" && route.continue === true,
  );

  assert.ok(slashRewriteRoute);
  assert.equal(
    slashRewriteRoute.src,
    "^/(?!api(?:/|$)|_image$|_server-islands(?:/|$))([^.]+[^/.])$",
  );
  const trailingSlashRedirectRoute = parsed.routes.find(
    (route) => route.status === 308 && route.headers?.Location === "/$1",
  );
  assert.ok(trailingSlashRedirectRoute);
  assert.equal(trailingSlashRedirectRoute.src, "^/(.+)/$");
});

test("EdgeOne static article assets create encoded mirrors for unicode paths", async () => {
  const {
    collectEdgeoneEncodedArticleRouteMirrors,
    syncEdgeoneEncodedArticleAssetPaths,
  } = await import("../src/platform/build/edgeone/index.js");

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "edgeone-articles-"));
  try {
    const unicodeArticleDir = path.join(tempRoot, "articles", "vibe-codoing指南");
    await fs.mkdir(unicodeArticleDir, { recursive: true });
    await fs.writeFile(path.join(unicodeArticleDir, "index.html"), "<h1>ok</h1>", "utf8");

    const routeMirrors = await collectEdgeoneEncodedArticleRouteMirrors(tempRoot);
    const mirroredPaths = await syncEdgeoneEncodedArticleAssetPaths(tempRoot);
    const encodedArticleIndex = path.join(tempRoot, "articles", "vibe-codoing%E6%8C%87%E5%8D%97", "index.html");

    assert.deepEqual(routeMirrors, [
      {
        relativeDir: "vibe-codoing指南",
        encodedRelativeDir: "vibe-codoing%E6%8C%87%E5%8D%97",
      },
    ]);
    assert.equal(existsSync(encodedArticleIndex), true);
    assert.ok(mirroredPaths.includes(encodedArticleIndex));

    const routeMirrorsAfterSync = await collectEdgeoneEncodedArticleRouteMirrors(tempRoot);
    assert.deepEqual(routeMirrorsAfterSync, routeMirrors);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
