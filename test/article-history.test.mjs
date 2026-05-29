import assert from "node:assert/strict";
import test from "node:test";

import {
  formatArticleHistoryPath,
  parseGitHistoryLog,
  resolveArticleIdentity,
} from "../src/lib/article-history.js";

test("article identity uses the frontmatter title", () => {
  assert.equal(
    resolveArticleIdentity({
      id: "server/CDN配置",
      data: { title: "CDN配置" },
    }),
    "CDN配置",
  );

  assert.equal(
    resolveArticleIdentity({
      id: "server/CDN配置",
      data: { title: "  CDN配置  " },
    }),
    "CDN配置",
  );

  assert.equal(
    resolveArticleIdentity({
      id: "server/CDN配置",
      data: {},
    }),
    "server/CDN配置",
  );
});

test("git history parser keeps commits, moves, and a synthetic published event", () => {
  const history = parseGitHistoryLog({
    articleIdentity: "CDN配置",
    sourcePath: "src/content/server/CDN配置.md",
    publishedAt: new Date("2023-12-25T12:07:21+08:00"),
    logOutput: [
      "\u001eabc123456789\u001fabc1234\u001f2026-05-29T10:00:00+08:00\u001flsy\u001fupdate CDN notes",
      "M\tsrc/content/server/CDN配置.md",
      "\u001edef987654321\u001fdef9876\u001f2026-04-20T10:00:00+08:00\u001flsy\u001fmove CDN article",
      "R100\tsrc/content/misc/CDN配置.md\tsrc/content/server/CDN配置.md",
    ].join("\n"),
  });

  assert.equal(history.articleIdentity, "CDN配置");
  assert.equal(history.updatedAt?.toISOString(), "2026-05-29T02:00:00.000Z");
  assert.equal(history.revisions[0].kind, "updated");
  assert.equal(history.revisions[1].kind, "moved");
  assert.equal(history.revisions[1].previousPath, "src/content/misc/CDN配置.md");
  assert.equal(history.revisions[1].currentPath, "src/content/server/CDN配置.md");
  assert.equal(history.events.at(-1)?.kind, "published");
  assert.equal(history.events.at(-1)?.date.toISOString(), "2023-12-25T04:07:21.000Z");
});

test("article history display paths omit the content root prefix", () => {
  assert.equal(
    formatArticleHistoryPath("src/content/notes/system/个人数据导出工具微信和QQ空间.md"),
    "notes/system/个人数据导出工具微信和QQ空间.md",
  );
  assert.equal(
    formatArticleHistoryPath("src\\content\\system\\个人数据导出工具微信和QQ空间.md"),
    "system/个人数据导出工具微信和QQ空间.md",
  );
  assert.equal(
    formatArticleHistoryPath("public/assets/example.png"),
    "public/assets/example.png",
  );
});

test("git history parser can attach commit and file snapshot links", () => {
  const history = parseGitHistoryLog({
    articleIdentity: "CDN配置",
    sourcePath: "src/content/server/CDN配置.md",
    publishedAt: new Date("2023-12-25T12:07:21+08:00"),
    repositoryUrl: "https://github.com/lsy2246/newechoes",
    logOutput: [
      "\u001eabc123456789\u001fabc1234\u001f2026-05-29T10:00:00+08:00\u001flsy\u001fupdate CDN notes",
      "M\tsrc/content/server/CDN配置.md",
    ].join("\n"),
  });

  assert.equal(
    history.revisions[0].commitUrl,
    "https://github.com/lsy2246/newechoes/commit/abc123456789",
  );
  assert.equal(
    history.revisions[0].snapshotUrl,
    "https://github.com/lsy2246/newechoes/blob/abc123456789/src/content/server/CDN%E9%85%8D%E7%BD%AE.md",
  );
  assert.equal(history.events.at(-1)?.commitUrl, undefined);
});

