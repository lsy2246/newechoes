import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const sitemapIntegration = readFileSync("src/plugins/sitemap-integration.js", "utf8");
const rssIntegration = readFileSync("src/plugins/rss-integration.js", "utf8");
const xmlViewStylesPath = "src/plugins/xml-view-styles.js";
const xmlViewStyles = existsSync(xmlViewStylesPath)
  ? readFileSync(xmlViewStylesPath, "utf8")
  : "";
const combined = `${sitemapIntegration}\n${rssIntegration}`;

test("sitemap and RSS XSL views share the light linear editorial palette", () => {
  assert.ok(xmlViewStyles.includes("export function generateXmlViewStyles"));
  assert.ok(xmlViewStyles.includes("--xml-bg: #ffffff;"));
  assert.ok(xmlViewStyles.includes("--xml-ink: #101010;"));
  assert.ok(xmlViewStyles.includes("--xml-muted: #3f3f3f;"));
  assert.ok(xmlViewStyles.includes("--xml-line: #dedede;"));
  assert.ok(xmlViewStyles.includes("--xml-soft: #fafafa;"));

  for (const source of [sitemapIntegration, rssIntegration]) {
    assert.ok(source.includes("generateXmlViewStyles"));
    assert.ok(source.includes("class=\"xml-page\""));
    assert.ok(source.includes("class=\"xml-header\""));
    assert.ok(source.includes("class=\"xml-list\""));
  }

  for (const stale of [
    "#0366d6",
    "#58a6ff",
    "prefers-color-scheme: dark",
    "--card-shadow",
    "box-shadow",
    "translateY",
    "grid-template-columns: repeat(auto-fill",
  ]) {
    assert.equal(combined.includes(stale), false, `${stale} should not appear in XML views`);
  }
});

test("sitemap and RSS render as linear rows instead of cards or boxed tables", () => {
  assert.ok(sitemapIntegration.includes("class=\"xml-row sitemap-row\""));
  assert.ok(sitemapIntegration.includes("class=\"xml-url\""));
  assert.ok(sitemapIntegration.includes("class=\"xml-priority\""));

  assert.ok(rssIntegration.includes("class=\"xml-row rss-row\""));
  assert.ok(rssIntegration.includes("class=\"xml-title\""));
  assert.ok(rssIntegration.includes("class=\"xml-summary\""));
  assert.equal(rssIntegration.includes("class=\"article\""), false);
  assert.equal(rssIntegration.includes("class=\"articles\""), false);
});
