import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getSpecialPath } from '../../content.config';

// 从文章内容中提取摘要的函数
function extractSummary(content: string, length = 150) {
  // 移除 Markdown 标记
  const plainText = content
    .replace(/---[\s\S]*?---/, '') // 移除 frontmatter
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 将链接转换为纯文本
    .replace(/[#*`~>]/g, '') // 移除特殊字符
    .replace(/\n+/g, ' ') // 将换行转换为空格
    .trim();

  return plainText.length > length 
    ? plainText.slice(0, length).trim() + '...'
    : plainText;
}

// 处理特殊ID的函数
function getArticleUrl(articleId: string) {
  return `/articles/${getSpecialPath(articleId)}`;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    // 获取所有文章
    const articles = await getCollection('articles');
    // 格式化文章数据
    const formattedArticles = articles.map(article => ({
      id: article.id,
      title: article.data.title,
      date: article.data.date,
      tags: article.data.tags || [],
      summary: article.data.summary || (article.body ? extractSummary(article.body) : ''),
      url: getArticleUrl(article.id) // 使用特殊ID处理函数
    }));
    
    return new Response(JSON.stringify({
      articles: formattedArticles,
      total: formattedArticles.length,
      success: true
    }), {
      headers: {
        'Content-Type': 'application/json',
        // 添加缓存头，缓存1小时
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: '获取文章数据失败',
      success: false,
      articles: [],
      total: 0
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 