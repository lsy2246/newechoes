import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const headerCss = readFileSync("src/styles/header.css", "utf8");
const header = readFileSync("src/components/Header.astro", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return headerCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("desktop navigation keeps labels at a regular weight in every state", () => {
  assert.match(cssBlock(".nav-item[data-state=\"inactive\"], \n.nav-subitem[data-state=\"inactive\"], \n.nav-group-toggle[data-state=\"inactive\"]"), /font-weight:\s*400;/);
  assert.match(cssBlock(".nav-item[data-state=\"active\"], \n.nav-subitem[data-state=\"active\"], \n.nav-group-toggle[data-state=\"active\"]"), /font-weight:\s*400;/);
  assert.equal(header.includes("class=\"nav-item relative flex items-center justify-center h-10 px-4 py-2 text-sm font-medium\""), false);
  assert.equal(header.includes("class=\"nav-group-toggle relative flex items-center justify-center h-10 px-4 py-2 text-sm font-medium\""), false);
  assert.equal(header.includes("class=\"nav-subitem relative flex items-center justify-center h-10 px-3 py-2 text-sm font-medium\""), false);
  assert.equal(header.includes("'font-semibold'"), false);
  assert.equal(header.includes("\"font-medium\""), false);
  assert.equal(globalCss.includes(".layout-overlay-header #main-header a,\n.layout-overlay-header #main-header button {\n  font-weight: 600;\n}"), false);
});
