import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");
const dioramaCss = readFileSync("src/components/home/diorama.css", "utf8");
const dioramaAstro = readFileSync("src/components/home/HomeDiorama.astro", "utf8");
const homeIndex = readFileSync("src/pages/index.astro", "utf8");

test("home wheel input becomes one bounded momentum phrase", () => {
  assert.match(dioramaTs, /from "\.\/homeScrollResistance";/);
  assert.match(dioramaTs, /from "\.\/homeScrollMomentum\.ts";/);
  assert.match(dioramaTs, /normalizeWheelDelta\(e\.deltaY, e\.deltaMode, window\.innerHeight\)/);
  assert.match(dioramaTs, /getResistedHomeScrollDelta\(\{/);
  assert.match(dioramaTs, /stepHomeScrollMomentum\(\{/);
  assert.match(dioramaTs, /queueHomeScrollMomentum\(deltaPx, elapsedMs, "desktop"\);/);
  assert.match(dioramaTs, /advanceHomeScrollMomentum\(dt\);/);
  assert.match(dioramaTs, /getAdjacentHomeChapterStop\(/);
  assert.doesNotMatch(dioramaTs, /getPacedHomeScrollDelta\(\{/);
  assert.match(dioramaTs, /getClassifyTo3dScrollMultiplier/);
  assert.match(dioramaTs, /HOME_MOTION_TIMING\.scroll\.classifyTo3dBoost/);
  assert.doesNotMatch(dioramaTs, /isFastHomeScrollInput/);
  assert.match(dioramaTs, /if \(reduceMotion \|\| e\.ctrlKey \|\| !e\.cancelable/);
  assert.match(
    dioramaTs,
    /window\.addEventListener\("wheel", homeWheelHandler, \{ passive: false, capture: true \}\);/,
  );
  assert.match(dioramaTs, /window\.removeEventListener\("wheel", homeWheelHandler, true\);/);
});

test("home scroll budget keeps the 3D ending compact", () => {
  assert.match(dioramaCss, /min-height:\s*680dvh;/);
  assert.match(dioramaTs, /const STORY_MODE_END = 0\.78;/);
  assert.match(dioramaTs, /const HANDOFF_MODE_END = 0\.795;/);
  assert.match(dioramaTs, /const ROOM_CAMERA_END = 0\.835;/);
  assert.match(dioramaTs, /const LOOP_CAMERA_REJOIN_START = 0\.86;/);
  assert.match(dioramaTs, /const LOOP_RETURN_START = 0\.885;/);
  assert.match(dioramaTs, /const LOOP_RESET_PROGRESS = 0\.93;/);
  assert.doesNotMatch(dioramaTs, /homeChapterStops[\s\S]*?HANDOFF_MODE_END/);
});

test("home story gives earlier handoffs more time and makes today a brief beat", () => {
  assert.match(homeIndex, /id: "input",[\s\S]*?transitionWeight: 0\.24,/);
  assert.match(homeIndex, /id: "input",[\s\S]*?transitionMode: "scan",/);
  assert.match(homeIndex, /id: "classify",[\s\S]*?transitionWeight: 0\.31,/);
  assert.match(homeIndex, /id: "work",[\s\S]*?transitionWeight: 0\.025,/);
  assert.match(homeIndex, /id: "today",[\s\S]*?canonicalWeight: 0\.005,/);
  assert.match(
    dioramaTs,
    /const WORK_FLOW_RESUME_PROGRESS = STORY_MODE_END \* \(workTodayEdge\?\.start \?\? 0\.97\);/,
  );
  assert.match(
    dioramaTs,
    /const TODAY_HOLD_PROGRESS = STORY_MODE_END \* \(workTodayEdge\?\.end \?\? 0\.995\);/,
  );
  assert.match(dioramaTs, /homeChapterStops[\s\S]*?TODAY_HOLD_PROGRESS,/);
  assert.match(dioramaTs, /evidenceReleaseEl\.offsetHeight \* 0\.98/);
  assert.match(dioramaTs, /evidenceReleaseEl\.offsetHeight \* 0\.02/);
});

test("the progress cue remains a viewport HUD above the native evidence flow", () => {
  assert.match(dioramaCss, /\.home-scroll-cue \{[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*20;/);
  assert.match(
    dioramaTs,
    /cueEl\?\.setAttribute\("data-home-visible", startupGateReleased \? "true" : "false"\);/,
  );
  const stageEnd = dioramaAstro.indexOf('</div>\n    </div>\n\n    <section class="home-evidence"');
  const cueStart = dioramaAstro.indexOf('<div class="home-scroll-cue"');
  assert.ok(stageEnd >= 0 && cueStart > stageEnd, "cue should live outside the sticky 3D stage");
});

test("story transitions keep the same native DPR as settled frames", () => {
  assert.doesNotMatch(dioramaTs, /STORY_TRANSITION_DPR_CAP/);
  assert.doesNotMatch(dioramaTs, /resolveHomeStoryTimeline\(storyInput\.progress/);
  assert.match(dioramaTs, /pixelRatio: storyCanvasDpr,/);
  assert.match(dioramaTs, /layoutPixelRatio: storyLayoutDpr,/);
  assert.match(dioramaTs, /storyCtx\.drawImage\(cachedFrame, drawX, drawY\);/);
});

test("the authored scan redraws from continuous scroll progress", () => {
  assert.match(dioramaTs, /const continuousScan = usesContinuousScanProgress\(/);
  assert.match(
    dioramaTs,
    /const cachedProgress = continuousScan[\s\S]*?clamp\(storyInput\.progress\)[\s\S]*?frameIndex \/ STORY_FRAME_STEPS;/,
  );
  assert.match(dioramaTs, /const frameKey = continuousScan \? cachedProgress\.toFixed\(5\)/);
  assert.match(
    dioramaTs,
    /progressChanged &&[\s\S]*?\(continuousScan \|\|[\s\S]*?SCREEN_REDRAW_STEP\)/,
  );
});

test("mobile vertical gestures stay direct while horizontal gestures keep orbit control", () => {
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
    /const directDelta = \(homeTouchLastY - touch\.clientY\) \* mobileTouchScrollGain;[\s\S]*?queueHomeScrollMomentum\([\s\S]*?directDelta,[\s\S]*?"mobile",[\s\S]*?homeTouchBoundaryLocked \? "touch" : "touch-start",\s*\);/,
  );
  assert.match(
    dioramaTs,
    /const directDelta = \(mobileGestureLastY - e\.clientY\) \* mobileTouchScrollGain;[\s\S]*?queueHomeScrollMomentum\([\s\S]*?directDelta,[\s\S]*?"mobile",[\s\S]*?mobileGestureBoundaryLocked \? "touch" : "touch-start",\s*\);/,
  );
  assert.match(
    dioramaTs,
    /inputMode === "touch-start" \|\|[\s\S]*?\(inputMode === "resisted" &&[\s\S]*?HOME_SCROLL_GESTURE_IDLE_MS\)/,
  );
  assert.match(dioramaTs, /homeScrollMomentumTargetY,[\s\S]*?mobileTouchFollow,/);
  assert.match(dioramaTs, /queueHomeScrollMomentum\(releaseLead, 16, "mobile", "release"\);/);
  assert.match(dioramaTs, /Math\.hypot\(dx, dy\) < 5/);
  assert.match(dioramaTs, /getHomeTouchReleaseLead\(homeTouchVelocityY, window\.innerHeight\)/);
  assert.match(dioramaTs, /getHomeTouchReleaseLead\(mobileGestureVelocityY, window\.innerHeight\)/);
  assert.match(
    dioramaTs,
    /if \(isEvidenceFlowActive\(\)\) \{[\s\S]*?cancelHomeScrollMomentum\(window\.scrollY\);[\s\S]*?resetHomeTouchGesture\(\);[\s\S]*?return;/,
  );
  assert.match(
    dioramaTs,
    /return physicalScroll > metrics\.flowStart \+ 1 && physicalScroll < metrics\.flowEnd - 1;/,
  );
  assert.match(dioramaTs, /const clampEvidenceNativeScroll = \(\) => \{/);
  assert.match(dioramaTs, /releaseUntil = performance\.now\(\) \+ 1_800;/);
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
