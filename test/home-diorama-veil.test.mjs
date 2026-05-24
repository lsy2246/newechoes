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
