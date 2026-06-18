# Platform Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate Vercel, EdgeOne, and Cloudflare platform behavior behind a single platform architecture with separate build-time and runtime layers.

**Architecture:** Introduce a `src/platform/` tree with shared target normalization, runtime capability/observability modules, and build helpers that own adapter, mirror, and workaround logic. Keep generic plugins in place, but route all platform-dependent behavior through the new platform modules so `astro.config.mjs` becomes a thin assembly layer.

**Tech Stack:** Astro, Vite, Node.js ESM, existing adapter packages (`@astrojs/vercel`, `@astrojs/cloudflare`, `@edgeone/astro`), Node test runner

---

### Task 1: Introduce shared platform modules

**Files:**
- Create: `src/platform/shared/types.ts`
- Create: `src/platform/shared/target.ts`
- Create: `src/platform/shared/registry.ts`
- Test: `test/platform-runtime-architecture.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";

test("platform shared target helpers normalize and validate supported targets", async () => {
  const { normalizeDeployTarget, DEFAULT_DEPLOY_TARGET } = await import("../src/platform/shared/target.ts");

  assert.equal(DEFAULT_DEPLOY_TARGET, "vercel");
  assert.equal(normalizeDeployTarget("edgeone"), "edgeone");
  assert.equal(normalizeDeployTarget("cloudflare"), "cloudflare");
  assert.equal(normalizeDeployTarget("unknown"), "vercel");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/platform-runtime-architecture.test.mjs`
Expected: FAIL because `src/platform/shared/target.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create shared platform modules that:

- define `DeployTarget`
- expose `DEFAULT_DEPLOY_TARGET`
- expose `normalizeDeployTarget()`
- expose a registry shell for platform build/runtime definitions

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/platform-runtime-architecture.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/platform/shared/types.ts src/platform/shared/target.ts src/platform/shared/registry.ts test/platform-runtime-architecture.test.mjs
git commit -m "refactor: add shared platform registry primitives"
```

### Task 2: Move runtime platform behavior under `src/platform/runtime`

**Files:**
- Create: `src/platform/runtime/capabilities.ts`
- Create: `src/platform/runtime/observability.ts`
- Create: `src/platform/runtime/index.ts`
- Modify: `src/lib/runtime/platform.ts`
- Modify: `src/components/layout/Layout.astro`
- Modify: `src/lib/article-history/index.js`
- Modify: `src/lib/google-photos/node.ts`
- Modify: `src/pages/api/google-photos.ts`
- Test: `test/platform-observability.test.mjs`

- [ ] **Step 1: Write the failing test**

Extend `test/platform-runtime-architecture.test.mjs` with assertions that:

