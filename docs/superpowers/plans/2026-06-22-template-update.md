# Template Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `bun run update` workflow that pulls the upstream template and selectively syncs tracked files based on `update.json` `protect` and `update` path lists.

**Architecture:** Keep the CLI entry in `scripts/` and move matching plus file-sync logic into a small reusable module under `src/lib/`. Use Git-tracked upstream files as the source of truth so ignored/generated files never enter the sync set. `update.json` stays user-owned and is never overwritten by the updater itself.

**Tech Stack:** Node.js ESM, Bun package scripts, Node test runner, built-in filesystem/path/process APIs

---

### Task 1: Define the behavior with tests

**Files:**
- Create: `test/template-update.test.mjs`
- Modify: `package.json`

- [ ] Add tests for path matching precedence: `update` overrides `protect`, `protect` skips by default, unmatched files update.
- [ ] Add tests for sync behavior in a temp workspace: protected files stay local, update exceptions are overwritten, new protected files are not created, and `update.json` is not overwritten.
- [ ] Run: `node --experimental-strip-types --test test/template-update.test.mjs`
- [ ] Confirm the new test file fails for missing module exports before implementation.

### Task 2: Implement the update engine

**Files:**
- Create: `src/lib/template-update.js`
- Create: `scripts/update-template.mjs`

- [ ] Add config loading and validation for `update.json`.
- [ ] Add path matching helpers for `protect` and `update`.
- [ ] Add file sync logic that copies only Git-tracked upstream files and leaves user-only files untouched.
- [ ] Add the CLI entry that clones the configured upstream branch into a temp directory, lists tracked files, applies the sync, and prints a concise summary.
- [ ] Run: `node --experimental-strip-types --test test/template-update.test.mjs`

### Task 3: Wire the command and docs

**Files:**
- Create: `update.json`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `src/content/echoes博客使用说明.md`

- [ ] Add the `update` package script pointing at the CLI entry.
- [ ] Commit the default `update.json` with the agreed protect/update lists for the template.
- [ ] Document the command and config semantics in README and the usage guide.
- [ ] Run: `node --experimental-strip-types --test test/template-update.test.mjs test/public-template-config.test.mjs`

### Task 4: Final verification

**Files:**
- Modify: `docs/superpowers/plans/2026-06-22-template-update.md`

- [ ] Run: `bun run update --help` or the script directly with an invalid setup to verify the CLI prints a clear config error.
- [ ] Run: `bun run test`
- [ ] Review the diff for accidental generated-file churn and keep only the intended update workflow changes.
