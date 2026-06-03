import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gitProjectsApiSource = readFileSync("src/server/api/git-projects.ts", "utf8");
const targetSource = readFileSync("src/platform/shared/target.js", "utf8");

test("git-projects reads GITHUB_TOKEN without assuming process exists", () => {
  assert.ok(gitProjectsApiSource.includes("function readProcessEnv(name: string)"));
  assert.ok(gitProjectsApiSource.includes("if (typeof process === 'undefined')"));
  assert.ok(gitProjectsApiSource.includes("const token = readProcessEnv('GITHUB_TOKEN');"));
  assert.equal(gitProjectsApiSource.includes("const token = process.env.GITHUB_TOKEN?.trim();"), false);
});

test("git-projects server api uses the renamed request log module path", () => {
  assert.ok(gitProjectsApiSource.includes("../../lib/server/request-log.js"));
  assert.equal(gitProjectsApiSource.includes("../../lib/server-request-log.js"), false);
});

test("shared target helpers keep isDeployTarget edge-safe", () => {
  assert.ok(targetSource.includes("function getProcessEnv()"));
  assert.ok(targetSource.includes("typeof process !== \"undefined\" ? process.env : undefined"));
  assert.ok(targetSource.includes("export function isDeployTarget(target, env = getProcessEnv())"));
});
