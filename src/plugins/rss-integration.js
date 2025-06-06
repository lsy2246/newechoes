import fs from 'node:fs/promises';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import * as cheerio from 'cheerio';

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

// 转换HTML内容为RSS友好格式
function transformContentForRss(htmlContent) {
  // 使用cheerio解析HTML
  const $ = cheerio.load(htmlContent);
  
  // 查找主要内容区域（文章内容）
  const article = $('article').first();
  if (!article.length) {
    console.warn('未找到文章内容');
    return '未找到文章内容';
  }
  
  // 移除不需要的元素
  article.find('.related-articles, .toc-panel, #back-to-top, .article-footer').remove();
  
  // 处理标题：移除ID属性
  article.find('h1, h2, h3, h4, h5, h6').removeAttr('id');
  
  // 处理其他标签：移除不必要的ID和class属性
  article.find('*').each(function() {
    // 保留链接、图片等重要属性，移除其他ID
    if (!$(this).is('a') && !$(this).is('img') && !$(this).is('source')) {
      $(this).removeAttr('id');
    }
    
    // 如果需要保留一些特定的类，可以进行选择性保留
    // 例如保留代码块相关类
    const classes = $(this).attr('class');
    if (classes) {
      const classesToKeep = classes.split(/\s+/).filter(cls => 
        cls.startsWith('language-') || 
        cls.includes('code-block') || 
        cls.includes('rss-')
      ).join(' ');
      
      if (classesToKeep) {
        $(this).attr('class', classesToKeep);
      } else {
        $(this).removeAttr('class');
      }
    }
  });
  
  // 专门处理内联代码，确保HTML标签被转义
  article.find('code:not(.code-block-container code)').each(function() {
    const codeText = $(this).text();
    $(this).text(codeText); // 重新设置文本内容，确保HTML被转义
  });
  
  // 处理pre标签中的内容，确保HTML标记不被错误解析
  article.find('pre:not(.code-block-container pre)').each(function() {
    // 仅当pre内部没有code标签时，才直接处理内容
    if (!$(this).find('code').length) {
      $(this).text($(this).text()); // 重新设置为纯文本以转义HTML标签
    }
  });
  
  // 处理代码块 - 移除复杂结构，保留基本代码
  article.find('.code-block-container').each((_, container) => {
    const codeElement = $(container).find('code');
    const language = $(container).attr('data-language') || '';
    const codeContent = codeElement.text();
    
    // 创建简化的代码块，确保代码内容中的HTML标签被转义
    const simplifiedCode = `<div class="rss-code-block">
      <div class="rss-code-language">${language}</div>
      <pre><code>${escapeXml(codeContent)}</code></pre>
    </div>`;
    
    $(container).replaceWith(simplifiedCode);
  });
  
  // 处理表格 - 确保简单结构
  article.find('table').each((_, table) => {
    // 添加简单的表格样式
    $(table).addClass('rss-table');
    
    // 确保表格结构简单
    if ($(table).find('thead').length === 0) {
      // 如果没有表头，添加一个简单的表头
      const firstRow = $(table).find('tr').first();
      const columnCount = firstRow.find('td, th').length;
      
      if (columnCount > 0 && firstRow.find('th').length === 0) {
        // 将第一行转换为表头
        firstRow.find('td').each((_, cell) => {
          // 确保HTML内容被正确处理，避免双重解析
          const cellContent = $(cell).html();
          $(cell).replaceWith(`<th>${cellContent}</th>`);
        });
        
        // 将第一行移入thead
        const thead = $('<thead></thead>').append(firstRow);
        $(table).prepend(thead);
      }
    }
  });
  
  // 确保所有链接使用绝对URL
  article.find('a').each((_, link) => {
    const href = $(link).attr('href');
    if (href && !href.startsWith('http') && !href.startsWith('#')) {
      // 相对链接转绝对链接
      $(link).attr('href', new URL(href, SITE_URL).toString());
    }
  });
  
  // 确保所有图片使用绝对URL
  article.find('img').each((_, img) => {
    const src = $(img).attr('src');
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      // 相对链接转绝对链接
      $(img).attr('src', new URL(src, SITE_URL).toString());
    }
    
    // 确保图片有alt文本
    if (!$(img).attr('alt')) {
      $(img).attr('alt', '图片');
    }
  });
  
  // 添加RSS专用样式
  const rssStyles = `
    <style>
      .rss-code-block {
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin: 1em 0;
        overflow: auto;
      }
      .rss-code-language {
        background: #e0e0e0;
        padding: 5px 10px;
        font-family: monospace;
        font-size: 0.9em;
        border-bottom: 1px solid #ddd;
      }
      .rss-code-block pre {
        margin: 0;
        padding: 10px;
        overflow-x: auto;
      }
      .rss-code-block code {
        font-family: Consolas, Monaco, 'Andale Mono', monospace;
        font-size: 0.9em;
        white-space: pre;
      }
      .rss-table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
      }
      .rss-table th, .rss-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      .rss-table th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      .rss-table tr:nth-child(even) {
        background-color: #f9f9f9;
      }
    </style>
  `;
  
  // 最终安全检查：确保所有代码块和预格式化文本中的HTML标签被正确处理
  const finalHtml = rssStyles + article.html();
  
  // 再次解析处理后的HTML，进行最终检查
  const $final = cheerio.load(finalHtml);
  
  // 确保所有代码块中的内容被转义
  $final('code').each(function() {
    const codeText = $final(this).text();
    $final(this).text(codeText);
  });
  
  // 返回处理后的安全HTML
  return $final.html();
}

