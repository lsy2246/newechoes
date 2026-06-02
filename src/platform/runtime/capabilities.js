import { getPlatformRegistryEntry } from "../shared/registry.js";
import { getDeployTarget } from "../shared/target.js";

export function getPlatformCapabilities() {
  return getPlatformRegistryEntry(getDeployTarget()).runtime.capabilities;
}

export function supportsVercelInsights() {
  return getPlatformCapabilities().vercelInsights;
}

export function supportsGooglePhotosParsing() {
  return getPlatformCapabilities().googlePhotosParsing;
}

export function supportsArticleHistory() {
  return getPlatformCapabilities().articleHistory;
}
