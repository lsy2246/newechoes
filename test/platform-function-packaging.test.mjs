import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import "./helpers/ensure-generated-function-wrappers.mjs";

const gitignoreSource = readFileSync(".gitignore", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const tsconfigSource = readFileSync("tsconfig.json", "utf8");
const edgeoneConfig = JSON.parse(readFileSync("edgeone.json", "utf8"));
const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8"));

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
  readFileSync("src/lib/server/asset-relay.ts", "utf8"),
  readFileSync("src/lib/google-photos/shared.ts", "utf8"),
  readFileSync("src/lib/google-photos/node.ts", "utf8"),
];

test("generated platform wrapper directories are gitignored", () => {
  assert.match(gitignoreSource, /^api\/$/m);
  assert.match(gitignoreSource, /^functions\/$/m);
  assert.match(gitignoreSource, /^cloud-functions\/$/m);
});

test("EdgeOne install command generates function wrappers before builder detection", () => {
  assert.match(edgeoneConfig.installCommand, /bun install --frozen-lockfile/);
  assert.match(edgeoneConfig.installCommand, /bun run generate:function-wrappers:edgeone/);
  assert.ok(
    edgeoneConfig.installCommand.indexOf("bun install --frozen-lockfile")
      < edgeoneConfig.installCommand.indexOf("bun run generate:function-wrappers:edgeone"),
  );
});

test("Vercel install command generates function wrappers before function detection", () => {
  assert.match(vercelConfig.installCommand, /bun install/);
  assert.match(vercelConfig.installCommand, /bun run generate:function-wrappers:vercel/);
  assert.ok(
    vercelConfig.installCommand.indexOf("bun install")
      < vercelConfig.installCommand.indexOf("bun run generate:function-wrappers:vercel"),
  );
});

test("platform build scripts generate only the wrapper directory for their target", () => {
  assert.match(packageJson.scripts["build:vercel"], /generate:function-wrappers:vercel/);
  assert.match(packageJson.scripts["build:cloudflare"], /generate:function-wrappers:cloudflare/);
  assert.match(packageJson.scripts["build:edgeone"], /generate:function-wrappers:edgeone/);
  assert.match(packageJson.scripts["deploy:cloudflare"], /generate:function-wrappers:cloudflare/);
});

test("EdgeOne wrapper generation does not emit Cloudflare edge functions", async () => {
  const { generateFunctionWrappers } = await import("../scripts/generate-function-wrappers.mjs");
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "function-wrappers-"));

  try {
    generateFunctionWrappers({ rootDir: tempRoot, target: "edgeone" });

    assert.equal(existsSync(path.join(tempRoot, "cloud-functions", "api", "douban.ts")), true);
    assert.equal(existsSync(path.join(tempRoot, "functions", "api", "douban.ts")), false);
    assert.equal(existsSync(path.join(tempRoot, "functions")), false);
    assert.equal(existsSync(path.join(tempRoot, "api", "douban.ts")), false);
    assert.equal(existsSync(path.join(tempRoot, "api")), false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
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
