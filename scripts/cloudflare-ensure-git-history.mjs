import { spawnSync } from "node:child_process";

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

function ensureGitHistory() {
  const shallowCheck = runGit(["rev-parse", "--is-shallow-repository"]);
  if (shallowCheck.status !== 0) {
    throw new Error(shallowCheck.stderr.trim() || "failed to detect shallow git repository state");
  }

  const isShallow = shallowCheck.stdout.trim() === "true";
  if (!isShallow) {
    console.log("[cloudflare-git] repository already has full history");
    return;
  }

  console.log("[cloudflare-git] shallow repository detected, fetching full history from origin");

  const unshallowResult = runGit(["fetch", "--unshallow", "origin"], { stdio: "inherit" });
  if (unshallowResult.status === 0) {
    console.log("[cloudflare-git] full history fetched with --unshallow");
    return;
  }

  console.log("[cloudflare-git] --unshallow unavailable, falling back to a full-depth fetch");
  const fallbackResult = runGit(["fetch", "--depth=2147483647", "origin"], { stdio: "inherit" });
  if (fallbackResult.status !== 0) {
    throw new Error("failed to fetch full git history from origin");
  }

  console.log("[cloudflare-git] full history fetched with fallback depth");
}

try {
  ensureGitHistory();
} catch (error) {
  console.error(
    "[cloudflare-git] failed to ensure git history:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
