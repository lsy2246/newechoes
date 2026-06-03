import assert from "node:assert/strict";
import test from "node:test";

import { createFilterRuntime } from "../src/lib/filter/runtime.js";

const fixtureIndex = {
  version: 1,
  articles: [
    {
      title: "第一篇",
      url: "/articles/first",
      date: "2026-05-30T12:00:00.000Z",
      tags: ["astro", "perf"],
    },
    {
      title: "第二篇",
      url: "/articles/second",
      date: "2026-05-20T12:00:00.000Z",
      tags: ["react"],
    },
  ],
};

test("filter runtime keeps all articles when date preset is all", () => {
  const runtime = createFilterRuntime(fixtureIndex);

  const result = runtime.filter({
    tags: [],
    sort: "newest",
    date: "all",
    page: 1,
    limit: 12,
  });

  assert.equal(result.total, 2);
  assert.equal(result.articles.length, 2);
  assert.deepEqual(
    result.articles.map((article) => article.title),
    ["第一篇", "第二篇"],
  );
});
