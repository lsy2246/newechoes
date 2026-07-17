import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");
const dioramaCss = readFileSync("src/components/home/diorama.css", "utf8");

test("home wheel input uses velocity and phase aware resistance", () => {
  assert.match(dioramaTs, /from "\.\/homeScrollResistance";/);
  assert.match(dioramaTs, /normalizeWheelDelta\(e\.deltaY, e\.deltaMode, window\.innerHeight\)/);
  assert.match(dioramaTs, /getResistedHomeScrollDelta\(\{/);
  assert.match(dioramaTs, /if \(reduceMotion \|\| e\.ctrlKey \|\| !e\.cancelable/);
  assert.match(
    dioramaTs,
    /window\.addEventListener\("wheel", homeWheelHandler, \{ passive: false, capture: true \}\);/,
  );
  assert.match(dioramaTs, /window\.removeEventListener\("wheel", homeWheelHandler, true\);/);
});

test("home scroll budget expands the 3D interaction and return phases", () => {
  assert.match(dioramaCss, /min-height:\s*680dvh;/);
  assert.match(dioramaTs, /const HANDOFF_MODE_END = 0\.745;/);
  assert.match(dioramaTs, /const ROOM_CAMERA_END = 0\.86;/);
  assert.match(dioramaTs, /const LOOP_CAMERA_REJOIN_START = 0\.925;/);
  assert.match(dioramaTs, /const LOOP_RETURN_START = 0\.95;/);
});

test("mobile vertical gestures use resistance while horizontal gestures keep orbit control", () => {
  assert.match(
    dioramaCss,
    /@media \(max-width: 900px\) and \(prefers-reduced-motion: no-preference\)[\s\S]*?\.home-diorama__canvas[\s\S]*?touch-action: none;/,
  );
  assert.match(
    dioramaTs,
    /window\.addEventListener\("touchstart", homeTouchStartHandler, \{ passive: true, capture: true \}\);/,
  );
  assert.match(
    dioramaTs,
    /window\.addEventListener\("touchmove", homeTouchMoveHandler, \{ passive: false, capture: true \}\);/,
  );
  assert.match(
    dioramaTs,
    /homeTouchLastY - touch\.clientY,[\s\S]*?"mobile",\s*\);/,
  );
  assert.match(
    dioramaTs,
    /mobileGestureLastY - e\.clientY,[\s\S]*?"mobile",\s*\);/,
  );
  assert.match(dioramaTs, /mobileGestureIntent === "scroll"/);
  assert.match(dioramaTs, /mobileGestureIntent === "orbit"/);
  assert.match(
    dioramaTs,
    /canvasEl\.style\.touchAction = useMobileCarrier && !reduceMotion \? "none" : "pan-y";/,
  );
  assert.match(
    dioramaTs,
    /sceneEl\.style\.touchAction = useMobileCarrier && !reduceMotion \? "none" : "pan-y";/,
  );
  assert.match(dioramaTs, /window\.removeEventListener\("touchmove", homeTouchMoveHandler, true\);/);
});
