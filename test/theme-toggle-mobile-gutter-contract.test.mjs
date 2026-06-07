import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("src/styles/theme-toggle.css", "utf8").replace(/\r\n/g, "\n");

test("theme transitions lock the root scroll gutter so mobile wide viewports do not expose a right-edge seam", () => {
  assert.match(
    css,
    /html\.theme-transition-active,\s*html\.theme-transition-active body\s*\{[\s\S]*overflow:\s*hidden\s*!important;[\s\S]*\}/,
  );
});

test("theme transitions temporarily neutralize the mobile panel shell shadow so the bottom edge does not read like an extra outer box", () => {
  assert.match(
    css,
    /html\.theme-transition-active \.mobile-panel-shell\s*\{[\s\S]*box-shadow:\s*none\s*!important;[\s\S]*\}/,
  );
});
