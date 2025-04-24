// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import remarkEmoji from "remark-emoji";
import rehypeExternalLinks from "rehype-external-links";
import sitemap from "@astrojs/sitemap";
import fs from "node:fs";
import path from "node:path";
import swup from "@swup/astro"
import { SITE_URL } from "./src/consts";
import pagefind from "astro-pagefind";
import compressor from "astro-compressor";

import vercel from "@astrojs/vercel";

import expressiveCode from "astro-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";

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
    expressiveCode({
      themes: ['github-light', 'dracula'],
      themeCssSelector: (theme) => 
        theme.name === 'dracula' ? '[data-theme=dark]' : '[data-theme=light]',
      useDarkModeMediaQuery: false,
      
      plugins: [
        pluginLineNumbers(),
        pluginCollapsibleSections(),
      ],
      defaultProps: {
        showLineNumbers: true,
        collapseStyle: 'collapsible-auto',
      },
      frames: {
        extractFileNameFromCode: true,
      },
      styleOverrides: {
        // 核心样式设置
        borderRadius: '0.5rem',
        borderWidth: '0.5px',
        codeFontSize: '0.9rem',
        codeFontFamily: "'JetBrains Mono', Menlo, Monaco, Consolas, 'Courier New', monospace",
        codeLineHeight: '1.5',
        codePaddingInline: '1.5rem',
        codePaddingBlock: '1.2rem',
        // 框架样式设置
        frames: {
          shadowColor: 'rgba(0, 0, 0, 0.12)',
          editorActiveTabBackground: '#ffffff',
          editorTabBarBackground: '#f5f5f5',
          terminalBackground: '#1a1a1a',
          terminalTitlebarBackground: '#333333',
        },
        // 文本标记样式
        textMarkers: {
          defaultChroma: 'rgba(255, 255, 0, 0.2)',
        },
      },
    }),
    
    // MDX 集成配置
    mdx(),
    swup(),
    react(),
    pagefind(),
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

  // Markdown 配置
  markdown: {
    syntaxHighlight: false, // 禁用默认的语法高亮，使用expressiveCode代替
    remarkPlugins: [
      [remarkEmoji, { emoticon: false, padded: true }]
    ],
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] }]
    ],
    gfm: true,
    // 设置 remark-rehype 选项，以控制HTML处理
    remarkRehype: { 
      // 保留原始HTML格式，但仅在非代码块区域
      allowDangerousHtml: true,
      // 确保代码块内容不被解析
      passThrough: ['code']
    },
  },

  adapter: vercel(),
});
