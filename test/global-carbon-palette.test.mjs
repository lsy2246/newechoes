import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalCss = readFileSync("src/styles/global.css", "utf8");
const articlesCss = readFileSync("src/styles/articles.css", "utf8");
const headerCss = readFileSync("src/styles/header.css", "utf8");
const footer = readFileSync("src/components/Footer.astro", "utf8");
const graphRuntime = readFileSync("src/lib/global-graph-modal.ts", "utf8");
const homeStory = readFileSync("src/components/home/homeScreenStory.ts", "utf8");
const homeDiorama = readFileSync("src/components/home/diorama.ts", "utf8");
const homeDioramaCss = readFileSync("src/components/home/diorama.css", "utf8");

const cssBlock = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("global palette uses A Carbon Editorial tokens in light and dark modes", () => {
  const root = cssBlock(globalCss, ":root");
  const dark = cssBlock(globalCss, '[data-theme="dark"]');

  assert.match(root, /--site-bg:\s*#ffffff;/);
  assert.match(root, /--site-ink:\s*#101010;/);
  assert.match(root, /--site-body:\s*#1f1f1f;/);
  assert.match(root, /--site-muted:\s*#3f3f3f;/);
  assert.match(root, /--site-quiet:\s*#626262;/);
  assert.match(root, /--site-line:\s*#dedede;/);
  assert.match(root, /--site-soft:\s*#fafafa;/);

  assert.match(dark, /--site-bg:\s*#111315;/);
  assert.match(dark, /--site-ink:\s*#f5f7fa;/);
  assert.match(dark, /--site-body:\s*#d9dee5;/);
  assert.match(dark, /--site-muted:\s*#bdc5cf;/);
  assert.match(dark, /--site-quiet:\s*#8f9aa7;/);
  assert.match(dark, /--site-line:\s*#30363d;/);
  assert.match(dark, /--site-soft:\s*#15181c;/);
});

test("article and navigation palettes inherit the same Carbon A language", () => {
  assert.match(cssBlock(articlesCss, ":root"), /--article-ink:\s*var\(--site-ink\);/);
  assert.match(cssBlock(articlesCss, ":root"), /--article-muted:\s*var\(--site-muted\);/);
  assert.match(cssBlock(articlesCss, '[data-theme="dark"]'), /--article-bg:\s*var\(--site-bg\);/);

  assert.match(cssBlock(headerCss, "#main-header"), /--nav-signal:\s*var\(--site-ink\);/);
  assert.match(cssBlock(headerCss, "#main-header"), /--nav-ink:\s*var\(--site-body\);/);
  assert.match(cssBlock(headerCss, '[data-theme="dark"] #main-header'), /--nav-panel:\s*color-mix\(in oklab,\s*var\(--site-bg\) 86%,\s*transparent\);/);
});

test("core monochrome pages do not keep the previous heavy black or lavender-gray palette", () => {
  const combined = `${globalCss}\n${articlesCss}\n${headerCss}`;

  for (const stale of ["#101116", "#0b0c10", "#d9dce4", "#9296a0", "#686d78", "#d0ccd0", "#aaa5aa"]) {
    assert.equal(combined.includes(stale), false, `${stale} should be replaced by Carbon A tokens`);
  }
});

test("home and graph runtime fallbacks use the same Carbon A palette", () => {
  const combined = `${graphRuntime}\n${homeStory}\n${homeDiorama}\n${homeDioramaCss}`;

  for (const stale of ["#050505", "#000000", "#d0ccd0", "#aaa5aa", "rgba(208, 204, 208", "rgba(170, 165, 170"]) {
    assert.equal(combined.includes(stale), false, `${stale} should not leak through runtime fallbacks`);
  }

  assert.match(graphRuntime, /read\("--site-ink",\s*isDark \? "#f5f7fa" : "#101010"\)/);
  assert.match(homeStory, /bg:\s*"#111315"/);
  assert.match(homeStory, /text:\s*"#f5f7fa"/);
  assert.match(homeDiorama, /screenBg:\s*"#111315"/);
  assert.match(homeDioramaCss, /background:\s*#111315;/);
});

test("footer and explorer pages avoid fixed black-white and blue-gray haze", () => {
  assert.equal(footer.includes("bg-white"), false);
  assert.equal(footer.includes("dark:bg-black"), false);
  assert.equal(footer.includes("text-black/45"), false);
  assert.equal(footer.includes("dark:text-white/45"), false);
  assert.ok(footer.includes("site-footer"));

  assert.match(cssBlock(globalCss, ".site-footer"), /background:\s*var\(--site-bg\);/);
  assert.match(cssBlock(globalCss, ".site-footer"), /color:\s*var\(--site-muted\);/);
  assert.match(cssBlock(globalCss, ".site-footer a:hover"), /color:\s*var\(--site-ink\);/);
  assert.match(cssBlock(globalCss, ".explorer-grid .node-icon"), /color:\s*var\(--site-muted\);/);
  assert.match(cssBlock(globalCss, ".explorer-grid .node-folder .node-icon"), /color:\s*var\(--site-body\);/);
  assert.equal(globalCss.includes("#9aa4ba"), false);
  assert.equal(globalCss.includes("#c1c8d6"), false);
});
