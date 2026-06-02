import { getDeployTarget } from "../shared/target.js";

function createCloudflareAnalyticsScripts() {
  const token = process.env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim();
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

function createEdgeOneTelemetryScripts() {
  const src = process.env.PUBLIC_EDGEONE_TELEMETRY_SRC?.trim();
  if (!src) {
    return [];
  }

  const websiteId = process.env.PUBLIC_EDGEONE_TELEMETRY_ID?.trim();

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

export function getPlatformObservability() {
  const target = getDeployTarget();

  if (target === "cloudflare") {
    return {
      provider: target,
      speedInsights: false,
      bodyScripts: createCloudflareAnalyticsScripts(),
    };
  }

  if (target === "edgeone") {
    return {
      provider: target,
      speedInsights: false,
      bodyScripts: createEdgeOneTelemetryScripts(),
    };
  }

  return {
    provider: target,
    speedInsights: true,
    bodyScripts: [],
  };
}
