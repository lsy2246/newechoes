import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactMasonryCss from 'react-masonry-css';

interface DoubanItem {
  imageUrl: string;
  title: string;
  subtitle: string;
  link: string;
  intro: string;
  rating: number;
  date: string;
}

interface Pagination {
  current: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface DoubanCollectionProps {
  type: 'movie' | 'book';
  doubanId?: string; // 可选参数，使其与 MediaGrid 保持一致
  className?: string; // 添加自定义类名
}

const DoubanCollection: React.FC<DoubanCollectionProps> = ({ type, doubanId, className = '' }) => {
  const [items, setItems] = useState<DoubanItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ current: 1, total: 1, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPageChanging, setIsPageChanging] = useState(false);
  
  // 使用 ref 避免竞态条件
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // 标题文本
  const titleText = useMemo(() => 
    type === 'movie' ? '观影记录' : '读书记录', 
  [type]);

  // 加载动画组件
  const LoadingSpinner = useCallback(() => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ), []);

  // 公共标题组件
  const Title = useCallback(() => (
    <h2 className="text-2xl font-bold mb-6 text-primary-700 dark:text-primary-400">
      {titleText}
    </h2>
  ), [titleText]);

  const fetchData = useCallback(async (start = 0) => {
    // 如果已经有一个请求在进行中，取消它
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    const params = new URLSearchParams();
    params.append('type', type);
    params.append('start', start.toString());
    
    if (doubanId) {
      params.append('doubanId', doubanId);
    }
    
    const url = `/api/douban?${params.toString()}`;
    
    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      });
      
      // 如果组件已卸载，不继续处理
      if (!isMountedRef.current) return;
      
      if (!response.ok) {
        throw new Error(`获取数据失败：状态码 ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setItems(data.items || []);
      setPagination(data.pagination || { current: 1, total: 1, hasNext: false, hasPrev: false });
    } catch (err) {
      // 如果是取消请求的错误，不设置错误状态
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      // 如果组件已卸载，不设置状态
      if (!isMountedRef.current) return;
      
      console.error('获取豆瓣数据失败:', err);
      setError(err instanceof Error ? err.message : '未知错误');
      setItems([]);
    } finally {
      // 如果组件已卸载，不设置状态
      if (!isMountedRef.current) return;
      
      setLoading(false);
      setIsPageChanging(false);
    }
  }, [type, doubanId]);

  useEffect(() => {
    // 组件挂载时设置标记
    isMountedRef.current = true;
    
    fetchData();
    
    // 组件卸载时清理
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const handlePageChange = useCallback((page: number) => {
    if (isPageChanging) return;
    
    setIsPageChanging(true);
    
    // 计算新页面的起始项
    const start = (page - 1) * 15;
    
    // 更新分页状态
    setPagination(prev => ({
      ...prev,
      current: page
    }));
    
    // 获取新页面的数据
    fetchData(start);
  }, [fetchData, isPageChanging]);

  const renderStars = useCallback((rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg 
            key={star} 
            className={`w-4 h-4 ${star <= rating ? 'text-accent-400' : 'text-secondary-300 dark:text-secondary-600'}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  }, []);

  const breakpointColumnsObj = {
    default: 3,
    1100: 2,
    700: 1
  };
  
  // 渲染内容的容器
  const Container = useCallback(({ children }: { children: React.ReactNode }) => (
    <div className={`douban-collection ${className}`}>
      <Title />
      {children}
    </div>
  ), [className, Title]);

  // 加载中状态
  if (loading && items.length === 0) {
    return (
      <Container>
        <div className="flex justify-center items-center p-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="ml-2 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </Container>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Container>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>错误: {error}</p>
          </div>
          <button 
            onClick={() => fetchData()} 
            className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-700 dark:text-red-300 rounded"
          >
            重试
          </button>
        </div>
      </Container>
    );
  }

  // 数据为空状态
  if (items.length === 0) {
    return (
      <Container>
        <div className="text-center p-8 text-gray-500 dark:text-gray-400">
          暂无{type === 'movie' ? '观影' : '读书'}记录
        </div>
      </Container>
    );
  }

  // 渲染分页按钮
  const renderPaginationButton = useCallback((
    direction: 'prev' | 'next', 
    onClick: () => void, 
    disabled: boolean
  ) => {
    const buttonText = direction === 'prev' ? '上一页' : '下一页';
    
    const buttonClass = `px-4 py-2 rounded ${disabled 
      ? 'bg-secondary-200 dark:bg-secondary-700 text-secondary-500 dark:text-secondary-500 cursor-not-allowed' 
      : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600'}`;
      
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={buttonClass}
        aria-label={buttonText}
      >
        {isPageChanging ? (
          <span className="flex items-center">
            <LoadingSpinner />
            加载中
          </span>
        ) : buttonText}
      </button>
    );
  }, [isPageChanging, LoadingSpinner]);

  return (
    <Container>
      <ReactMasonryCss
        breakpointCols={breakpointColumnsObj}
        className="flex -ml-4 w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {items.map((item, index) => (
          <div 
            key={`${item.title}-${index}`} 
            className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg"
          >
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
              <div className="relative pb-[140%] overflow-hidden">
                <img 
                  src={item.imageUrl} 
                  alt={item.title} 
                  className="absolute inset-0 w-full h-full object-cover hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjIyNCIgdmlld0JveD0iMCAwIDE2MCAyMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3QgeD0iMCIgeT0iMCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSIyMjQiIGZpbGw9IiNmMWYxZjEiLz48dGV4dCB4PSI4MCIgeT0iMTEyIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPuWbuuWumuWbvueJh+acquivu+WPlzwvdGV4dD48L3N2Zz4=';
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1 line-clamp-1 text-primary-800 dark:text-primary-300">{item.title}</h3>
                {item.subtitle && <p className="text-secondary-600 dark:text-secondary-400 text-sm mb-2 line-clamp-1">{item.subtitle}</p>}
                <div className="flex justify-between items-center mb-2">
                  {renderStars(item.rating)}
                  <span className="text-sm text-secondary-500 dark:text-secondary-400">{item.date}</span>
                </div>
                <p className="text-secondary-700 dark:text-secondary-300 text-sm line-clamp-3">{item.intro}</p>
              </div>
            </a>
          </div>
        ))}
      </ReactMasonryCss>

      {/* 分页 */}
      {pagination.total > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          {renderPaginationButton(
            'prev',
            () => handlePageChange(pagination.current - 1),
            !pagination.hasPrev || isPageChanging
          )}
          
          <span className="px-4 py-2 bg-secondary-100 dark:bg-secondary-800 rounded">
            {pagination.current} / {pagination.total}
          </span>
          
          {renderPaginationButton(
            'next',
            () => handlePageChange(pagination.current + 1),
            !pagination.hasNext || isPageChanging
          )}
        </div>
      )}
    </Container>
  );
};

export default DoubanCollection;