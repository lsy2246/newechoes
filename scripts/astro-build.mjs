import { spawnSync } from "node:child_process";
import { normalizeDeployTarget } from "../src/platform/shared/target.js";

const target = normalizeDeployTarget(process.argv[2]?.trim() || process.env.DEPLOY_TARGET);
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
