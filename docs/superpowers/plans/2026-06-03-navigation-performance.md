# Navigation Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove eager homepage and global header work that delays first route transitions.

**Architecture:** Shift heavyweight header features behind user intent, move graph content out of base page HTML, defer homepage 3D startup until the browser is idle, and relax swup preloading/asset waiting so route transitions can render sooner.

**Tech Stack:** Astro, React, Swup, Node test runner

---

### Task 1: Lock Performance Contracts With Tests

**Files:**
- Modify: `test/performance-code-splitting.test.mjs`

- [ ] **Step 1: Write failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement the minimal code to make the test pass**
- [ ] **Step 4: Run test to verify it passes**

### Task 2: Move Global Graph Behind First Open

**Files:**
- Create: `src/components/GlobalGraphModalContent.astro`
- Create: `src/pages/global-graph-fragment.astro`
- Create: `src/lib/global-graph-launcher.ts`
- Modify: `src/components/GlobalGraphModal.astro`
- Modify: `src/lib/global-graph-modal.ts`

- [ ] **Step 1: Keep header pages light and fetch modal fragment on demand**
- [ ] **Step 2: Make graph runtime return an openable controller**
- [ ] **Step 3: Verify non-home pages no longer inline graph payload**

### Task 3: Lazy-Mount Header Search

**Files:**
- Create: `src/lib/search-lazy.ts`
- Modify: `src/components/layout/Header.astro`

- [ ] **Step 1: Replace eager `Search` islands with lightweight placeholders**
- [ ] **Step 2: Dynamically import and mount `Search` on user interaction**
- [ ] **Step 3: Verify header source no longer uses `client:idle`**

### Task 4: Delay Homepage Diorama And Relax Swup

**Files:**
- Modify: `src/components/home/HomeDiorama.astro`
- Modify: `src/components/swup.js`

- [ ] **Step 1: Schedule homepage diorama initialization during idle time**
- [ ] **Step 2: Remove visible-link preloading and `awaitAssets: true`**
- [ ] **Step 3: Run focused tests and then the full test suite**
