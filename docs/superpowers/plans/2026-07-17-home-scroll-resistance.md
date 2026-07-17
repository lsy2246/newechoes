# Homepage Scroll Resistance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage preserve readable 2D story stages and longer 3D interaction/return stages by applying velocity-aware, phase-aware resistance to desktop and mobile scrolling.

**Architecture:** Add a pure scroll-resistance module that normalizes input and returns a bounded effective delta. Keep `window.scrollY` as the single source of truth by applying that delta to real page scroll inside `diorama.ts`; retain native synchronization for keyboard, scrollbar, and programmatic movement.

**Tech Stack:** TypeScript, Astro, browser Wheel/Touch/Pointer Events, Node test runner, Playwright browser verification

---

## File Structure

- Create `src/components/home/homeScrollResistance.ts`: pure normalization, velocity compression, zone resistance, and step cap functions.
- Create `test/home-scroll-resistance.test.mjs`: behavior tests for the pure math.
- Create `test/home-scroll-resistance-integration.test.mjs`: source contracts for desktop/mobile wiring, lifecycle cleanup, fallbacks, and phase budgets.
- Modify `src/components/home/diorama.ts`: integrate resisted wheel and touch input while preserving the current progress pipeline and 3D orbit intent.
- Modify `src/components/home/diorama.css`: increase the homepage physical scroll budget on desktop and mobile.

### Task 1: Pure dynamic resistance math

**Files:**
- Create: `src/components/home/homeScrollResistance.ts`
- Create: `test/home-scroll-resistance.test.mjs`

- [ ] **Step 1: Write the failing unit tests**

Create tests that import the wished-for API and verify normalization, precision input, high-speed compression, stronger 3D resistance, direction preservation, and maximum step size:

```js
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
    viewportHeight: 900,
    device: "desktop",
  });
  const interactive = getResistedHomeScrollDelta({
    deltaPx: 900,
    elapsedMs: 8,
    progress: 0.88,
    viewportHeight: 900,
    device: "desktop",
  });

  assert.ok(neutral > 0 && neutral < 900);
  assert.ok(interactive > 0 && interactive < neutral);
  assert.ok(neutral <= 900 * 0.11);
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
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --experimental-strip-types --test test/home-scroll-resistance.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `homeScrollResistance.ts`.

- [ ] **Step 3: Implement the minimal pure module**

Create a typed module with these public exports and exact zone profile:

```ts
export type HomeScrollInputDevice = "desktop" | "mobile";

export type HomeScrollResistanceInput = {
  deltaPx: number;
  elapsedMs: number;
  progress: number;
  viewportHeight: number;
  device: HomeScrollInputDevice;
};

