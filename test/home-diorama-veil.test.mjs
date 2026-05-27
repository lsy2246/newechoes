import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaCss = readFileSync("src/components/home/diorama.css", "utf8");
const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return dioramaCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("home diorama keeps the veil transparent", () => {
  assert.match(
    dioramaTs,
    /setAttribute\("data-home-phase",\s*progress > 0\.76 \? "room" : "page"\)/,
  );

  assert.match(
    cssBlock(".home-diorama__veil"),
    /background:\s*transparent;/,
  );

  assert.match(
    cssBlock('.home-diorama[data-home-phase="room"] .home-diorama__veil'),
    /opacity:\s*0;/,
  );
  assert.match(cssBlock(".home-diorama__veil"), /opacity:\s*0;/);
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

test("home center diorama is limited to the first-screen opening", () => {
  assert.match(dioramaTs, /const CENTER_DIORAMA_FADE_START = 0\.08;/);
  assert.match(dioramaTs, /const CENTER_DIORAMA_PROGRESS_END = 0\.24;/);
  assert.match(dioramaTs, /const SCREEN_TEXTURE_PROGRESS_END = STORY_MODE_END;/);
  assert.match(dioramaTs, /const isCenterDioramaActive = \(progress: number\) => progress < CENTER_DIORAMA_PROGRESS_END;/);
  assert.match(dioramaTs, /const shouldUpdateScreenTexture = \(progress: number\) => !useMobileCarrier && progress <= SCREEN_TEXTURE_PROGRESS_END;/);
  assert.match(dioramaTs, /const STORY_FADE_START = 0\.695;/);
  assert.match(dioramaTs, /const STORY_FADE_END = 0\.71;/);
  assert.match(dioramaTs, /const SCENE_FADE_START = 0\.708;/);
  assert.match(dioramaTs, /const SCENE_FADE_END = HANDOFF_MODE_END;/);
  assert.match(dioramaTs, /revealCenterDiorama: centerDioramaActive,/);
  assert.match(dioramaTs, /storyInput\.revealCenterDiorama \? "center-diorama" : "story"/);
  assert.doesNotMatch(dioramaTs, /texture: !useMobileCarrier && isCenterDioramaActive\(homeProgress\)/);
});

test("home diorama handoff pulls back from the screen into the room", () => {
  assert.match(dioramaTs, /const STORY_MODE_END = 0\.7;/);
  assert.match(dioramaTs, /const HANDOFF_MODE_END = 0\.735;/);
  assert.match(
    dioramaTs,
    /const getCameraPull = \(progress: number\) => easeInOutSine\(clamp\(\(progress - STORY_MODE_END\) \/ 0\.27\)\);/,
  );
  assert.match(dioramaTs, /outPos\.lerpVectors\(screenCameraPos, roomCameraPos, pull\);/);
  assert.match(dioramaTs, /outTarget\.lerpVectors\(screenCameraTarget, roomCameraTarget, pull\);/);
  assert.match(dioramaTs, /lerp\(\s*screenFov,\s*roomFov,\s*getScrollCameraState/);
  assert.doesNotMatch(dioramaTs, /getHandoffCameraPull/);
  assert.doesNotMatch(dioramaTs, /outPos\.lerp\(roomCameraPos/);
});
