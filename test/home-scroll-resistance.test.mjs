import assert from "node:assert/strict";
import test from "node:test";

import {
  getPacedHomeScrollDelta,
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

test("compresses fast input consistently across story phases", () => {
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
  assert.equal(interactive, neutral);
  assert.ok(neutral >= 98 && neutral <= 100);
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

test("uses the same maximum speed throughout a fast gesture", () => {
  const deltas = [];
  for (let index = 0; index < 12; index += 1) {
    deltas.push(getPacedHomeScrollDelta({
      deltaPx: 100,
      elapsedMs: 8,
      viewportHeight: 800,
      device: "desktop",
    }));
  }
  assert.ok(deltas[0] > 0);
  assert.ok(deltas.every((delta) => delta === deltas[0]));
  assert.ok(deltas[0] > 17 && deltas[0] < 18);

  const afterIdle = getPacedHomeScrollDelta({
    deltaPx: -100,
    elapsedMs: 180,
    viewportHeight: 800,
    device: "desktop",
  });
  assert.equal(afterIdle, -100);
});

test("allows an explicit sequence multiplier without introducing state", () => {
  const base = getPacedHomeScrollDelta({
    deltaPx: 100,
    elapsedMs: 8,
    viewportHeight: 800,
    device: "desktop",
  });
  const boosted = getPacedHomeScrollDelta({
    deltaPx: 100,
    elapsedMs: 8,
    viewportHeight: 800,
    device: "desktop",
    speedMultiplier: 1.35,
  });
  assert.ok(Math.abs(boosted / base - 1.35) < 1e-9);
});
