export type DeployTarget = "vercel" | "edgeone" | "cloudflare";

export type PlatformScript = {
  src: string;
  async?: boolean;
  defer?: boolean;
  dataAttributes?: Record<string, string>;
};

export type PlatformObservability = {
  provider: DeployTarget;
  speedInsights: boolean;
  bodyScripts: PlatformScript[];
};

const DEFAULT_TARGET: DeployTarget = "vercel";

function normalizeDeployTarget(value: string | undefined): DeployTarget {
  if (value === "edgeone" || value === "cloudflare" || value === "vercel") {
    return value;
  }

  return DEFAULT_TARGET;
}

export function getDeployTarget() {
  return normalizeDeployTarget(process.env.DEPLOY_TARGET);
}

export function isDeployTarget(target: DeployTarget) {
  return getDeployTarget() === target;
}

function createCloudflareAnalyticsScripts(): PlatformScript[] {
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

function createEdgeOneTelemetryScripts(): PlatformScript[] {
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

export function getPlatformObservability(): PlatformObservability {
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

const PLATFORM_CAPABILITIES = {
  vercel: {
    vercelInsights: true,
    googlePhotosParsing: true,
    articleHistory: true,
  },
  edgeone: {
    vercelInsights: false,
    googlePhotosParsing: true,
    articleHistory: true,
  },
  cloudflare: {
    vercelInsights: false,
    googlePhotosParsing: true,
    articleHistory: false,
  },
} as const;

export function getPlatformCapabilities() {
  return PLATFORM_CAPABILITIES[getDeployTarget()];
}

export function supportsVercelInsights() {
  return getPlatformObservability().speedInsights;
}

export function supportsGooglePhotosParsing() {
  return getPlatformCapabilities().googlePhotosParsing;
}

export function supportsArticleHistory() {
  return getPlatformCapabilities().articleHistory;
}
