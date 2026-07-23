import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

test("home diorama preserves scroll-driven story progress during theme transitions", () => {
  const themeTransitionObserverBlock = dioramaTs.match(
    /const themeTransitionObserver = new MutationObserver\(\(\) => \{[\s\S]*?\}\);\s*themeTransitionObserver\.observe/,
  )?.[0];

  assert.ok(themeTransitionObserverBlock);

  assert.match(
    dioramaTs,
    /const isThemeTransitionActive = \(\) =>\s*document\.documentElement\.classList\.contains\("theme-transition-active"\);/,
  );

  assert.match(
    dioramaTs,
    /const syncScrollProgress = \(\) => \{\s*if \(isThemeTransitionActive\(\)\) return;/,
  );

  assert.match(
    dioramaTs,
    /const handleBreakpointResize = \(\) => \{\s*if \(isThemeTransitionActive\(\)\) return;/,
  );

  assert.match(
    dioramaTs,
    /!isThemeTransitionActive\(\)[\s\S]*needScreenRedraw = true;[\s\S]*flushDeferredThemeBootFrame\(\);/,
  );

  assert.doesNotMatch(themeTransitionObserverBlock, /syncScrollProgress\(\)/);
});
