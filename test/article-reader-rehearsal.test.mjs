import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const contentConfig = readFileSync("src/content.config.ts", "utf8");
const header = readFileSync("src/components/Header.astro", "utf8");
const demoPath = "src/pages/design/article-reader-rehearsal.astro";

test("article collection schema does not include draft state", () => {
  const schemaBlock =
    contentConfig.match(/schema:\s*z\.object\(\{[\s\S]*?\}\),/)?.[0] ?? "";

  assert.notEqual(schemaBlock, "");
  assert.equal(schemaBlock.includes("draft"), false);
});

test("article reader rehearsal page exists as a standalone layout demo", () => {
  assert.equal(existsSync(demoPath), true);

  const page = readFileSync(demoPath, "utf8");

  for (const requiredText of [
    "article-rehearsal",
    "Cloudflare 免费服务资源限制解决思路",
    "文章目录",
    "Worker CPU 限制",
    "D1 免费额度限制",
    "返回文章列表",
    "这篇文章已经发布超过一年了，内容可能已经过时，请谨慎参考。",
    "相关文章",
    "反向链接",
  ]) {
    assert.ok(page.includes(requiredText), `${requiredText} should be present`);
  }

  assert.ok(page.includes('hideFooter={true}'));
  assert.ok(page.includes('pageType="page"'));
  assert.ok(page.includes('fullBleed={true}'));
  assert.equal(page.includes('pageType="article"'), false);
  assert.ok(page.includes('data-rehearsal-toc'));
});

test("article reader rehearsal avoids course and category language", () => {
  const page = readFileSync(demoPath, "utf8");

  for (const forbiddenText of [
    "echoes / articles",
    "CHAPTER",
    "server note",
    "约 8 分钟阅读",
    "分钟阅读",
  ]) {
    assert.equal(page.includes(forbiddenText), false, `${forbiddenText} should be removed`);
  }

  assert.equal(page.includes('class="reader-path"'), false);
});

