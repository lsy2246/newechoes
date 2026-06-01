import assert from "node:assert/strict";
import test from "node:test";

import { assertUniqueArticleIdentities } from "../src/lib/article-history/shared.js";

test("duplicate article titles fail with a useful message", () => {
  assert.throws(
    () =>
      assertUniqueArticleIdentities([
        { id: "server/a", data: { title: "same-title" } },
        { id: "server/b", data: { title: "same-title" } },
      ]),
    /Duplicate article title "same-title": server\/a, server\/b/,
  );
});
