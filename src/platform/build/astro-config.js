import cloudflare from "@astrojs/cloudflare";
import vercel from "@astrojs/vercel";
import edgeone from "@edgeone/astro";
import { createEdgeoneCompatPlugin, edgeoneRoutingIntegration } from "./edgeone/index.js";

export function resolvePlatformAdapter(target) {
  if (target === "cloudflare") {
    return cloudflare({
      prerenderEnvironment: "node",
    });
  }

  if (target === "edgeone") {
    return edgeone({
      includeFiles: [
        "node_modules/zod/**",
      ],
    });
  }

  return vercel();
}

export function resolvePlatformImageConfig(target) {
  if (target === "edgeone") {
    return {
      service: {
        entrypoint: "astro/assets/services/noop",
      },
    };
  }

  return undefined;
}

export function resolvePlatformSsrConfig(target) {
  if (target === "edgeone") {
    return {
      noExternal: [
        "cheerio",
      ],
    };
  }

  return undefined;
}

export function getPlatformVitePlugins(target, { tailwindcss }) {
  return [
    createEdgeoneCompatPlugin(target),
    tailwindcss(),
  ];
}

export function getPlatformIntegrations(target) {
  if (target === "edgeone") {
    return [edgeoneRoutingIntegration()];
  }

  return [];
}
