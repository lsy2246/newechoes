# Homepage Scroll Speed Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase resisted medium/high-speed homepage input by about 25% without changing gentle input precision or story phase lengths.

**Architecture:** Keep `homeScrollResistance.ts` as the only source of scroll-speed math. Blend a 1.25× speed scale using the existing input-intensity signal, raise device step caps by the same ratio, and leave `diorama.ts`, phase boundaries, and `680dvh` unchanged.

**Tech Stack:** TypeScript, Node test runner with `--experimental-strip-types`, Astro/Vite.

---

### Task 1: Lock the faster resistance curve with tests

**Files:**
- Modify: `test/home-scroll-resistance.test.mjs`

- [ ] **Step 1: Add a failing high-speed output test**

Add a test that calls `getResistedHomeScrollDelta` with desktop `deltaPx: 900`, `elapsedMs: 8`, `viewportHeight: 720` at progress `0.18` and `0.88`. Assert that the neutral output is between 98 and 100 pixels, the interactive output is between 45 and 47 pixels, and the interactive output remains below the neutral output. Keep the existing gentle 8px equality assertion.

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --experimental-strip-types --test test/home-scroll-resistance.test.mjs
```

Expected: FAIL because the current neutral and interactive outputs are approximately 79px and 36px.

### Task 2: Apply the 25% high-input speed scale

**Files:**
- Modify: `src/components/home/homeScrollResistance.ts`
- Test: `test/home-scroll-resistance.test.mjs`

- [ ] **Step 1: Add the speed constant and intensity blend**

Add:

```ts
export const HOME_SCROLL_FAST_INPUT_SCALE = 1.25;
```

After `effectiveResistance`, compute:

```ts
const inputSpeedScale = lerp(1, HOME_SCROLL_FAST_INPUT_SCALE, resistanceAmount);
```

Change the caps and effective magnitude to:

```ts
const maxStep = height * (device === "mobile" ? 0.10625 : 0.1375);
const effectiveMagnitude = Math.min(
  (compressed / effectiveResistance) * inputSpeedScale,
  maxStep,
);
```

- [ ] **Step 2: Run the focused tests and verify GREEN**

Run:

```powershell
node --experimental-strip-types --test test/home-scroll-resistance.test.mjs test/home-scroll-resistance-integration.test.mjs test/home-diorama-mobile-loop-framing.test.mjs test/home-diorama-veil.test.mjs
```

Expected: all focused tests pass, including gentle 8px precision and stronger 3D resistance.

- [ ] **Step 3: Commit the implementation**

```powershell
git add src/components/home/homeScrollResistance.ts test/home-scroll-resistance.test.mjs
git commit -m "tune: speed up homepage resisted scrolling"
```

### Task 3: Verify runtime behavior and delivery

**Files:**
- Verify: `src/components/home/homeScrollResistance.ts`
- Verify: `src/components/home/diorama.ts`
- Verify: `src/components/home/diorama.css`

- [ ] **Step 1: Run production verification**

Run focused tests, `git diff --check`, and `npm run build`. Expected: focused tests and production build exit 0. Run the full test suite and compare any failures against the documented existing baseline rather than attributing unrelated failures to this change.

- [ ] **Step 2: Measure desktop and mobile-size behavior**

In the local homepage, verify desktop slow input remains 8px, a 900px fast input advances about 99px in the neutral zone and about 46px in the 3D interactive zone, and the 3D cue still transitions through `explore` and `settle`. At 390×844, verify the layout remains intact and both scene and canvas retain `touch-action: none` outside reduced-motion mode.

- [ ] **Step 3: Merge the verified branch locally**

Fast-forward the feature branch into `master`, rerun the production build from the main checkout, and remove the temporary worktree only after verification succeeds.
