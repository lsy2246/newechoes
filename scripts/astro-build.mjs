import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { normalizeDeployTarget } from "../src/platform/shared/target.js";

const target = normalizeDeployTarget(process.argv[2]?.trim() || process.env.DEPLOY_TARGET);
const prebuiltArticleHistoryPath = join(process.cwd(), ".astro", "assets", "index", "article-history.json");
const prebuiltArticleHistoryDir = join(process.cwd(), ".astro", "assets", "index");

function clearAstroRenderedContentCache() {
  const cachePaths = [
    join(process.cwd(), ".astro", "data-store.json"),
    join(process.cwd(), "node_modules", ".astro", "data-store.json"),
  ];

  for (const cachePath of cachePaths) {
    rmSync(cachePath, { force: true });
  }
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function ensureFullGitHistoryForCloudflareBuild() {
  if (target !== "cloudflare") {
    return;
  }

  const shallowCheck = runGit(["rev-parse", "--is-shallow-repository"]);
  if (shallowCheck.status !== 0) {
    throw new Error(shallowCheck.stderr.trim() || "failed to detect shallow git repository state");
  }

  if (shallowCheck.stdout.trim() !== "true") {
    console.log("[astro-build] repository already has full git history");
    return;
  }

  console.log("[astro-build] shallow repository detected, fetching full history from origin");

  const unshallowResult = spawnSync("git", ["fetch", "--unshallow", "origin"], {
    stdio: "inherit",
  });
  if (unshallowResult.error) {
    throw unshallowResult.error;
  }
  if ((unshallowResult.status ?? 1) === 0) {
    return;
  }

  console.log("[astro-build] --unshallow unavailable, falling back to full-depth fetch");
  const fallbackResult = spawnSync("git", ["fetch", "--depth=2147483647", "origin"], {
    stdio: "inherit",
  });
  if (fallbackResult.error) {
    throw fallbackResult.error;
  }
  if ((fallbackResult.status ?? 1) !== 0) {
    throw new Error("failed to fetch full git history from origin");
  }
}

try {
  clearAstroRenderedContentCache();
  const {
    prepareArticleIndexRuntimeArtifacts,
  } = await import("../src/plugins/article-index/integration.js");
  const {
    buildArticleIndexes,
    writeArticleHistoryIndex,
  } = await import("../src/plugins/article-index/build.js");
  const siteConfig = await import("../src/consts.ts");
  const optionalSiteConfig = /** @type {typeof siteConfig & { SOURCE_REPOSITORY_CONFIG?: Partial<{ url: string, provider: string }> }} */ (siteConfig);
  const siteSourceRepositoryConfig = {
    url: "",
    provider: "github",
    ...(optionalSiteConfig.SOURCE_REPOSITORY_CONFIG ?? {}),
  };

  ensureFullGitHistoryForCloudflareBuild();
  prepareArticleIndexRuntimeArtifacts();
  mkdirSync(prebuiltArticleHistoryDir, { recursive: true });
  const indexes = buildArticleIndexes(
    join(process.cwd(), "src", "content"),
    siteSourceRepositoryConfig,
  );
  writeArticleHistoryIndex(prebuiltArticleHistoryDir, indexes.articleHistoryIndex);
  console.log(`[astro-build] wrote prebuilt article history: ${prebuiltArticleHistoryPath}`);
} catch (error) {
  console.error(
    `[astro-build] failed to prepare article index runtime artifacts for target "${target}":`,
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}

const env = {
  ...process.env,
  DEPLOY_TARGET: target,
  PREBUILT_ARTICLE_HISTORY_PATH: prebuiltArticleHistoryPath,
};

const result = spawnSync("pnpm exec astro build", {
  env,
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(`[astro-build] failed to start Astro build for target "${target}":`, result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
