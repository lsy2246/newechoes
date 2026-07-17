import assert from "node:assert/strict";
import test from "node:test";

import {
  getHomeScrollZoneResistance,
  getResistedHomeScrollDelta,
  normalizeWheelDelta,
} from "../src/components/home/homeScrollResistance.ts";

test("normalizes wheel line and page deltas to pixels", () => {
  assert.equal(normalizeWheelDelta(3, 1, 900), 48);
  assert.equal(normalizeWheelDelta(-1, 2, 900), -900);
  assert.equal(normalizeWheelDelta(12, 0, 900), 12);
});

test("preserves gentle precision input", () => {
  assert.equal(getResistedHomeScrollDelta({
    deltaPx: 8,
    elapsedMs: 40,
    progress: 0.18,
    viewportHeight: 900,
    device: "desktop",
  }), 8);
});

test("compresses fast input and applies stronger resistance in the interactive room", () => {
  const neutral = getResistedHomeScrollDelta({
    deltaPx: 900,
    elapsedMs: 8,
    progress: 0.18,
    viewportHeight: 720,
    device: "desktop",
  });
  const interactive = getResistedHomeScrollDelta({
    deltaPx: 900,
    elapsedMs: 8,
    progress: 0.88,
    viewportHeight: 720,
    device: "desktop",
  });

  assert.ok(neutral > 0 && neutral < 900);
  assert.ok(interactive > 0 && interactive < neutral);
  assert.ok(neutral >= 98 && neutral <= 100);
  assert.ok(interactive >= 45 && interactive <= 47);
  assert.ok(neutral <= 720 * 0.1375);
});

test("preserves direction and uses a smaller mobile step cap", () => {
  const reverse = getResistedHomeScrollDelta({
    deltaPx: -1200,
    elapsedMs: 8,
    progress: 0.97,
    viewportHeight: 800,
    device: "mobile",
  });

  assert.ok(reverse < 0);
  assert.ok(Math.abs(reverse) <= 800 * 0.085);
});

test("assigns the strongest zone resistance to the interactive room", () => {
  assert.ok(getHomeScrollZoneResistance(0.88) > getHomeScrollZoneResistance(0.30));
  assert.ok(getHomeScrollZoneResistance(0.30) > 1);
  assert.equal(getHomeScrollZoneResistance(0.18), 1);
});

test("keeps resistance continuous across adjacent story phase boundaries", () => {
  for (const boundary of [0.70, 0.86, 0.925, 0.95]) {
    assert.ok(
      getHomeScrollZoneResistance(boundary) > 1.3,
      `expected story boundary ${boundary} to remain resisted`,
    );
  }
});