// 生成RSS XML内容 (主索引)
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

// 生成RSS的XSLT样式表 - 根据内容类型返回不同样式
function generateRssXslt() {
  // 共享的CSS样式
  const sharedStyles = `
    /* 基础样式 */
    :root {
      --background: #fff;
      --text: #222;
      --link: #0366d6;
      --border: #eee;
      --header-bg: #f8f9fa;
      --article-bg: #fff;
      --card-shadow: 0 1px 3px rgba(0,0,0,0.1);
      --code-bg: #f6f8fa;
      --blockquote-border: #dfe2e5;
    }
    
    /* 深色模式 */
    @media (prefers-color-scheme: dark) {
      :root {
        --background: #121212;
        --text: #eee;
        --link: #58a6ff;
        --border: #333;
        --header-bg: #222;
        --article-bg: #1e1e1e;
        --card-shadow: 0 1px 3px rgba(0,0,0,0.3);
        --code-bg: #2d333b;
        --blockquote-border: #444;
      }
    }
    
    /* 全局修复 */
    * {
      box-sizing: border-box;
      max-width: 100%;
    }
    
    img, svg, video, canvas, audio, iframe, embed, object {
      display: block;
      max-width: 100%;
    }
    
    /* 正常样式 */
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--background);
      color: var(--text);
      margin: 0;
      padding: 20px;
      line-height: 1.6;
      overflow-x: hidden;
      width: 100%;
    }
    
    .page-header {
      background: var(--header-bg);
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 8px;
      box-shadow: var(--card-shadow);
      width: 100%;
    }
    
    .page-header h1 {
      margin: 0;
      font-size: 24px;
      color: var(--link);
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    a {
      color: var(--link);
      text-decoration: none;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    .date-display {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: var(--text);
      opacity: 0.7;
    }
    
    /* 表格修复 */
    table {
      display: block;
      overflow-x: auto;
      width: 100%;
      max-width: 100%;
    }
    
    /* 代码块修复 */
    pre {
      overflow-x: auto;
      max-width: 100%;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    code {
      word-break: break-all;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    
    /* 共享移动端适配 */
    @media (max-width: 768px) {
      body {
        padding: 15px;
        font-size: 15px;
      }
      
      .page-header {
        padding: 15px;
        margin-bottom: 20px;
      }
      
      .page-header h1 {
        font-size: 20px;
      }
    }
    
    @media (max-width: 380px) {
      body {
        padding: 10px;
        font-size: 14px;
      }
      
      .page-header {
        padding: 12px;
        margin-bottom: 15px;
        border-radius: 6px;
      }
      
      .page-header h1 {
        font-size: 18px;
      }
      
      .date-display {
        font-size: 12px;
      }
    }
  `;

  // 索引页特有样式
  const indexStyles = `
    body {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .feed-info {
      margin-bottom: 40px;
    }
    
    .feed-info h2 {
      margin: 0 0 15px 0;
      color: var(--text);
      font-size: 28px;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .feed-info p {
      margin: 10px 0;
      color: var(--text);
      opacity: 0.8;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .articles {
      list-style: none;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    
    .article {
      background: var(--article-bg);
      border: 1px solid var(--border);
      margin-bottom: 5px;
      padding: 20px;
      border-radius: 8px;
      box-shadow: var(--card-shadow);
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
      width: 100%;
      box-sizing: border-box;
    }
    
    .article:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    .article h3 {
      margin: 0 0 15px 0;
      font-size: 18px;
      line-height: 1.4;
      word-wrap: break-word;
      overflow-wrap: break-word;
      width: 100%;
    }
    
    .article h3 a {
      word-break: break-word;
    }
    
    .article-meta {
      font-size: 14px;
      color: var(--text);
      opacity: 0.7;
      margin-bottom: 12px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 15px;
      width: 100%;
    }
    
    .article-description {
      margin: 0;
      font-size: 15px;
      line-height: 1.5;
      color: var(--text);
      opacity: 0.9;
      word-wrap: break-word;
      overflow-wrap: break-word;
      width: 100%;
      -webkit-hyphens: auto;
      -ms-hyphens: auto;
      hyphens: auto;
      max-height: 4.5em;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      text-overflow: ellipsis;
    }
    
    .rss-link {
      display: inline-flex;
      align-items: center;
      margin-top: 5px;
      font-size: 13px;
      color: var(--link);
      gap: 3px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(0,102,204,0.08);
    }
    
    .rss-link:hover {
      background: rgba(0,102,204,0.15);
    }

    /* 移动端适配 */
    @media (max-width: 768px) {
      body {
        padding: 15px;
      }
      
      .feed-info {
        margin-bottom: 25px;
      }
      
      .feed-info h2 {
        font-size: 22px;
        line-height: 1.3;
      }
      
      .articles {
        grid-template-columns: 1fr;
        gap: 15px;
        width: 100%;
      }

      .article {
        padding: 15px;
        margin-bottom: 0;
        width: auto;
        max-width: 100%;
      }

      .article h3 {
        font-size: 17px;
        margin-bottom: 10px;
      }
      
      .article-meta {
        margin-bottom: 8px;
        gap: 10px;
      }

      .article-description {
        font-size: 14px;
        -webkit-line-clamp: 2;
        max-height: 3em;
      }
    }
    
    /* 超小屏幕设备适配 */
    @media (max-width: 380px) {
      body {
        padding: 10px;
        width: 100%;
        box-sizing: border-box;
        overflow-x: hidden;
      }
      
      .feed-info h2 {
        font-size: 20px;
      }
      
      .article {
        padding: 12px;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
      }
      
      .article h3 {
        font-size: 16px;
        width: 100%;
      }
      
      .article-meta {
        font-size: 12px;
        width: 100%;
      }
      
      .article-description {
        width: 100%;
      }
    }
  `;

  // 返回索引页模板
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
          ${sharedStyles}
          ${indexStyles}
        </style>
      </head>
      <body>
        <div class="page-header">
          <h1>RSS订阅</h1>
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
                <span class="date-display">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <xsl:value-of select="substring-before(substring-after(pubDate, ', '), ' GMT')"/>
                </span>
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
          
          console.log('开始生成RSS...');
          
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
          await fs.writeFile(path.join(buildDirPath, 'rss.xml'), BOM + rssContent, 'utf8');
          console.log('已生成 rss.xml (UTF-8 with BOM)');
          
          // 生成索引页XSLT样式表
          const indexXsl = generateRssXslt();
          await fs.writeFile(path.join(buildDirPath, 'rss.xsl'), BOM + indexXsl, 'utf8');
          console.log('已生成 rss.xsl (UTF-8 with BOM)');
          
        } catch (error) {
          console.error('生成 RSS 时出错:', error);
          console.error(error.stack);
        }
      }
    }
  };
} 