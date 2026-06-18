import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const themeToggleAstro = readFileSync("src/components/theme-toggle/runtime.ts", "utf8").replace(/\r\n/g, "\n");

test("theme transitions preseed the initial pseudo-element mask before waiting for transition.ready", () => {
  assert.match(
    themeToggleAstro,
    /const applyInitialTransitionStyles = \(\) => \{[\s\S]*style\.textContent = `::view-transition-new\(root\) \{ \$\{styles\.initialStyle\} \}`;[\s\S]*style\.textContent = `\s*::view-transition-old\(root\) \{ \$\{styles\.initialStyle\} \}\s*::view-transition-new\(root\) \{ z-index: 998 !important; \}\s*`;/,
  );

  assert.match(
    themeToggleAstro,
    /applyInitialTransitionStyles\(\);[\s\S]*\(async function applyAnimation\(\) \{[\s\S]*\/\/ 等待过渡准备完成[\s\S]*await transition\.ready;/,
  );
});

test("theme transitions use dedicated easing curves for expand and shrink animations", () => {
  assert.match(
    themeToggleAstro,
    /const timingFunction = isExpand\s*\?\s*"cubic-bezier\([^)]+\)"\s*:\s*"cubic-bezier\([^)]+\)";/,
  );
});
