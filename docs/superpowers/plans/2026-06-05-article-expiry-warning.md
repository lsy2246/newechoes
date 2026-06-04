# Article Expiry Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the article expiry warning prefer the article's latest update time and fall back to the publish time when no update exists.

**Architecture:** Keep the change inside the existing article detail page so the warning logic, JSON-LD metadata, and visible timestamps continue to share the same date source. Extend the existing source-inspection editorial test to lock the new logic and the revised warning copy.

**Tech Stack:** Astro, Node.js built-in test runner, existing source-inspection tests

---

### Task 1: Lock the intended warning behavior with a failing test

**Files:**
- Modify: `test/articles-linear-editorial.test.mjs`
- Test: `test/articles-linear-editorial.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
test("article expiry warning prefers updated time and uses matching copy", () => {
  assert.ok(articleDetail.includes("const articleWarningDate = articleHistory.updatedAt ?? article.data.date;"));
  assert.ok(articleDetail.includes("(currentDate.getTime() - articleWarningDate.getTime())"));
  assert.match(
    constsSource,
    /warningMessage:\s*'这篇文章最近一次更新距离现在已经超过一年了，内容可能已经过时，请谨慎参考。'/,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test --test-name-pattern "article expiry warning prefers updated time and uses matching copy"`
Expected: FAIL because the page still uses `publishDate` and the warning copy still says `已经发布超过一年`.

### Task 2: Implement the minimal article warning change

**Files:**
- Modify: `src/pages/articles/[...id].astro`
- Modify: `src/consts.ts`
- Test: `test/articles-linear-editorial.test.mjs`

- [ ] **Step 1: Write minimal implementation**

```ts
const articleHistory = await getArticleHistory(article, SOURCE_REPOSITORY_CONFIG);
const articleWarningDate = articleHistory.updatedAt ?? article.data.date;

const shouldShowArticleWarning = (() => {
  const currentDate = new Date();
  const daysDiff = Math.floor(
    (currentDate.getTime() - articleWarningDate.getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    ARTICLE_EXPIRY_CONFIG.enabled &&
    daysDiff > ARTICLE_EXPIRY_CONFIG.expiryDays
  );
})();
```

```ts
warningMessage: '这篇文章最近一次更新距离现在已经超过一年了，内容可能已经过时，请谨慎参考。'
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm test --test-name-pattern "article expiry warning prefers updated time and uses matching copy"`
Expected: PASS

### Task 3: Verify the regression and surrounding article-page checks

**Files:**
- Test: `test/articles-linear-editorial.test.mjs`

- [ ] **Step 1: Run the focused editorial suite**

Run: `pnpm test --test-name-pattern "article"`
Expected: PASS with zero failures in matching tests
