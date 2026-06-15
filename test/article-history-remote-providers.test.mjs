import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fetchRemoteArticleHistory } from "../src/lib/article-history/remote.js";

const remoteHistorySource = readFileSync("src/lib/article-history/remote.js", "utf8");
const constsSource = readFileSync("src/consts.ts", "utf8");

test("remote article history supports github gitee and gitea providers", () => {
  assert.match(remoteHistorySource, /provider === "github"/);
  assert.match(remoteHistorySource, /provider === "gitee"/);
  assert.match(remoteHistorySource, /provider === "gitea"/);
  assert.match(remoteHistorySource, /provider === "forgejo"/);
});

test("remote article history supports optional provider-specific tokens from env", () => {
  assert.match(remoteHistorySource, /process\.env\.GITHUB_TOKEN/);
  assert.match(remoteHistorySource, /process\.env\.GITEE_TOKEN/);
  assert.match(remoteHistorySource, /process\.env\.GITEA_TOKEN/);
  assert.match(remoteHistorySource, /process\.env\.SOURCE_REPOSITORY_TOKEN/);
});

test("remote article history keeps source repository config provider-driven", () => {
  assert.match(constsSource, /SOURCE_REPOSITORY_CONFIG/);
  assert.match(remoteHistorySource, /repositoryProvider/);
  assert.match(remoteHistorySource, /repositoryUrl/);
});

test("remote article history falls back to published-only data when provider fetch fails", () => {
  assert.match(remoteHistorySource, /return createPublishedOnlyHistory/);
  assert.match(remoteHistorySource, /catch/);
});

test("remote article history requests commit history by repository source file path", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });

    return {
      ok: true,
      async json() {
        return [
          {
            sha: "abc1234567890",
            commit: {
              author: { name: "lsy" },
              committer: { date: "2026-06-15T10:00:00Z" },
              message: "update article",
            },
          },
        ];
      },
    };
  };

  try {
    const history = await fetchRemoteArticleHistory({
      articleIdentity: "常用软件",
      sourcePath: "src/content/articles/常用软件.md",
      publishedAt: new Date("2026-06-01T00:00:00Z"),
      repositoryConfig: {
        url: "https://github.com/lsy2246/newechoes",
        provider: "github",
      },
    });

    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /path=src%2Fcontent%2Farticles%2F%E5%B8%B8%E7%94%A8%E8%BD%AF%E4%BB%B6\.md/);
    assert.equal(history.revisions.length, 1);
    assert.equal(history.revisions[0].currentPath, "src/content/articles/常用软件.md");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