test("article reader rehearsal adds a top path bar with a return link", () => {
  const page = readFileSync(demoPath, "utf8");
  const topbarBlock = page.match(/<nav class="reader-topbar"[\s\S]*?<\/nav>/)?.[0] ?? "";
  const topbarCss = page.match(/\.reader-topbar\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
  const breadcrumbCss = page.match(/\.reader-breadcrumb\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";
  const mobileCss = page.match(/@media \(max-width: 720px\) \{[\s\S]*?\n  \}/)?.[0] ?? "";

  assert.notEqual(topbarBlock, "");
  assert.ok(topbarBlock.includes('aria-label="文章路径"'));
  assert.ok(topbarBlock.includes('href="/articles/"'));
  assert.ok(topbarBlock.includes('href="/articles/server/"'));
  assert.ok(topbarBlock.includes("文章"));
  assert.ok(topbarBlock.includes("server"));
  assert.ok(topbarBlock.includes("Cloudflare 免费服务资源限制解决思路"));
  assert.ok(topbarBlock.includes("← 返回文章列表"));
  assert.ok(topbarBlock.includes('aria-current="page"'));
  assert.match(topbarCss, /grid-column:\s*1 \/ -1;/);
  assert.match(topbarCss, /justify-content:\s*space-between;/);
  assert.match(topbarCss, /border-bottom:\s*1px solid var\(--reader-line\);/);
  assert.match(breadcrumbCss, /min-width:\s*0;/);
  assert.match(breadcrumbCss, /overflow:\s*hidden;/);
  assert.match(mobileCss, /\.reader-topbar\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
});

test("article reader rehearsal keeps title and side navigation restrained", () => {
  const page = readFileSync(demoPath, "utf8");

  assert.ok(header.includes("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"));
  assert.match(
    page,
    /grid-template-columns:\s*minmax\(150px,\s*190px\)\s+minmax\(0,\s*1fr\);/,
  );
  assert.match(page, /box-sizing:\s*border-box;/);
  assert.match(page, /width:\s*100%;/);
  assert.match(page, /max-width:\s*80rem;/);
  assert.match(page, /margin:\s*0 auto;/);
  assert.match(page, /gap:\s*34px;/);
  assert.match(page, /padding:\s*38px 1rem 88px;/);
  assert.match(
    page,
    /@media \(min-width: 640px\) \{[\s\S]*?\.article-rehearsal\s*\{[\s\S]*?padding-left:\s*1\.5rem;[\s\S]*?padding-right:\s*1\.5rem;/,
  );
  assert.match(
    page,
    /@media \(min-width: 1024px\) \{[\s\S]*?\.article-rehearsal\s*\{[\s\S]*?padding-left:\s*2rem;[\s\S]*?padding-right:\s*2rem;/,
  );
  assert.match(page, /font-size:\s*46px;/);
  assert.match(page, /font-size:\s*34px;/);
});

test("article reader rehearsal shows dense tags and a compact meta row", () => {
  const page = readFileSync(demoPath, "utf8");
  const tagsBlock = page.match(/const tags = \[[\s\S]*?\];/)?.[0] ?? "";
  const tagCount = (tagsBlock.match(/"/g) || []).length / 2;

  assert.ok(tagCount >= 18);
  assert.equal(page.includes("reader-chapter-row"), false);
  assert.ok(page.includes("reader-meta-line"));
  assert.ok(page.includes("reader-date"));
  assert.ok(page.includes("visibleTags"));
  assert.ok(page.includes("hiddenTagCount"));
  assert.ok(page.includes("reader-tag-more"));
  assert.match(page, /grid-template-columns:\s*auto minmax\(0,\s*1fr\);/);
  assert.match(page, /max-height:\s*68px;/);
  assert.match(page, /overflow:\s*hidden;/);
});

test("article reader rehearsal toc supports nesting without layout-shifting active state", () => {
  const page = readFileSync(demoPath, "utf8");
  const activeBlock = page.match(/\.rail-toc \.toc-link\.is-active\s*\{[\s\S]*?\}/)?.[0] ?? "";
  const activeMarkerBlock =
    page.match(/\.rail-toc \.toc-link\.is-active \.toc-marker\s*\{[\s\S]*?\}/)?.[0] ?? "";

  assert.ok(page.includes("toc-children"));
  assert.ok(page.includes("toc-marker"));
  assert.ok(page.includes("toc-label"));
  assert.ok(page.includes('data-depth="1"'));
  assert.ok(page.includes('data-depth="2"'));
  assert.equal(page.includes("toc-index"), false);
  assert.doesNotMatch(page, /aria-label=\{item\.label\}/);
  assert.doesNotMatch(page, /aria-label=\{child\.label\}/);
  assert.doesNotMatch(page, /<span>\{item\.number\}<\/span>/);
  assert.doesNotMatch(page, /<span>\{child\.number\}<\/span>/);
  assert.notEqual(activeBlock, "");
  assert.equal(activeBlock.includes("padding-left"), false);
  assert.match(activeBlock, /background:\s*transparent;/);
  assert.match(activeBlock, /box-shadow:\s*none;/);
  assert.equal(activeBlock.includes("font-weight"), false);
  assert.equal(activeBlock.includes("border-radius"), false);
  assert.match(activeMarkerBlock, /height:\s*12px;/);
  assert.match(activeMarkerBlock, /width:\s*3px;/);
  assert.equal(page.includes(".rail-toc .toc-link.is-active::before"), false);
  assert.ok(page.includes(".rail-toc .toc-link.is-active .toc-marker"));
  assert.match(page, /grid-template-columns:\s*10px minmax\(0,\s*1fr\);/);
  assert.match(page, /\.rail-toc \.toc-link-child\s*\{[\s\S]*?padding-left:\s*18px;/);
});

test("article reader rehearsal hides the table of contents on mobile", () => {
  const page = readFileSync(demoPath, "utf8");
  const narrowBlock = page.match(/@media \(max-width: 1080px\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
  const mobileBlock = page.match(/@media \(max-width: 720px\) \{[\s\S]*?\n  \}/)?.[0] ?? "";

  assert.notEqual(narrowBlock, "");
  assert.match(narrowBlock, /\.rehearsal-rail\s*\{[\s\S]*?display:\s*none;/);
  assert.notEqual(mobileBlock, "");
  assert.match(mobileBlock, /\.rehearsal-rail\s*\{[\s\S]*?display:\s*none;/);
});

test("article reader rehearsal uses an expired article notice instead of a quote-like note", () => {
  const page = readFileSync(demoPath, "utf8");
  const warningBlock = page.match(/\.reader-warning\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";

  assert.ok(page.includes("reader-warning"));
  assert.ok(page.includes("版本提示"));
  assert.ok(page.includes("这篇文章已经发布超过一年了，内容可能已经过时，请谨慎参考。"));
  assert.equal(page.includes("reader-note"), false);
  assert.notEqual(warningBlock, "");
  assert.equal(warningBlock.includes("font-style"), false);
});

test("article reader rehearsal content column is not narrowed by section numbering", () => {
  const page = readFileSync(demoPath, "utf8");
  const sectionBlock = page.match(/\.reader-section\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";

  assert.notEqual(sectionBlock, "");
  assert.equal(page.includes("section-mark"), false);
  assert.equal(page.includes("grid-template-columns: 52px"), false);
  assert.equal(sectionBlock.includes("display: grid"), false);
});
