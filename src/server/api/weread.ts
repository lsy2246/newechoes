import { load } from 'cheerio/slim';
import { createServerRequestLog, summarizeUrl } from '../../lib/server/request-log.js';
import { fetchAssetDirect, relayAssetUrl } from '../../lib/server/asset-relay.js';

// 请求配置常量
const MAX_RETRIES = 1;        // 最大重试次数
const RETRY_DELAY = 1500;     // 重试延迟（毫秒）
const REQUEST_TIMEOUT = 10000; // 请求超时时间（毫秒）
const WEREAD_PAGE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};
const WEREAD_IMAGE_HEADERS = {
  'User-Agent': WEREAD_PAGE_HEADERS['User-Agent'],
  'Referer': 'https://weread.qq.com/',
  'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
};

const localWereadImageUrl = (imageUrl: string) =>
  `/api/weread?imageUrl=${encodeURIComponent(imageUrl)}`;

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

// 从HTML页面中提取书籍数据
function extractBooksFromScript(html: string): { title: string; author: string; cover: string; }[] | null {
  try {
    // 使用Cheerio解析HTML
    const $ = load(html);

    // 1. 从HTML结构中提取书名和作者信息（保证准确性）
    const htmlBooks = new Map<string, string>(); // 以书名为键，作者为值
    const orderedTitles: string[] = []; // 保持HTML中的顺序

    $('.booklist_books li').each((index, element) => {
      const title = $(element).find('.booklist_book_title').text().trim();
      const author = $(element).find('.booklist_book_author').text().trim();

      if (title && author) {
        htmlBooks.set(title, author);
        orderedTitles.push(title);
      }
    });

    if (htmlBooks.size === 0) {
      console.error('[WeRead] 无法从HTML中提取书籍信息');
      return null;
    }

    // 2. 从脚本中提取封面URL
    const bookEntitiesMatch = html.match(/bookEntities:(\{.*?\}),bookIds/s);
    if (!bookEntitiesMatch) {
      console.error('[WeRead] 未找到bookEntities数据，无法获取书籍封面');

      // 即使找不到封面URL，也可以返回标题和作者信息
      const booksWithoutCovers = orderedTitles.map(title => ({
        title,
        author: htmlBooks.get(title) || '',
        cover: ''
      }));

      return booksWithoutCovers;
    }

    // 从bookEntities中提取标题和封面URL的映射
    const coverMap = new Map<string, string>(); // 以标题为键，封面URL为值
    const bookPattern = /"([^"]+)":\{.*?title:"([^"]+)",.*?cover:"([^"]+)".*?\}/g;

    let match;
    while ((match = bookPattern.exec(bookEntitiesMatch[1])) !== null) {
      const title = match[2]; // 书名
      const cover = match[3].replace(/\\u002F/g, '/'); // 封面URL
      coverMap.set(title, cover);
    }

    // 3. 合并数据，按照HTML中的顺序
    const finalBooks: { title: string; author: string; cover: string; }[] = [];

    // 遍历HTML中的书籍顺序
    for (const title of orderedTitles) {
      const author = htmlBooks.get(title) || '';
      const cover = coverMap.get(title) || '';

      finalBooks.push({ title, author, cover });
    }

    // 记录找不到封面的书籍数量
    const missingCovers = finalBooks.filter(book => !book.cover).length;
    if (missingCovers > 0) {
      console.warn(`[WeRead] 警告：有${missingCovers}/${finalBooks.length}本书未找到封面URL`);
    }

    return finalBooks.length > 0 ? finalBooks : null;
  } catch (error) {
    console.error('[WeRead] 从HTML提取书籍数据时出错:', error);
    return null;
  }
}

