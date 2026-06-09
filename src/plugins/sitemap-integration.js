// 自定义 Sitemap 集成
// 用于生成带 XSLT 样式表的 sitemap.xml

import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { SITE_META } from '../consts';
import { generateXmlViewStyles } from './xml-view-styles.js';
import { normalizeCanonicalPath } from '../lib/canonical-url.js';
import { resolveBuildDir, syncStaticGeneratedFileToPlatformOutputs } from '../platform/build/index.js';

function getLocalBuildFilePath(...segments) {
  return path.join(resolveBuildDir(path.join(process.cwd(), 'dist')), ...segments);
}

const EXCLUDED_SITEMAP_PATHS = new Set([
  "/404",
  "/global-graph-modal-fragment",
]);

function shouldIncludeSitemapPage(page) {
  const pathname = normalizeCanonicalPath(page.pathname);

  if (EXCLUDED_SITEMAP_PATHS.has(pathname)) {
    return false;
  }

  return pathname !== "/api" && !pathname.startsWith("/api/");
}

// 转义XML特殊字符
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString().replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// 生成带XSLT的XML
function generateXmlWithXslt(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${entries.map(entry => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}

function resolveHtmlPath(buildDirPath, pagePathname) {
  const normalizedPath = normalizeCanonicalPath(pagePathname);
  if (normalizedPath === '/') {
    return path.join(buildDirPath, 'index.html');
  }

  const withoutLeading = normalizedPath.replace(/^\//, '');
  const filePath = path.join(buildDirPath, `${withoutLeading}.html`);
  if (existsSync(filePath)) {
    return filePath;
  }

  return path.join(buildDirPath, withoutLeading, 'index.html');
}

async function resolvePageLastmod(buildDirPath, pagePathname) {
  const htmlPath = resolveHtmlPath(buildDirPath, pagePathname);

  try {
    const content = await fs.readFile(htmlPath, 'utf-8');
    const modifiedTime = content.match(/<meta property="article:modified_time" content="(.*?)"/)?.[1];
    const publishedTime = content.match(/<meta property="article:published_time" content="(.*?)"/)?.[1];
    const candidate = modifiedTime || publishedTime;

    if (candidate && !Number.isNaN(new Date(candidate).getTime())) {
      return new Date(candidate).toISOString();
    }

    const stat = await fs.stat(htmlPath);
    return stat.mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// 生成XSLT样式表 - 简化版直接嵌入解码后的URL
function generateXsltStylesheet(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">

  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  
  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <title>网站地图</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <style>
          ${generateXmlViewStyles()}
        </style>
        <script>
        <![CDATA[
          document.addEventListener('DOMContentLoaded', function() {
            const copyBtn = document.getElementById('copy-urls-btn');
            const urls = [];
            
            document.querySelectorAll('.xml-list .xml-url').forEach(function(link) {
              urls.push(link.getAttribute('href'));
            });
            
            if (copyBtn && urls.length > 0) {
              copyBtn.addEventListener('click', function() {
                navigator.clipboard.writeText(urls.join('\\n'))
                  .then(function() {
                    copyBtn.innerHTML = '<svg class="xml-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"></path></svg>复制成功';
                    copyBtn.classList.add('success');
                    
                    setTimeout(function() {
                      copyBtn.innerHTML = '<svg class="xml-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>复制所有 URL';
                      copyBtn.classList.remove('success');
                    }, 3000);
                  })
                  .catch(function(err) {
                    console.error('复制失败:', err);
                    copyBtn.textContent = '复制失败';
                    
                    setTimeout(function() {
                      copyBtn.innerHTML = '<svg class="xml-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>复制所有 URL';
                    }, 3000);
                  });
              });
            }
          });
        ]]>
        </script>
      </head>
      <body>
        <div class="xml-page">
          <header class="xml-header">
            <div>
              <p class="xml-kicker">sitemap.xml</p>
              <h1 class="xml-title">网站地图</h1>
              <p class="xml-lede">这里是站点公开页面的线性索引，供搜索引擎和访问者快速检查 URL。</p>
              <div class="xml-meta">
                <span><xsl:value-of select="count(sitemap:urlset/sitemap:url)" /> 个 URL</span>
                <span>按优先级排序</span>
              </div>
            </div>
            <button id="copy-urls-btn" class="xml-action">
              <svg class="xml-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
              </svg>
              复制所有 URL
            </button>
          </header>

          <div class="xml-list">
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <xsl:sort select="sitemap:priority" order="descending" />
              <xsl:variable name="url" select="sitemap:loc/text()" />
              <div class="xml-row sitemap-row">
                <div class="xml-row-main">
                  <a class="xml-url" href="{$url}">
                    ${entries.map((entry) => `<xsl:if test="$url = '${escapeXml(entry.url)}'"><xsl:value-of select="'${escapeXml(entry.decodedUrl)}'" /></xsl:if>`).join('\n                    ')}
                  </a>
                </div>
                <div class="xml-priority">
                  <xsl:value-of select="sitemap:priority" />
                </div>
              </div>
            </xsl:for-each>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;
}

// 主集成函数
export function customSitemapIntegration() {
  return {
    name: 'custom-sitemap-integration',
    hooks: {
      // 开发服务器钩子 - 为开发模式添加虚拟API路由
      'astro:server:setup': ({ server }) => {
        // 为 sitemap 相关文件提供虚拟路由
        server.middlewares.use((req, res, next) => {
          // 检查请求路径是否是 sitemap 相关文件
          if (req.url === '/sitemap.xml' && req.method === 'GET') {
            console.log(`虚拟路由请求: ${req.url}`);
            
            // 尝试返回已构建好的sitemap.xml文件
            const distPath = getLocalBuildFilePath('sitemap.xml');
            
            if (existsSync(distPath)) {
              try {
                const xmlContent = readFileSync(distPath, 'utf-8');
                res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
                res.end(xmlContent);
              } catch (error) {
                res.statusCode = 500;
                res.end('读取 sitemap.xml 文件时出错');
              }
            } else {
              res.statusCode = 404;
            }
            return;
          }
          
          if (req.url === '/sitemap.xsl' && req.method === 'GET') {
            console.log(`虚拟路由请求: ${req.url}`);
            
            // 尝试返回已构建好的sitemap.xsl文件
            const distPath = getLocalBuildFilePath('sitemap.xsl');
            
            if (existsSync(distPath)) {
              try {
                const xslContent = readFileSync(distPath, 'utf-8');
                res.setHeader('Content-Type', 'application/xslt+xml; charset=UTF-8');
                res.end(xslContent);
                console.log('已返回构建好的 sitemap.xsl 文件');
              } catch (error) {
                console.error('读取 sitemap.xsl 文件时出错:', error);
                res.statusCode = 500;
                res.end('读取 sitemap.xsl 文件时出错');
              }
            } else {
              console.log('未找到构建好的 sitemap.xsl 文件，请先运行 npm run build');
              res.statusCode = 404;
              res.end('未找到 sitemap.xsl 文件，请先运行 npm run build');
            }
            return;
          }
          
          // 不是 sitemap 相关请求，继续下一个中间件
          next();
        });
      },

      // 构建完成钩子 - 生成 sitemap 文件
      'astro:build:done': async ({ pages, dir }) => {
        console.log('生成自定义 Sitemap...');
        
        try {
          // 获取构建目录路径
          const buildDirPath = resolveBuildDir(dir);
          await fs.mkdir(buildDirPath, { recursive: true });
          
          
          // 收集所有页面信息
          const sitemapEntries = [];
          
          for (const page of pages) {
            // 过滤掉 API、404 和内部片段页面
            if (!shouldIncludeSitemapPage(page)) {
              continue;
            }
            
            const url = new URL(normalizeCanonicalPath(page.pathname), SITE_META.url).toString();
            
            // 解码URL
            const urlObj = new URL(url);
            const decodedPathname = decodeURIComponent(urlObj.pathname);
            const decodedUrl = `${urlObj.protocol}//${urlObj.host}${decodedPathname}`;
            
            // 确定页面优先级
            let priority = 0.7;
            
            // 首页最高优先级 - 增强匹配逻辑
            if (page.pathname === '/' || urlObj.pathname === '/' || decodedPathname === '/') {
              priority = 1.0;
            }
            // 文章列表页次高优先级
            else if (
              normalizeCanonicalPath(page.pathname) === '/articles' ||
              normalizeCanonicalPath(decodedPathname) === '/articles'
            ) {
              priority = 0.9;
            }
            // 文章页面
            else if (
              normalizeCanonicalPath(page.pathname).startsWith('/articles/') ||
              normalizeCanonicalPath(decodedPathname).startsWith('/articles/')
            ) {
              priority = 0.8;
            }
            
            sitemapEntries.push({
              url,
              decodedUrl,
              lastmod: await resolvePageLastmod(buildDirPath, page.pathname),
              priority
            });
          }
          
          // 按优先级排序
          sitemapEntries.sort((a, b) => b.priority - a.priority);
          
          // 生成带XSLT的XML文件
          const xmlContent = generateXmlWithXslt(sitemapEntries);
          
          // 添加 UTF-8 BOM 标记以确保浏览器正确识别编码
          const BOM = '\uFEFF';
          
          // 写入sitemap.xml
          const sitemapFilePath = path.join(buildDirPath, 'sitemap.xml');
          await fs.writeFile(sitemapFilePath, BOM + xmlContent, 'utf8');
          console.log('已生成 sitemap.xml (UTF-8 with BOM)');
          const mirroredSitemapFiles = syncStaticGeneratedFileToPlatformOutputs(buildDirPath, sitemapFilePath);
          if (mirroredSitemapFiles.length > 0) {
            console.log(`已同步 sitemap.xml 到平台静态目录: ${mirroredSitemapFiles.join(', ')}`);
          }
          
          // 写入XSLT样式表文件
          const sitemapStylesheetPath = path.join(buildDirPath, 'sitemap.xsl');
          await fs.writeFile(sitemapStylesheetPath, BOM + generateXsltStylesheet(sitemapEntries), 'utf8');
          console.log('已生成 sitemap.xsl (UTF-8 with BOM)');
          const mirroredSitemapStylesheets = syncStaticGeneratedFileToPlatformOutputs(buildDirPath, sitemapStylesheetPath);
          if (mirroredSitemapStylesheets.length > 0) {
            console.log(`已同步 sitemap.xsl 到平台静态目录: ${mirroredSitemapStylesheets.join(', ')}`);
          }
          
        } catch (error) {
          console.error('生成 Sitemap 时出错:', error);
        }
      }
    }
  };
}
