import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const doubanCollection = readFileSync("src/components/DoubanList.tsx", "utf8");
const wereadBookList = readFileSync("src/components/WereadBookList.tsx", "utf8");
const globalCss = readFileSync("src/styles/global.css", "utf8");

const cssBlock = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return globalCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("movie posters and book covers share a stable title reading layer", () => {
  for (const component of [doubanCollection, wereadBookList]) {
    for (const className of [
      "cover-card",
      "cover-card-poster",
      "cover-card-image",
      "cover-card-overlay",
      "cover-card-textStack",
      "cover-card-titleBadge",
      "cover-card-titleLink",
    ]) {
      assert.ok(component.includes(className), `${className} should be used by cover cards`);
    }
  }

  for (const staleClass of [
    "hover:text-blue-300",
    "bg-linear-to-t from-black/80 to-transparent",
    "font-bold text-white text-sm line-clamp-2",
  ]) {
    assert.equal(doubanCollection.includes(staleClass), false, `${staleClass} should not style movie covers`);
    assert.equal(wereadBookList.includes(staleClass), false, `${staleClass} should not style book covers`);
  }

  const overlay = cssBlock(".cover-card-overlay");
  assert.match(overlay, /linear-gradient\(/);
  assert.match(overlay, /rgba\(0,\s*0,\s*0,\s*0\.92\)/);
  assert.match(overlay, /rgba\(0,\s*0,\s*0,\s*0\.68\)/);

  const textStack = cssBlock(".cover-card-textStack");
  assert.match(textStack, /width:\s*100%;/);
  assert.match(textStack, /display:\s*grid;/);
  assert.match(textStack, /background:\s*rgba\(0,\s*0,\s*0,\s*0\.46\);/);
  assert.match(textStack, /padding:\s*0\.42rem\s+0\.5rem;/);
  assert.match(textStack, /-webkit-backdrop-filter:\s*blur\(6px\);/);

  const titleBadge = cssBlock(".cover-card-titleBadge");
  assert.match(titleBadge, /min-width:\s*0;/);
  assert.match(titleBadge, /-webkit-line-clamp:\s*2;/);
  assert.match(titleBadge, /overflow-wrap:\s*anywhere;/);
  assert.match(titleBadge, /word-break:\s*break-word;/);
  assert.match(titleBadge, /text-shadow:\s*0\s+1px\s+2px\s+rgba\(0,\s*0,\s*0,\s*0\.9\)/);
  assert.doesNotMatch(titleBadge, /padding:\s*0\.34rem\s+0\.45rem;/);

  const scopedTitleBadge = cssBlock(".site-monochrome-page .cover-card-titleBadge");
  assert.match(scopedTitleBadge, /color:\s*#ffffff;/);

  const titleLinkHover = cssBlock(".cover-card-titleLink:hover");
  assert.match(titleLinkHover, /color:\s*#ffffff;/);
  assert.doesNotMatch(titleLinkHover, /blue|2563eb|3b82f6/i);

  const meta = cssBlock(".cover-card-meta");
  assert.match(meta, /min-width:\s*0;/);
  assert.match(meta, /margin:\s*0;/);
  assert.match(meta, /color:\s*rgba\(255,\s*255,\s*255,\s*0\.78\);/);
  assert.match(meta, /text-shadow:\s*0\s+1px\s+2px\s+rgba\(0,\s*0,\s*0,\s*0\.8\)/);
  assert.match(meta, /text-overflow:\s*ellipsis;/);
  assert.match(meta, /white-space:\s*nowrap;/);
  assert.ok(wereadBookList.includes("cover-card-meta"), "book author should use cover-card-meta");
});
