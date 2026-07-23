import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");
const storyTs = readFileSync("src/components/home/homeScreenStory.ts", "utf8");
const dioramaCss = readFileSync("src/components/home/diorama.css", "utf8");
const headerAstro = readFileSync("src/components/layout/Header.astro", "utf8");
const headerCss = readFileSync("src/styles/header.css", "utf8");

test("home does not add a page-specific scale on large desktop viewports", () => {
  assert.doesNotMatch(dioramaTs, /homeViewportScale|--home-viewport-scale|viewportScale:/);
  assert.doesNotMatch(storyTs, /viewportScale\?:|largeViewportAmount|1\.2 \* viewportScale/);
  assert.doesNotMatch(headerCss, /--home-viewport-scale/);
  assert.doesNotMatch(dioramaCss, /--home-viewport-scale/);
});

test("desktop home keeps the same capped layout scale and shared header frame", () => {
  assert.match(storyTs, /const unit = clamp\(Math\.min\(width \/ 1280, height \/ 760\), 0\.88, 1\.2\);/);
  assert.match(storyTs, /const sharedFrameW = 1280 \* layoutScale;/);
  assert.match(storyTs, /const stageOverscan = 160 \* layoutScale;/);
  assert.match(storyTs, /sharedFrameW \+ stageOverscan \* 2,/);
  assert.match(headerAstro, /header-content-frame max-w-7xl/);
  assert.match(dioramaCss, /translate3d\(-50%, 0\.38rem, 0\) scale\(0\.98\)/);
  assert.match(dioramaCss, /translate3d\(-50%, 0, 0\) scale\(1\)/);
});
