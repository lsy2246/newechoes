import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gitProjectsApiSource = readFileSync("src/server/api/git-projects.ts", "utf8");
const gitProjectCollectionSource = readFileSync("src/components/GitProjectCollection.tsx", "utf8");
const targetSource = readFileSync("src/platform/shared/target.js", "utf8");

test("git-projects removes token-based auth and keeps client config token-free", () => {
  assert.equal(gitProjectsApiSource.includes("readProcessEnv"), false);
  assert.equal(gitProjectsApiSource.includes("GITHUB_TOKEN"), false);
  assert.equal(gitProjectsApiSource.includes("Authorization"), false);
  assert.equal(gitProjectCollectionSource.includes("token?: string"), false);
  assert.equal(gitProjectCollectionSource.includes("token,"), false);
  assert.equal(gitProjectCollectionSource.includes("token,"), false);
  assert.equal(gitProjectCollectionSource.includes("config.token"), false);
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
