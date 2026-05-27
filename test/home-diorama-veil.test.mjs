import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaCss = readFileSync("src/components/home/diorama.css", "utf8");
const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return dioramaCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("home diorama removes the veil once the scene enters room mode", () => {
  assert.match(
    dioramaTs,
    /setAttribute\("data-home-phase",\s*progress > 0\.76 \? "room" : "page"\)/,
  );

  assert.match(
    cssBlock(".home-diorama__veil"),
    /opacity:\s*calc\(0\.14 - var\(--home-progress\) \* 0\.12\);/,
  );

  assert.match(
    cssBlock('.home-diorama[data-home-phase="room"] .home-diorama__veil'),
    /opacity:\s*0;/,
  );
});

test("home diorama keeps the light theme background white", () => {
  assert.match(cssBlock(".home-diorama"), /background:\s*#ffffff;/);
  assert.match(dioramaTs, /sceneBg:\s*0xffffff,/);
  assert.doesNotMatch(dioramaCss, /#f2f3f1|0xf7f8f7/);
});

test("home dark theme matches the header background while keeping light model materials", () => {
  assert.match(cssBlock('[data-theme="dark"] .home-diorama'), /background:\s*var\(--site-bg,\s*#111315\);/);
  assert.match(dioramaTs, /dark:\s*\{\s*wall:\s*0xffffff,\s*chairShell:\s*0xf1f2f0,/);
  assert.match(dioramaTs, /keyTop:\s*0x202326,/);
  assert.match(dioramaTs, /mats\.floor\.opacity = componentReveal;/);
  assert.match(dioramaTs, /const objectSceneLight = 0xffffff;/);
  assert.match(dioramaTs, /sunLight\.intensity = 1\.22;/);
  assert.doesNotMatch(dioramaTs, /theme === "dark" \? 0xcfd5dc/);
});
