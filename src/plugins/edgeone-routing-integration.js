import path from "node:path";
import {
  patchEdgeoneBuildConfig,
  patchEdgeoneConfigText,
  syncEdgeoneEncodedArticleAssetPaths,
} from "../platform/build/edgeone/routing-patch.js";

export { patchEdgeoneConfigText };

export function edgeoneRoutingIntegration() {
  return {
    name: "edgeone-routing-integration",
    hooks: {
      "astro:build:done": async () => {
        if ((process.env.DEPLOY_TARGET || "").trim().toLowerCase() !== "edgeone") {
          return;
        }

        const mirroredArticlePaths = await syncEdgeoneEncodedArticleAssetPaths(
          path.join(process.cwd(), ".edgeone", "assets"),
        );
        if (mirroredArticlePaths.length > 0) {
          console.log(`已补齐 EdgeOne 编码文章路径镜像: ${mirroredArticlePaths.length} 个`);
        }

        const patched = await patchEdgeoneBuildConfig();
        if (patched) {
          console.log("已修正 EdgeOne SSR 路由规则，避免 clean-url 重写误伤 API");
        }
      },
    },
  };
}
