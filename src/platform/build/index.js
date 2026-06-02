export {
  getPlatformIntegrations,
  getPlatformVitePlugins,
  resolvePlatformAdapter,
  resolvePlatformImageConfig,
  resolvePlatformSsrConfig,
} from "./astro-config.js";
export {
  getStaticOutputMirrorRoots,
  resolveBuildDir,
  syncStaticGeneratedFileToPlatformOutputs,
} from "./mirrors.js";
export {
  patchEdgeoneBuildConfig,
  patchEdgeoneConfigText,
} from "./edgeone/routing-patch.js";
