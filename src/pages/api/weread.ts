import type { APIRoute } from 'astro';
import { load } from 'cheerio';

// 添加服务器渲染标记
export const prerender = false;

// 请求配置常量
const MAX_RETRIES = 1;        // 最大重试次数
const RETRY_DELAY = 1500;     // 重试延迟（毫秒）
const REQUEST_TIMEOUT = 10000; // 请求超时时间（毫秒）

// 添加延迟函数
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

// 从脚本中提取书籍数据（简单直接的方法）
function extractBooksFromScript(html: string): { title: string; author: string; cover: string; }[] | null {
  try {
    // 1. 提取函数参数列表，用于解析参数引用
    const paramsMatch = html.match(/\(function\(([^)]*)\)/);
    if (!paramsMatch) {
      console.error('未找到函数参数列表');
      return null;
    }
    
    const params = paramsMatch[1].split(',').map(p => p.trim());
    
    // 2. 提取bookEntities对象
    const bookEntitiesMatch = html.match(/bookEntities:(\{.*?\}),bookIds/s);
    if (!bookEntitiesMatch) {
      console.error('未找到bookEntities数据');
      return null;
    }
    
    // 3. 提取bookIds数组
    const bookIdsMatch = html.match(/bookIds:\[(.*?)\]/s);
    if (!bookIdsMatch) {
      console.error('未找到bookIds数据');
      return null;
    }
    
    const bookIdsStr = bookIdsMatch[1];
    const bookIds = bookIdsStr.split(',')
      .map(id => id.trim().replace(/"/g, ''))
      .filter(id => id && id !== '');
    
    // 4. 创建参数到实际ID的映射
    // 首先提取所有bookId参数引用
    const bookIdParamPattern = /"([^"]+)":\{bookId:([^,]+),/g;
    const paramToIdMap = new Map<string, string>();
    let bookIdMatch;
    
    while ((bookIdMatch = bookIdParamPattern.exec(bookEntitiesMatch[1])) !== null) {
      const entityId = bookIdMatch[1];  // 如 "728774"
      const paramRef = bookIdMatch[2];  // 如 "h"
      
      if (paramRef.length === 1 && /[a-z]/.test(paramRef)) {
        paramToIdMap.set(paramRef, entityId);
      }
    }
    
    // 5. 解析每本书的信息
    const bookMap = new Map();
    const bookPattern = /"([^"]+)":\{bookId:[^,]+,.*?author:([^,]+),.*?title:"([^"]+)",.*?cover:"([^"]+)"/g;
    
    let match;
    let bookCount = 0;
    
    while ((match = bookPattern.exec(bookEntitiesMatch[1])) !== null) {
      const bookId = match[1];
      const authorParam = match[2];
      const title = match[3];
      const cover = match[4].replace(/\\u002F/g, '/');
      
      // 处理作者参数引用
      let author = authorParam;
      if (authorParam.length === 1 && /[a-z]/.test(authorParam)) {
        const paramIndex = authorParam.charCodeAt(0) - 'a'.charCodeAt(0);
        if (paramIndex >= 0 && paramIndex < params.length) {
          author = params[paramIndex].replace(/"/g, '');
        }
      } else if (authorParam.startsWith('"') && authorParam.endsWith('"')) {
        author = authorParam.substring(1, authorParam.length - 1);
      }
      
      // 同时用实体ID和参数引用作为键存储书籍信息
      bookMap.set(bookId, { title, author, cover });
      bookCount++;
    }
    
    // 6. 按照bookIds的顺序返回书籍，使用参数映射
    const orderedBooks = [];
    
    for (const paramId of bookIds) {
      // 如果是参数引用，使用映射查找实际ID
      const actualId = paramToIdMap.get(paramId);
      
      if (actualId) {
        const book = bookMap.get(actualId);
        if (book) {
          orderedBooks.push(book);
          continue;
        }
      }
      
      // 尝试直接使用paramId查找
      const directBook = bookMap.get(paramId);
      if (directBook) {
        orderedBooks.push(directBook);
      }
    }
    
    // 如果没有找到任何书籍，返回所有书籍
    if (orderedBooks.length === 0) {
      return Array.from(bookMap.values());
    }
    
    return orderedBooks;
  } catch (error) {
    console.error('从脚本提取书籍数据时出错:', error);
    return null;
  }
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const listId = url.searchParams.get('listId');  // 从查询参数获取微信读书书单ID
  
  if (!listId) {
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

        // 使用带超时的fetch发送请求
        const response = await fetchWithTimeout(wereadUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          }
        }, REQUEST_TIMEOUT);
        
        if (!response.ok) {
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
        
        // 检查是否包含验证码页面的特征
        if (html.includes('验证码') || html.includes('captcha')) {
          const errorMessage = '请求被微信读书限制，需要验证码';
          console.error(errorMessage);
          
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
            link: `https://weread.qq.com/web/search/books?keyword=${encodeURIComponent(book.title)}`
          }));
          
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
              books.push({
                title,
                author,
                imageUrl,
                link: `https://weread.qq.com/web/search/books?keyword=${encodeURIComponent(title)}`
              });
            }
          } catch (error) {
            console.error('解析书籍时出错:', error);
          }
        });
        
        if (books.length > 0) {
          return new Response(JSON.stringify({ books }), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, s-maxage=300',
              'CDN-Cache-Control': 'public, max-age=300'
            }
          });
        } else {
          throw new Error('未能从页面中提取书籍数据');
        }
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
          await delay(RETRY_DELAY * retries);
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