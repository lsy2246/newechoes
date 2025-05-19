import React, { useEffect, useState } from "react";

interface WereadBookListProps {
  listId: string;
}

interface WereadBook {
  title: string;
  author: string;
  imageUrl: string;
  link: string;
}

const WereadBookList: React.FC<WereadBookListProps> = ({ listId }) => {
  const [books, setBooks] = useState<WereadBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取微信读书数据
  const fetchWereadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/weread?listId=${listId}`);
      
      if (!response.ok) {
        // 解析响应内容，获取详细错误信息
        let errorMessage = `获取微信读书数据失败`;
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
          errorMessage = "微信读书接口访问受限，可能是请求过于频繁，请稍后再试";
        } else if (response.status === 404) {
          errorMessage = "未找到相关内容，请检查书单ID是否正确";
        }

        setError(errorMessage);
        setBooks([]);
        return;
      }

      const data = await response.json();

      if (data.books && Array.isArray(data.books)) {
        setBooks(data.books);
      } else {
        setBooks([]);
      }
    } catch (error) {
      setError("获取微信读书数据失败: " + (error instanceof Error ? error.message : "未知错误"));
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 组件初始化时获取数据
  useEffect(() => {
    fetchWereadData();
  }, [listId]);

  // 错误提示组件
  const ErrorMessage = () => {
    if (!error) return null;

    return (
      <div className="text-center bg-red-50 p-4 rounded-md">
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
            onClick={fetchWereadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            重试
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {error ? (
        <ErrorMessage />
      ) : isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {books.length > 0 ? (
            books.map((book, index) => (
              <div
                key={`${book.title}-${index}`}
                className="bg-white rounded-lg overflow-hidden shadow-md"
              >
                <div className="relative pb-[150%] overflow-hidden">
                  <img
                    src={book.imageUrl}
                    alt={book.title}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <h3 className="font-bold text-white text-sm line-clamp-2">
                      <a
                        href={book.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {book.title}
                      </a>
                    </h3>
                    <p className="text-white/80 text-xs mt-1 line-clamp-1">
                      {book.author}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center">
              暂无图书数据
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WereadBookList; 