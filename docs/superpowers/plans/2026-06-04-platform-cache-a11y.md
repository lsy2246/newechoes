# Platform Cache Headers And A11y Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consistent cache header configuration for Cloudflare Pages, Vercel, and EdgeOne, while fixing icon-only controls that lack accessible names.

**Architecture:** Define one shared cache-header policy in source code, then render platform-specific config outputs from that policy so Cloudflare, Vercel, and EdgeOne stay aligned. Fix the confirmed unlabeled search controls in component markup and cover both areas with regression tests.

**Tech Stack:** Astro, Node.js ESM, Node test runner, platform JSON config files, Cloudflare Pages `_headers`

---

### Task 1: Lock Shared Platform Header Policy With Tests

**Files:**
- Create: `test/platform-cache-headers.test.mjs`
- Create: `src/platform/config/cache-headers.js`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";

test("shared cache header policy renders Cloudflare, Vercel, and EdgeOne outputs", async () => {
  const {
    CACHE_HEADER_RULES,
    renderCloudflareHeadersFile,
    buildVercelHeaders,
    buildEdgeoneHeaders,
  } = await import("../src/platform/config/cache-headers.js");

  assert.ok(CACHE_HEADER_RULES.length >= 3);
  assert.match(renderCloudflareHeadersFile(), /Cache-Control:/);
  assert.equal(buildVercelHeaders().length, CACHE_HEADER_RULES.length);
  assert.equal(buildEdgeoneHeaders().length, CACHE_HEADER_RULES.length);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --test-name-pattern "shared cache header policy renders Cloudflare, Vercel, and EdgeOne outputs"`
Expected: FAIL because `src/platform/config/cache-headers.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```js
export const CACHE_HEADER_RULES = [
  {
    source: "/_astro/*",
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      Expires: "Thu, 31 Dec 2037 23:55:55 GMT",
    },
  },
];

export function renderCloudflareHeadersFile() {
  return CACHE_HEADER_RULES.map(({ source, headers }) => {
    const lines = [source];
    for (const [name, value] of Object.entries(headers)) {
      lines.push(`  ${name}: ${value}`);
    }
    return lines.join("\n");
  }).join("\n\n");
}

export function buildVercelHeaders() {
  return CACHE_HEADER_RULES.map(({ source, headers }) => ({ source, headers }));
}

export function buildEdgeoneHeaders() {
  return CACHE_HEADER_RULES.map(({ source, headers }) => ({ source, headers }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --test-name-pattern "shared cache header policy renders Cloudflare, Vercel, and EdgeOne outputs"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/platform-cache-headers.test.mjs src/platform/config/cache-headers.js
git commit -m "test: add shared platform cache header policy coverage"
```

### Task 2: Generate Platform Config Outputs From The Shared Policy

**Files:**
- Modify: `vercel.json`
- Modify: `edgeone.json`
- Create: `public/_headers`
- Modify: `test/platform-cache-headers.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { readFileSync } from "node:fs";

test("platform config files stay in sync with shared cache header policy", async () => {
  const { renderCloudflareHeadersFile, buildVercelHeaders, buildEdgeoneHeaders } =
    await import("../src/platform/config/cache-headers.js");

  assert.equal(readFileSync("public/_headers", "utf8").trim(), renderCloudflareHeadersFile().trim());

  const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.deepEqual(vercelConfig.headers, buildVercelHeaders());

  const edgeoneConfig = JSON.parse(readFileSync("edgeone.json", "utf8"));
  assert.deepEqual(edgeoneConfig.headers, buildEdgeoneHeaders());
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --test-name-pattern "platform config files stay in sync with shared cache header policy"`
Expected: FAIL because `public/_headers` and per-platform header config are missing.

- [ ] **Step 3: Write minimal implementation**

```json
{
  "headers": [
    {
      "source": "/_astro/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --test-name-pattern "platform config files stay in sync with shared cache header policy"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/_headers vercel.json edgeone.json test/platform-cache-headers.test.mjs
git commit -m "feat: add shared cache headers across deploy platforms"
```

### Task 3: Fix Confirmed Unlabeled Search Controls

**Files:**
- Create: `test/search-accessible-name.test.mjs`
- Modify: `src/components/search/Search.tsx`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const searchSource = readFileSync("src/components/search/Search.tsx", "utf8");

test("search icon-only controls expose accessible names", () => {
  assert.match(searchSource, /aria-label="清除搜索"/);
  assert.match(searchSource, /aria-label=\{inlineSuggestion\.type === "correction"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --test-name-pattern "search icon-only controls expose accessible names"`
Expected: FAIL because the controls only use `title` or anonymous `role="button"` markup.

- [ ] **Step 3: Write minimal implementation**

```tsx
<button
  aria-label="清除搜索"
  title="清除搜索"
>
```

```tsx
<div
  role="button"
  aria-label={inlineSuggestion.type === "correction" ? "接受搜索纠正" : "接受搜索补全"}
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test --test-name-pattern "search icon-only controls expose accessible names"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/search-accessible-name.test.mjs src/components/search/Search.tsx
git commit -m "fix: add accessible names to search icon controls"
```

### Task 4: Verify The Full Regression Slice

**Files:**
- Test: `test/platform-cache-headers.test.mjs`
- Test: `test/search-accessible-name.test.mjs`

- [ ] **Step 1: Run targeted regression tests**

Run: `pnpm test --test-name-pattern "shared cache header policy renders Cloudflare, Vercel, and EdgeOne outputs|platform config files stay in sync with shared cache header policy|search icon-only controls expose accessible names"`
Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run: `pnpm test`
Expected: PASS with exit code `0`

- [ ] **Step 3: Run a production build**

Run: `pnpm run build:cloudflare`
Expected: PASS and emit `dist/` with existing compressed artifacts plus unchanged static output.

- [ ] **Step 4: Commit**

```bash
git add test/platform-cache-headers.test.mjs test/search-accessible-name.test.mjs src/platform/config/cache-headers.js public/_headers vercel.json edgeone.json src/components/search/Search.tsx
git commit -m "fix: align platform cache headers and search accessibility"
```
