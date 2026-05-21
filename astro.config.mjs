// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import rehypeExternalLinks from "rehype-external-links";
import { SITE_URL } from "./src/consts";
import vercel from "@astrojs/vercel";
import { articleIndexerIntegration } from "./src/plugins/build-article-index.js";
import { compressionIntegration } from "./src/plugins/compression-integration.js";
import { rehypeCodeBlocks } from "./src/plugins/rehype-code-blocks.js";
import { rehypeTables } from "./src/plugins/rehype-tables.js";
import { customSitemapIntegration } from "./src/plugins/sitemap-integration.js";
import { rssIntegration } from "./src/plugins/rss-integration.js";
import { robotsIntegration } from "./src/plugins/robots-integration.js";
import mermaid from 'astro-mermaid';


// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: "static",
  trailingSlash: "ignore",
  devToolbar: {
    enabled: false,
  },

  build: {
    format: "directory",
  },

  vite: {
    plugins: [tailwindcss()],
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
            if (id.includes("node_modules/three/")) return "vendor-three";
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
    // 使用Astro官方的MDX支持
    mdx(),
    react(),
    // mermaid插件
    mermaid({
      theme: 'neutral',
      autoTheme: true
    }),
    // 使用文章索引生成器
    articleIndexerIntegration(),
    // 站点地图和robots.txt生成
    customSitemapIntegration(),
    robotsIntegration(),
    rssIntegration(),
    // 添加压缩插件 (必须放在最后位置)
    compressionIntegration()
  ],

  // Markdown 配置 - 使用官方语法高亮
  markdown: {
    // 配置语法高亮
    syntaxHighlight: {
      // 使用shiki作为高亮器
      type: 'shiki',
    },
    // Shiki主题配置
    shikiConfig: {
      // 默认主题 - 必须设置，但最终会被替换为 light/dark 主题
      theme: 'github-light',
      // 定义明亮和暗黑主题
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      },
      // 启用代码换行
      wrap: true
    },
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] }],
      rehypeCodeBlocks,
      rehypeTables
    ],
    gfm: true,
  },

  adapter: vercel(),
});
