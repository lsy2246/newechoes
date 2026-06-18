import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const astroConfig = readFileSync("astro.config.mjs", "utf8");
const articlePage = readFileSync("src/pages/articles/[...id].astro", "utf8");
const articleMermaid = readFileSync("src/lib/article-mermaid.ts", "utf8");
const swupInit = readFileSync("src/components/swup.js", "utf8");

test("mermaid rendering no longer relies on the global astro-mermaid integration", () => {
  assert.equal(astroConfig.includes('import mermaid from "astro-mermaid";'), false);
  assert.equal(astroConfig.includes("mermaid({"), false);
  assert.ok(astroConfig.includes("rehypeMermaid"));
});

test("article pages own mermaid runtime bootstrapping and gate it behind markdown usage", () => {
  assert.ok(articlePage.includes("const hasMermaidDiagrams"));
  assert.ok(articlePage.includes("initArticleMermaid"));
  assert.ok(articlePage.includes("article.body"));
});

test("swup reboots mermaid after article navigation completes", () => {
  assert.ok(swupInit.includes("function scheduleArticleMermaidBoot()"));
  assert.ok(swupInit.includes("import('../lib/article-mermaid.ts')"));
  assert.ok(swupInit.includes("hasArticleMermaidDiagrams"));
  assert.ok(swupInit.includes("scheduleArticleMermaidBoot();"));
});

test("article mermaid renders in a private scratch root and removes leaked render wrappers", () => {
  assert.ok(articleMermaid.includes("MERMAID_RENDER_ROOT_ID"));
  assert.ok(articleMermaid.includes("data-article-mermaid-render-root"));
  assert.match(articleMermaid, /mermaid\.render\(id,\s*definition,\s*renderRoot\)/);
  assert.match(
    articleMermaid,
    /querySelectorAll\("\[id\^='darticle-mermaid-'\], \[id\^='iarticle-mermaid-'\]"\)/,
  );
  assert.match(
    articleMermaid,
    /try\s*\{[\s\S]*mermaid\.render\(id,\s*definition,\s*renderRoot\)[\s\S]*\}\s*finally\s*\{[\s\S]*removeMermaidRenderArtifacts\(\);/,
  );
});

test("article mermaid uses a fresh deterministic id for every render call", () => {
  assert.match(articleMermaid, /let mermaidRenderIdSequence = 0;/);
  assert.match(articleMermaid, /mermaidRenderIdSequence \+= 1;/);
  assert.match(articleMermaid, /article-mermaid-\$\{index \+ 1\}-\$\{mermaidRenderIdSequence\}/);
  assert.doesNotMatch(articleMermaid, /diagram\.dataset\.mermaidId/);
  assert.doesNotMatch(articleMermaid, /Math\.random/);
});
