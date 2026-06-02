export const DEFAULT_DEPLOY_TARGET = "vercel";
const RUNTIME_TARGET_KEY = "__NEWECHOES_DEPLOY_TARGET__";

export function normalizeDeployTarget(value) {
  if (value === "edgeone" || value === "cloudflare" || value === "vercel") {
    return value;
  }

  return DEFAULT_DEPLOY_TARGET;
}

export function setRuntimeDeployTarget(target) {
  globalThis[RUNTIME_TARGET_KEY] = normalizeDeployTarget(target);
}

export function getDeployTarget(env = typeof process !== "undefined" ? process.env : undefined) {
  const runtimeTarget = globalThis[RUNTIME_TARGET_KEY];
  if (runtimeTarget) {
    return normalizeDeployTarget(runtimeTarget);
  }

  return normalizeDeployTarget(env?.DEPLOY_TARGET);
}

export function isDeployTarget(target, env = process.env) {
  return getDeployTarget(env) === target;
}
