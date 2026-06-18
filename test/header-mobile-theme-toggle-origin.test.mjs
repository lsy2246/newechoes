import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync("src/components/layout/Header.astro", "utf8").replace(/\r\n/g, "\n");

test("mobile theme row forwards non-button taps using the real toggle button center", () => {
  assert.match(
    header,
    /if \(e\.target instanceof Node && themeToggleButton\.contains\(e\.target\)\) \{\s*return;\s*\}/,
  );

  assert.match(
    header,
    /const buttonRect = themeToggleButton\.getBoundingClientRect\(\);[\s\S]*const buttonCenterX = buttonRect\.left \+ buttonRect\.width \/ 2;[\s\S]*const buttonCenterY = buttonRect\.top \+ buttonRect\.height \/ 2;/,
  );

  assert.match(
    header,
    /clientX:\s*buttonCenterX,\s*[\s\S]*clientY:\s*buttonCenterY/,
  );
});
