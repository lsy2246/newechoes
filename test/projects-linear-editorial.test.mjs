import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalCss = readFileSync("src/styles/global.css", "utf8");
const projectsPage = readFileSync("src/pages/projects.astro", "utf8");
const gitProjects = readFileSync("src/components/GitProjects.tsx", "utf8");
const gitProjectsApi = readFileSync("src/server/api/git-projects.ts", "utf8");

const cssBlock = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
};

test("projects page uses the same dark linear editorial page shell", () => {
  assert.ok(projectsPage.includes('pageType="directory"'));
  assert.ok(projectsPage.includes("GitProjects"));
  assert.equal(projectsPage.includes("projects-shell"), false);
  assert.equal(projectsPage.includes("projects-pathbar"), false);
  assert.equal(projectsPage.includes('aria-label="项目路径"'), false);
  assert.equal(projectsPage.includes("首页"), false);
  assert.equal(projectsPage.includes("container mx-auto"), false);
});

test("git projects render as lightweight project nodes instead of masonry cards", () => {
  assert.ok(gitProjects.includes("git-project-grid"));
  assert.ok(gitProjects.includes("git-project-card-header"));
  assert.ok(gitProjects.includes("git-project-description"));
  assert.equal(gitProjects.includes("ReactMasonryCss"), false);

  assert.match(cssBlock(globalCss, ".git-project-grid"), /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(cssBlock(globalCss, ".git-project-card"), /border:\s*1px solid transparent;/);
  assert.match(cssBlock(globalCss, ".git-project-card"), /box-shadow:\s*none;/);
  assert.match(cssBlock(globalCss, ".git-project-card-link"), /min-height:\s*12rem;/);
  assert.match(cssBlock(globalCss, ".git-project-card-link"), /padding:\s*0\.95rem\s+1rem\s+0\.95rem;/);
  assert.match(cssBlock(globalCss, ".git-project-platform-icon"), /width:\s*2\.8rem;/);
  assert.match(cssBlock(globalCss, ".git-project-platform-icon"), /height:\s*2\.8rem;/);
  assert.match(cssBlock(globalCss, ".git-project-platform-icon"), /color:\s*var\(--site-ink\);/);
  assert.match(cssBlock(globalCss, ".git-project-platform-icon svg"), /width:\s*2\.35rem;/);
  assert.match(cssBlock(globalCss, ".git-project-platform-icon svg"), /height:\s*2\.35rem;/);
  assert.match(cssBlock(globalCss, ".git-project-name"), /overflow-wrap:\s*anywhere;/);
  assert.match(cssBlock(globalCss, ".git-project-description"), /-webkit-line-clamp:\s*2;/);
});

test("project grid keeps three columns on desktop and steps down responsively", () => {
  assert.match(
    globalCss,
    /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.git-project-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?\}/,
  );
  assert.match(
    globalCss,
    /@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*?\.git-project-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\}/,
  );
  assert.match(
    globalCss,
    /\[data-theme="dark"\]\s+\.git-project-platform-icon\s*\{[\s\S]*?color:\s*var\(--site-ink\);[\s\S]*?\}/,
  );
});

test("project metadata can not force horizontal overflow", () => {
  assert.match(cssBlock(globalCss, ".git-project-card"), /min-width:\s*0;/);
  assert.match(cssBlock(globalCss, ".git-project-card-main"), /min-width:\s*0;/);
  assert.match(cssBlock(globalCss, ".git-project-card-main"), /flex:\s*1\s+1\s+0;/);
  assert.match(cssBlock(globalCss, ".git-project-card-main"), /width:\s*100%;/);
  assert.match(cssBlock(globalCss, ".git-project-meta"), /width:\s*100%;/);
  assert.match(cssBlock(globalCss, ".git-project-meta-row"), /min-width:\s*0;/);
  assert.match(cssBlock(globalCss, ".git-project-date-row"), /justify-self:\s*end;/);
  assert.match(cssBlock(globalCss, ".git-project-meta-text"), /text-overflow:\s*ellipsis;/);
  assert.match(cssBlock(globalCss, ".git-project-pagination"), /flex-wrap:\s*wrap;/);
});

test("github projects stay on a single upstream repo-list request and tolerate missing languages", () => {
  assert.equal(gitProjectsApi.includes("fetchGithubPrimaryLanguage"), false);
  assert.equal(gitProjectsApi.includes("/languages"), false);
  assert.match(gitProjectsApi, /language:\s*repo\.language\s*\|\|\s*['"]['"]/);
  assert.match(gitProjectsApi, /fetchAssetWithRelayFallback/);
  assert.doesNotMatch(gitProjectsApi, /GITHUB_PROJECTS_CACHE_TTL_SECONDS|cache:\s*"prefer"|cacheTtl/);
  assert.match(gitProjectsApi, /'Cache-Control':\s*'public,\s*s-maxage=1800'/);
  assert.match(gitProjectsApi, /'CDN-Cache-Control':\s*'public,\s*max-age=1800'/);
  assert.match(gitProjectsApi, /https:\/\/api\.github\.com\/(?:orgs|users)\/.*repos/);
  assert.match(gitProjects, /const displayLanguage = project\.language\?\.trim\(\) \|\| "Unknown";/);
  assert.equal(gitProjects.includes("{project.language && ("), false);
  assert.match(gitProjects, /getLanguageColor\(\s*displayLanguage\s*\)/);
});
