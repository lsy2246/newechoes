import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");
const storyTs = readFileSync("src/components/home/homeScreenStory.ts", "utf8");
const dioramaCss = readFileSync("src/components/home/diorama.css", "utf8");
const headerAstro = readFileSync("src/components/layout/Header.astro", "utf8");
const headerCss = readFileSync("src/styles/header.css", "utf8");

test("home derives one capped visual scale from desktop viewport width", () => {
  assert.match(dioramaTs, /clamp\(window\.innerWidth \/ 2048, 1, 1\.25\)/);
  assert.match(dioramaTs, /docEl\.style\.setProperty\("--home-viewport-scale", homeViewportScale\.toFixed\(4\)\);/);
  assert.match(dioramaTs, /viewportScale: homeViewportScale,/);
  assert.match(dioramaTs, /docEl\.style\.removeProperty\("--home-viewport-scale"\);/);
});

test("desktop canvas, header, and scroll cue share the viewport scale", () => {
  assert.match(storyTs, /viewportScale\?: number;/);
  assert.match(storyTs, /const viewportScale = clamp\(input\.viewportScale \?\? 1, 1, 1\.25\);/);
  assert.match(storyTs, /1\.2 \* viewportScale/);
  assert.match(storyTs, /const adjustedY = y \+ 16 \* unit \* largeViewportAmount;/);
  assert.match(headerAstro, /header-content-frame max-w-7xl/);
  assert.match(headerCss, /scale\(var\(--home-viewport-scale, 1\)\)/);
  assert.match(dioramaCss, /scale\(calc\(0\.98 \* var\(--home-viewport-scale, 1\)\)\)/);
  assert.match(dioramaCss, /scale\(var\(--home-viewport-scale, 1\)\)/);
});
