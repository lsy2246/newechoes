import { edgeoneRoutingIntegration } from "./edgeone/index.js";

export function resolvePlatformOutput(target) {
  return "static";
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

export function getPlatformVitePlugins(_target, { tailwindcss }) {
  return [
    tailwindcss(),
  ];
}

export function getPlatformIntegrations(target) {
  const integrations = [];

  if (target === "edgeone") {
    integrations.push(edgeoneRoutingIntegration());
  }

  return integrations;
}