- `src/lib/runtime/platform.ts` becomes a compatibility re-export or shim
- runtime capability helpers still expose `supportsGooglePhotosParsing()` and `supportsArticleHistory()`
- runtime observability behavior still depends on `DEPLOY_TARGET`

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/platform-runtime-architecture.test.mjs test/platform-observability.test.mjs`
Expected: FAIL because the new runtime module paths do not exist and old imports still point to legacy layout.

- [ ] **Step 3: Write minimal implementation**

Implement runtime modules by moving logic out of `src/lib/runtime/platform.ts`, then turn `src/lib/runtime/platform.ts` into a small compatibility bridge that re-exports from `src/platform/runtime/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/platform-runtime-architecture.test.mjs test/platform-observability.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/platform/runtime src/lib/runtime/platform.ts src/components/layout/Layout.astro src/lib/article-history/index.js src/lib/google-photos/node.ts src/pages/api/google-photos.ts test/platform-runtime-architecture.test.mjs test/platform-observability.test.mjs
git commit -m "refactor: move runtime platform logic into platform module"
```

### Task 3: Move build/platform helpers out of `astro.config.mjs`

**Files:**
- Create: `src/platform/build/edgeone/compat-plugin.js`
- Create: `src/platform/build/edgeone/routing-patch.js`
- Create: `src/platform/build/mirrors.js`
- Create: `src/platform/build/astro-config.js`
- Create: `src/platform/build/index.js`
- Modify: `src/plugins/build-output.js`
- Modify: `src/plugins/edgeone-routing-integration.js`
- Modify: `astro.config.mjs`
- Test: `test/edgeone-routing.test.mjs`
- Test: `test/edgeone-ssr-packaging.test.mjs`
- Test: `test/url-canonicalization.test.mjs`

- [ ] **Step 1: Write the failing test**

Extend architecture tests so they assert:

- `astro.config.mjs` imports build helpers instead of defining platform functions inline
- `edgeone-routing-integration` becomes a compatibility wrapper around a new EdgeOne build module
- mirror helpers live under `src/platform/build/`

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/platform-runtime-architecture.test.mjs test/edgeone-routing.test.mjs test/edgeone-ssr-packaging.test.mjs test/url-canonicalization.test.mjs`
Expected: FAIL because the build helper modules and delegations do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Move EdgeOne-only build logic into `src/platform/build/edgeone/*`, move output mirror resolution into `src/platform/build/mirrors.js`, and reduce `astro.config.mjs` to importing build descriptors and helper functions.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/platform-runtime-architecture.test.mjs test/edgeone-routing.test.mjs test/edgeone-ssr-packaging.test.mjs test/url-canonicalization.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/platform/build src/plugins/build-output.js src/plugins/edgeone-routing-integration.js astro.config.mjs test/platform-runtime-architecture.test.mjs test/edgeone-routing.test.mjs test/edgeone-ssr-packaging.test.mjs test/url-canonicalization.test.mjs
git commit -m "refactor: extract platform build architecture"
```

### Task 4: Make generic plugins consume platform build helpers

**Files:**
- Modify: `src/plugins/build-article-index.js`
- Modify: `src/plugins/sitemap-integration.js`
- Modify: `src/plugins/rss-integration.js`
- Modify: `src/plugins/robots-integration.js`
- Modify: `src/plugins/llms-integration.js`
- Test: `test/article-index-runtime-artifacts.test.mjs`
- Test: `test/server-asset-relay.test.mjs`

- [ ] **Step 1: Write the failing test**

Extend architecture tests so they assert the generic plugins no longer hard-code platform root paths directly and instead depend on platform build helpers.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/platform-runtime-architecture.test.mjs test/article-index-runtime-artifacts.test.mjs test/server-asset-relay.test.mjs`
Expected: FAIL because the plugins still own platform branching.

- [ ] **Step 3: Write minimal implementation**

Update the generic plugins to delegate static output mirror resolution and other target-specific path handling to the new `src/platform/build/*` modules.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/platform-runtime-architecture.test.mjs test/article-index-runtime-artifacts.test.mjs test/server-asset-relay.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/plugins/build-article-index.js src/plugins/sitemap-integration.js src/plugins/rss-integration.js src/plugins/robots-integration.js src/plugins/llms-integration.js test/platform-runtime-architecture.test.mjs test/article-index-runtime-artifacts.test.mjs test/server-asset-relay.test.mjs
git commit -m "refactor: route generic plugins through platform helpers"
```

### Task 5: Verify all platform behavior end to end

**Files:**
- Modify: `scripts/astro-build.mjs`
- Test: `test/platform-runtime-architecture.test.mjs`
- Test: existing platform-related tests

- [ ] **Step 1: Write the failing test**

Add final assertions that build script target normalization matches the shared target helper and that platform architecture exports are used consistently across runtime and build layers.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/platform-runtime-architecture.test.mjs`
Expected: FAIL until build-script target handling is aligned with the shared target helper.

- [ ] **Step 3: Write minimal implementation**

Update `scripts/astro-build.mjs` to consume shared target normalization and make any final consistency adjustments.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test test/platform-runtime-architecture.test.mjs test/platform-observability.test.mjs test/article-index-runtime-artifacts.test.mjs test/edgeone-routing.test.mjs test/edgeone-ssr-packaging.test.mjs test/url-canonicalization.test.mjs test/server-asset-relay.test.mjs
pnpm run build:edgeone
pnpm run build:vercel
pnpm run build:cloudflare
```

Expected: all tests pass and all three builds complete successfully.

- [ ] **Step 5: Commit**

```bash
git add scripts/astro-build.mjs test/platform-runtime-architecture.test.mjs
git commit -m "refactor: unify platform build entrypoints"
```
