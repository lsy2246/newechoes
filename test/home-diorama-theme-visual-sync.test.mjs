import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

test("home theme switches keep the visible story overlay and desktop screen texture in sync", () => {
  assert.match(
    dioramaTs,
    /const syncThemeVisuals = \(\) => \{[\s\S]*const t = getTheme\(\);[\s\S]*if \(t === theme\) return;/,
  );

  assert.match(
    dioramaTs,
    /if \(renderMode !== "room"\) \{\s*lastConnectorMotionTick = -1;\s*drawScreen\(\{ overlay: true, texture: shouldUpdateScreenTexture\(homeProgress\) \}\);\s*renderThemeSyncedFrame\(\);\s*\}/,
  );

  assert.match(
    dioramaTs,
    /const renderThemeSyncedFrame = \(\) => \{\s*if \(disposed\) return;\s*camera\.updateProjectionMatrix\(\);\s*renderer\.render\(scene, camera\);\s*\};/,
  );

  assert.match(
    dioramaTs,
    /window\.addEventListener\("theme:changed", syncThemeVisuals\);/,
  );

  assert.match(
    dioramaTs,
    /window\.removeEventListener\("theme:changed", syncThemeVisuals\);/,
  );
});
