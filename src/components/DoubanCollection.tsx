import React, { useEffect, useRef, useState, useCallback } from "react";

interface DoubanCollectionProps {
  type: "movie" | "book";
  doubanId: string;
  className?: string; // 添加可选的className属性以提高灵活性
}

interface DoubanItem {
  title: string;
  imageUrl: string;
  link: string;
}

const DoubanCollection: React.FC<DoubanCollectionProps> = ({ type, doubanId, className = '' }) => {
  const [items, setItems] = useState<DoubanItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreContent, setHasMoreContent] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 15;
  const contentListRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollDetectorRef = useRef<HTMLDivElement | null>(null);
  // 添加一个 ref 来标记组件是否已挂载
  const isMountedRef = useRef<boolean>(true);

  // 使用ref来跟踪关键状态，避免闭包问题
  const stateRef = useRef({
    isLoading: false,
    hasMoreContent: true,
    currentPage: 1,
    error: null as string | null,
  });

  // 封装fetch函数使用useCallback避免重新创建
  const fetchDoubanData = useCallback(async (page = 1, append = false) => {
    // 使用ref中的最新状态
    if (
      stateRef.current.isLoading ||
      (!append && !stateRef.current.hasMoreContent) ||
      (append && !stateRef.current.hasMoreContent)
    ) {
      return;
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    // 更新状态和ref
    setIsLoading(true);
    stateRef.current.isLoading = true;

    // 只在首次加载时清除错误
    if (!append) {
      setError(null);
      stateRef.current.error = null;
    }

    const start = (page - 1) * itemsPerPage;
    try {
      const response = await fetch(
        `/api/douban?type=${type}&start=${start}&doubanId=${doubanId}`,
        { signal: abortControllerRef.current.signal }
      );
      
      // 检查组件是否已卸载，如果卸载则不继续处理
      if (!isMountedRef.current) {
        return;
      }
      
      if (!response.ok) {
        // 解析响应内容，获取详细错误信息
        let errorMessage = `获取${type === "movie" ? "电影" : "图书"}数据失败`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
            if (errorData.message) {
              errorMessage += `: ${errorData.message}`;
            }
          }
        } catch (e) {
          // 无法解析JSON，使用默认错误信息
        }

        // 针对不同错误提供更友好的提示
        if (response.status === 403) {
          errorMessage = "豆瓣接口访问受限，可能是请求过于频繁，请稍后再试";
        } else if (response.status === 404) {
          // 对于404错误，如果是追加模式，说明已经到了最后一页，设置hasMoreContent为false
          if (append) {
            setHasMoreContent(false);
            stateRef.current.hasMoreContent = false;
            setIsLoading(false);
            stateRef.current.isLoading = false;
            return; // 直接返回，不设置错误，不清空已有数据
          } else {
            errorMessage = "未找到相关内容，请检查豆瓣ID是否正确";
          }
        }

        // 设置错误状态和ref
        setError(errorMessage);
        stateRef.current.error = errorMessage;

        // 只有非追加模式才清空数据
        if (!append) {
          setItems([]);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // 再次检查组件是否已卸载
      if (!isMountedRef.current) {
        return;
      }

      if (data.items.length === 0) {
        // 如果返回的项目为空，则认为已经没有更多内容
        setHasMoreContent(false);
        stateRef.current.hasMoreContent = false;
        if (!append) {
          setItems([]);
        }
      } else {
        if (append) {
          setItems((prev) => {
            const newItems = [...prev, ...data.items];
            return newItems;
          });
        } else {
          setItems(data.items);
        }
        // 更新页码状态和ref
        setCurrentPage(data.pagination.current);
        stateRef.current.currentPage = data.pagination.current;

        // 更新是否有更多内容的状态和ref
        const newHasMoreContent = data.pagination.hasNext;
        setHasMoreContent(newHasMoreContent);
        stateRef.current.hasMoreContent = newHasMoreContent;
      }
    } catch (error) {
      // 检查组件是否已卸载
      if (!isMountedRef.current) {
        return;
      }
      
      // 如果是取消的请求，不显示错误
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('请求被取消', error.message);
        // 如果是取消请求，重置加载状态但不显示错误
        setIsLoading(false);
        stateRef.current.isLoading = false;
        return;
      }
      
      // 只有在非追加模式下才清空已加载的内容
      if (!append) {
        setItems([]);
      }
    } finally {
      // 检查组件是否已卸载
      if (isMountedRef.current) {
        // 重置加载状态
        setIsLoading(false);
        stateRef.current.isLoading = false;
      }
    }
  }, [type, doubanId]);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    // 获取关键滚动值
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollPosition = scrollY + windowHeight;
    const threshold = documentHeight - 300;

    // 限制滚动日志频率，每秒最多输出一次
    const now = Date.now();
    if (now - lastScrollTime.current < 1000) {
      return;
    }
    lastScrollTime.current = now;

    // 使用ref中的最新状态来检查
    if (
      stateRef.current.isLoading ||
      !stateRef.current.hasMoreContent ||
      stateRef.current.error
    ) {
      return;
    }

    // 当滚动到距离底部300px时加载更多
    if (scrollPosition >= threshold) {
      fetchDoubanData(stateRef.current.currentPage + 1, true);
    }
  }, [fetchDoubanData]);

  // 更新ref值以跟踪状态变化
  useEffect(() => {
    stateRef.current.isLoading = isLoading;
  }, [isLoading]);

  useEffect(() => {
    stateRef.current.hasMoreContent = hasMoreContent;
  }, [hasMoreContent]);

  useEffect(() => {
    stateRef.current.currentPage = currentPage;
  }, [currentPage]);

  useEffect(() => {
    stateRef.current.error = error;
  }, [error]);

  // 设置和清理IntersectionObserver
  const setupIntersectionObserver = useCallback(() => {
    // 清理旧的Observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    
    // 清理旧的检测元素
    if (scrollDetectorRef.current) {
      scrollDetectorRef.current.remove();
      scrollDetectorRef.current = null;
    }

    // 创建新的IntersectionObserver
    const observerOptions = {
      root: null,
      rootMargin: "300px",
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const entry = entries[0];

      if (
        entry.isIntersecting &&
        !stateRef.current.isLoading &&
        stateRef.current.hasMoreContent &&
        !stateRef.current.error
      ) {
        fetchDoubanData(stateRef.current.currentPage + 1, true);
      }
    }, observerOptions);

    // 创建并添加检测底部的元素
    const footer = document.createElement("div");
    footer.id = "scroll-detector";
    footer.style.width = "100%";
    footer.style.height = "10px";
    scrollDetectorRef.current = footer;

    // 确保contentListRef有父元素
    if (contentListRef.current && contentListRef.current.parentElement) {
      // 插入到grid后面而不是内部
      contentListRef.current.parentElement.insertBefore(
        footer,
        contentListRef.current.nextSibling,
      );
      observerRef.current.observe(footer);
    }
  }, [fetchDoubanData]);

  // 组件初始化和依赖变化时重置
  useEffect(() => {
    // 设置组件挂载状态
    isMountedRef.current = true;
    
    // 重置状态
    setCurrentPage(1);
    stateRef.current.currentPage = 1;

    setHasMoreContent(true);
    stateRef.current.hasMoreContent = true;

    setError(null);
    stateRef.current.error = null;

    setIsLoading(false);
    stateRef.current.isLoading = false;

    // 清空列表
    setItems([]);

    // 取消可能存在的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 加载第一页数据
    fetchDoubanData(1, false);

    // 设置滚动事件监听器
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // 设置IntersectionObserver
    setupIntersectionObserver();

    // 初始检查一次，以防内容不足一屏
    const timeoutId = setTimeout(() => {
      if (stateRef.current.hasMoreContent && !stateRef.current.isLoading) {
        handleScroll();
      }
    }, 500);

    // 清理函数
    return () => {
      // 标记组件已卸载
      isMountedRef.current = false;
      
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
      
      // 清理IntersectionObserver
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      
      // 清理scroll detector元素
      if (scrollDetectorRef.current) {
        scrollDetectorRef.current.remove();
        scrollDetectorRef.current = null;
      }
      
      // 取消正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [type, doubanId, handleScroll, fetchDoubanData, setupIntersectionObserver]);

  // 错误提示组件
  const ErrorMessage = () => {
    if (!error) return null;

    return (
      <div className="col-span-full text-center bg-red-50 p-4 rounded-md">
        <div className="flex flex-col items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-red-500 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-medium text-red-800">访问错误</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button
            onClick={() => {
              // 重置错误和加载状态
              setError(null);
              stateRef.current.error = null;

              // 允许再次加载
              setHasMoreContent(true);
              stateRef.current.hasMoreContent = true;

              // 重新获取当前页
              fetchDoubanData(currentPage, false);
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            重试
          </button>
        </div>
      </div>
    );
  };

  // 没有更多内容提示
  const EndMessage = () => {
    if (isLoading || !items.length || error) return null;

    return (
      <div className="text-center py-8">
        <p className="text-gray-600">已加载全部内容</p>
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        ref={contentListRef}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      >
        {error && items.length === 0 ? (
          <ErrorMessage />
        ) : items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl"
            >
              <div className="relative pb-[150%] overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="absolute top-0 left-0 w-full h-full object-cover hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="font-bold text-white text-sm line-clamp-2">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-300"
                    >
                      {item.title}
                    </a>
                  </h3>
                </div>
              </div>
            </div>
          ))
        ) : !isLoading ? (
          <div className="col-span-full text-center">
            暂无{type === "movie" ? "电影" : "图书"}数据
          </div>
        ) : null}
      </div>

      {error && items.length > 0 && (
        <div className="mt-4">
          <ErrorMessage />
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-gray-600">加载更多...（第{currentPage}页）</p>
        </div>
      )}

      {!hasMoreContent && items.length > 0 && !isLoading && <EndMessage />}
    </div>
  );
};

export default DoubanCollection;
