import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/ThemeToggle.astro", "utf8").replace(/\r\n/g, "\n");

test("theme transitions size the mask against the broadest available viewport and add overscan so the feathered edge stays off-screen", () => {
  assert.match(
    source,
    /const viewportWidth = Math\.max\(\s*window\.innerWidth,\s*Math\.ceil\(window\.visualViewport\?\.width \|\| 0\),\s*\);/,
  );
  assert.match(
    source,
    /const viewportHeight = Math\.max\(\s*window\.innerHeight,\s*Math\.ceil\(window\.visualViewport\?\.height \|\| 0\),\s*\);/,
  );
  assert.match(
    source,
    /const viewportPadding = Math\.max\(\s*96,\s*Math\.max\(viewportWidth, viewportHeight\) \* 0\.18,\s*\);/,
  );
  assert.match(
    source,
    /const maxRadius = Math\.ceil\(\s*\(maxDistance \+ viewportPadding\) \/ gradientOffset,\s*\);/,
  );
});
