import assert from "node:assert/strict";
import test from "node:test";

import { createArticleRouteId } from "../src/lib/article-route-id.js";

test("article route ids match Astro glob loader slugs", () => {
  assert.equal(
    createArticleRouteId("Guides/My Demo (Beta).md"),
    "guides/my-demo-beta",
  );
  assert.equal(
    createArticleRouteId("ai/OpenClaw使用和约束机制.md"),
    "ai/openclaw使用和约束机制",
  );
  assert.equal(
    createArticleRouteId("creator/Adobe_Photoshop (Beta)使用教程.md"),
    "creator/adobe_photoshop-beta使用教程",
  );
  assert.equal(createArticleRouteId("server/index.md"), "server");
});
