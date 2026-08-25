import assert from "node:assert/strict";
import test from "node:test";

import {
  getAdjacentHomeChapterStop,
  getHomeScrollMomentumLeadLimit,
  getHomeTouchReleaseLead,
  stepHomeScrollMomentum,
} from "../src/components/home/homeScrollMomentum.ts";

test("a wheel impulse keeps moving, eases out, and settles without overshoot", () => {
  let state = {
    positionPx: 0,
    targetPx: 120,
    velocityPxPerSecond: 0,
  };
  const positions = [];
  for (let frameIndex = 0; frameIndex < 120; frameIndex += 1) {
    const frame = stepHomeScrollMomentum(state, 1000 / 60, "desktop");
    positions.push(frame.positionPx);
    state = frame;
    if (frame.settled) break;
  }

  assert.ok(positions[0] > 0 && positions[0] < 12);
  assert.ok(positions.every((position, index) => index === 0 || position >= positions[index - 1]));
  assert.ok(positions.every((position) => position <= 120));
  assert.equal(state.positionPx, 120);
  assert.equal(state.velocityPxPerSecond, 0);
});

test("reverse input follows the same no-overshoot rhythm", () => {
  const frame = stepHomeScrollMomentum({
    positionPx: 400,
    targetPx: 280,
    velocityPxPerSecond: 0,
  }, 1000 / 60, "desktop");

  assert.ok(frame.positionPx < 400);
  assert.ok(frame.positionPx > 280);
  assert.ok(frame.velocityPxPerSecond < 0);
});

test("one gesture resolves only to its adjacent chapter boundary", () => {
  const stops = [0, 0.25, 0.4, 0.58, 0.7, 0.86, 1];
  assert.equal(getAdjacentHomeChapterStop(0.12, 1, stops), 0.25);
  assert.equal(getAdjacentHomeChapterStop(0.26, 1, stops), 0.4);
  assert.equal(getAdjacentHomeChapterStop(0.67, -1, stops), 0.58);
  assert.equal(getAdjacentHomeChapterStop(0.01, -1, stops), 0);
});

test("buffered input stays close to the rendered page", () => {
  assert.equal(getHomeScrollMomentumLeadLimit(800, "desktop"), 400);
  assert.equal(getHomeScrollMomentumLeadLimit(800, "mobile"), 352);
});

test("mobile release velocity adds a short bounded continuation", () => {
  assert.equal(getHomeTouchReleaseLead(60, 800), 0);
  assert.equal(getHomeTouchReleaseLead(900, 800), 90);
  assert.equal(getHomeTouchReleaseLead(-900, 800), -90);
  assert.equal(getHomeTouchReleaseLead(2_000, 800), 144);
});