test("git history parser omits external links when no repository url is configured", () => {
  const history = parseGitHistoryLog({
    articleIdentity: "CDN配置",
    sourcePath: "src/content/server/CDN配置.md",
    publishedAt: new Date("2023-12-25T12:07:21+08:00"),
    logOutput: [
      "\u001eabc123456789\u001fabc1234\u001f2026-05-29T10:00:00+08:00\u001flsy\u001fupdate CDN notes",
      "M\tsrc/content/server/CDN配置.md",
    ].join("\n"),
  });

  assert.equal(history.revisions[0].commitUrl, undefined);
  assert.equal(history.revisions[0].snapshotUrl, undefined);
});

test("git history parser supports common repository hosting url patterns", () => {
  const cases = [
    {
      repositoryUrl: "https://gitlab.com/lsy2246/newechoes",
      commitUrl: "https://gitlab.com/lsy2246/newechoes/-/commit/abc123456789",
      snapshotUrl: "https://gitlab.com/lsy2246/newechoes/-/blob/abc123456789/src/content/server/CDN%E9%85%8D%E7%BD%AE.md",
    },
    {
      repositoryUrl: "https://git.example.com/lsy2246/newechoes",
      provider: "gitea",
      commitUrl: "https://git.example.com/lsy2246/newechoes/commit/abc123456789",
      snapshotUrl: "https://git.example.com/lsy2246/newechoes/src/commit/abc123456789/src/content/server/CDN%E9%85%8D%E7%BD%AE.md",
    },
    {
      repositoryUrl: "https://bitbucket.org/lsy2246/newechoes",
      commitUrl: "https://bitbucket.org/lsy2246/newechoes/commits/abc123456789",
      snapshotUrl: "https://bitbucket.org/lsy2246/newechoes/src/abc123456789/src/content/server/CDN%E9%85%8D%E7%BD%AE.md",
    },
  ];

  for (const config of cases) {
    const history = parseGitHistoryLog({
      articleIdentity: "CDN配置",
      sourcePath: "src/content/server/CDN配置.md",
      publishedAt: new Date("2023-12-25T12:07:21+08:00"),
      repositoryUrl: config.repositoryUrl,
      repositoryProvider: config.provider,
      logOutput: [
        "\u001eabc123456789\u001fabc1234\u001f2026-05-29T10:00:00+08:00\u001flsy\u001fupdate CDN notes",
        "M\tsrc/content/server/CDN配置.md",
      ].join("\n"),
    });

    assert.equal(history.revisions[0].commitUrl, config.commitUrl);
    assert.equal(history.revisions[0].snapshotUrl, config.snapshotUrl);
  }
});

test("git history parser decodes quoted unicode paths before building snapshot links", () => {
  const history = parseGitHistoryLog({
    articleIdentity: "echoes博客使用说明",
    sourcePath: "src/content/echoes博客使用说明.md",
    publishedAt: new Date("2025-03-09T01:07:23Z"),
    repositoryUrl: "https://github.com/lsy2246/newechoes.git",
    logOutput: [
      "\u001e22de78bbbb93d638440b1a30d5dc3064dce69d63\u001f22de78b\u001f2026-05-29T15:19:07+08:00\u001flsy\u001fmove guide",
      'R100\t"src/content/misc/echoes\\345\\215\\232\\345\\256\\242\\344\\275\\277\\347\\224\\250\\350\\257\\264\\346\\230\\216.md"\t"src/content/echoes\\345\\215\\232\\345\\256\\242\\344\\275\\277\\347\\224\\250\\350\\257\\264\\346\\230\\216.md"',
    ].join("\n"),
  });

  assert.equal(
    history.revisions[0].currentPath,
    "src/content/echoes博客使用说明.md",
  );
  assert.equal(
    history.revisions[0].snapshotUrl,
    "https://github.com/lsy2246/newechoes/blob/22de78bbbb93d638440b1a30d5dc3064dce69d63/src/content/echoes%E5%8D%9A%E5%AE%A2%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E.md",
  );
});
