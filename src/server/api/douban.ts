import { load } from 'cheerio/slim';
import { createServerRequestLog, summarizeUrl } from '../../lib/server/request-log.js';
import { fetchAssetDirect, relayAssetUrl } from '../../lib/server/asset-relay.js';

// 请求配置常量
const MAX_RETRIES = 0;        // 最大重试次数
const RETRY_DELAY = 1500;     // 重试延迟（毫秒）
const REQUEST_TIMEOUT = 10000; // 请求超时时间（毫秒）
const DOUBAN_IMAGE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Referer': 'https://movie.douban.com/',
  'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
};

const localDoubanImageUrl = (imageUrl: string) =>
  `/api/douban?imageUrl=${encodeURIComponent(imageUrl)}`;

// 带超时的 fetch 函数
async function fetchWithTimeout(
  url: string,
  options: { headers?: Record<string, string>; signal?: AbortSignal },
  timeoutMs: number,
) {
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

      const response = await fetch(url, {
        headers: options.headers,
        signal: timeoutSignal
      });

      // 移除监听器
      existingSignal.removeEventListener('abort', abortListener);

      return response;
    } else {
      return await fetch(url, {
        headers: options.headers,
        signal: timeoutSignal
      });
    }
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'movie';
  const start = parseInt(url.searchParams.get('start') || '0');
  const doubanId = url.searchParams.get('doubanId');
  const imageUrl = url.searchParams.get('imageUrl'); // 图片代理参数
  const log = createServerRequestLog('api.douban', request, {
    type,
    start,
    doubanId: doubanId || null,
    hasImageProxy: Boolean(imageUrl),
    imageHost: imageUrl ? summarizeUrl(imageUrl) : null,
  });

  // 如果是图片代理请求
  if (imageUrl) {
    try {
      log.info('image.proxy.fetch.start', {
        imageUrl: summarizeUrl(imageUrl),
      });
      const response = await fetchAssetDirect(imageUrl, {
        headers: DOUBAN_IMAGE_HEADERS,
      });

      if (!response.ok) {
        log.warn('image.proxy.fetch.failed', {
          imageUrl: summarizeUrl(imageUrl),
          upstreamStatus: response.status,
        });
        return new Response('Failed to fetch image', { status: response.status });
      }

      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/webp';
      log.respond(200, {
        reason: 'image_proxy_success',
        imageUrl: summarizeUrl(imageUrl),
      });

      return new Response(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } catch (error) {
      log.error('image.proxy.fetch.error', error, {
        imageUrl: summarizeUrl(imageUrl),
      });
      log.respond(500, { reason: 'image_proxy_failed' });
      return new Response('Error fetching image', { status: 500 });
    }
  }

  if (!doubanId) {
    log.respond(400, { reason: 'missing_douban_id' });
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

        log.info('upstream.fetch.start', {
          attempt: retries + 1,
          upstreamUrl: summarizeUrl(doubanUrl),
        });

        const response = await fetchWithTimeout(doubanUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cookie': `bid=doubanAPIClient`,
            'Referer': 'https://movie.douban.com'
          }
        }, REQUEST_TIMEOUT);

        if (!response.ok) {
          log.warn('upstream.fetch.non_ok', {
            attempt: retries + 1,
            upstreamUrl: summarizeUrl(doubanUrl),
            upstreamStatus: response.status,
          });
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
        log.info('upstream.fetch.success', {
          attempt: retries + 1,
          upstreamUrl: summarizeUrl(doubanUrl),
          htmlLength: html.length,
        });

        // 检查是否包含验证码页面的特征
        if (html.includes('验证码') || html.includes('captcha') || html.includes('too many requests')) {
          const errorMessage = '请求被豆瓣限制，需要验证码';
          log.warn('upstream.fetch.captcha', {
            upstreamUrl: summarizeUrl(doubanUrl),
          });
          log.respond(403, { reason: 'upstream_captcha' });

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
          fallbackImageUrl: string;
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
          log.warn('parse.empty_items', {
            attempt: retries + 1,
            selector: itemSelector,
            upstreamUrl: summarizeUrl(doubanUrl),
          });

          if (retries < MAX_RETRIES) {
            retries++;
            // 增加重试延迟，避免频繁请求
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
            continue;
          } else {
            // 检查页面内容，判断是否是访问限制
            if (html.includes('禁止访问') || html.includes('访问受限') || html.includes('频繁')) {
              log.respond(403, { reason: 'upstream_access_denied' });
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
            const relayImageUrl = imageUrl
              ? relayAssetUrl(imageUrl, DOUBAN_IMAGE_HEADERS)
              : null;
            const fallbackImageUrl = relayImageUrl && imageUrl
              ? localDoubanImageUrl(imageUrl)
              : '';

            items.push({
              imageUrl: imageUrl ? relayImageUrl || localDoubanImageUrl(imageUrl) : '',
              fallbackImageUrl,
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

        log.respond(200, {
          items: items.length,
          selector: itemSelector,
          pagination,
        });

        // 如果有缓存系统，可以在这里保存数据到缓存

        return new Response(JSON.stringify({ items, pagination }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=300', // 5分钟服务器缓存
            'CDN-Cache-Control': 'public, max-age=300' // CDN缓存
          }
        });
      } catch (error) {
        log.error('upstream.fetch.attempt_failed', error, {
          attempt: retries + 1,
          maxAttempts: MAX_RETRIES + 1,
        });

        // 判断是否是请求被中止
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          log.warn('request.aborted', {
            message: error.message,
          });
          // 对于中止请求，我们可以直接返回404
          log.respond(499, { reason: 'request_aborted' });
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
    log.error('request.failed', lastError, {
      type,
      doubanId,
      start,
    });

    // 检查是否是常见错误类型并返回对应错误信息
    const errorMessage = lastError?.message || '未知错误';

    // 检查是否是中止错误
    if (lastError && (lastError.name === 'AbortError' || errorMessage.includes('aborted'))) {
      log.respond(499, { reason: 'request_aborted_final' });
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
      log.respond(403, { reason: 'upstream_rate_limited' });
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
      log.respond(404, { reason: 'content_not_found' });
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
      log.respond(408, { reason: 'upstream_timeout' });
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

    log.respond(500, { reason: 'request_failed', message: errorMessage });
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
    log.error('request.unhandled_error', error, {
      type,
      start,
      doubanId,
    });

    // 判断是否是中止错误
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      log.respond(499, { reason: 'request_aborted_unhandled' });
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

    log.respond(500, { reason: 'unhandled_error' });
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
