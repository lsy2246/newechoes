import type { APIRoute } from 'astro';
import { load } from 'cheerio';

// 添加服务器渲染标记
export const prerender = false;

// 请求配置常量
const MAX_RETRIES = 0;        // 最大重试次数
const RETRY_DELAY = 1500;     // 重试延迟（毫秒）
const REQUEST_TIMEOUT = 10000; // 请求超时时间（毫秒）

// 带超时的 fetch 函数
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  // 检查是否已经提供了信号
  const existingSignal = options.signal;

  // 创建我们自己的 AbortController 用于超时
  const timeoutController = new AbortController();
  const timeoutSignal = timeoutController.signal;

  // 设置超时
  const timeout = setTimeout(() => {
    timeoutController.abort();
  }, timeoutMs);

  try {
    // 使用已有的信号和我们的超时信号
    if (existingSignal) {
      // 如果已经取消了，直接抛出异常
      if (existingSignal.aborted) {
        throw new DOMException('已被用户取消', 'AbortError');
      }

      // 创建一个监听器，当外部信号中止时，也中止我们的控制器
      const abortListener = () => timeoutController.abort();
      existingSignal.addEventListener('abort', abortListener);

      // 进行请求，但只使用我们的超时信号
      const response = await fetch(url, {
        ...options,
        signal: timeoutSignal
      });

      // 移除监听器
      existingSignal.removeEventListener('abort', abortListener);

      return response;
    } else {
      // 如果没有提供信号，只使用我们的超时信号
      return await fetch(url, {
        ...options,
        signal: timeoutSignal
      });
    }
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
          doubanUrl = `https://book.douban.com/people/${doubanId}/collect?start=${start}`;
        } else {
          doubanUrl = `https://movie.douban.com/people/${doubanId}/collect?start=${start}`;
        }

        // 使用带超时的fetch发送请求
        const response = await fetchWithTimeout(doubanUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cookie': `bid=doubanAPIClient`
          }
        }, REQUEST_TIMEOUT);

        if (!response.ok) {
          // 根据状态码提供更详细的错误信息
          let errorMessage = `豆瓣请求失败，状态码: ${response.status}`;

          if (response.status === 403) {
            errorMessage = `豆瓣接口返回403禁止访问，可能是请求频率受限`;
            console.error(errorMessage);

            // 返回更友好的错误信息
            return new Response(JSON.stringify({
              error: '豆瓣接口暂时不可用',
              message: '请求频率过高，豆瓣服务器已限制访问，请稍后再试',
              status: 403
            }), {
              status: 403,
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0'
              }
            });
          } else if (response.status === 404) {
            errorMessage = `未找到豆瓣用户或内容 (ID: ${doubanId})`;
          } else if (response.status === 429) {
            errorMessage = '豆瓣API请求过于频繁，被限流';
          } else if (response.status >= 500) {
            errorMessage = '豆瓣服务器内部错误';
          }

          throw new Error(errorMessage);
        }

        const html = await response.text();

        // 检查是否包含验证码页面的特征
        if (html.includes('验证码') || html.includes('captcha') || html.includes('too many requests')) {
          const errorMessage = '请求被豆瓣限制，需要验证码';
          console.error(errorMessage);

          // 返回更友好的错误信息
          return new Response(JSON.stringify({
            error: '豆瓣接口暂时不可用',
            message: '请求需要验证码验证，可能是因为请求过于频繁',
            status: 403
          }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, max-age=0'
            }
          });
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
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
            continue;
          } else {
            // 检查页面内容，判断是否是访问限制
            if (html.includes('禁止访问') || html.includes('访问受限') || html.includes('频繁')) {
              return new Response(JSON.stringify({
                error: '豆瓣接口访问受限',
                message: '您的访问请求过于频繁，豆瓣已暂时限制访问',
                status: 403
              }), {
                status: 403,
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-store, max-age=0'
                }
              });
            }

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

        // 判断是否是请求被中止
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          console.warn('请求被中止:', error.message);
          // 对于中止请求，我们可以直接返回404
          return new Response(JSON.stringify({
            error: '请求被中止',
            message: '请求已被用户或服务器中止',
            status: 499 // 使用499代表客户端中止请求
          }), {
            status: 499,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store, max-age=0'
            }
          });
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        if (retries < MAX_RETRIES) {
          retries++;
          // 增加重试延迟，避免频繁请求
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
        } else {
          break;
        }
      }
    }

    // 所有尝试都失败了
    console.error('所有尝试都失败了:', lastError);

    // 检查是否是常见错误类型并返回对应错误信息
    const errorMessage = lastError?.message || '未知错误';

    // 检查是否是中止错误
    if (lastError && (lastError.name === 'AbortError' || errorMessage.includes('aborted'))) {
      return new Response(JSON.stringify({
        error: '请求被中止',
        message: '请求已被用户或系统中止',
        status: 499
      }), {
        status: 499,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      });
    }

    // 根据错误信息判断错误类型
    if (errorMessage.includes('403') || errorMessage.includes('禁止访问') || errorMessage.includes('频繁')) {
      return new Response(JSON.stringify({
        error: '豆瓣接口访问受限',
        message: '请求频率过高，豆瓣服务器已限制访问，请稍后再试',
        status: 403
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      });
    }

    if (errorMessage.includes('404') || errorMessage.includes('未找到')) {
      return new Response(JSON.stringify({
        error: '未找到豆瓣内容',
        message: `未找到ID为 ${doubanId} 的${type === 'movie' ? '电影' : '图书'}内容`,
        status: 404
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      });
    }

    if (errorMessage.includes('超时')) {
      return new Response(JSON.stringify({
        error: '豆瓣接口请求超时',
        message: '请求豆瓣服务器超时，请稍后再试',
        status: 408
      }), {
        status: 408,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      });
    }

    return new Response(JSON.stringify({
      error: '获取豆瓣数据失败',
      message: errorMessage
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('处理请求时出错:', error);

    // 判断是否是中止错误
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      return new Response(JSON.stringify({
        error: '请求被中止',
        message: '请求已被用户或系统中止',
        status: 499
      }), {
        status: 499,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      });
    }

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