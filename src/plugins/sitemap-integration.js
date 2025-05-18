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

// 生成XSLT样式表
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
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #1a1a1a;
              color: #f0f0f0;
            }
            a {
              color: #4da6ff;
            }
            a:visited {
              color: #c58fff;
            }
            .table {
              border-color: #444;
            }
            .table th, .table td {
              border-color: #444;
            }
            .table thead th {
              background-color: #2a2a2a;
            }
            .table tbody tr:nth-child(odd) {
              background-color: #252525;
            }
            .table tbody tr:hover {
              background-color: #303030;
            }
            .stat-box {
              background-color: #2a2a2a;
            }
            .copy-btn {
              background-color: #2a2a2a;
              color: #f0f0f0;
              border: 1px solid #444;
            }
            .copy-btn:hover {
              background-color: #3a3a3a;
            }
            .copy-btn:active {
              background-color: #4a4a4a;
            }
          }
          
          .page-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          
          .page-title {
            margin: 0;
            font-size: 2.2rem;
          }
          
          h1 {
            margin-top: 0;
            font-size: 2.2rem;
          }
          
          .meta {
            margin-bottom: 20px;
            font-size: 0.9rem;
            color: #666;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            table-layout: fixed;
          }
          
          .table th, .table td {
            padding: 10px 15px;
            border: 1px solid #ddd;
            text-align: left;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .table thead th {
            background-color: #f5f5f5;
            font-weight: 600;
          }
          
          .table tbody tr:nth-child(odd) {
            background-color: #f9f9f9;
          }
          
          .table tbody tr:hover {
            background-color: #f0f0f0;
          }
          
          .url {
            word-break: break-all;
            width: 80%;
          }
          
          .priority {
            width: 20%;
            text-align: center;
          }
          
          .stats {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 20px;
          }
          
          .stat-box {
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
            flex: 1;
            min-width: 200px;
          }
          
          .stat-box h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 1rem;
            color: #666;
          }
          
          .stat-box p {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
          }
          
          .footer {
            margin-top: 30px;
            font-size: 0.9rem;
            color: #666;
            text-align: center;
          }
          
          @media (max-width: 768px) {
            .table {
              display: block;
              overflow-x: auto;
            }
            
            .page-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 10px;
            }
          }
          
          .copy-btn {
            padding: 8px 16px;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .copy-btn:hover {
            background-color: #e5e5e5;
          }
          
          .copy-btn:active {
            background-color: #d5d5d5;
            transform: translateY(1px);
          }
          
          .copy-btn.success {
            background-color: #4caf50;
            color: white;
            border-color: #4caf50;
          }
          
          .copy-icon {
            width: 14px;
            height: 14px;
            display: inline-block;
            vertical-align: middle;
          }
        </style>
        <script>
        <![CDATA[
          // 页面加载完成后执行
          document.addEventListener('DOMContentLoaded', function() {
            const copyBtn = document.getElementById('copy-urls-btn');
            const urls = [];
            
            // 收集所有URL
            document.querySelectorAll('#sitemap-table tbody a').forEach(function(link) {
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
        
        <div class="stats">
          <div class="stat-box">
            <h3>总页面数</h3>
            <p><xsl:value-of select="count(sitemap:urlset/sitemap:url)" /></p>
          </div>
        </div>
        
        <table id="sitemap-table" class="table">
          <thead>
            <tr>
              <th class="url">URL</th>
              <th class="priority">优先级</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <xsl:sort select="sitemap:priority" order="descending" />
              <xsl:variable name="url" select="sitemap:loc/text()" />
              <xsl:variable name="decodedUrl">
                <xsl:call-template name="decode-url">
                  <xsl:with-param name="url" select="$url" />
                </xsl:call-template>
              </xsl:variable>
              <tr>
                <td class="url">
                  <a href="{$url}">
                    <xsl:value-of select="$decodedUrl" />
                  </a>
                </td>
                <td class="priority">
                  <xsl:value-of select="sitemap:priority" />
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
        
        <div class="footer">
          <p>此网站地图使用 XSLT 样式表生成，既适合搜索引擎索引，又方便人类阅读</p>
        </div>
      </body>
    </html>
  </xsl:template>
  
  <!-- 自定义URL解码模板 -->
  <xsl:template name="decode-url">
    <xsl:param name="url" />
    <!-- 直接输出预先解码的URL映射 -->
    <xsl:variable name="urlKey" select="$url" />
    <xsl:choose>
      <xsl:when test="document('')/*/xsl:variable[@name='url-mapping']/url[@key=$urlKey]">
        <xsl:value-of select="document('')/*/xsl:variable[@name='url-mapping']/url[@key=$urlKey]/@decoded" />
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$url" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  
  <!-- URL映射变量 -->
  <xsl:variable name="url-mapping">
    ${entries.map(entry => `<url key="${escapeXml(entry.url)}" decoded="${escapeXml(entry.decodedUrl)}" />`).join('\n    ')}
  </xsl:variable>
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
                res.setHeader('Content-Type', 'application/xml');
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
                res.setHeader('Content-Type', 'application/xslt+xml');
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
          
          console.log(`构建目录路径: ${buildDirPath}`);
          
          // 收集所有页面信息
          const sitemapEntries = [];
          
          for (const page of pages) {
            // 过滤掉API路径
            if (page.pathname.includes('/api/')) {
              continue;
            }
            
            const url = new URL(page.pathname, SITE_URL).toString();
            
            // 解码URL
            const urlObj = new URL(url);
            const decodedPathname = decodeURIComponent(urlObj.pathname);
            const decodedUrl = `${urlObj.protocol}//${urlObj.host}${decodedPathname}`;
            
            // 确定页面优先级
            let priority = 0.7;
            
            // 首页最高优先级
            if (page.pathname === '/') {
              priority = 1.0;
            }
            // 文章列表页次高优先级
            else if (page.pathname === '/articles/') {
              priority = 0.9;
            }
            // 文章页面
            else if (page.pathname.includes('/articles/')) {
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
          
          // 写入sitemap.xml
          await fs.writeFile(path.join(buildDirPath, 'sitemap.xml'), xmlContent);
          console.log('已生成 sitemap.xml');
          
          // 写入XSLT样式表文件
          await fs.writeFile(path.join(buildDirPath, 'sitemap.xsl'), generateXsltStylesheet(sitemapEntries));
          console.log('已生成 sitemap.xsl');
          
        } catch (error) {
          console.error('生成 Sitemap 时出错:', error);
        }
      }
    }
  };
} 