type ResistanceZone = {
  start: number;
  end: number;
  multiplier: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const smoothstep = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export const HOME_SCROLL_RESISTANCE_ZONES: readonly ResistanceZone[] = [
  { start: 0.04, end: 0.16, multiplier: 1.35 },
  { start: 0.22, end: 0.41, multiplier: 1.45 },
  { start: 0.40, end: 0.53, multiplier: 1.50 },
  { start: 0.56, end: 0.70, multiplier: 1.60 },
  { start: 0.70, end: 0.86, multiplier: 1.55 },
  { start: 0.86, end: 0.925, multiplier: 2.40 },
  { start: 0.925, end: 0.95, multiplier: 1.80 },
  { start: 0.95, end: 1, multiplier: 2.00 },
];

export const normalizeWheelDelta = (delta: number, deltaMode: number, viewportHeight: number) => {
  if (deltaMode === 1) return delta * 16;
  if (deltaMode === 2) return delta * Math.max(1, viewportHeight);
  return delta;
};

export const getHomeScrollZoneResistance = (progress: number) => {
  const value = clamp(progress);
  return HOME_SCROLL_RESISTANCE_ZONES.reduce((strongest, zone) => {
    const feather = Math.min(0.016, (zone.end - zone.start) / 3);
    const enter = smoothstep((value - zone.start) / feather);
    const exit = 1 - smoothstep((value - (zone.end - feather)) / feather);
    const weight = Math.min(enter, exit);
    return Math.max(strongest, 1 + (zone.multiplier - 1) * weight);
  }, 1);
};

export const getResistedHomeScrollDelta = ({
  deltaPx,
  elapsedMs,
  progress,
  viewportHeight,
  device,
}: HomeScrollResistanceInput) => {
  if (!Number.isFinite(deltaPx) || Math.abs(deltaPx) < 0.001) return 0;

  const height = Math.max(1, viewportHeight);
  const magnitude = Math.abs(deltaPx);
  const fineThreshold = Math.max(device === "mobile" ? 14 : 18, height * (device === "mobile" ? 0.018 : 0.022));
  const excess = Math.max(0, magnitude - fineThreshold);
  const compressed = magnitude <= fineThreshold
    ? magnitude
    : fineThreshold + Math.sqrt(excess * fineThreshold);
  const elapsed = clamp(elapsedMs, 8, 120);
  const velocity = magnitude / elapsed;
  const velocityStart = device === "mobile" ? 0.9 : 0.65;
  const velocitySpan = device === "mobile" ? 3.2 : 2.4;
  const velocityAmount = smoothstep((velocity - velocityStart) / velocitySpan);
  const magnitudeAmount = smoothstep((magnitude - fineThreshold) / (fineThreshold * 2.5));
  const resistanceAmount = Math.max(velocityAmount, magnitudeAmount);
  const velocityResistance = 1 + velocityAmount * (device === "mobile" ? 0.5 : 0.65);
  const zoneResistance = getHomeScrollZoneResistance(progress);
  const effectiveResistance = lerp(1, velocityResistance * zoneResistance, resistanceAmount);
  const maxStep = height * (device === "mobile" ? 0.085 : 0.11);
  const effectiveMagnitude = Math.min(compressed / effectiveResistance, maxStep);

  return Math.sign(deltaPx) * effectiveMagnitude;
};
```

- [ ] **Step 4: Run the unit tests and verify GREEN**

Run: `node --experimental-strip-types --test test/home-scroll-resistance.test.mjs`

Expected: 5 tests pass.

- [ ] **Step 5: Commit the pure behavior**

```bash
git add src/components/home/homeScrollResistance.ts test/home-scroll-resistance.test.mjs
git commit -m "feat: add homepage scroll resistance curve"
```

### Task 2: Desktop wheel integration and lifecycle

**Files:**
- Create: `test/home-scroll-resistance-integration.test.mjs`
- Modify: `src/components/home/diorama.ts`

- [ ] **Step 1: Write the failing desktop integration contracts**

Create a source-contract test that asserts:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dioramaTs = readFileSync("src/components/home/diorama.ts", "utf8");
const dioramaCss = readFileSync("src/components/home/diorama.css", "utf8");

test("home wheel input uses velocity and phase aware resistance", () => {
  assert.match(dioramaTs, /from "\.\/homeScrollResistance";/);
  assert.match(dioramaTs, /normalizeWheelDelta\(e\.deltaY, e\.deltaMode, window\.innerHeight\)/);
  assert.match(dioramaTs, /getResistedHomeScrollDelta\(\{/);
  assert.match(dioramaTs, /if \(reduceMotion \|\| e\.ctrlKey \|\| !e\.cancelable/);
  assert.match(dioramaTs, /window\.addEventListener\("wheel", homeWheelHandler, \{ passive: false, capture: true \}\);/);
  assert.match(dioramaTs, /window\.removeEventListener\("wheel", homeWheelHandler, true\);/);
});

test("home scroll budget expands the 3D interaction and return phases", () => {
  assert.match(dioramaCss, /min-height:\s*680dvh;/);
  assert.match(dioramaTs, /const HANDOFF_MODE_END = 0\.745;/);
  assert.match(dioramaTs, /const ROOM_CAMERA_END = 0\.86;/);
  assert.match(dioramaTs, /const LOOP_CAMERA_REJOIN_START = 0\.925;/);
  assert.match(dioramaTs, /const LOOP_RETURN_START = 0\.95;/);
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `node --experimental-strip-types --test test/home-scroll-resistance-integration.test.mjs`

Expected: FAIL because the resistance imports, handlers, and new budgets do not exist.

- [ ] **Step 3: Wire the desktop input path**

Import `getResistedHomeScrollDelta` and `normalizeWheelDelta`. Replace `loopBackwardWheelHandler` with `homeWheelHandler`. Add an `applyResistedScrollDelta(deltaPx, elapsedMs, device)` helper that calls the pure module, performs `window.scrollBy({ top: effectiveDelta, left: 0, behavior: "auto" })`, and calls `syncScrollProgress()`.

The wheel handler must:

```ts
if (reduceMotion || e.ctrlKey || !e.cancelable || !isHomeScrollActive()) return;
const deltaPx = normalizeWheelDelta(e.deltaY, e.deltaMode, window.innerHeight);
if (Math.abs(deltaPx) < 0.01) return;
if (deltaPx < 0 && wrapOpeningBackward(deltaPx)) {
  e.preventDefault();
  e.stopImmediatePropagation();
  return;
}
e.preventDefault();
e.stopImmediatePropagation();
const now = e.timeStamp || performance.now();
applyResistedScrollDelta(deltaPx, lastWheelAt ? now - lastWheelAt : 16, "desktop");
lastWheelAt = now;
```

Register it on `window` with `{ passive: false, capture: true }` and remove it with capture `true` in `cleanup()`.

- [ ] **Step 4: Adjust the phase constants and CSS budget**

Set:

```ts
const HANDOFF_MODE_END = 0.745;
const ROOM_CAMERA_END = 0.86;
const LOOP_CAMERA_REJOIN_START = 0.925;
const LOOP_RETURN_START = 0.95;
```

Change both desktop and mobile `.home-diorama-shell` declarations from `620dvh` to `680dvh`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --experimental-strip-types --test test/home-scroll-resistance.test.mjs test/home-scroll-resistance-integration.test.mjs test/home-diorama-veil.test.mjs`

Expected: all focused tests pass after updating the existing veil contract to the new phase constants.

- [ ] **Step 6: Commit desktop integration**

```bash
git add src/components/home/diorama.ts src/components/home/diorama.css test/home-scroll-resistance-integration.test.mjs test/home-diorama-veil.test.mjs
git commit -m "feat: resist fast homepage wheel input"
```

### Task 3: Mobile vertical resistance without breaking orbit gestures

**Files:**
- Modify: `test/home-scroll-resistance-integration.test.mjs`
- Modify: `src/components/home/diorama.ts`

- [ ] **Step 1: Add failing mobile contracts**

Append assertions for non-passive window touch listeners, interactive-target bypass, use of the mobile resistance profile, the existing horizontal orbit branch, and cleanup:

```js
test("mobile vertical gestures use resistance while horizontal gestures keep orbit control", () => {
  assert.match(dioramaTs, /window\.addEventListener\("touchstart", homeTouchStartHandler, \{ passive: true, capture: true \}\);/);
  assert.match(dioramaTs, /window\.addEventListener\("touchmove", homeTouchMoveHandler, \{ passive: false, capture: true \}\);/);
  assert.match(dioramaTs, /applyResistedScrollDelta\([^;]+"mobile"\)/s);
  assert.match(dioramaTs, /mobileGestureIntent === "scroll"/);
  assert.match(dioramaTs, /mobileGestureIntent === "orbit"/);
  assert.match(dioramaTs, /window\.removeEventListener\("touchmove", homeTouchMoveHandler, true\);/);
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `node --experimental-strip-types --test test/home-scroll-resistance-integration.test.mjs`

Expected: the new mobile contract fails.

- [ ] **Step 3: Implement non-interactive mobile touch resistance**

Add window-level `touchstart`, `touchmove`, `touchend`, and `touchcancel` handlers active only for the mobile carrier, one-finger gestures, the visible home range, and non-interactive targets. Track one touch identifier, start/last coordinates, last timestamp, and an intent of `pending | scroll | horizontal`. After an 8px threshold, accept vertical intent when `abs(dy) >= abs(dx) * 0.75`; only the scroll intent calls `preventDefault()` and `applyResistedScrollDelta(lastY - currentY, elapsed, "mobile")`.

- [ ] **Step 4: Route interactive vertical gestures through the same helper**

In `handleMobileGestureMove`, replace the raw `window.scrollBy` call in the `scroll` branch with `applyResistedScrollDelta`. Keep the existing `orbit` branch and update a `mobileGestureLastAt` timestamp on start and move.

- [ ] **Step 5: Register and clean up every touch listener**

Use passive `touchstart`, non-passive `touchmove`, passive `touchend`/`touchcancel`, all with capture `true`. Remove each listener in `cleanup()` and reset gesture state.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --experimental-strip-types --test test/home-scroll-resistance.test.mjs test/home-scroll-resistance-integration.test.mjs test/home-diorama-mobile-loop-framing.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 7: Commit mobile integration**

```bash
git add src/components/home/diorama.ts test/home-scroll-resistance-integration.test.mjs
git commit -m "feat: add resisted mobile homepage scrolling"
```

### Task 4: Full verification and runtime tuning

**Files:**
- Modify only if evidence requires it: `src/components/home/homeScrollResistance.ts`, `src/components/home/diorama.ts`, `src/components/home/diorama.css`, related tests

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: all tests pass without new warnings or failures.

- [ ] **Step 2: Run Astro type checking**

Run: `npx astro check`

Expected: zero errors.

- [ ] **Step 3: Run a production build**

Run: `npm run build`

Expected: build exits successfully and creates `dist`.

- [ ] **Step 4: Verify desktop behavior in a real browser**

Start the local site and use a desktop viewport. Verify with small and large wheel deltas that small input remains precise, large input cannot cross multiple 2D changes, progress can settle in 0.86–0.925, horizontal 3D drag still orbits, and 0.95–0.998 returns gradually.

- [ ] **Step 5: Verify mobile behavior in a real browser**

Use a phone-sized viewport with touch emulation. Verify that vertical swipes use bounded progress, horizontal gestures orbit only during the interactive stage, multi-touch remains native, and navigation controls remain tappable.

- [ ] **Step 6: Review the diff and run whitespace checks**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended implementation and test files remain modified.

- [ ] **Step 7: Commit any evidence-based tuning**

If browser verification required curve changes, stage only the resistance implementation and its expectation updates, then commit with:

```bash
git add src/components/home/homeScrollResistance.ts src/components/home/diorama.ts src/components/home/diorama.css test/home-scroll-resistance.test.mjs test/home-scroll-resistance-integration.test.mjs test/home-diorama-veil.test.mjs
git commit -m "fix: tune homepage animation pacing"
```
