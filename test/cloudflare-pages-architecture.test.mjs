import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import "./helpers/ensure-generated-function-wrappers.mjs";

const astroConfigSource = readFileSync("astro.config.mjs", "utf8");
const buildConfigHelpers = readFileSync("src/platform/build/astro-config.js", "utf8");
const mirrorHelpers = readFileSync("src/platform/build/mirrors.js", "utf8");
const packageJson = readFileSync("package.json", "utf8");
const astroBuildScript = readFileSync("scripts/astro-build.mjs", "utf8");

test("frontend build is globally static and does not depend on a server adapter", () => {
  assert.match(astroConfigSource, /output:\s*"static"/);
  assert.match(
    buildConfigHelpers,
    /export function resolvePlatformOutput\(target\)\s*\{\s*return "static";\s*\}/,
  );
  assert.match(astroConfigSource, /resolvePlatformAdapter\(DEPLOY_TARGET\)/);
  assert.match(buildConfigHelpers, /target === "vercel"/);
  assert.match(buildConfigHelpers, /return vercel\(\)/);
  assert.match(buildConfigHelpers, /return undefined/);
  assert.doesNotMatch(buildConfigHelpers, /createAstroApiRouteIntegration/);
  assert.doesNotMatch(buildConfigHelpers, /resolvePlatformSsrConfig/);
  assert.doesNotMatch(mirrorHelpers, /deployTarget === "cloudflare"[\s\S]*dist", "server"/);
});

test("shared API logic stays in src/server/api behind generated Astro route wrappers", () => {
  for (const sharedHandlerPath of [
    "src/server/api/douban.ts",
    "src/server/api/weread.ts",
    "src/server/api/git-projects.ts",
    "src/server/api/google-photos.ts",
  ]) {
    assert.equal(existsSync(sharedHandlerPath), true, `${sharedHandlerPath} should exist`);
  }

  for (const generatedRoutePath of [
    "src/pages/api/douban.ts",
    "src/pages/api/weread.ts",
    "src/pages/api/git-projects.ts",
    "src/pages/api/google-photos.ts",
  ]) {
    const generatedSource = readFileSync(generatedRoutePath, "utf8");
    assert.match(generatedSource, /This file is auto-generated/);
    assert.match(generatedSource, /export const prerender = false/);
    assert.match(generatedSource, /from "\.\.\/\.\.\/server\/api\//);
  }
});

test("platform wrappers exist for every public api route", () => {
  for (const functionPath of [
    "src/pages/api/douban.ts",
    "src/pages/api/weread.ts",
    "src/pages/api/git-projects.ts",
    "src/pages/api/google-photos.ts",
    "functions/api/douban.ts",
    "functions/api/weread.ts",
    "functions/api/git-projects.ts",
    "functions/api/google-photos.ts",
    "cloud-functions/api/douban.ts",
    "cloud-functions/api/weread.ts",
    "cloud-functions/api/git-projects.ts",
    "cloud-functions/api/google-photos.ts",
  ]) {
    assert.equal(existsSync(functionPath), true, `${functionPath} should exist`);
  }
});

test("cloudflare deploy script targets pages instead of worker wrangler output", () => {
  const parsed = JSON.parse(packageJson);
  assert.equal(
    parsed.scripts["deploy:cloudflare"],
    "bun run generate:function-wrappers:cloudflare && wrangler pages deploy dist",
  );
});

test("cloudflare build hydrates git history before Astro build", () => {
  const parsed = JSON.parse(packageJson);

  assert.equal(existsSync("scripts/cloudflare-ensure-git-history.mjs"), false);
  assert.equal(existsSync("scripts/prebuild-article-history.mjs"), false);
  assert.doesNotMatch(parsed.scripts["build:cloudflare"], /cloudflare-ensure-git-history/);
  assert.doesNotMatch(parsed.scripts["build:cloudflare"], /prebuild-article-history/);
  assert.match(astroBuildScript, /--is-shallow-repository/);
  assert.match(astroBuildScript, /--unshallow/);
  assert.match(astroBuildScript, /PREBUILT_ARTICLE_HISTORY_PATH/);
});
