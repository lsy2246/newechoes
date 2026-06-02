export type {
  DeployTarget,
  PlatformObservability,
  PlatformScript,
} from "@/platform/shared/types";
export {
  getDeployTarget,
  getPlatformCapabilities,
  getPlatformObservability,
  isDeployTarget,
  supportsArticleHistory,
  supportsGooglePhotosParsing,
  supportsVercelInsights,
} from "@/platform/runtime/index.js";
