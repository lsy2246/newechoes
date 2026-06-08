import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { normalizeDeployTarget } from "../src/platform/shared/target.js";

const target = normalizeDeployTarget(process.argv[2]?.trim() || process.env.DEPLOY_TARGET);

function clearAstroRenderedContentCache() {
  const cachePaths = [
    join(process.cwd(), ".astro", "data-store.json"),
    join(process.cwd(), "node_modules", ".astro", "data-store.json"),
  ];

  for (const cachePath of cachePaths) {
    rmSync(cachePath, { force: true });
  }
}

try {
  clearAstroRenderedContentCache();
  const { prepareArticleIndexRuntimeArtifacts } = await import("../src/plugins/article-index/integration.js");
  prepareArticleIndexRuntimeArtifacts();
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
