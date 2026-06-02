export const DEFAULT_DEPLOY_TARGET = "vercel";

export function normalizeDeployTarget(value) {
  if (value === "edgeone" || value === "cloudflare" || value === "vercel") {
    return value;
  }

  return DEFAULT_DEPLOY_TARGET;
}

export function getDeployTarget(env = process.env) {
  return normalizeDeployTarget(env.DEPLOY_TARGET);
}

export function isDeployTarget(target, env = process.env) {
  return getDeployTarget(env) === target;
}
