import { getDeployTarget } from "../shared/target.js";

function getRuntimeEnv() {
  return typeof process !== "undefined" ? process.env : undefined;
}

function readTrimmedEnv(name, env = getRuntimeEnv()) {
  const value = env?.[name];
  return typeof value === "string" ? value.trim() : "";
}

function isExplicitVercelEnvironment(env = getRuntimeEnv()) {
  if (readTrimmedEnv("DEPLOY_TARGET", env).toLowerCase() === "vercel") {
    return true;
  }

  const vercelFlag = readTrimmedEnv("VERCEL", env).toLowerCase();
  return vercelFlag === "1" || vercelFlag === "true";
}

function createCloudflareAnalyticsScripts(env = getRuntimeEnv()) {
  const token = readTrimmedEnv("PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN", env);
  if (!token) {
    return [];
  }

  return [
    {
      src: "https://static.cloudflareinsights.com/beacon.min.js",
      defer: true,
      dataAttributes: {
        "cf-beacon": JSON.stringify({ token }),
      },
    },
  ];
}

function createEdgeOneTelemetryScripts(env = getRuntimeEnv()) {
  const src = readTrimmedEnv("PUBLIC_EDGEONE_TELEMETRY_SRC", env);
  if (!src) {
    return [];
  }

  const websiteId = readTrimmedEnv("PUBLIC_EDGEONE_TELEMETRY_ID", env);

  return [
    {
      src,
      defer: true,
      dataAttributes: websiteId
        ? {
            "edgeone-id": websiteId,
          }
        : undefined,
    },
  ];
}

export function getPlatformObservability(env = getRuntimeEnv()) {
  const target = getDeployTarget(env);

  if (target === "cloudflare") {
    return {
      provider: target,
      speedInsights: false,
      bodyScripts: createCloudflareAnalyticsScripts(env),
    };
  }

  if (target === "edgeone") {
    return {
      provider: target,
      speedInsights: false,
      bodyScripts: createEdgeOneTelemetryScripts(env),
    };
  }

  return {
    provider: target,
    speedInsights: isExplicitVercelEnvironment(env),
    bodyScripts: [],
  };
}
