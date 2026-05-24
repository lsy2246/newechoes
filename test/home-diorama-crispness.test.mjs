import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");
const homeStoryTs = readFileSync("src/components/home/homeScreenStory.ts", "utf8");

test("home 2D and 3D canvases use a high-density pixel ratio cap", () => {
  assert.match(dioramaTs, /const HOME_DIORAMA_PIXEL_RATIO_CAP = 2;/);
  assert.match(
    dioramaTs,
    /renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio \|\| 1, HOME_DIORAMA_PIXEL_RATIO_CAP\)\);/,
  );
  assert.match(
    dioramaTs,
    /const STORY_CANVAS_DPR = HOME_DIORAMA_PIXEL_RATIO_CAP;/,
  );
  assert.doesNotMatch(
    dioramaTs,
    /renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio, useMobileCarrier \? 1\.35 : 1\.5\)\);/,
  );
});

test("home story overlay avoids upscaling cached desktop frames", () => {
  assert.match(
    dioramaTs,
    /const overlaySourceAspect = screenCanvas\.width \/ screenCanvas\.height;/,
  );
  assert.match(
    dioramaTs,
    /const overlayTargetAspect = W \/ H;/,
  );
  assert.match(
    dioramaTs,
    /const sourceW = isWideOverlay\s*\?\s*overlayTargetAspect >= overlaySourceAspect\s*\?\s*Math\.max\(screenCanvas\.width, W\)/,
  );
  assert.match(
    dioramaTs,
    /:\s*Math\.round\(Math\.max\(screenCanvas\.height, H\) \* overlaySourceAspect\)\s*:\s*W;/,
  );
  assert.match(
    dioramaTs,
    /const sourceH = isWideOverlay\s*\?\s*overlayTargetAspect >= overlaySourceAspect\s*\?\s*Math\.round\(Math\.max\(screenCanvas\.width, W\) \/ overlaySourceAspect\)/,
  );
  assert.match(
    dioramaTs,
    /:\s*Math\.max\(screenCanvas\.height, H\)\s*:\s*H;/,
  );
});

test("home story overlay uses high quality resampling when scaling", () => {
  assert.match(dioramaTs, /storyCtx\.imageSmoothingEnabled = true;/);
  assert.match(dioramaTs, /storyCtx\.imageSmoothingQuality = "high";/);
});

test("home story drawing preserves the old visual scale after DPR scaling", () => {
  assert.match(homeStoryTs, /pixelRatio\?: number;/);
  assert.match(homeStoryTs, /layoutPixelRatio\?: number;/);
  assert.match(homeStoryTs, /const pixelRatio = Math\.max\(1, input\.pixelRatio \?\? 1\);/);
  assert.match(homeStoryTs, /const layoutPixelRatio = Math\.max\(1, input\.layoutPixelRatio \?\? pixelRatio\);/);
  assert.match(
    homeStoryTs,
    /const layoutWidth = \(ctx\.canvas\.width \/ pixelRatio\) \* layoutPixelRatio;/,
  );
  assert.match(
    homeStoryTs,
    /ctx\.setTransform\(pixelRatio \/ layoutPixelRatio, 0, 0, pixelRatio \/ layoutPixelRatio, 0, 0\);/,
  );
  assert.match(homeStoryTs, /drawMobileStory\(ctx, input, palette, progress, layoutWidth, layoutHeight\);/);
  assert.match(homeStoryTs, /drawDesktopStory\(ctx, input, palette, progress, layoutWidth, layoutHeight\);/);
  assert.match(dioramaTs, /const STORY_LAYOUT_DPR_CAP = useMobileCarrier \? 1\.35 : 1\.5;/);
  assert.match(dioramaTs, /let storyLayoutDpr = 1;/);
  assert.match(
    dioramaTs,
    /const layoutDpr = Math\.min\(window\.devicePixelRatio \|\| 1, STORY_LAYOUT_DPR_CAP\);/,
  );
  assert.match(dioramaTs, /storyLayoutDpr = layoutDpr;/);
  assert.match(dioramaTs, /storyLayoutDpr\.toFixed\(3\),/);
  assert.match(dioramaTs, /pixelRatio: storyCanvasDpr,/);
  assert.match(dioramaTs, /layoutPixelRatio: storyLayoutDpr,/);
  assert.doesNotMatch(dioramaTs, /layoutPixelRatio: STORY_LAYOUT_DPR,/);
});
