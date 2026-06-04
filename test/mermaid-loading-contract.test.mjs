import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const astroConfig = readFileSync("astro.config.mjs", "utf8");
const articlePage = readFileSync("src/pages/articles/[...id].astro", "utf8");

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
