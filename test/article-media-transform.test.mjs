import assert from "node:assert/strict";
import test from "node:test";

import {
  clampMediaTransform,
  fitMediaToStage,
  zoomMediaAtPoint,
} from "../src/lib/article-media-transform.ts";

test("fitMediaToStage centers large media inside the padded stage", () => {
  assert.deepEqual(
    fitMediaToStage(
      { width: 1000, height: 500 },
      { width: 600, height: 400 },
      20,
    ),
    { scale: 0.56, x: 20, y: 60 },
  );
});

test("fitMediaToStage does not enlarge small media past its intrinsic size", () => {
  assert.deepEqual(
    fitMediaToStage(
      { width: 240, height: 120 },
      { width: 600, height: 400 },
      20,
    ),
    { scale: 1, x: 180, y: 140 },
  );
});

test("zoomMediaAtPoint preserves the media point under the cursor", () => {
  const next = zoomMediaAtPoint(
    { scale: 0.5, x: 50, y: 50 },
    { width: 1000, height: 1000 },
    { width: 600, height: 600 },
    { x: 100, y: 100 },
    1,
    0.25,
    4,
  );

  assert.deepEqual(next, { scale: 1, x: 0, y: 0 });
});

test("zoomMediaAtPoint enforces configured scale limits", () => {
  const media = { width: 1000, height: 1000 };
  const stage = { width: 600, height: 600 };
  const point = { x: 300, y: 300 };

  assert.equal(
    zoomMediaAtPoint(
      { scale: 1, x: -200, y: -200 },
      media,
      stage,
      point,
      10,
      0.5,
      4,
    ).scale,
    4,
  );
  assert.equal(
    zoomMediaAtPoint(
      { scale: 1, x: -200, y: -200 },
      media,
      stage,
      point,
      0.1,
      0.5,
      4,
    ).scale,
    0.5,
  );
});

test("clampMediaTransform keeps part of oversized media reachable", () => {
  assert.deepEqual(
    clampMediaTransform(
      { scale: 1, x: 300, y: -800 },
      { width: 1000, height: 1000 },
      { width: 600, height: 600 },
    ),
    { scale: 1, x: 48, y: -448 },
  );
});
