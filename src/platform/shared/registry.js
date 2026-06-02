import { DEFAULT_DEPLOY_TARGET } from "./target.js";

export const PLATFORM_REGISTRY = {
  vercel: {
    target: "vercel",
    build: {},
    runtime: {
      capabilities: {
        vercelInsights: true,
        googlePhotosParsing: true,
        articleHistory: true,
      },
    },
  },
  edgeone: {
    target: "edgeone",
    build: {},
    runtime: {
      capabilities: {
        vercelInsights: false,
        googlePhotosParsing: true,
        articleHistory: true,
      },
    },
  },
  cloudflare: {
    target: "cloudflare",
    build: {},
    runtime: {
      capabilities: {
        vercelInsights: false,
        googlePhotosParsing: true,
        articleHistory: false,
      },
    },
  },
};

export function getPlatformRegistryEntry(target = DEFAULT_DEPLOY_TARGET) {
  return PLATFORM_REGISTRY[target];
}
