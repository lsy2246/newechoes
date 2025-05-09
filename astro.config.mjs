// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import rehypeExternalLinks from "rehype-external-links";
import sitemap from "@astrojs/sitemap";
import fs from "node:fs";
import path from "node:path";
import swup from "@swup/astro"
import { SITE_URL } from "./src/consts";
import compressor from "astro-compressor";
import vercel from "@astrojs/vercel";
import { articleIndexerIntegration } from "./src/plugins/build-article-index.js";
import { rehypeCodeBlocks } from "./src/plugins/rehype-code-blocks.js";
import { rehypeTables } from "./src/plugins/rehype-tables.js";

function getArticleDate(articleId) {
  try {
    // 处理多级目录的文章路径
    const mdPath = path.join(process.cwd(), "src/content", articleId + ".md");
    const mdxPath = path.join(process.cwd(), "src/content", articleId + ".mdx");

    let filePath = fs.existsSync(mdPath) ? mdPath : mdxPath;

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const match = content.match(/date:\s*(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return new Date(match[1]).toISOString();
      }
    }
  } catch (error) {
    console.error("Error reading article date:", error);
  }
  return new Date().toISOString(); // 如果没有日期，返回当前时间
}

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: "static",
  trailingSlash: "ignore",

  build: {
    format: "directory",
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    // 使用Astro官方的MDX支持
    mdx(),
    swup({
      cache: true,
      preload: true,
    }),
    react(),
    // 使用文章索引生成器
    articleIndexerIntegration(),
    sitemap({
      filter: (page) => !page.includes("/api/"),
      serialize(item) {
        if (!item) return undefined;

        // 文章页面
        if (item.url.includes("/articles/")) {
          // 从 URL 中提取文章 ID
          const articleId = item.url
            .replace(SITE_URL + "/articles/", "")
            .replace(/\/$/, "");
          const publishDate = getArticleDate(articleId);
          return {
            ...item,
            priority: 0.8,
            lastmod: publishDate,
          };
        }
        // 其他页面
        else {
          let priority = 0.7; // 默认优先级

          // 首页最高优先级
          if (item.url === SITE_URL + "/") {
            priority = 1.0;
          }
          // 文章列表页次高优先级
          else if (item.url === SITE_URL + "/articles/") {
            priority = 0.9;
          }

          return {
            ...item,
            priority,
          };
        }
      },
    }),
    // 添加压缩插件 (必须放在最后位置)
    compressor()
  ],

  // Markdown 配置 - 使用官方语法高亮
  markdown: {
    // 配置语法高亮
    syntaxHighlight: {
      // 使用shiki作为高亮器
      type: 'shiki',
      // 排除mermaid语言，不进行高亮处理
      excludeLangs: ['mermaid']
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
