import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const swupInit = readFileSync("src/lib/navigation/swup-init.js", "utf8");

test("swup initializes with a single stable main container across page types", () => {
  assert.match(swupInit, /const containers = \['main'\];/);
  assert.doesNotMatch(swupInit, /containers\.push\('#article-content'\)/);
  assert.match(swupInit, /resolveContainers: async function\(visit\)/);
  assert.match(swupInit, /return \['main'\];/);
});
