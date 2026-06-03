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

test("PhotoAlbumMasonry queues preview video playback from the first click", () => {
  assert.match(
    component,
    /const \[previewVideoPlayRequested, setPreviewVideoPlayRequested\] = useState\(false\);/,
  );
  assert.match(component, /const \[previewVideoStarted, setPreviewVideoStarted\] = useState\(false\);/);
  assert.match(
    component,
    /const \[previewVideoLoadProgress, setPreviewVideoLoadProgress\] = useState<number \| null>\(null\);/,
  );
  assert.match(component, /const shouldReloadPreviewVideo =\s*!previewVideoRequested \|\| previewVideoFailed \|\| !video\.currentSrc;/);
  assert.match(component, /if \(!shouldReloadPreviewVideo\) \{\s*playPreviewVideo\(video\);/s);
  assert.match(component, /video\.src = selectedPhoto\.videoUrl;/);
  assert.match(component, /video\.load\(\);/);
  assert.match(component, /video\.load\(\);\s*playPreviewVideo\(video\);/s);
  assert.match(component, /setPreviewVideoPlayRequested\(true\);/);
  assert.match(component, /const markPreviewVideoStarted = useCallback\(\(\) => \{/);
  assert.match(component, /const resumePreviewVideoPlayback = useCallback\(/);
});

test("PhotoAlbumMasonry switches the preview flow to click, load, and auto-play", () => {
  assert.match(component, /const previewVideoStatusText = !previewVideoRequested[\s\S]*"点击播放视频"[\s\S]*"正在开始播放\.\.\."/);
  assert.match(component, /const isPreviewVideoOverlayVisible = !previewVideoStarted \|\| previewVideoFailed;/);
  assert.match(
    component,
    /const isPreviewVideoPlayButtonVisible = !previewVideoPlayRequested \|\| previewVideoFailed;/,
  );
  assert.match(component, /\{isPreviewVideoPlayButtonVisible \? \(/);
  assert.match(
    component,
    /aria-label=\{\s*previewVideoFailed \? "重新加载视频" : "加载并播放视频"\s*\}/,
  );
  assert.match(component, /controls=\{isPreviewVideoControlsVisible\}/);
  assert.match(component, /const isPreviewVideoControlsVisible = previewVideoStarted;/);
  assert.match(component, /!previewVideoStarted \? "opacity-100" : "pointer-events-none opacity-0"/);
  assert.match(component, /previewVideoStarted \? "opacity-100" : "pointer-events-none opacity-0"/);
  assert.match(component, /onPlaying=\{\(\) => \{\s*markPreviewVideoStarted\(\);/s);
});

test("PhotoAlbumMasonry surfaces preview loading progress and buffering state", () => {
  assert.match(component, /const getPreviewVideoLoadProgress = \(/);
  assert.match(component, /const syncPreviewVideoLoadProgress = useCallback\(/);
  assert.match(component, /const syncPreviewVideoPlaybackStarted = useCallback\(/);
  assert.match(
    component,
    /const isPreviewVideoSpinnerVisible =\s*previewVideoRequested && !previewVideoFailed && \(!previewVideoStarted \|\| previewVideoBuffering\);/,
  );
  assert.match(component, /onLoadedMetadata=\{\(event\) => \{\s*syncPreviewVideoLoadProgress\(event\.currentTarget\);/s);
  assert.match(component, /onProgress=\{\(event\) => \{\s*syncPreviewVideoLoadProgress\(event\.currentTarget\);/s);
  assert.match(
    component,
    /onCanPlay=\{\(event\) => \{[\s\S]*setPreviewVideoBuffering\(previewVideoPlayRequested && !previewVideoStarted\);[\s\S]*syncPreviewVideoLoadProgress\(event\.currentTarget\);[\s\S]*resumePreviewVideoPlayback\(event\.currentTarget\);/,
  );
  assert.match(
    component,
    /onLoadedData=\{\(\) => \{[\s\S]*resumePreviewVideoPlayback\(previewVideoRef\.current\);/s,
  );
  assert.match(
    component,
    /onPlaying=\{\(\) => \{[\s\S]*markPreviewVideoStarted\(\);/,
  );
  assert.match(
    component,
    /onTimeUpdate=\{\(event\) => \{[\s\S]*syncPreviewVideoPlaybackStarted\(event\.currentTarget\);[\s\S]*syncPreviewVideoLoadProgress\(event\.currentTarget\);/,
  );
  assert.match(
    component,
    /onSuspend=\{\(\) => \{[\s\S]*previewVideoPlayRequested && !previewVideoStarted[\s\S]*setPreviewVideoBuffering\(true\);/s,
  );
  assert.ok(component.includes("已加载 "));
  assert.ok(component.includes("正在缓冲视频..."));
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
    /!previewVideoStarted \? "opacity-100" : "pointer-events-none opacity-0"/,
  );
});
