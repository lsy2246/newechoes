import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeToggleAstro = readFileSync("src/components/ThemeToggle.astro", "utf8").replace(
  /\r\n/g,
  "\n",
);

test("theme transition root snapshots keep viewport size while the mask gets edge padding", () => {
  assert.match(
    themeToggleAstro,
    /const viewportPadding = Math\.max\(\s*96,\s*Math\.max\(viewportWidth, viewportHeight\) \* 0\.18,\s*\);/,
  );

  assert.match(
    themeToggleAstro,
    /inset:\s*0 !important;[\s\S]*width:\s*100% !important;[\s\S]*height:\s*100% !important;/,
  );

  assert.match(
    themeToggleAstro,
    /const maskX = x;\s*const maskY = y;/,
  );

  assert.doesNotMatch(themeToggleAstro, /const snapshotOverscan =/);
  assert.doesNotMatch(themeToggleAstro, /calc\(100% \+ \$\{snapshotOverscan \* 2\}px\)/);
});
