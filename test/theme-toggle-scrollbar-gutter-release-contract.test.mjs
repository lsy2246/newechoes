import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("src/styles/theme-toggle.css", "utf8").replace(
  /\r\n/g,
  "\n",
);

test("theme transitions temporarily release the stable scrollbar gutter so mobile snapshots do not keep a reserved edge strip", () => {
  assert.match(
    css,
    /html\.theme-transition-active\s*\{[\s\S]*scrollbar-gutter:\s*auto\s*!important;[\s\S]*\}/,
  );
});
