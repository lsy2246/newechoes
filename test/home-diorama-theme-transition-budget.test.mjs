import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

test("home diorama defers its one-off theme redraw until the page transition settles", () => {
  const syncThemeVisualsBlock = dioramaTs.match(
    /const syncThemeVisuals = \(\) => \{[\s\S]*?\n  \};\s*\n\s*const themeObserver = new MutationObserver\(syncThemeVisuals\);/,
  )?.[0];

  assert.ok(syncThemeVisualsBlock);
  assert.match(dioramaTs, /let pendingThemeBootFrame = false;/);
  assert.match(dioramaTs, /const flushDeferredThemeBootFrame = \(\) => \{/);
  assert.match(dioramaTs, /const themeObserver = new MutationObserver\(syncThemeVisuals\);/);
  assert.match(
    dioramaTs,
    /const scheduleThemeBootFrame = \(\) => \{[\s\S]*if \(isThemeTransitionActive\(\)\) \{[\s\S]*pendingThemeBootFrame = true;[\s\S]*return;[\s\S]*flushDeferredThemeBootFrame\(\);[\s\S]*\};/,
  );
  assert.match(
    dioramaTs,
    /const themeTransitionObserver = new MutationObserver\(\(\) => \{[\s\S]*pendingThemeBootFrame[\s\S]*!isThemeTransitionActive\(\)[\s\S]*flushDeferredThemeBootFrame\(\);[\s\S]*\}\);/,
  );
  assert.match(
    dioramaTs,
    /needScreenRedraw = true;[\s\S]*scheduleThemeBootFrame\(\);/,
  );
  assert.match(
    dioramaTs,
    /themeTransitionObserver\.observe\(document\.documentElement,\s*\{\s*attributes:\s*true,\s*attributeFilter:\s*\["class"\],?\s*\}\);/,
  );
  assert.match(dioramaTs, /themeTransitionObserver\.disconnect\(\);/);
  assert.doesNotMatch(syncThemeVisualsBlock, /needScreenRedraw = true;\s*renderBootFrame\(\);/);
});
