import React, { useEffect, useRef, useState } from "react";

interface MediaGridProps {
  type: "movie" | "book";
  title: string;
  doubanId: string;
}

interface MediaItem {
  title: string;
  imageUrl: string;
  link: string;
}

const MediaGrid: React.FC<MediaGridProps> = ({ type, title, doubanId }) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreContent, setHasMoreContent] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 15;
  const mediaListRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);

  // 使用ref来跟踪关键状态，避免闭包问题
  const stateRef = useRef({
    isLoading: false,
    hasMoreContent: true,
    currentPage: 1,
    error: null as string | null,
  });

  // 封装fetch函数但不使用useCallback以避免依赖循环
  const fetchMedia = async (page = 1, append = false) => {
    // 使用ref中的最新状态
    if (
      stateRef.current.isLoading ||
      (!append && !stateRef.current.hasMoreContent) ||
      (append && !stateRef.current.hasMoreContent)
    ) {
      return;
    }

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
      );
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
      // 只有在非追加模式下才清空已加载的内容
      if (!append) {
        setItems([]);
      }
    } finally {
      // 重置加载状态
      setIsLoading(false);
      stateRef.current.isLoading = false;
    }
  };

  // 处理滚动事件
  const handleScroll = () => {
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
      fetchMedia(stateRef.current.currentPage + 1, true);
    }
  };

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

  // 组件初始化和依赖变化时重置
  useEffect(() => {
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

    // 加载第一页数据
    fetchMedia(1, false);

    // 管理滚动事件
    const scrollListener = handleScroll;

    // 移除任何现有监听器
    window.removeEventListener("scroll", scrollListener);

    // 添加滚动事件监听器 - 使用passive: true可提高滚动性能
    window.addEventListener("scroll", scrollListener, { passive: true });

    // 创建一个IntersectionObserver作为备选检测方案
    const observerOptions = {
      root: null,
      rootMargin: "300px",
      threshold: 0.1,
    };

    const intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];

      if (
        entry.isIntersecting &&
        !stateRef.current.isLoading &&
        stateRef.current.hasMoreContent &&
        !stateRef.current.error
      ) {
        fetchMedia(stateRef.current.currentPage + 1, true);
      }
    }, observerOptions);

    // 添加检测底部的元素 - 放在grid容器的后面而不是内部
    const footer = document.createElement("div");
    footer.id = "scroll-detector";
    footer.style.width = "100%";
    footer.style.height = "10px";

    // 确保mediaListRef有父元素
    if (mediaListRef.current && mediaListRef.current.parentElement) {
      // 插入到grid后面而不是内部
      mediaListRef.current.parentElement.insertBefore(
        footer,
        mediaListRef.current.nextSibling,
      );
      intersectionObserver.observe(footer);
    }

    // 初始检查一次，以防内容不足一屏
    const timeoutId = setTimeout(() => {
      if (stateRef.current.hasMoreContent && !stateRef.current.isLoading) {
        scrollListener();
      }
    }, 500);

    // 清理函数
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", scrollListener);
      intersectionObserver.disconnect();
      document.getElementById("scroll-detector")?.remove();
    };
  }, [type, doubanId]); // 只在关键属性变化时执行

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
              fetchMedia(currentPage, false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">{title}</h1>

      <div
        ref={mediaListRef}
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

export default MediaGrid;
