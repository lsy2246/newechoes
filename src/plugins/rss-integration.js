import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { SITE_META } from '../consts';
import { createCanonicalUrl, normalizeCanonicalPath } from '../lib/canonical-url.js';
import * as cheerio from 'cheerio';
import { generateXmlViewStyles } from './xml-view-styles.js';
import { resolveBuildDir, syncStaticGeneratedFileToPlatformOutputs } from './build-output.js';

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

// 生成RSS XML内容 (主索引)
function generateRssXml(entries) {
  const now = new Date().toUTCString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/rss.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_META.title)}</title>
    <link>${SITE_META.url}</link>
    <description>${escapeXml(SITE_META.title)}</description>
    <language>zh-CN</language>
    <managingEditor>${escapeXml(SITE_META.author)}</managingEditor>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_META.url}/rss.xml" rel="self" type="application/rss+xml" />
    ${entries.map(entry => {
      // 确保描述内容中的HTML标签安全
      const safeDescription = entry.description || '';
      
      return `
    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${entry.url}</link>
      <guid>${entry.url}</guid>
      <pubDate>${entry.pubDate}</pubDate>
      <description><![CDATA[${safeDescription}]]></description>
    </item>`;
    }).join('\n    ')}
  </channel>
</rss>`;
}

// 生成RSS的XSLT样式表
function generateRssXslt() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" 
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  
  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <title>RSS订阅</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <style>
          ${generateXmlViewStyles()}
        </style>
      </head>
      <body>
        <div class="xml-page">
          <header class="xml-header">
            <div>
              <p class="xml-kicker">rss.xml</p>
              <h1 class="xml-title">RSS 订阅</h1>
              <p class="xml-lede"><xsl:value-of select="/rss/channel/description"/></p>
              <div class="xml-meta">
                <span><xsl:value-of select="count(/rss/channel/item)" /> 篇文章</span>
                <span>最后更新 <xsl:value-of select="/rss/channel/lastBuildDate"/></span>
              </div>
            </div>
          </header>

          <div class="xml-list">
            <xsl:for-each select="/rss/channel/item">
              <div class="xml-row rss-row">
                <div class="xml-row-main">
                  <a class="xml-row-title" href="{link}">
                  <xsl:value-of select="title"/>
                  </a>
                  <div class="xml-summary">
                    <xsl:value-of select="description"/>
                  </div>
                </div>
                <div class="xml-row-meta">
                  <xsl:value-of select="substring-before(substring-after(pubDate, ', '), ' GMT')"/>
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

// 主集成函数
export function rssIntegration() {
  return {
    name: 'rss-integration',
    hooks: {
      // 开发服务器钩子 - 为开发模式添加虚拟API路由
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          // 处理主RSS索引
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
          
          // 处理索引页RSS样式表
          if (req.url === '/rss.xsl' && req.method === 'GET') {
            // 生成索引页XSL内容
            const xslContent = generateRssXslt();
            
            // 添加 UTF-8 BOM 标记
            const BOM = '\uFEFF';
            
            res.setHeader('Content-Type', 'application/xslt+xml; charset=UTF-8');
            res.end(BOM + xslContent);
            return;
          }
          
          // 处理单篇文章的RSS
          if (req.url.endsWith('/rss.xml') && req.method === 'GET') {
            // 获取文章路径，注意保留末尾的斜杠
            const encodedPath = req.url.substring(0, req.url.length - 7); // 移除 "rss.xml"
            // 对URL进行解码，确保中文字符正确显示
            const articlePath = decodeURIComponent(encodedPath);
            
            // 因为我们的目录结构要求路径以/结尾，所以要确保保留末尾斜杠
            const distPath = path.join(process.cwd(), 'dist/client', articlePath, 'rss.xml');
            
            console.log(`尝试读取RSS文件: ${distPath}`);
            
            if (existsSync(distPath)) {
              try {
                const xmlContent = readFileSync(distPath, 'utf-8');
                res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
                res.end(xmlContent);
              } catch (error) {
                console.error(`读取文章RSS文件失败: ${distPath}`, error);
                res.statusCode = 500;
                res.end('读取文章RSS文件时出错');
              }
            } else {
              // 如果文件不存在，尝试重定向到主RSS
              console.log(`RSS文件不存在: ${distPath}，重定向到主RSS`);
              res.statusCode = 302;
              res.setHeader('Location', '/rss.xml');
              res.end();
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
          const buildDirPath = resolveBuildDir(dir);
          await fs.mkdir(buildDirPath, { recursive: true });

          // 收集文章信息
          const rssEntries = [];
          
          console.log('开始生成RSS...');
          
          for (const page of pages) {
            // 跳过404页面
            if (page.pathname.includes('404')) {
              continue;
            }
            
            // 从构建目录读取文章的HTML文件
            const htmlPath = resolveHtmlPath(buildDirPath, page.pathname);
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

            const url = createCanonicalUrl(page.pathname, SITE_META.url);
            
            // 构造文章信息
            const articleInfo = {
              title,
              url,
              pubDate,
              description
            };
            
            // 添加到条目列表
            rssEntries.push(articleInfo);
          }
          
          // 按发布日期排序（最新的在前）
          rssEntries.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
          
          // 添加 UTF-8 BOM 标记以确保浏览器正确识别编码
          const BOM = '\uFEFF';
          
          // 生成主RSS XML
          const rssContent = generateRssXml(rssEntries);
          const rssFilePath = path.join(buildDirPath, 'rss.xml');
          await fs.writeFile(rssFilePath, BOM + rssContent, 'utf8');
          console.log('已生成 rss.xml (UTF-8 with BOM)');
          const mirroredRssFiles = syncStaticGeneratedFileToPlatformOutputs(buildDirPath, rssFilePath);
          if (mirroredRssFiles.length > 0) {
            console.log(`已同步 rss.xml 到平台静态目录: ${mirroredRssFiles.join(', ')}`);
          }
          
          // 生成索引页XSLT样式表
          const indexXsl = generateRssXslt();
          const rssStylesheetPath = path.join(buildDirPath, 'rss.xsl');
          await fs.writeFile(rssStylesheetPath, BOM + indexXsl, 'utf8');
          console.log('已生成 rss.xsl (UTF-8 with BOM)');
          const mirroredRssStylesheets = syncStaticGeneratedFileToPlatformOutputs(buildDirPath, rssStylesheetPath);
          if (mirroredRssStylesheets.length > 0) {
            console.log(`已同步 rss.xsl 到平台静态目录: ${mirroredRssStylesheets.join(', ')}`);
          }
          
        } catch (error) {
          console.error('生成 RSS 时出错:', error);
          console.error(error.stack);
        }
      }
    }
  };
}
