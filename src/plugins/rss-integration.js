import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from '../consts';

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

// 生成RSS XML内容
function generateRssXml(entries) {
  const now = new Date().toUTCString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    ${entries.map(entry => `
    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${entry.url}</link>
      <guid>${entry.url}</guid>
      <pubDate>${entry.pubDate}</pubDate>
      <description><![CDATA[${entry.description}]]></description>
    </item>`).join('\n    ')}
  </channel>
</rss>`;
}

// 生成RSS的XSLT样式表
function generateRssXslt() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  
  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <title>RSS</title>
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
          }
          
          .feed-info {
            margin-bottom: 30px;
          }
          
          .feed-info h2 {
            margin: 0;
            color: var(--text);
          }
          
          .feed-info p {
            margin: 10px 0;
            color: var(--text);
          }
          
          .articles {
            list-style: none;
            padding: 0;
          }
          
          .article {
            border: 1px solid var(--border);
            margin-bottom: 20px;
            padding: 15px;
            border-radius: 4px;
          }
          
          .article h3 {
            margin: 0;
            margin-bottom: 10px;
          }
          
          .article a {
            color: var(--link);
            text-decoration: none;
          }
          
          .article a:hover {
            text-decoration: underline;
          }
          
          .article-meta {
            font-size: 0.9em;
            color: var(--text);
            opacity: 0.8;
            margin-bottom: 10px;
          }
          
          .article-description {
            margin: 0;
            line-height: 1.5;
            word-wrap: break-word;
            overflow-wrap: break-word;
            -webkit-hyphens: auto;
            -ms-hyphens: auto;
            hyphens: auto;
            white-space: pre-wrap;
            max-height: 4.5em;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            text-overflow: ellipsis;
          }

          /* 移动端适配 */
          @media (max-width: 768px) {
            body {
              padding: 10px;
            }

            .article {
              padding: 10px;
            }

            .article h3 {
              font-size: 1.1em;
              line-height: 1.4;
            }

            .article-description {
              font-size: 0.9em;
              line-height: 1.4;
            }
          }
        </style>
      </head>
      <body>
        <div class="page-header">
          <h1>RSS</h1>
        </div>
        
        <div class="feed-info">
          <h2><xsl:value-of select="/rss/channel/title"/></h2>
          <p><xsl:value-of select="/rss/channel/description"/></p>
          <p>最后更新时间: <xsl:value-of select="/rss/channel/lastBuildDate"/></p>
        </div>
        
        <ul class="articles">
          <xsl:for-each select="/rss/channel/item">
            <li class="article">
              <h3>
                <a href="{link}">
                  <xsl:value-of select="title"/>
                </a>
              </h3>
              <div class="article-meta">
                发布时间: <xsl:value-of select="pubDate"/>
              </div>
              <div class="article-description">
                <xsl:value-of select="description" disable-output-escaping="yes"/>
              </div>
            </li>
          </xsl:for-each>
        </ul>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;
}

// 主集成函数
export function rssIntegration() {
  return {
    name: 'rss-integration',
    hooks: {
      // 开发服务器钩子 - 为开发模式添加虚拟API路由
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/rss.xml' && req.method === 'GET') {
            const distPath = path.join(process.cwd(), 'dist/client/rss.xml');
            
            if (existsSync(distPath)) {
              try {
                const xmlContent = readFileSync(distPath, 'utf-8');
                res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
                res.end(xmlContent);
              } catch (error) {
                res.statusCode = 500;
                res.end('读取 RSS 文件时出错');
              }
            } else {
              res.statusCode = 404;
              res.end('RSS 文件未找到，请先运行构建');
            }
            return;
          }
          
          if (req.url === '/rss.xsl' && req.method === 'GET') {
            const distPath = path.join(process.cwd(), 'dist/client/rss.xsl');
            
            if (existsSync(distPath)) {
              try {
                const xslContent = readFileSync(distPath, 'utf-8');
                res.setHeader('Content-Type', 'application/xslt+xml; charset=UTF-8');
                res.end(xslContent);
              } catch (error) {
                res.statusCode = 500;
                res.end('读取 RSS 样式表文件时出错');
              }
            } else {
              res.statusCode = 404;
              res.end('RSS 样式表文件未找到，请先运行构建');
            }
            return;
          }
          
          next();
        });
      },

      // 构建完成钩子 - 生成 RSS
      'astro:build:done': async ({ pages, dir }) => {
        try {
          // 获取构建目录路径
          let buildDirPath;
          
          if (dir instanceof URL) {
            buildDirPath = dir.pathname;
            // Windows路径修复
            if (process.platform === 'win32' && buildDirPath.startsWith('/') && /^\/[A-Z]:/i.test(buildDirPath)) {
              buildDirPath = buildDirPath.substring(1);
            }
          } else {
            buildDirPath = String(dir);
          }

          // 收集文章信息
          const rssEntries = [];
          
          for (const page of pages) {
            // 跳过404页面
            if (page.pathname.includes('404')) {
              continue;
            }
            
            // 从构建目录读取文章的HTML文件
            const htmlPath = path.join(buildDirPath, page.pathname, 'index.html');
            let content = '';
            try {
              content = await fs.readFile(htmlPath, 'utf-8');
            } catch (err) {
              console.error(`读取文件失败 ${htmlPath}: ${err.message}`);
              continue;
            }

            // 检查页面类型
            const pageTypeMatch = content.match(/<meta property="og:type" content="(.*?)"/);
            if (!pageTypeMatch || pageTypeMatch[1] !== 'article') {
              continue;
            }

            // 提取文章标题
            const titleMatch = content.match(/<title>(.*?)<\/title>/);
            const title = titleMatch ? titleMatch[1] : '无标题';

            // 提取文章描述
            const descMatch = content.match(/<meta name="description" content="(.*?)"/);
            const description = descMatch ? descMatch[1] : '';

            // 提取发布日期
            const dateMatch = content.match(/<time datetime="(.*?)"/);
            const pubDate = dateMatch 
              ? new Date(dateMatch[1]).toUTCString()
              : new Date().toUTCString();

            const url = new URL(page.pathname, SITE_URL).toString();
            
            rssEntries.push({
              title,
              url,
              pubDate,
              description
            });
          }
          
          // 按发布日期排序（最新的在前）
          rssEntries.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
          
          // 添加 UTF-8 BOM 标记以确保浏览器正确识别编码
          const BOM = '\uFEFF';
          
          // 生成RSS XML
          const rssContent = generateRssXml(rssEntries);
          await fs.writeFile(path.join(buildDirPath, 'rss.xml'), BOM + rssContent, 'utf8');
          console.log('已生成 rss.xml (UTF-8 with BOM)');
          
          // 生成XSLT样式表
          await fs.writeFile(path.join(buildDirPath, 'rss.xsl'), BOM + generateRssXslt(), 'utf8');
          console.log('已生成 rss.xsl (UTF-8 with BOM)');
          
        } catch (error) {
          console.error('生成 RSS 时出错:', error);
          console.error(error.stack);
        }
      }
    }
  };
} 