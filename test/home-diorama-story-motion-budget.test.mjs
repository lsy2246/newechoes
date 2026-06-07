import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

test("home story mode quantizes connector motion instead of redrawing the intro flow every frame", () => {
  assert.match(dioramaTs, /const STORY_CONNECTOR_MOTION_FPS = 18;/);
  assert.match(
    dioramaTs,
    /const getStoryConnectorMotionTick = \(motionSeconds: number\) => Math\.round\(motionSeconds \* STORY_CONNECTOR_MOTION_FPS\);/,
  );
  assert.match(
    dioramaTs,
    /const getStoryConnectorMotionValue = \(tick: number\) => tick \/ STORY_CONNECTOR_MOTION_FPS;/,
  );
  assert.match(dioramaTs, /let lastConnectorMotionTick = -1;/);
  assert.match(
    dioramaTs,
    /const connectorMotionActive = storyProgress < 0\.22 && !reduceMotion(?: && !themeTransitionActive)?;/,
  );
  assert.match(
    dioramaTs,
    /const connectorMotionTick = connectorMotionActive \? getStoryConnectorMotionTick\(now \* 0\.001\) : -1;/,
  );
  assert.match(
    dioramaTs,
    /if \(connectorMotionTick !== lastConnectorMotionTick\) \{\s*lastConnectorMotionTick = connectorMotionTick;\s*needScreenRedraw = true;\s*\}/,
  );
  assert.match(
    dioramaTs,
    /motion:\s*connectorMotionActive \? getStoryConnectorMotionValue\(connectorMotionTick\) : undefined,/,
  );
  assert.doesNotMatch(
    dioramaTs,
    /const connectorMotionActive = storyProgress < 0\.22 && !reduceMotion;\s*if \(connectorMotionActive\) needScreenRedraw = true;/,
  );
});
