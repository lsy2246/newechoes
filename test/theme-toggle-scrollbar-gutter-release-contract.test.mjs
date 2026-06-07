import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("src/styles/theme-toggle.css", "utf8").replace(
  /\r\n/g,
  "\n",
);

test("theme transitions keep the desktop scrollbar gutter stable while mobile snapshots release the edge strip", () => {
  assert.match(
    css,
    /html\.theme-transition-active\s*\{[\s\S]*scrollbar-gutter:\s*stable\s*!important;[\s\S]*\}/,
  );

  assert.match(
    css,
    /@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*html\.theme-transition-active\s*\{[\s\S]*scrollbar-gutter:\s*auto\s*!important;[\s\S]*\}[\s\S]*\}/,
  );
});
