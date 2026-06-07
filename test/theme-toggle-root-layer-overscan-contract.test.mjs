import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeToggleAstro = readFileSync("src/components/ThemeToggle.astro", "utf8").replace(
  /\r\n/g,
  "\n",
);

test("theme transition root snapshots are slightly oversized while preserving the click-origin mask center", () => {
  assert.match(
    themeToggleAstro,
    /const snapshotOverscan = 2;/,
  );

  assert.match(
    themeToggleAstro,
    /inset:\s*-\$\{snapshotOverscan\}px !important;[\s\S]*width:\s*calc\(100% \+ \$\{snapshotOverscan \* 2\}px\) !important;[\s\S]*height:\s*calc\(100% \+ \$\{snapshotOverscan \* 2\}px\) !important;/,
  );

  assert.match(
    themeToggleAstro,
    /const maskX = x \+ snapshotOverscan;\s*const maskY = y \+ snapshotOverscan;/,
  );
});
