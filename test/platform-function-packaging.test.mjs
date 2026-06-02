import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gitignoreSource = readFileSync(".gitignore", "utf8");
const tsconfigSource = readFileSync("tsconfig.json", "utf8");

const vercelWrapperSources = [
  readFileSync("api/douban.ts", "utf8"),
  readFileSync("api/weread.ts", "utf8"),
  readFileSync("api/git-projects.ts", "utf8"),
  readFileSync("api/google-photos.ts", "utf8"),
  readFileSync("src/server/vercel-node.ts", "utf8"),
];

const sharedServerSources = [
  readFileSync("src/server/api/douban.ts", "utf8"),
  readFileSync("src/server/api/weread.ts", "utf8"),
  readFileSync("src/server/api/git-projects.ts", "utf8"),
  readFileSync("src/server/api/google-photos.ts", "utf8"),
  readFileSync("src/lib/server-asset-relay.ts", "utf8"),
  readFileSync("src/lib/google-photos/shared.ts", "utf8"),
  readFileSync("src/lib/google-photos/node.ts", "utf8"),
];

test("platform function directories are not gitignored", () => {
  assert.doesNotMatch(gitignoreSource, /^functions\/\*/m);
  assert.doesNotMatch(gitignoreSource, /^cloud-functions\/\*/m);
});

test("vercel node wrappers use explicit .js extensions for relative ESM imports", () => {
  for (const source of vercelWrapperSources) {
    assert.doesNotMatch(source, /from\s+["']\.\.?\/[^"'.]+["']/);
    assert.match(source, /from\s+["']\.\.?\/[^"']+\.js["']/);
  }
});

test("shared server modules use explicit .js extensions for relative runtime imports", () => {
  for (const source of sharedServerSources) {
    assert.doesNotMatch(source, /from\s+["']\.\.?\/[^"'.]+["']/);
  }
});

test("tsconfig includes node types for server wrappers", () => {
  assert.match(tsconfigSource, /"types"\s*:\s*\[[^\]]*"node"[^\]]*\]/);
});
