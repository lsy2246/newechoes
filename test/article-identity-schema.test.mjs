import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const contentConfig = readFileSync("src/content.config.ts", "utf8");
const newPost = readFileSync("src/plugins/new-post.mjs", "utf8");
const guide = readFileSync("src/content/echoes博客使用说明.md", "utf8");
const homeDiorama = readFileSync("src/components/home/HomeDiorama.astro", "utf8");
const homeScreenStory = readFileSync("src/components/home/homeScreenStory.ts", "utf8");
const timelinePage = readFileSync("src/pages/timeline.astro", "utf8");
const articleIndexBuild = readFileSync("src/plugins/article-index/build.js", "utf8");
const llmsIntegration = readFileSync("src/plugins/llms-integration.js", "utf8");

test("article collection uses title as the article identity", () => {
  assert.doesNotMatch(contentConfig, /^\s*id:\s*z\.string\(\)/m);
  assert.match(contentConfig, /^\s*title:\s*z\.string\(\)/m);
});

test("new post template writes only title metadata for identity", () => {
  assert.equal(newPost.includes("createStableArticleId"), false);
  assert.doesNotMatch(newPost, /`id:\s*/);
  assert.match(newPost, /`title:\s*"\$\{title\}"\\n`/);
});

test("article system does not support retired article visibility frontmatter", () => {
  const retiredField = ["dr", "aft"].join("");
  const retiredChineseLabel = ["草", "稿"].join("");

  for (const source of [contentConfig, newPost, homeDiorama, homeScreenStory, timelinePage, articleIndexBuild, llmsIntegration]) {
    assert.equal(source.includes(retiredField), false);
    assert.equal(source.includes(retiredChineseLabel), false);
  }
});

test("article guide documents title-backed identity and git-backed history", () => {
  assert.ok(guide.includes("文章身份"));
  assert.ok(guide.includes("文章 URL"));
  assert.ok(guide.includes("title"));
  assert.ok(guide.includes("标题不能重复"));
  assert.ok(guide.includes("Git 修订历史"));
});

test("article guide documents the source repository config", () => {
  assert.ok(guide.includes("SOURCE_REPOSITORY_CONFIG"));
  assert.ok(guide.includes("url: \"\""));
  assert.equal(guide.includes("provider: \"auto\""), false);
  assert.ok(guide.includes("不配置时"));
});

test("article guide documents built-in markdown writing features", () => {
  assert.ok(guide.includes("Markdown 写作能力"));
  assert.ok(guide.includes("Mermaid 图表"));
  assert.ok(guide.includes("```mermaid"));
  assert.ok(guide.includes("可折叠代码块"));
  assert.ok(guide.includes("Shiki"));
  assert.ok(guide.includes("GFM 表格"));
  assert.ok(guide.includes("| 功能 | 写法 |"));
  assert.ok(guide.includes("MDX"));
  assert.ok(guide.includes("外链会自动添加"));
  assert.ok(guide.includes("summary"));
  assert.equal(guide.includes(["dr", "aft"].join("")), false);
  assert.equal(guide.includes(["草", "稿"].join("")), false);
});

test("all article files omit id and declare unique titles", () => {
  const files = [];
  const queue = ["src/content"];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
      } else if (/\.(md|mdx)$/.test(entry.name)) {
        files.push(entryPath);
      }
    }
  }

  const titles = new Map();

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(frontmatter, `${file} is missing frontmatter`);

    const id = frontmatter[1].match(/^id:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim();
    const titleMatch = frontmatter[1].match(/^title:\s*(?:"([^"]*)"|'([^']*)'|([^\r\n]+))\s*$/m);
    const title = (titleMatch?.[1] ?? titleMatch?.[2] ?? titleMatch?.[3] ?? "").trim();
    const dateValue = frontmatter[1].match(/^date:\s*([^\r\n]+)\s*$/m)?.[1]?.trim();
    assert.equal(id, undefined, `${file} should not declare frontmatter id`);
    assert.ok(title, `${file} is missing title`);
    assert.ok(dateValue, `${file} is missing date`);
    assert.doesNotMatch(title, /[\\/]/, `${file} title should be a single route segment`);

    const existing = titles.get(title);
    assert.equal(existing, undefined, `Duplicate article title "${title}" in ${existing} and ${file}`);
    titles.set(title, file);
  }

  assert.ok(files.length > 0);
});
