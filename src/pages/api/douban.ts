import type { APIRoute } from 'astro';
import { load } from 'cheerio';

// 添加服务器渲染标记
export const prerender = false;

// 请求配置常量
const MAX_RETRIES = 0;        // 最大重试次数
const RETRY_DELAY = 1500;     // 重试延迟（毫秒）
const REQUEST_TIMEOUT = 10000; // 请求超时时间（毫秒）

// 生成随机的bid Cookie值
function generateBid() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 添加延迟函数
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 带超时的 fetch 函数
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'movie';
  const start = parseInt(url.searchParams.get('start') || '0');
  const doubanId = url.searchParams.get('doubanId');  // 从查询参数获取 doubanId
  
  if (!doubanId) {
    return new Response(JSON.stringify({ error: '缺少豆瓣ID' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  }

  // 添加缓存键的构建，用于区分不同的请求
  const cacheKey = `douban_${type}_${doubanId}_${start}`;
  
  // 尝试从缓存获取数据
  try {
    // 如果有缓存系统，可以在这里检查和返回缓存数据
    
    // 重试逻辑
    let retries = 0;
    let lastError: Error | null = null;
    
    while (retries <= MAX_RETRIES) {
      try {
        let doubanUrl = '';
        if (type === 'book') {
          doubanUrl = `https://book.douban.com/people/${doubanId}/collect?start=${start}&sort=time&rating=all&filter=all&mode=grid`;
        } else {
          doubanUrl = `https://movie.douban.com/people/${doubanId}/collect?start=${start}&sort=time&rating=all&filter=all&mode=grid`;
        }

        // 生成随机bid
        const bid = generateBid();
        
        // 随机化一些请求参数，减少被检测的风险
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
        ];
        
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

        // 使用带超时的fetch发送请求
        const response = await fetchWithTimeout(doubanUrl, {
          headers: {
            'User-Agent': randomUserAgent,
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'max-age=0',
            'Cookie': `bid=${bid}`
          }
        }, REQUEST_TIMEOUT);
        
        if (!response.ok) {
          throw new Error(`豆瓣请求失败，状态码: ${response.status}`);
        }
        
        const html = await response.text();
        
        // 检查是否包含验证码页面的特征
        if (html.includes('验证码') || html.includes('captcha') || html.includes('too many requests')) {
          throw new Error('请求被豆瓣限制，需要验证码');
        }
        
        const $ = load(html);
        
        // 添加类型定义
        interface DoubanItem {
          imageUrl: string;
          title: string;
          subtitle: string;
          link: string;
          intro: string;
          rating: number;
          date: string;
        }
        
        const items: DoubanItem[] = [];
        
        // 尝试不同的选择器
        let itemSelector = '.item.comment-item';
        let itemCount = $(itemSelector).length;
        
        if (itemCount === 0) {
          // 尝试其他可能的选择器
          itemSelector = '.subject-item';
          itemCount = $(itemSelector).length;
        }
        
        if (itemCount === 0) {
          // 如果两个选择器都没有找到内容，可能是页面结构变化或被封锁
          console.error('未找到内容，页面结构可能已变化');
          
          // 记录HTML以便调试
          console.debug('HTML片段:', html.substring(0, 500) + '...');
          
          if (retries < MAX_RETRIES) {
            retries++;
            // 增加重试延迟，避免频繁请求
            await delay(RETRY_DELAY * retries);
            continue;
          } else {
            throw new Error('未找到电影/图书内容，可能是页面结构已变化');
          }
        }
        
        $(itemSelector).each((_, element) => {
          const $element = $(element);
          
          try {
            // 根据选择器调整查找逻辑
            let imageUrl = '';
            let title = '';
            let subtitle = '';
            let link = '';
            let intro = '';
            let rating = 0;
            let date = '';
            
            if (itemSelector === '.item.comment-item') {
              // 原始逻辑
              imageUrl = $element.find('.pic img').attr('src') || '';
              title = $element.find('.title a em').text().trim();
              subtitle = $element.find('.title a').text().replace(title, '').trim();
              link = $element.find('.title a').attr('href') || '';
              intro = $element.find('.intro').text().trim();
              
              // 获取评分，从rating1-t到rating5-t
              for (let i = 1; i <= 5; i++) {
                if ($element.find(`.rating${i}-t`).length > 0) {
                  rating = i;
                  break;
                }
              }
              
              date = $element.find('.date').text().trim();
            } else if (itemSelector === '.subject-item') {
              // 新的图书页面结构
              imageUrl = $element.find('.pic img').attr('src') || '';
              title = $element.find('.info h2 a').text().trim();
              link = $element.find('.info h2 a').attr('href') || '';
              intro = $element.find('.info .pub').text().trim();
              
              // 获取评分
              const ratingClass = $element.find('.rating-star').attr('class') || '';
              const ratingMatch = ratingClass.match(/rating(\d)-t/);
              if (ratingMatch) {
                rating = parseInt(ratingMatch[1]);
              }
              
              date = $element.find('.info .date').text().trim();
            }
            
            // 确保所有字段至少有空字符串
            items.push({
              imageUrl: imageUrl || '',
              title: title || '',
              subtitle: subtitle || '',
              link: link || '',
              intro: intro || '',
              rating: rating || 0,
              date: date || ''
            });
          } catch (error) {
            console.error('解析项目时出错:', error);
            // 继续处理下一个项目，而不是终止整个循环
          }
        });
        
        // 改进分页信息获取逻辑
        let currentPage = 1;
        let totalPages = 1;
        
        // 尝试从当前页码元素获取信息
        if ($('.paginator .thispage').length > 0) {
          currentPage = parseInt($('.paginator .thispage').text() || '1');
          // 豆瓣可能不直接提供总页数，需要计算
          const paginatorLinks = $('.paginator a');
          let maxPage = currentPage;
          paginatorLinks.each((_, el) => {
            const pageNum = parseInt($(el).text());
            if (!isNaN(pageNum) && pageNum > maxPage) {
              maxPage = pageNum;
            }
          });
          totalPages = maxPage;
        }
        
        const pagination = {
          current: currentPage,
          total: totalPages,
          hasNext: $('.paginator .next a').length > 0,
          hasPrev: $('.paginator .prev a').length > 0
        };
        
        // 如果有缓存系统，可以在这里保存数据到缓存
        
        return new Response(JSON.stringify({ items, pagination }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=300', // 5分钟服务器缓存
            'CDN-Cache-Control': 'public, max-age=300' // CDN缓存
          }
        });
      } catch (error) {
        console.error(`尝试第 ${retries + 1}/${MAX_RETRIES + 1} 次失败:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (retries < MAX_RETRIES) {
          retries++;
          // 增加重试延迟，避免频繁请求
          await delay(RETRY_DELAY * retries);
        } else {
          break;
        }
      }
    }
    
    // 所有尝试都失败了
    console.error('所有尝试都失败了:', lastError);
    return new Response(JSON.stringify({ 
      error: '获取豆瓣数据失败', 
      message: lastError?.message || '未知错误'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('处理请求时出错:', error);
    return new Response(JSON.stringify({ 
      error: '获取豆瓣数据失败', 
      message: error instanceof Error ? error.message : '未知错误'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  }
} 