# Template Update Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `bun run update` preview and confirm by default, add `--apply` for direct sync, and prevent no-op rewrites that create line-ending noise.

**Architecture:** Keep the CLI entry in `scripts/update-template.mjs`, add a planning phase in `src/lib/template-update.js` that classifies tracked files before writing, and only write files whose contents differ. Normalize repository text behavior with `.gitattributes` so the updater stops inflating the working tree on Windows.

**Tech Stack:** Node.js ESM, Bun package scripts, Node test runner, Git, `.gitattributes`

---

### Task 1: Define preview and no-op write behavior with tests

**Files:**
- Modify: `test/template-update.test.mjs`

- [ ] Add a failing test for planning updates into `update`, `skip`, and `unchanged`.
- [ ] Add a failing test showing default CLI mode requires confirmation before applying.
- [ ] Add a failing test showing identical files are reported as unchanged and not rewritten.
- [ ] Run: `node --experimental-strip-types --test test/template-update.test.mjs`

### Task 2: Implement preview planning and apply control

**Files:**
- Modify: `src/lib/template-update.js`
- Modify: `scripts/update-template.mjs`

- [ ] Add a planning helper that compares upstream and local file contents before any write.
- [ ] Return detailed file lists and counts for `update`, `skip`, and `unchanged`.
- [ ] Make the CLI prompt on default mode and bypass the prompt with `--apply`.
- [ ] Run: `node --experimental-strip-types --test test/template-update.test.mjs`

### Task 3: Normalize repository line endings and docs

**Files:**
- Create: `.gitattributes`
- Modify: `README.md`
- Modify: `src/content/echoes博客使用说明.md`

- [ ] Add a minimal `.gitattributes` policy for text files.
- [ ] Document preview-first update behavior and `--apply`.
- [ ] Run: `node --experimental-strip-types --test test/template-update.test.mjs test/public-template-config.test.mjs`

### Task 4: Final verification

**Files:**
- Modify: `docs/superpowers/plans/2026-06-22-template-update-preview.md`

- [ ] Run: `bun run update -- --help`
- [ ] Run: `node --experimental-strip-types --test test/template-update.test.mjs test/public-template-config.test.mjs`
- [ ] Review `git diff --name-only` to confirm the updater no longer rewrites unrelated files in the test harness.
