import { patchEdgeoneBuildConfig, patchEdgeoneConfigText } from "../platform/build/edgeone/routing-patch.js";

export { patchEdgeoneConfigText };

export function edgeoneRoutingIntegration() {
  return {
    name: "edgeone-routing-integration",
    hooks: {
      "astro:build:done": async () => {
        if ((process.env.DEPLOY_TARGET || "").trim().toLowerCase() !== "edgeone") {
          return;
        }

        const patched = await patchEdgeoneBuildConfig();
        if (patched) {
          console.log("已修正 EdgeOne SSR 路由规则，避免 clean-url 重写误伤 API");
        }
      },
    },
  };
}
