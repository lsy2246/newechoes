import { useEffect, useState, useCallback, useRef } from 'react';

export function ThemeToggle({ height = 16, width = 16, fill = "currentColor", className = "" }) {
  // 使用null作为初始状态，表示尚未确定主题
  const [theme, setTheme] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 获取系统主题
  const getSystemTheme = useCallback(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // 在客户端挂载后再确定主题
  useEffect(() => {
    setMounted(true);
    
    // 从 localStorage 或 document.documentElement.dataset.theme 获取主题
    const savedTheme = localStorage.getItem('theme');
    const rootTheme = document.documentElement.dataset.theme;
    const systemTheme = getSystemTheme();
    
    // 优先使用已保存的主题，其次是文档根元素的主题，最后是系统主题
    const initialTheme = savedTheme || rootTheme || systemTheme;
    setTheme(initialTheme);
    
    // 确保文档根元素的主题与状态一致
    document.documentElement.dataset.theme = initialTheme;
    
    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      // 只有当主题设置为跟随系统时才更新主题
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.dataset.theme = newTheme;
      }
    };
    
    mediaQuery.addEventListener('change', handleMediaChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      
      // 清理可能的超时
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [getSystemTheme]);

  // 当主题改变时更新 DOM 和 localStorage
  useEffect(() => {
    if (!mounted || theme === null) return;
    
    document.documentElement.dataset.theme = theme;
    
    // 检查是否是跟随系统的主题
    const isSystemTheme = theme === getSystemTheme();
    
    if (isSystemTheme) {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted, getSystemTheme]);

  const toggleTheme = useCallback(() => {
    if (transitioning) return; // 避免快速连续点击
    
    setTransitioning(true);
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    
    // 添加300ms的防抖，避免快速切换
    transitionTimeoutRef.current = setTimeout(() => {
      setTransitioning(false);
    }, 300);
  }, [transitioning]);

  // 在客户端挂载前，返回一个空的占位符
  if (!mounted || theme === null) {
    return (
      <div 
        className={`inline-flex items-center justify-center h-8 w-8 cursor-pointer rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 ${className}`}
      >
        <span className="sr-only">加载主题切换按钮...</span>
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center justify-center h-8 w-8 cursor-pointer rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 ${transitioning ? 'pointer-events-none opacity-80' : ''} ${className}`}
      onClick={toggleTheme}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      }}
      aria-label={`切换到${theme === 'dark' ? '浅色' : '深色'}模式`}
    >
      {theme === 'dark' ? (
        <svg
          style={{ height: `${height}px`, width: `${width}px` }}
          fill={fill}
          viewBox="0 0 16 16"
          className="hover:scale-110"
          aria-hidden="true"
        >
          <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
        </svg>
      ) : (
        <svg
          style={{ height: `${height}px`, width: `${width}px` }}
          fill={fill}
          viewBox="0 0 16 16"
          className="hover:scale-110"
          aria-hidden="true"
        >
          <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
        </svg>
      )}
    </div>
  );
} 