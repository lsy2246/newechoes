// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import rehypeExternalLinks from "rehype-external-links";
import { SITE_META } from "./src/consts";
import { articleIndexerIntegration } from "./src/plugins/article-index/integration.js";
import { compressionIntegration } from "./src/plugins/compression-integration.js";
import { rehypeCodeBlocks } from "./src/plugins/rehype-code-blocks.js";
import { rehypeTables } from "./src/plugins/rehype-tables.js";
import { customSitemapIntegration } from "./src/plugins/sitemap-integration.js";
import { rssIntegration } from "./src/plugins/rss-integration.js";
import { robotsIntegration } from "./src/plugins/robots-integration.js";
import { llmsIntegration } from "./src/plugins/llms-integration.js";
import { localDevApiIntegration } from "./src/plugins/local-dev-api-integration.js";
import { rehypeMermaid } from "./src/plugins/rehype-mermaid.js";
import {
  getPlatformIntegrations,
  getPlatformVitePlugins,
  resolvePlatformImageConfig,
} from "./src/platform/build/index.js";

const DEPLOY_TARGET = process.env.DEPLOY_TARGET || "vercel";

// https://astro.build/config
export default defineConfig({
  site: SITE_META.url,
  output: "static",
  trailingSlash: "never",
  devToolbar: {
    enabled: false,
  },

  build: {
    format: "file",
  },

  vite: {
    plugins: getPlatformVitePlugins(DEPLOY_TARGET, { tailwindcss }),
    optimizeDeps: {
      include: [
        "d3-force-3d",
        "three",
        "three/examples/jsm/controls/OrbitControls.js",
        "three/examples/jsm/renderers/CSS2DRenderer.js",
      ],
    },
    worker: {
      format: "es",
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes("node_modules/three/examples/") ||
              id.includes("node_modules/three/addons/")
            ) {
              return "vendor-three-addons";
            }
            if (id.includes("node_modules/three/")) return "vendor-three-core";
            if (id.includes("node_modules/react") || id.includes("node_modules/scheduler/")) {
              return "vendor-react";
            }
            if (id.includes("node_modules/swup/") || id.includes("node_modules/@swup/")) {
              return "vendor-swup";
            }
          },
        },
      },
    },
  },

  integrations: [
    mdx(),
    react(),
    articleIndexerIntegration(),
    customSitemapIntegration(),
    robotsIntegration(),
    rssIntegration(),
    llmsIntegration(),
    localDevApiIntegration(),
    ...getPlatformIntegrations(DEPLOY_TARGET),
    compressionIntegration(),
  ],

  markdown: {
    syntaxHighlight: {
      type: "shiki",
    },
    shikiConfig: {
      theme: "github-light",
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      wrap: true,
    },
    rehypePlugins: [
      [rehypeExternalLinks, { target: "_blank", rel: ["nofollow", "noopener", "noreferrer"] }],
      rehypeMermaid,
      rehypeCodeBlocks,
      rehypeTables,
    ],
    gfm: true,
  },
  image: resolvePlatformImageConfig(DEPLOY_TARGET),
});
