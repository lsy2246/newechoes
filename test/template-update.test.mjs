import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  formatPreviewSection,
  formatPreviewSummary,
  loadUpdateConfig,
  parseUpdateCommandArgs,
  planTemplateUpdate,
  shouldUpdatePath,
  syncTemplateFiles,
} from "../scripts/update-template.mjs";

function createTempDir(prefix) {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(rootDir, relativePath, contents) {
  const fullPath = path.join(rootDir, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, contents, "utf8");
}

test("shouldUpdatePath lets update patterns override protect patterns", () => {
  const config = {
    upstream: "https://example.com/template.git",
    branch: "main",
    protect: ["src/content/**", "src/pages/**"],
    update: ["src/pages/articles/**"],
  };

  assert.equal(shouldUpdatePath("src/pages/index.astro", config), false);
  assert.equal(shouldUpdatePath("src/pages/articles/index.astro", config), true);
  assert.equal(shouldUpdatePath("src/styles/global.css", config), true);
  assert.equal(shouldUpdatePath("src/content/post.md", config), false);
});

test("loadUpdateConfig reads list-based settings from update.json", () => {
  const projectDir = createTempDir("template-update-config-");

  try {
    writeFile(
      projectDir,
      "update.json",
      JSON.stringify(
        {
          upstream: "https://example.com/template.git",
          branch: "main",
          protect: ["README.md"],
          update: ["src/pages/articles/**"],
        },
        null,
        2,
      ),
    );

    const config = loadUpdateConfig({ projectDir });
    assert.equal(config.upstream, "https://example.com/template.git");
    assert.equal(config.branch, "main");
    assert.deepEqual(config.protect, ["README.md"]);
    assert.deepEqual(config.update, ["src/pages/articles/**"]);
  } finally {
    rmSync(projectDir, { recursive: true, force: true });
  }
});

test("syncTemplateFiles keeps protected files local and updates allowed files", () => {
  const sourceDir = createTempDir("template-update-source-");
  const targetDir = createTempDir("template-update-target-");

  try {
    const config = {
      upstream: "https://example.com/template.git",
      branch: "main",
      protect: ["src/content/**", "README.md", "src/pages/**"],
      update: ["src/pages/articles/**"],
    };

    writeFile(sourceDir, "README.md", "template readme\n");
    writeFile(sourceDir, "update.json", '{"upstream":"template"}\n');
    writeFile(sourceDir, "src/content/post.md", "template content\n");
    writeFile(sourceDir, "src/pages/index.astro", "template home\n");
    writeFile(sourceDir, "src/pages/articles/index.astro", "template articles\n");
    writeFile(sourceDir, "src/styles/global.css", "template styles\n");

    writeFile(targetDir, "update.json", '{"upstream":"local","protect":["README.md"]}\n');
    writeFile(targetDir, "README.md", "local readme\n");
    writeFile(targetDir, "src/content/post.md", "local content\n");
    writeFile(targetDir, "src/pages/index.astro", "local home\n");
    writeFile(targetDir, "src/pages/articles/index.astro", "local articles old\n");
    writeFile(targetDir, "user-only.txt", "keep me\n");

    const result = syncTemplateFiles({
      sourceDir,
      targetDir,
      trackedFiles: [
        "README.md",
        "update.json",
        "src/content/post.md",
        "src/pages/index.astro",
        "src/pages/articles/index.astro",
        "src/styles/global.css",
      ],
      config,
    });

    assert.deepEqual(result, {
      updated: 2,
      skipped: 4,
      unchanged: 0,
    });
    assert.equal(readFileSync(path.join(targetDir, "README.md"), "utf8"), "local readme\n");
    assert.equal(readFileSync(path.join(targetDir, "update.json"), "utf8"), '{"upstream":"local","protect":["README.md"]}\n');
    assert.equal(readFileSync(path.join(targetDir, "src/content/post.md"), "utf8"), "local content\n");
    assert.equal(readFileSync(path.join(targetDir, "src/pages/index.astro"), "utf8"), "local home\n");
    assert.equal(
      readFileSync(path.join(targetDir, "src/pages/articles/index.astro"), "utf8"),
      "template articles\n",
    );
    assert.equal(readFileSync(path.join(targetDir, "src/styles/global.css"), "utf8"), "template styles\n");
    assert.equal(readFileSync(path.join(targetDir, "user-only.txt"), "utf8"), "keep me\n");
    assert.equal(existsSync(path.join(targetDir, "src/content/new.md")), false);
  } finally {
    rmSync(sourceDir, { recursive: true, force: true });
    rmSync(targetDir, { recursive: true, force: true });
  }
});

test("planTemplateUpdate classifies update skip and unchanged files before writing", () => {
  const sourceDir = createTempDir("template-update-plan-source-");
  const targetDir = createTempDir("template-update-plan-target-");

  try {
    const config = {
      upstream: "https://example.com/template.git",
      branch: "main",
      protect: ["README.md", "src/pages/**"],
      update: ["src/pages/articles/**"],
    };

    writeFile(sourceDir, "README.md", "template readme\n");
    writeFile(sourceDir, "src/pages/index.astro", "template home\n");
    writeFile(sourceDir, "src/pages/articles/index.astro", "template articles\n");
    writeFile(sourceDir, "src/styles/global.css", "same styles\n");

    writeFile(targetDir, "README.md", "local readme\n");
    writeFile(targetDir, "src/pages/index.astro", "local home\n");
    writeFile(targetDir, "src/pages/articles/index.astro", "old articles\n");
    writeFile(targetDir, "src/styles/global.css", "same styles\n");

    const result = planTemplateUpdate({
      sourceDir,
      targetDir,
      trackedFiles: [
        "README.md",
        "src/pages/index.astro",
        "src/pages/articles/index.astro",
        "src/styles/global.css",
      ],
      config,
    });

    assert.deepEqual(result.update, ["src/pages/articles/index.astro"]);
    assert.deepEqual(result.skip, ["README.md", "src/pages/index.astro"]);
    assert.deepEqual(result.unchanged, ["src/styles/global.css"]);
  } finally {
    rmSync(sourceDir, { recursive: true, force: true });
    rmSync(targetDir, { recursive: true, force: true });
  }
});

test("parseUpdateCommandArgs defaults to preview mode and supports apply flag", () => {
  assert.deepEqual(parseUpdateCommandArgs([]), { apply: false, help: false });
  assert.deepEqual(parseUpdateCommandArgs(["--apply"]), { apply: true, help: false });
  assert.deepEqual(parseUpdateCommandArgs(["--help"]), { apply: false, help: true });
});

test("formatPreviewSection truncates long file lists and keeps the count visible", () => {
  const section = formatPreviewSection("无需更新", ["a", "b", "c", "d"], 2);

  assert.deepEqual(section, [
    "无需更新：4",
    "  - a",
    "  - b",
    "  ... 其余 2 项省略",
  ]);
});

test("formatPreviewSummary hides unchanged entries entirely and prints skipped before updates", () => {
  const summary = formatPreviewSummary({
    upstream: "https://example.com/template.git",
    branch: "master",
    trackedFiles: 12,
    plan: {
      skip: ["README.md", "src/pages/index.astro"],
      update: ["package.json"],
      unchanged: ["a", "b", "c"],
    },
  });

  assert.deepEqual(summary, [
    "模板来源：https://example.com/template.git#master",
    "已扫描跟踪文件：12",
    "已屏蔽：2",
    "  - README.md",
    "  - src/pages/index.astro",
    "待更新：1",
    "  - package.json",
  ]);
});

test("syncTemplateFiles does not rewrite unchanged files", () => {
  const sourceDir = createTempDir("template-update-unchanged-source-");
  const targetDir = createTempDir("template-update-unchanged-target-");

  try {
    const config = {
      upstream: "https://example.com/template.git",
      branch: "main",
      protect: [],
      update: [],
    };

    writeFile(sourceDir, "src/styles/global.css", "same styles\n");
    writeFile(targetDir, "src/styles/global.css", "same styles\n");

    const result = syncTemplateFiles({
      sourceDir,
      targetDir,
      trackedFiles: ["src/styles/global.css"],
      config,
    });

    assert.deepEqual(result, {
      updated: 0,
      skipped: 0,
      unchanged: 1,
    });
    assert.equal(readFileSync(path.join(targetDir, "src/styles/global.css"), "utf8"), "same styles\n");
  } finally {
    rmSync(sourceDir, { recursive: true, force: true });
    rmSync(targetDir, { recursive: true, force: true });
  }
});

test("planTemplateUpdate treats text files with different line endings as unchanged", () => {
  const sourceDir = createTempDir("template-update-line-endings-source-");
  const targetDir = createTempDir("template-update-line-endings-target-");

  try {
    const config = {
      upstream: "https://example.com/template.git",
      branch: "main",
      protect: [],
      update: [],
    };

    writeFile(sourceDir, "README.md", "line one\nline two\n");
    writeFile(targetDir, "README.md", "line one\r\nline two\r\n");

    const result = planTemplateUpdate({
      sourceDir,
      targetDir,
      trackedFiles: ["README.md"],
      config,
    });

    assert.deepEqual(result, {
      update: [],
      skip: [],
      unchanged: ["README.md"],
    });
  } finally {
    rmSync(sourceDir, { recursive: true, force: true });
    rmSync(targetDir, { recursive: true, force: true });
  }
});

test("template ships the update command and default update.json lists", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const updateConfig = JSON.parse(readFileSync("update.json", "utf8"));

  assert.equal(packageJson.scripts.update, "node scripts/update-template.mjs");
  assert.equal(updateConfig.upstream, "https://github.com/lsy2246/newechoes.git");
  assert.equal(updateConfig.branch, "master");
  assert.deepEqual(updateConfig.protect, [
    "src/content/**",
    "public/images/**",
    "public/favicon.svg",
    "src/consts.ts",
    "README.md",
    "src/pages/**",
  ]);
  assert.deepEqual(updateConfig.update, ["src/pages/articles/**"]);
});

test("repository defines a text normalization policy", () => {
  const attributes = readFileSync(".gitattributes", "utf8");
  assert.match(attributes, /\* text=auto/);
});
