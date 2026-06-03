import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync("src/components/PhotoAlbumMasonry.tsx", "utf8");

test("PhotoAlbumMasonry keeps the Google Photos preview video button size consistent", () => {
  assert.match(
    component,
    /className="flex h-16 w-16 items-center justify-center rounded-full bg-black\/75 text-white shadow-lg transition hover:bg-black\/90"/,
  );
  assert.match(component, /className="h-8 w-8"/);
});

test("PhotoAlbumMasonry loads preview videos first and only plays after the video is ready", () => {
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
  assert.match(component, /if \(!shouldReloadPreviewVideo\) \{\s*if \(previewVideoReady \|\| video\.readyState >= HTMLMediaElement\.HAVE_CURRENT_DATA\) \{\s*playPreviewVideo\(video\);/s);
  assert.match(component, /video\.src = selectedPhoto\.videoUrl;/);
  assert.match(component, /video\.load\(\);/);
  assert.match(component, /setPreviewVideoPlayRequested\(true\);/);
});

test("PhotoAlbumMasonry keeps preview playback actionable after the first frame is ready", () => {
  assert.match(component, /const previewVideoStatusText = !previewVideoRequested[\s\S]*"已加载首帧，点击播放"/);
  assert.match(component, /const isPreviewVideoOverlayVisible = !previewVideoStarted \|\| previewVideoFailed;/);
  assert.match(
    component,
    /const isPreviewVideoPlayButtonVisible = !previewVideoPlayRequested \|\| previewVideoFailed;/,
  );
  assert.match(component, /\{isPreviewVideoPlayButtonVisible \? \(/);
  assert.match(
    component,
    /aria-label=\{\s*previewVideoFailed\s*\?\s*"重新加载视频"\s*:\s*previewVideoReady\s*\?\s*"播放视频"\s*:\s*"加载视频"\s*\}/,
  );
  assert.match(component, /controls=\{isPreviewVideoControlsVisible\}/);
  assert.match(component, /const isPreviewVideoControlsVisible = previewVideoStarted;/);
});

test("PhotoAlbumMasonry surfaces preview loading progress and buffering state", () => {
  assert.match(component, /const getPreviewVideoLoadProgress = \(/);
  assert.match(component, /const syncPreviewVideoLoadProgress = useCallback\(/);
  assert.match(component, /const syncPreviewVideoPlaybackStarted = useCallback\(/);
  assert.match(
    component,
    /const isPreviewVideoSpinnerVisible =\s*previewVideoRequested &&[\s\S]*previewVideoPlayRequested && !previewVideoStarted\)\);/,
  );
  assert.match(component, /onLoadedMetadata=\{\(event\) => \{\s*syncPreviewVideoLoadProgress\(event\.currentTarget\);/s);
  assert.match(component, /onProgress=\{\(event\) => \{\s*syncPreviewVideoLoadProgress\(event\.currentTarget\);/s);
  assert.match(
    component,
    /onCanPlay=\{\(event\) => \{[\s\S]*setPreviewVideoBuffering\(previewVideoPlayRequested && !previewVideoStarted\);[\s\S]*syncPreviewVideoLoadProgress\(event\.currentTarget\);/,
  );
  assert.match(
    component,
    /onPlaying=\{\(\) => \{[\s\S]*setPreviewVideoBuffering\(!previewVideoStarted\);/,
  );
  assert.match(
    component,
    /onTimeUpdate=\{\(event\) => \{[\s\S]*syncPreviewVideoPlaybackStarted\(event\.currentTarget\);[\s\S]*syncPreviewVideoLoadProgress\(event\.currentTarget\);/,
  );
  assert.ok(component.includes("已加载 "));
  assert.ok(component.includes("正在缓冲视频..."));
});
