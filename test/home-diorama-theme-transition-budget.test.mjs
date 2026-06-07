import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

test("home diorama defers its one-off theme redraw until the page transition settles", () => {
  const themeObserverBlock = dioramaTs.match(
    /const themeObserver = new MutationObserver\(\(\) => \{[\s\S]*?\}\);\s*themeObserver\.observe\(document\.documentElement,\s*\{[\s\S]*?\}\);/,
  )?.[0];

  assert.ok(themeObserverBlock);
  assert.match(dioramaTs, /let pendingThemeBootFrame = false;/);
  assert.match(dioramaTs, /const flushDeferredThemeBootFrame = \(\) => \{/);
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
  assert.doesNotMatch(themeObserverBlock, /needScreenRedraw = true;\s*renderBootFrame\(\);/);
});