export const GET = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const listId = url.searchParams.get('listId');  // 从查询参数获取微信读书书单ID
  const imageUrl = url.searchParams.get('imageUrl');
  const log = createServerRequestLog('api.weread', request, {
    listId: listId || null,
    hasImageProxy: Boolean(imageUrl),
    imageHost: imageUrl ? summarizeUrl(imageUrl) : null,
  });

  if (imageUrl) {
    try {
      log.info('image.proxy.fetch.start', {
        imageUrl: summarizeUrl(imageUrl),
      });
      const response = await fetchAssetDirect(imageUrl, {
        headers: WEREAD_IMAGE_HEADERS,
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

  if (!listId) {
    log.respond(400, { reason: 'missing_list_id' });
    return new Response(JSON.stringify({ error: '缺少微信读书书单ID' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  }

  // 尝试从缓存获取数据
  try {
    // 重试逻辑
    let retries = 0;
    let lastError: Error | null = null;

    while (retries <= MAX_RETRIES) {
      try {
        const wereadUrl = `https://weread.qq.com/misc/booklist/${listId}`;
        log.info('upstream.fetch.start', {
          attempt: retries + 1,
          upstreamUrl: summarizeUrl(wereadUrl),
        });

        const response = await fetchWithTimeout(wereadUrl, {
          headers: WEREAD_PAGE_HEADERS,
        }, REQUEST_TIMEOUT);

        if (!response.ok) {
          log.warn('upstream.fetch.non_ok', {
            attempt: retries + 1,
            upstreamUrl: summarizeUrl(wereadUrl),
            upstreamStatus: response.status,
          });
          // 根据状态码提供更详细的错误信息
          let errorMessage = `微信读书请求失败，状态码: ${response.status}`;

          if (response.status === 403) {
            errorMessage = `微信读书接口返回403禁止访问，可能是请求频率受限`;
            console.error(errorMessage);

            // 返回更友好的错误信息
            return new Response(JSON.stringify({
              error: '微信读书接口暂时不可用',
              message: '请求频率过高，服务器已限制访问，请稍后再试',
              status: 403
            }), {
              status: 403,
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0'
              }
            });
          } else if (response.status === 404) {
            errorMessage = `未找到微信读书书单 (ID: ${listId})`;
          } else if (response.status === 429) {
            errorMessage = '微信读书API请求过于频繁，被限流';
          } else if (response.status >= 500) {
            errorMessage = '微信读书服务器内部错误';
          }

          throw new Error(errorMessage);
        }

        const html = await response.text();
        log.info('upstream.fetch.success', {
          attempt: retries + 1,
          upstreamUrl: summarizeUrl(wereadUrl),
          htmlLength: html.length,
        });

        // 检查是否包含验证码页面的特征
        if (html.includes('验证码') || html.includes('captcha')) {
          const errorMessage = '请求被微信读书限制，需要验证码';
          log.warn('upstream.fetch.captcha', {
            upstreamUrl: summarizeUrl(wereadUrl),
          });
          log.respond(403, { reason: 'upstream_captcha' });

          // 返回更友好的错误信息
          return new Response(JSON.stringify({
            error: '微信读书接口暂时不可用',
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

        // 从脚本中提取书籍数据
        const scriptBooks = extractBooksFromScript(html);

        if (scriptBooks && scriptBooks.length > 0) {
          // 将提取的数据转换为API响应格式
          const books = scriptBooks.map(book => ({
            title: book.title,
            author: book.author,
            imageUrl: book.cover,
            fallbackImageUrl: book.cover ? relayAssetUrl(book.cover, WEREAD_IMAGE_HEADERS) || localWereadImageUrl(book.cover) : '',
            serverFallbackImageUrl: book.cover && relayAssetUrl(book.cover, WEREAD_IMAGE_HEADERS)
              ? localWereadImageUrl(book.cover)
              : '',
            link: `https://weread.qq.com/web/search/books?keyword=${encodeURIComponent(book.title)}`
          }));
          log.respond(200, {
            books: books.length,
            source: 'script_payload',
          });

          return new Response(JSON.stringify({ books }), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, s-maxage=300', // 5分钟服务器缓存
              'CDN-Cache-Control': 'public, max-age=300' // CDN缓存
            }
          });
        }

        // 如果从脚本提取失败，尝试从HTML解析
        const $ = load(html);

        // 定义书籍项目接口
        interface WereadBook {
          title: string;
          author: string;
          imageUrl: string;
          fallbackImageUrl: string;
          serverFallbackImageUrl: string;
          link: string;
        }

        const books: WereadBook[] = [];

        // 从HTML中解析书籍列表
        $('.booklist_books li').each((_, element) => {
          try {
            const $element = $(element);

            // 提取标题和作者
            const title = $element.find('.booklist_book_title').text().trim();
            const author = $element.find('.booklist_book_author').text().trim();
            // 尝试直接从HTML中提取图片URL
            const imageUrl = $element.find('.wr_bookCover_img').attr('src') || '';

            // 只有在找到标题和作者的情况下才添加书籍
            if (title && author) {
              const relayImageUrl = imageUrl
                ? relayAssetUrl(imageUrl, WEREAD_IMAGE_HEADERS)
                : null;

              books.push({
                title,
                author,
                imageUrl,
                fallbackImageUrl: imageUrl ? relayImageUrl || localWereadImageUrl(imageUrl) : '',
                serverFallbackImageUrl: relayImageUrl && imageUrl ? localWereadImageUrl(imageUrl) : '',
                link: `https://weread.qq.com/web/search/books?keyword=${encodeURIComponent(title)}`
              });
            }
          } catch (error) {
            console.error('解析书籍时出错:', error);
          }
        });

        if (books.length > 0) {
          log.respond(200, {
            books: books.length,
            source: 'html_fallback',
          });
          return new Response(JSON.stringify({ books }), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, s-maxage=300',
              'CDN-Cache-Control': 'public, max-age=300'
            }
          });
        } else {
          log.warn('parse.empty_books', {
            upstreamUrl: summarizeUrl(wereadUrl),
          });
          throw new Error('未能从页面中提取书籍数据');
        }
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
      listId,
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
        error: '微信读书接口访问受限',
        message: '请求频率过高，服务器已限制访问，请稍后再试',
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
      log.respond(404, { reason: 'list_not_found' });
      return new Response(JSON.stringify({
        error: '未找到微信读书书单',
        message: `未找到ID为 ${listId} 的书单内容`,
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
        error: '微信读书接口请求超时',
        message: '请求微信读书服务器超时，请稍后再试',
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
      error: '获取微信读书数据失败',
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
      listId,
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
      error: '获取微信读书数据失败',
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
