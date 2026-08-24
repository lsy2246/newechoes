import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");
const homeStoryTs = readFileSync("src/components/home/homeScreenStory.ts", "utf8");

test("home 3D renderer uses a gentler DPR cap while the 2D story canvas stays crisp", () => {
  assert.match(dioramaTs, /const HOME_DIORAMA_PIXEL_RATIO_CAP = 2;/);
  assert.match(dioramaTs, /const HOME_DIORAMA_RENDERER_DPR_CAP_DESKTOP = 1\.5;/);
  assert.match(dioramaTs, /const HOME_DIORAMA_RENDERER_DPR_CAP_MOBILE = 1\.35;/);
  assert.match(
    dioramaTs,
    /const getHomeDioramaRendererDprCap = \(useMobileCarrier: boolean\) =>\s*useMobileCarrier \? HOME_DIORAMA_RENDERER_DPR_CAP_MOBILE : HOME_DIORAMA_RENDERER_DPR_CAP_DESKTOP;/,
  );
  assert.match(
    dioramaTs,
    /renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio \|\| 1, getHomeDioramaRendererDprCap\(useMobileCarrier\)\)\);/,
  );
  assert.match(
    dioramaTs,
    /const STORY_CANVAS_DPR = HOME_DIORAMA_PIXEL_RATIO_CAP;/,
  );
  assert.doesNotMatch(
    dioramaTs,
    /renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio \|\| 1, HOME_DIORAMA_PIXEL_RATIO_CAP\)\);/,
  );
});

test("home story overlay composites every desktop frame at a native 1:1 pixel scale", () => {
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
    /const sourceW = isWideOverlay\s*\?\s*overlayTargetAspect >= overlaySourceAspect\s*\?\s*W\s*:\s*Math\.round\(H \* overlaySourceAspect\)\s*:\s*W;/,
  );
  assert.match(
    dioramaTs,
    /const sourceH = isWideOverlay\s*\?\s*overlayTargetAspect >= overlaySourceAspect\s*\?\s*Math\.round\(W \/ overlaySourceAspect\)\s*:\s*H\s*:\s*H;/,
  );
  assert.doesNotMatch(dioramaTs, /Math\.max\(screenCanvas\.(?:width|height), [WH]\)/);
  assert.match(dioramaTs, /storyCtx\.drawImage\(cachedFrame, drawX, drawY\);/);
  assert.doesNotMatch(dioramaTs, /renderScale/);
});

test("home story overlay uses high quality resampling when scaling", () => {
  assert.match(dioramaTs, /storyCtx\.imageSmoothingEnabled = true;/);
  assert.match(dioramaTs, /storyCtx\.imageSmoothingQuality = "high";/);
});

test("home transition text snapshots stay at the destination canvas resolution", () => {
  assert.match(homeStoryTs, /const HOME_TRANSITION_CACHE_LIMIT = 1;/);
  assert.doesNotMatch(homeStoryTs, /HOME_TRANSITION_SNAPSHOT_MAX_/);
  assert.match(
    homeStoryTs,
    /const snapshotSizeFor = \(\s*ctx: CanvasRenderingContext2D,\s*\) => \(\{\s*width: Math\.max\(1, ctx\.canvas\.width\),\s*height: Math\.max\(1, ctx\.canvas\.height\),\s*\}\);/,
  );
  assert.match(homeStoryTs, /const size = snapshotSizeFor\(ctx\);/);
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
