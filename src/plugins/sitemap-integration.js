// 自定义 Sitemap 集成
// 用于生成带 XSLT 样式表的 sitemap.xml

import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { SITE_URL } from '../consts';

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
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
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
          /* 基础样式 */
          :root {
            --background: #fff;
            --text: #222;
            --link: #0366d6;
            --border: #eee;
            --header-bg: #f8f9fa;
          }
          
          /* 深色模式 */
          @media (prefers-color-scheme: dark) {
            :root {
              --background: #121212;
              --text: #eee;
              --link: #58a6ff;
              --border: #333;
              --header-bg: #222;
            }
          }
          
          body {
            font-family: -apple-system, system-ui, sans-serif;
            background: var(--background);
            color: var(--text);
            margin: 0;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .page-header {
            background: var(--header-bg);
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .copy-btn {
            cursor: pointer;
            padding: 8px 16px;
            display: flex;
            align-items: center;
            gap: 5px;
            border: 1px solid var(--border);
            background: var(--background);
            color: var(--text);
            border-radius: 4px;
          }
          
          .copy-icon {
            width: 16px;
            height: 16px;
          }
          
          .copy-btn.success {
            background: #28a745;
            color: white;
          }
          
          /* 表格样式 - 最关键部分 */
          .table-container {
            width: 100%;
            overflow-x: auto;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            min-width: 100%;
            border: 1px solid var(--border);
          }
          
          .table th, .table td {
            padding: 10px;
            border: 1px solid var(--border);
            text-align: left;
            white-space: nowrap; /* 防止URL换行 */
          }
          
          .table th {
            background: var(--header-bg);
          }
          
          .url {
            width: 85%;
          }
          
          .priority {
            width: 15%;
            text-align: center;
          }
          
          .table a {
            color: var(--link);
            text-decoration: none;
          }
          
          .table a:hover {
            text-decoration: underline;
          }
          
          /* 其他组件样式 */
          .meta {
            margin-bottom: 20px;
          }
        </style>
        <script>
        <![CDATA[
          // 页面加载完成后执行
          document.addEventListener('DOMContentLoaded', function() {
            const copyBtn = document.getElementById('copy-urls-btn');
            const urls = [];
            
            // 收集所有URL
            document.querySelectorAll('.table-container #sitemap-table tbody a').forEach(function(link) {
              urls.push(link.textContent.trim());
            });
            
            if (copyBtn && urls.length > 0) {
              copyBtn.addEventListener('click', function() {
                // 使用现代的Clipboard API复制内容
                navigator.clipboard.writeText(urls.join('\\n'))
                  .then(function() {
                    // 复制成功
                    copyBtn.innerHTML = '<svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"></path></svg> 复制成功!';
                    copyBtn.classList.add('success');
                    
                    // 3秒后恢复按钮状态
                    setTimeout(function() {
                      copyBtn.innerHTML = '<svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg> 复制所有URL';
                      copyBtn.classList.remove('success');
                    }, 3000);
                  })
                  .catch(function(err) {
                    // 复制失败
                    console.error('复制失败:', err);
                    copyBtn.textContent = '复制失败';
                    
                    // 3秒后恢复按钮状态
                    setTimeout(function() {
                      copyBtn.innerHTML = '<svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg> 复制所有URL';
                    }, 3000);
                  });
              });
            }
          });
        ]]>
        </script>
      </head>
      <body>
        <div class="page-header">
          <h1 class="page-title">网站地图</h1>
          <button id="copy-urls-btn" class="copy-btn">
            <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
            </svg>
            复制所有URL
          </button>
        </div>
        
        <div class="meta">
          <p>此网站地图包含 <xsl:value-of select="count(sitemap:urlset/sitemap:url)" /> 个 URL</p>
        </div>
        
        <div class="table-container" style="overflow-x: auto;">
          <table id="sitemap-table" class="table">
            <thead>
              <tr>
                <th class="url">URL</th>
                <th class="priority">优先级</th>
              </tr>
            </thead>
            <tbody>
              <!-- 直接内联解码后的URL映射 -->
              ${entries.map(entry => `<xsl:variable name="urlMap_${entry.url.replace(/[^a-zA-Z0-9]/g, '_')}" select="'${escapeXml(entry.url)}'" />`).join('\n              ')}
              
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <xsl:sort select="sitemap:priority" order="descending" />
                <xsl:variable name="url" select="sitemap:loc/text()" />
                <tr>
                  <td class="url">
                    <a href="{$url}">
                      <!-- 使用直接构建时生成的解码URL -->
                      ${entries.map((entry, index) => 
                        index === 0 
                          ? `<xsl:if test="$url = '${escapeXml(entry.url)}'"><xsl:value-of select="'${escapeXml(entry.decodedUrl)}'" /></xsl:if>`
                          : `<xsl:if test="$url = '${escapeXml(entry.url)}'"><xsl:value-of select="'${escapeXml(entry.decodedUrl)}'" /></xsl:if>`
                      ).join('\n                      ')}
                    </a>
                  </td>
                  <td class="priority">
                    <xsl:value-of select="sitemap:priority" />
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
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
            const distPath = path.join(process.cwd(), 'dist/client/sitemap.xml');
            
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
            const distPath = path.join(process.cwd(), 'dist/client/sitemap.xsl');
            
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
          let buildDirPath;
          
          // 直接处理URL对象
          if (dir instanceof URL) {
            buildDirPath = dir.pathname;
            // Windows路径修复
            if (process.platform === 'win32' && buildDirPath.startsWith('/') && /^\/[A-Z]:/i.test(buildDirPath)) {
              buildDirPath = buildDirPath.substring(1);
            }
          } else {
            buildDirPath = String(dir);
          }
          
          
          // 收集所有页面信息
          const sitemapEntries = [];
          
          for (const page of pages) {
            // 过滤掉API路径和404页面
            if (page.pathname.includes('/api/') || page.pathname.includes('/404/')) {
              continue;
            }
            
            const url = new URL(page.pathname, SITE_URL).toString();
            
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
            else if (page.pathname === '/articles/' || decodedPathname === '/articles/') {
              priority = 0.9;
            }
            // 文章页面
            else if (page.pathname.startsWith('/articles/') || decodedPathname.startsWith('/articles/')) {
              priority = 0.8;
            }
            
            sitemapEntries.push({
              url,
              decodedUrl,
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
          await fs.writeFile(path.join(buildDirPath, 'sitemap.xml'), BOM + xmlContent, 'utf8');
          console.log('已生成 sitemap.xml (UTF-8 with BOM)');
          
          // 写入XSLT样式表文件
          await fs.writeFile(path.join(buildDirPath, 'sitemap.xsl'), BOM + generateXsltStylesheet(sitemapEntries), 'utf8');
          console.log('已生成 sitemap.xsl (UTF-8 with BOM)');
          
        } catch (error) {
          console.error('生成 Sitemap 时出错:', error);
        }
      }
    }
  };
} 