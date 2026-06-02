import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("EdgeOne route patch excludes API and internal endpoints from clean-url slash rewrites", async () => {
  const { patchEdgeoneConfigText } = await import("../src/plugins/edgeone-routing-integration.js");

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
    (route) => route.dest === "/$1/" && route.continue === true,
  );

  assert.ok(slashRewriteRoute);
  assert.equal(
    slashRewriteRoute.src,
    "^/(?!api(?:/|$)|_image$|_server-islands(?:/|$))([^.]+[^/.])$",
  );
});

test("EdgeOne route patch adds explicit encoded article rewrites before the generic slash rewrite", async () => {
  const { patchEdgeoneConfigText } = await import("../src/plugins/edgeone-routing-integration.js");

  const input = JSON.stringify({
    version: 3,
    conf: { redirects: [] },
    routes: [
      { src: "^/(.+)/$", headers: { Location: "/$1" }, status: 308 },
      { src: "^/([^.]+[^/.])$", dest: "/$1/", continue: true },
      { handle: "filesystem" },
      { src: "^/(.*)$" },
    ],
  });

  const output = patchEdgeoneConfigText(input, [
    {
      relativeDir: "vibe-codoing指南",
      encodedRelativeDir: "vibe-codoing%E6%8C%87%E5%8D%97",
    },
  ]);
  const parsed = JSON.parse(output);
  const encodedArticleRouteIndex = parsed.routes.findIndex(
    (route) => route.src === "^/articles/vibe\\-codoing%E6%8C%87%E5%8D%97$",
  );
  const decodedArticleRouteIndex = parsed.routes.findIndex(
    (route) => route.src === "^/articles/vibe\\-codoing指南$",
  );
  const slashRewriteIndex = parsed.routes.findIndex(
    (route) => route.dest === "/$1/" && route.continue === true,
  );

  assert.ok(encodedArticleRouteIndex >= 0);
  assert.ok(decodedArticleRouteIndex >= 0);
  assert.ok(slashRewriteIndex >= 0);
  assert.ok(encodedArticleRouteIndex < slashRewriteIndex);
  assert.ok(decodedArticleRouteIndex < slashRewriteIndex);
  assert.deepEqual(parsed.routes[encodedArticleRouteIndex], {
    src: "^/articles/vibe\\-codoing%E6%8C%87%E5%8D%97$",
    dest: "/articles/vibe-codoing%E6%8C%87%E5%8D%97/",
    continue: true,
  });
  assert.deepEqual(parsed.routes[decodedArticleRouteIndex], {
    src: "^/articles/vibe\\-codoing指南$",
    dest: "/articles/vibe-codoing%E6%8C%87%E5%8D%97/",
    continue: true,
  });
});

test("EdgeOne static article assets create encoded mirrors for unicode paths", async () => {
  const {
    collectEdgeoneEncodedArticleRouteMirrors,
    syncEdgeoneEncodedArticleAssetPaths,
  } = await import("../src/platform/build/edgeone/routing-patch.js");

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
