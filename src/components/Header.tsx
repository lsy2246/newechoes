import { useEffect, useState, useRef } from 'react';
import { SITE_NAME, NAV_LINKS } from '@/consts.ts';
import { ThemeToggle } from './ThemeToggle';
import '@/styles/header.css';


// 文章对象类型定义
interface Article {
  id: string;
  title: string;
  date: string | Date;
  summary?: string;
  tags?: string[];
  image?: string;
  content?: string;
}

export default function Header() {
  // 状态定义
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isArticlesLoaded, setIsArticlesLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [desktopSearchFocused, setDesktopSearchFocused] = useState(false);

  // 获取当前路径 (使用window.location.pathname)
  const [pathname, setPathname] = useState('/');
  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  // 移除结尾的斜杠以统一路径格式
  const normalizedPath = pathname?.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // 引用
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const desktopResultsRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理滚动效果
  useEffect(() => {
    const scrollThreshold = 50;

    function updateHeaderBackground() {
      if (window.scrollY > scrollThreshold) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    }

    // 初始检查
    updateHeaderBackground();

    // 添加滚动事件监听
    window.addEventListener('scroll', updateHeaderBackground);

    // 清理
    return () => window.removeEventListener('scroll', updateHeaderBackground);
  }, []);

  // 搜索节流函数
  function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function(this: any, ...args: Parameters<T>): void {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // 获取文章数据
  async function fetchArticles() {
    if (isArticlesLoaded && articles.length > 0) return;
    
    try {
      const response = await fetch('/api/search');
      if (!response.ok) {
        throw new Error('获取文章数据失败');
      }
      const data = await response.json();
      setArticles(data);
      setIsArticlesLoaded(true);
    } catch (error) {
      console.error('获取文章失败:', error);
    }
  }

  // 高亮文本中的匹配部分
  function highlightText(text: string, query: string): string {
    if (!text || !query.trim()) return text;
    
    // 转义正则表达式中的特殊字符
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    return text.replace(regex, '<mark class="bg-yellow-100 dark:bg-yellow-900/30 text-gray-900 dark:text-gray-100 px-0.5 rounded">$1</mark>');
  }

  // 搜索文章逻辑
  const debouncedSearch = debounce((query: string) => {
    setSearchQuery(query);
  }, 300);

  // 点击页面其他区域关闭搜索结果
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        desktopSearchRef.current && 
        desktopResultsRef.current && 
        !desktopSearchRef.current.contains(event.target as Node) && 
        !desktopResultsRef.current.contains(event.target as Node)
      ) {
        setDesktopSearchFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 处理ESC键
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDesktopSearchFocused(false);
        setMobileSearchOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 搜索结果处理
  const getFilteredArticles = () => {
    if (!searchQuery.trim()) return [];
    
    const lowerQuery = searchQuery.toLowerCase();
    
    return articles
      .filter((article: Article) => {
        const title = article.title.toLowerCase();
        const tags = article.tags ? article.tags.map((tag: string) => tag.toLowerCase()) : [];
        const summary = article.summary ? article.summary.toLowerCase() : '';
        const content = article.content ? article.content.toLowerCase() : '';
        
        return title.includes(lowerQuery) || 
               tags.some((tag: string) => tag.includes(lowerQuery)) ||
               summary.includes(lowerQuery) ||
               content.includes(lowerQuery);
      })
      .sort((a: Article, b: Article) => {
        // 标题匹配优先
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        
        if (aTitle.includes(lowerQuery) && !bTitle.includes(lowerQuery)) {
          return -1;
        }
        if (!aTitle.includes(lowerQuery) && bTitle.includes(lowerQuery)) {
          return 1;
        }
        
        // 内容匹配次之
        const aContent = a.content ? a.content.toLowerCase() : '';
        const bContent = b.content ? b.content.toLowerCase() : '';
        
        if (aContent.includes(lowerQuery) && !bContent.includes(lowerQuery)) {
          return -1;
        }
        if (!aContent.includes(lowerQuery) && bContent.includes(lowerQuery)) {
          return 1;
        }
        
        // 日期排序
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      })
      .slice(0, 10); // 限制结果数量
  };

  // 生成搜索结果列表项
  const renderSearchResults = () => {
    const filteredArticles = getFilteredArticles();
    if (filteredArticles.length === 0) {
      return (
        <div className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
          没有找到相关文章
        </div>
      );
    }

    return (
      <ul className="py-2">
        {filteredArticles.map(article => {
          return (
            <li key={article.id} className="group">
              <a href={`/articles/${article.id}`} className="block px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700/70">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400"
                  dangerouslySetInnerHTML={{ __html: highlightText(article.title, searchQuery) }}
                ></h4>
                
                {article.summary && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1"
                    dangerouslySetInnerHTML={{ __html: highlightText(article.summary, searchQuery) }}
                  ></p>
                )}
                
                {article.tags && article.tags.length > 0 && (
                  <div className="mt-2 flex items-center flex-wrap gap-1">
                    {article.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="inline-block text-2xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700/70 text-gray-600 dark:text-gray-400 rounded">
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        +{article.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    );
  };

  // 准备样式类
  const headerBgClasses = `absolute inset-0 bg-gray-50/95 dark:bg-dark-bg/95 ${
    scrolled ? 'scrolled' : ''
  }`;

  return (
    <header className="fixed w-full top-0 z-50" id="main-header">
      <div className={headerBgClasses} id="header-bg"></div>
      <nav className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo 部分 */}
            <div className="flex items-center">
              <a href="/" className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent hover:from-primary-500 hover:to-primary-300 dark:from-primary-400 dark:to-primary-200 dark:hover:from-primary-300 dark:hover:to-primary-100">
                {SITE_NAME}
              </a>
            </div>

            {/* 导航链接 */}
            <div className="hidden md:flex md:items-center md:space-x-8">
              {/* 桌面端搜索框 */}
              <div className="relative">
                <input
                  type="text"
                  id="desktop-search"
                  ref={desktopSearchRef}
                  className="w-48 pl-10 pr-4 py-1.5 rounded-full text-sm text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/40 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-800 focus:border-primary-300 dark:focus:border-primary-600"
                  placeholder="搜索文章..."
                  onFocus={() => {
                    setDesktopSearchFocused(true);
                    fetchArticles();
                  }}
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* 搜索结果容器 */}
                <div 
                  ref={desktopResultsRef}
                  className={`absolute top-full left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-lg bg-white/95 dark:bg-gray-800/95 shadow-md border border-gray-200/70 dark:border-gray-700/70 backdrop-blur-sm z-50 ${
                    desktopSearchFocused ? '' : 'hidden'
                  }`}
                >
                  {renderSearchResults()}
                </div>
              </div>

              {/* 导航链接 */}
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    normalizedPath === (link.href === '/' ? '' : link.href)
                      ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-b-2 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  {link.text}
                </a>
              ))}
              <ThemeToggle />
            </div>

            {/* 移动端菜单按钮 */}
            <div className="flex items-center md:hidden">
              {/* 移动端搜索按钮 */}
              <button 
                type="button" 
                className="inline-flex items-center justify-center p-2 rounded-md text-secondary-400 dark:text-secondary-500 hover:text-secondary-500 dark:hover:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-dark-card focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 mr-2"
                aria-expanded={mobileSearchOpen}
                aria-label="搜索"
                onClick={() => {
                  setMobileSearchOpen(true);
                  setTimeout(() => {
                    mobileSearchRef.current?.focus();
                  }, 100);
                  fetchArticles();
                }}
              >
                <span className="sr-only">搜索</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* 移动端菜单按钮 */}
              <button 
                type="button" 
                className="inline-flex items-center justify-center p-2 rounded-md text-secondary-400 dark:text-secondary-500 hover:text-secondary-500 dark:hover:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-dark-card focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                id="mobile-menu-button"
                aria-expanded={mobileMenuOpen}
                aria-label="打开菜单"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">打开菜单</span>
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 移动端搜索面板 */}
        {mobileSearchOpen && (
          <div className="md:hidden fixed inset-x-0 top-16 p-4 bg-white dark:bg-gray-800 shadow-md z-50 border-t border-gray-200 dark:border-gray-700 show">
            <div className="relative">
              <input
                type="text"
                ref={mobileSearchRef}
                className="w-full pl-10 pr-10 py-2 rounded-full text-sm text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/40 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-800 focus:border-primary-300 dark:focus:border-primary-600"
                placeholder="搜索文章..."
                onChange={(e) => debouncedSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="关闭搜索"
                onClick={() => setMobileSearchOpen(false)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 移动端搜索结果 */}
            <div className={`mt-3 max-h-80 overflow-y-auto rounded-lg bg-white/95 dark:bg-gray-800/95 shadow-md border border-gray-200/70 dark:border-gray-700/70 backdrop-blur-sm ${searchQuery ? '' : 'hidden'}`}>
              {renderSearchResults()}
            </div>
          </div>
        )}

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-16 z-40" id="mobile-menu">
            <div className="backdrop-blur-[6px] bg-white/80 dark:bg-gray-800/80 shadow-md">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                <div className="grid gap-1">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`flex items-center px-3 py-3 rounded-lg text-base font-medium ${
                        normalizedPath === (link.href === '/' ? '' : link.href)
                          ? 'text-white bg-primary-600 dark:bg-primary-500 shadow-sm'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/70'
                      }`}
                    >
                      {link.text}
                    </a>
                  ))}
                  <div 
                    className="mt-2 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 rounded-lg px-3 py-2"
                    onClick={(e) => {
                      const themeToggleButton = e.currentTarget.querySelector('[role="button"]');
                      const target = e.target as HTMLElement;
                      if (themeToggleButton instanceof HTMLElement && target !== themeToggleButton && !themeToggleButton.contains(target)) {
                        themeToggleButton.click();
                      }
                    }}
                  >
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">切换主题</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
} 