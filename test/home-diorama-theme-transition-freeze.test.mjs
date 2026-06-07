import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

test("home theme transition freezes intro-only motion and hidden story texture churn", () => {
  assert.match(
    dioramaTs,
    /const themeTransitionActive = document\.documentElement\.classList\.contains\("theme-transition-active"\);/,
  );
  assert.match(
    dioramaTs,
    /const updateTexture = targets\?\.texture \?\? \(renderMode !== "story" \|\| \(shouldUpdateScreenTexture\(homeProgress\) && !themeTransitionActive\)\);/,
  );
  assert.match(
    dioramaTs,
    /const connectorMotionActive = storyProgress < 0\.22 && !reduceMotion && !themeTransitionActive;/,
  );
  assert.match(
    dioramaTs,
    /needScreenRedraw = true;\s*lastConnectorMotionTick = -1;\s*flushDeferredThemeBootFrame\(\);/,
  );
});
