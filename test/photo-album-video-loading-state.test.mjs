import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync("src/components/PhotoAlbumMasonry.tsx", "utf8");

test("PhotoAlbumMasonry keeps the Google Photos preview video button size consistent", () => {
  assert.match(
    component,
    /className="flex h-16 w-16 items-center justify-center rounded-full border border-white\/10 bg-black\/72 text-white shadow-\[0_18px_38px_rgba\(0,0,0,0\.28\)\] transition hover:bg-black\/82"/,
  );
  assert.match(component, /className="h-6 w-6 translate-x-\[1px\]"/);
});

test("PhotoAlbumMasonry adapts preview navigation buttons to dark theme", () => {
  assert.match(
    component,
    /const previewIconButtonClassName =\s*"z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white\/65 bg-white\/90 text-neutral-900[\s\S]*dark:border-white\/12[\s\S]*dark:bg-neutral-950\/88[\s\S]*dark:text-neutral-50[\s\S]*dark:ring-white\/10/,
  );
});

test("PhotoAlbumMasonry queues preview video playback from the first click", () => {
  assert.match(component, /type PreviewVideoPhase = "idle" \| "preloading" \| "ready" \| "playing" \| "buffering" \| "paused" \| "error";/);
  assert.match(
    component,
    /const \[previewVideoPhase, setPreviewVideoPhase\] = useState<PreviewVideoPhase>\("idle"\);/,
  );
  assert.match(component, /const \[previewVideoPlayRequested, setPreviewVideoPlayRequested\] = useState\(false\);/);
  assert.match(component, /const shouldReloadPreviewVideo =\s*previewVideoFailed \|\| !video\.currentSrc;/);
  assert.match(component, /if \(!shouldReloadPreviewVideo\) \{\s*playPreviewVideo\(video\);/s);
  assert.match(component, /const preloadPreviewVideo = useCallback\(\(\{\s*silent = false\s*\}: \{\s*silent\?: boolean\s*\} = \{\}\) => \{/);
  assert.match(component, /if \(!silent\) \{\s*setPreviewVideoPhase\("preloading"\);/s);
  assert.match(component, /video\.preload = "auto";/);
  assert.match(component, /video\.load\(\);/);
  assert.match(component, /setPreviewVideoPlayRequested\(true\);/);
  assert.match(component, /const markPreviewVideoStarted = useCallback\(\(\) => \{[\s\S]*setPreviewVideoPhase\("playing"\);/);
  assert.match(component, /const resumePreviewVideoPlayback = useCallback\(/);
  assert.match(component, /preloadPreviewVideo\(\{\s*silent:\s*true\s*\}\);/);
});

test("PhotoAlbumMasonry switches the preview flow to phase-based playback states", () => {
  assert.match(component, /const previewVideoStatusText =\s*previewVideoPhase === "error"[\s\S]*"视频加载失败，请重试"[\s\S]*"点击播放视频"/);
  assert.match(component, /const isPreviewVideoOverlayVisible =\s*!previewVideoPlayRequested \|\| previewVideoPhase === "error";/);
  assert.match(component, /const isPreviewVideoPlayButtonVisible =\s*!previewVideoPlayRequested \|\| previewVideoPhase === "error";/);
  assert.match(component, /\{isPreviewVideoPlayButtonVisible \? \(/);
  assert.match(
    component,
    /aria-label=\{\s*previewVideoFailed \? "重新加载视频" : "加载并播放视频"\s*\}/,
  );
  assert.match(component, /controls=\{\s*previewVideoPlayRequested && previewVideoPhase !== "error"\s*\}/);
  assert.match(component, /previewVideoPlayRequested && previewVideoPhase !== "error"[\s\S]*\? "opacity-100"[\s\S]*: "pointer-events-none opacity-0"/);
  assert.doesNotMatch(component, /absolute inset-x-0 bottom-6 flex justify-center/);
  assert.doesNotMatch(component, /const isPreviewVideoSpinnerVisible =/);
});

test("PhotoAlbumMasonry keeps a single loading UI and real video aspect ratio", () => {
  assert.match(component, /const \[previewVideoAspectRatio, setPreviewVideoAspectRatio\] = useState<number \| null>\(null\);/);
  assert.match(component, /const resolvedPreviewVideoAspectRatio =/);
  assert.match(component, /const syncPreviewVideoAspectRatio = useCallback\(/);
  assert.match(component, /const syncPreviewVideoPlaybackStarted = useCallback\(/);
  assert.match(component, /onLoadedMetadata=\{\(event\) => \{[\s\S]*syncPreviewVideoAspectRatio\(event\.currentTarget\);/s);
  assert.match(
    component,
    /onCanPlay=\{\(event\) => \{[\s\S]*setPreviewVideoPhase\(previewVideoPlayRequested \? "ready" : "idle"\);[\s\S]*resumePreviewVideoPlayback\(event\.currentTarget\);/s,
  );
  assert.match(
    component,
    /onLoadedData=\{\(event\) => \{[\s\S]*if \(previewVideoPlayRequested\) \{\s*setPreviewVideoPhase\("ready"\);[\s\S]*resumePreviewVideoPlayback\(event\.currentTarget\);/s,
  );
  assert.match(
    component,
    /onPlaying=\{\(\) => \{[\s\S]*markPreviewVideoStarted\(\);/,
  );
  assert.match(
    component,
    /onWaiting=\{\(\) => \{[\s\S]*setPreviewVideoPhase\("buffering"\);/s,
  );
  assert.match(
    component,
    /onPause=\{\(event\) => \{[\s\S]*setPreviewVideoPhase\("paused"\);/s,
  );
  assert.doesNotMatch(component, /已缓冲 /);
  assert.match(component, /aspectRatio:\s*resolvedPreviewVideoAspectRatio \? String\(resolvedPreviewVideoAspectRatio\) : "16 \/ 9"/);
});

test("PhotoAlbumMasonry keeps native video seeking available inside the preview modal", () => {
  assert.match(
    component,
    /touchAction:\s*selectedPhoto\?\.mediaType === "video" \? "auto" : "none"/,
  );
  assert.doesNotMatch(
    component,
    /style=\{\{\s*overscrollBehavior:\s*"contain",\s*touchAction:\s*"none",\s*\}\}/,
  );
  assert.match(
    component,
    /previewVideoPlayRequested && previewVideoPhase !== "error"[\s\S]*\? "opacity-100"[\s\S]*: "pointer-events-none opacity-0"/,
  );
});
