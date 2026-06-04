# Home Late Boot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home page show loading first, defer 3D boot until after page load, and cancel pending 3D boot when the user navigates away early.

**Architecture:** Extract the home diorama boot timing into a focused browser helper that waits for the initial page `load` event, then starts the existing `diorama` module after a short delay. Keep the existing scene implementation intact, but change the component shell so the loading state is the only visible first impression.

**Tech Stack:** Astro, browser module scripts, Node test runner

---

### Task 1: Add a testable home boot controller

**Files:**
- Create: `src/components/home/homeDioramaBoot.js`
- Create: `test/home-diorama-late-boot.test.mjs`

- [ ] Write failing tests for delayed boot, early navigation cancellation, and post-load scheduling
- [ ] Run `node --test test/home-diorama-late-boot.test.mjs` and confirm the new tests fail
- [ ] Implement the smallest controller that satisfies those tests
- [ ] Re-run `node --test test/home-diorama-late-boot.test.mjs` and confirm it passes

### Task 2: Rewire the home component to use late boot

**Files:**
- Modify: `src/components/home/HomeDiorama.astro`

- [ ] Replace the inline boot scheduler with the extracted controller
- [ ] Keep the existing `diorama` scene module lazy-loaded
- [ ] Set the initial cue state so loading is the only visible first-screen affordance

### Task 3: Verify the new startup contract

**Files:**
- Modify: `test/performance-code-splitting.test.mjs`

- [ ] Update the home startup contract assertions to match the late-boot controller
- [ ] Run the focused home startup tests
- [ ] Run a throttled manual verification to confirm loading appears first and navigation remains responsive
