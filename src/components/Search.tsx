import React, { useState, useEffect, useRef, useCallback } from "react";

// 类型定义
interface SearchResult {
  items: SearchResultItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  time_ms: number;
  query: string;
  suggestions: SearchSuggestion[];
}

interface SearchResultItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  score: number;
  heading_tree?: HeadingNode;
  page_type: string;
}

// 建议类型
type SuggestionType = 'completion' | 'correction';

interface SearchSuggestion {
  text: string;
  suggestion_type: SuggestionType;
  matched_text: string;
  suggestion_text: string;
}

// 标题树结构
interface HeadingNode {
  id: string;
  text: string;
  level: number;
  content?: string; // 与Rust端匹配
  matched_terms?: string[]; // 与Rust端匹配
  children: HeadingNode[];
}

interface SearchWasm {
  search_articles: (indexData: Uint8Array, requestJson: string) => string;
  default?: () => Promise<any>;
}

interface SearchProps {
  placeholder?: string;
  maxResults?: number;
}

// 加载状态类型
type LoadingStatus = 'idle' | 'loading_index' | 'loading_search' | 'loading_more' | 'error' | 'success';

// 内联建议相关状态类型
interface InlineSuggestionState {
  text: string;
  visible: boolean;
  caretPosition: number;
  selection: {start: number, end: number};
  type: SuggestionType; // 建议类型：completion 或 correction
  matchedText: string;  // 已匹配部分
  suggestionText: string; // 建议部分
}

const Search: React.FC<SearchProps> = ({
  placeholder = "搜索文章...",
  maxResults = 10,
}) => {
  // 状态
  const [query, setQuery] = useState<string>("");
  
  // 加载状态合并为一个对象
  const [loadingState, setLoadingState] = useState<{
    status: LoadingStatus;
    error: string | null;
  }>({
    status: 'idle',
    error: null
  });
  
  const [wasmModule, setWasmModule] = useState<SearchWasm | null>(null);
  const [indexData, setIndexData] = useState<Uint8Array | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // 无限滚动状态
  const [allItems, setAllItems] = useState<SearchResultItem[]>([]);
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(true);
  
  // 合并内联建议相关状态
  const [inlineSuggestion, setInlineSuggestion] = useState<InlineSuggestionState>({
    text: "",
    visible: false,
    caretPosition: 0,
    selection: {start: 0, end: 0},
    type: 'completion',
    matchedText: "",
    suggestionText: ""
  });
  
  // 添加当前选中建议的索引
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(0);

  // refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inlineSuggestionRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  // 添加 AbortController 引用以取消请求
  const abortControllerRef = useRef<AbortController | null>(null);
  // 添加组件挂载状态引用
  const isMountedRef = useRef<boolean>(true);

  // 辅助函数 - 从loadingState获取各种加载状态 
  const isLoading = loadingState.status === 'loading_search';
  const isLoadingIndex = loadingState.status === 'loading_index';
  const isLoadingMore = loadingState.status === 'loading_more';
  const error = loadingState.error;
  const isIndexLoaded = indexData !== null;

  // 加载 WASM 模块
  useEffect(() => {
    const loadWasmModule = async () => {
      try {
        setLoadingState(prev => ({ ...prev, status: 'loading_index' }));
        
        const wasm = await import("@/assets/wasm/search/search_wasm.js");
        
        if (typeof wasm.default === "function") {
          await wasm.default();
        }
        
        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;
        
        setWasmModule(wasm as unknown as SearchWasm);
      } catch (err) {
        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;
        
        console.error("加载搜索WASM模块失败:", err);
        setLoadingState({
          status: 'error',
          error: `无法加载搜索模块: ${err instanceof Error ? err.message : String(err)}`
        });
      }
    };

    loadWasmModule();
    
    // 组件卸载时清理
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 加载搜索索引
  useEffect(() => {
    if (!wasmModule) return;

    const loadSearchIndex = async () => {
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();
      
      try {
        setLoadingState(prev => ({ ...prev, status: 'loading_index' }));
        
        const response = await fetch("/index/search_index.bin", {
          signal: abortControllerRef.current.signal
        });
        
        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;
        
        if (!response.ok) {
          throw new Error(`获取搜索索引失败: ${response.statusText}`);
        }

        const indexBuffer = await response.arrayBuffer();
        const data = new Uint8Array(indexBuffer);
        
        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;
        
        setIndexData(data);
        setLoadingState(prev => ({ ...prev, status: 'success' }));
      } catch (err) {
        // 检查组件是否仍然挂载
        if (!isMountedRef.current) return;
        
        // 如果是取消的请求，不显示错误
        if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))) {
          return;
        }
        
        console.error("搜索索引加载失败:", err);
        setLoadingState({
          status: 'error',
          error: `无法加载搜索索引: ${err instanceof Error ? err.message : String(err)}`
        });
      }
    };

    loadSearchIndex();
    
    // 组件卸载时清理
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [wasmModule]);

  // 监听窗口大小变化，确保内联建议位置正确
  useEffect(() => {
    const handleResize = () => {
      if (searchInputRef.current && inlineSuggestionRef.current) {
        // 重新计算内联建议的位置
        const inputRect = searchInputRef.current.getBoundingClientRect();
        if (inlineSuggestionRef.current) {
          inlineSuggestionRef.current.style.width = `${inputRect.width}px`;
          inlineSuggestionRef.current.style.height = `${inputRect.height}px`;
        }
      }
    };

    window.addEventListener('resize', handleResize, { passive: false });
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 处理点击外部关闭搜索结果和建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 获取事件目标元素
      const target = event.target as Node;
      
      // 检查是否点击了清除按钮、Tab按钮或其子元素
      const clearButtonEl = document.querySelector('.clear-search-button');
      const tabButtonEl = document.querySelector('.tab-completion-button');
      
      const isClickOnClearButton = clearButtonEl && (clearButtonEl === target || clearButtonEl.contains(target));
      const isClickOnTabButton = tabButtonEl && (tabButtonEl === target || tabButtonEl.contains(target));
      
      // 如果点击了清除按钮或Tab按钮，不做任何操作
      if (isClickOnClearButton || isClickOnTabButton) {
        return;
      }
      
      // 原有的逻辑：点击搜索框和结果区域之外时关闭
      if (
        searchResultsRef.current && 
        !searchResultsRef.current.contains(target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(target)
      ) {
        // 当点击搜索框和结果区域之外时，才隐藏结果
        setShowResults(false);
        setInlineSuggestion(prev => ({ ...prev, visible: false })); // 也隐藏内联建议
      }
    };

    document.addEventListener("mousedown", handleClickOutside, { passive: false });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 确保在组件挂载和更新时内联建议的样式与输入框一致
  useEffect(() => {
    if (inlineSuggestion.visible && inlineSuggestionRef.current && searchInputRef.current) {
      const inputStyle = window.getComputedStyle(searchInputRef.current);
      const suggestionEl = inlineSuggestionRef.current;
      
      // 设置样式以匹配输入框
      suggestionEl.style.fontFamily = inputStyle.fontFamily;
      suggestionEl.style.fontSize = inputStyle.fontSize;
      suggestionEl.style.fontWeight = inputStyle.fontWeight;
      suggestionEl.style.letterSpacing = inputStyle.letterSpacing;
      suggestionEl.style.lineHeight = inputStyle.lineHeight;
    }
  }, [inlineSuggestion.visible, query]);

  // 确保当用户离开页面时清理所有定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  // 内联建议函数 - 整合获取和管理内联建议的逻辑
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    // 如果查询为空或WASM模块未加载，不获取建议
    if (!searchQuery.trim() || !wasmModule || !isIndexLoaded || !indexData) {
      setSuggestions([]);
      setInlineSuggestion(prev => ({ ...prev, visible: false }));
      setSelectedSuggestionIndex(0); // 重置选中索引
      console.log("[建议] 没有符合条件的查询或模块未加载");
      return;
    }

    try {
      // 获取内联建议请求
      const req = {
        query: searchQuery,
        search_type: "autocomplete",
        page_size: 10,
        page: 1
      };

      const result = wasmModule.search_articles(indexData, JSON.stringify(req));
      
      // 检查组件是否仍然挂载
      if (!isMountedRef.current) return;
      
      if (!result || result.trim() === "") {
        setSuggestions([]);
        setInlineSuggestion(prev => ({ ...prev, visible: false }));
        setSelectedSuggestionIndex(0); // 重置选中索引
        return;
      }
      
      const searchResult = JSON.parse(result) as SearchResult;

      
      // 检查组件是否仍然挂载
      if (!isMountedRef.current) return;
      
      // 确保有suggestions字段且是数组
      if (!searchResult?.suggestions || !Array.isArray(searchResult.suggestions) || searchResult.suggestions.length === 0) {
        setSuggestions([]);
        setInlineSuggestion(prev => ({ ...prev, visible: false }));
        setSelectedSuggestionIndex(0); // 重置选中索引
        return;
      }
      
      // 将新的建议格式转换为前端显示所需格式
      const simplifiedSuggestions = searchResult.suggestions.map(sug => sug.text);
      setSuggestions(simplifiedSuggestions);
      
      // 重置选中索引
      setSelectedSuggestionIndex(0);
      
      // 只有当查询不为空并且有建议时才设置内联建议
      const firstSuggestion = searchResult.suggestions[0];
      
      if (firstSuggestion) {
        
        setInlineSuggestion(prev => ({
          ...prev,
          text: firstSuggestion.text,
          visible: true,
          type: firstSuggestion.suggestion_type,
          matchedText: firstSuggestion.matched_text,
          suggestionText: firstSuggestion.suggestion_text
        }));
      } else {
        // 没有任何建议
        setInlineSuggestion(prev => ({ ...prev, visible: false }));
      }
    } catch (err) {
      // 检查组件是否仍然挂载
      if (!isMountedRef.current) return;
      
      console.error("[建议错误]", err);
      setInlineSuggestion(prev => ({ ...prev, visible: false }));
      setSelectedSuggestionIndex(0); // 重置选中索引
    }
  }, [wasmModule, isIndexLoaded, indexData]);

  // 更新输入框光标位置
  const updateCaretPosition = useCallback(() => {
    if (searchInputRef.current) {
      const pos = searchInputRef.current.selectionStart || 0;
      setInlineSuggestion(prev => ({
        ...prev,
        caretPosition: pos,
        selection: {
          start: searchInputRef.current?.selectionStart || 0,
          end: searchInputRef.current?.selectionEnd || 0
        }
      }));
    }
  }, []);

  // 更新选中的建议
  const updateSelectedSuggestion = (index: number) => {
    if (!suggestions || suggestions.length === 0) return;
    
    // 确保索引在合法范围内
    const newIndex = Math.max(0, Math.min(index, suggestions.length - 1));
    setSelectedSuggestionIndex(newIndex);
    
    // 根据索引更新当前显示的建议
    const selectedSuggestion = suggestions[newIndex];
    
    if (selectedSuggestion) {
      // 找到对应的完整建议对象以获取所有属性
      let suggestionType: SuggestionType = 'completion';
      let matchedText = '';
      let suggestionText = '';
      
      // 尝试获取完整的建议对象
      if (searchResults?.suggestions && searchResults.suggestions.length > 0) {
        const fullSuggestion = searchResults.suggestions.find(s => s.text === selectedSuggestion);
        if (fullSuggestion) {
          suggestionType = fullSuggestion.suggestion_type;
          matchedText = fullSuggestion.matched_text;
          suggestionText = fullSuggestion.suggestion_text;
        } else {
          // 如果找不到完整对象，进行基本推断
          matchedText = query;
          suggestionText = selectedSuggestion.slice(query.length);
        }
      } else {
        // 基本推断
        matchedText = query;
        suggestionText = selectedSuggestion.slice(query.length);
      }
      
      setInlineSuggestion(prev => ({
        ...prev,
        text: selectedSuggestion,
        visible: true,
        type: suggestionType,
        matchedText: matchedText,
        suggestionText: suggestionText
      }));
    }
  };

  // 添加关闭移动端搜索面板的函数
  const closeMobileSearchPanel = useCallback(() => {
    // 查找移动端搜索面板
    const mobileSearch = document.getElementById('mobile-search');
    if (mobileSearch && !mobileSearch.classList.contains('hidden')) {
      // 关闭移动端搜索面板
      mobileSearch.classList.add('hidden');
      
      // 更新按钮状态
      const searchButton = document.getElementById('mobile-search-button');
      if (searchButton) {
        searchButton.setAttribute('aria-expanded', 'false');
      }
    }
  }, []);

  // 修改navigateToUrl函数，确保在跳转前关闭界面元素
  const navigateToUrl = useCallback((url: string) => {
    // 先关闭所有相关UI元素
    setShowResults(false);
    setInlineSuggestion(prev => ({ ...prev, visible: false }));
    closeMobileSearchPanel();
    
    // 使用短暂延迟确保UI状态先更新
    setTimeout(() => {
      // 创建一个临时链接元素
      const linkEl = document.createElement('a');
      linkEl.href = url;
      
      // 设置导航同源属性，确保使用内部导航机制
      linkEl.setAttribute('data-astro-prefetch', 'true');
      
      // 添加到DOM中并触发点击
      document.body.appendChild(linkEl);
      linkEl.click();
      
      // 清理临时元素
      setTimeout(() => {
        document.body.removeChild(linkEl);
      }, 100);
    }, 10); // 很短的延迟，只是让UI状态更新
  }, [closeMobileSearchPanel]);

  // 修改handleKeyDown函数中的回车键处理逻辑
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    
    // Tab键处理内联建议补全
    if (e.key === "Tab" && inlineSuggestion.visible && inlineSuggestion.text) {
      e.preventDefault(); // 阻止默认的Tab行为
      e.stopPropagation(); // 防止事件冒泡
      completeInlineSuggestion();
      return;
    }

    // 处理上下箭头切换建议
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && suggestions.length > 0) {
      e.preventDefault(); // 阻止默认的光标移动
      
      // 如果当前没有显示建议，先显示
      if (!inlineSuggestion.visible) {
        setInlineSuggestion(prev => ({ ...prev, visible: true }));
      }
      
      // 根据按键更新选中的建议索引
      if (e.key === "ArrowUp") {
        // 向上移动，索引减1，如果到达顶部则循环到底部
        const newIndex = selectedSuggestionIndex <= 0 ? suggestions.length - 1 : selectedSuggestionIndex - 1;
        updateSelectedSuggestion(newIndex);
      } else {
        // 向下移动，索引加1，如果到达底部则循环到顶部
        const newIndex = selectedSuggestionIndex >= suggestions.length - 1 ? 0 : selectedSuggestionIndex + 1;
        updateSelectedSuggestion(newIndex);
      }
      return;
    }

    // 如果有内联建议并且按下右箭头键且光标在输入的末尾，完成建议
    if (e.key === "ArrowRight" && inlineSuggestion.visible && inlineSuggestion.text) {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
        e.preventDefault();
        completeInlineSuggestion();
        return;
      }
    }

    // 如果按Esc键，清除内联建议
    if (e.key === "Escape") {
      if (inlineSuggestion.visible) {
        e.preventDefault();
        setInlineSuggestion(prev => ({ ...prev, visible: false }));
        return;
      }
      
      // 如果显示搜索结果，则关闭搜索结果
      if (showResults) {
        setShowResults(false);
        return;
      }
    }

    // 回车键处理逻辑
    if (e.key === "Enter") {
      e.preventDefault();
      
      // 情况1: 如果有当前选中的内联建议（推荐或纠正）
      if (inlineSuggestion.visible && inlineSuggestion.text) {
        const suggestionText = inlineSuggestion.text;
        
        // 立即更新搜索框内容和状态
        setQuery(suggestionText);
        if (searchInputRef.current) {
          searchInputRef.current.value = suggestionText;
        }
        
        // 先检查当前搜索结果中是否有完全匹配的结果
        const exactMatchForSuggestion = allItems.find(item => 
          item.title.replace(/<\/?mark>/g, '').toLowerCase() === suggestionText.toLowerCase()
        );
        
        if (exactMatchForSuggestion) {
          // 如果有完全匹配的结果，关闭搜索结果面板并导航
          setShowResults(false);
          setInlineSuggestion(prev => ({ ...prev, visible: false }));
          // 关闭移动端搜索面板
          closeMobileSearchPanel();
          // 使用新的导航函数替代直接修改location
          navigateToUrl(exactMatchForSuggestion.url);
          return;
        }
        
        // 没有完全匹配，先补全建议并导航到第一个结果
        completeInlineSuggestion(true); // 传入true表示需要导航到第一个结果
        return;
      } 
      // 情况2: 如果没有内联建议，但有搜索结果
      else if (allItems.length > 0 && query.trim()) {
        // 尝试找到完全匹配当前查询的结果
        const exactMatch = allItems.find(item => 
          item.title.replace(/<\/?mark>/g, '').toLowerCase() === query.trim().toLowerCase()
        );
        
        if (exactMatch) {
          // 找到完全匹配，关闭搜索结果面板并导航
          setShowResults(false);
          setInlineSuggestion(prev => ({ ...prev, visible: false }));
          // 关闭移动端搜索面板
          closeMobileSearchPanel();
          // 使用新的导航函数替代直接修改location
          navigateToUrl(exactMatch.url);
          return;
        }
        
        // 如果没有完全匹配，但有搜索结果，关闭搜索结果面板并进入第一个结果
        setShowResults(false);
        setInlineSuggestion(prev => ({ ...prev, visible: false }));
        // 关闭移动端搜索面板
        closeMobileSearchPanel();
        // 使用新的导航函数替代直接修改location
        navigateToUrl(allItems[0].url);
        return;
      }
      
      // 如果以上条件都不满足，执行普通搜索
      performSearch(query, false);
    }
  };

  // 处理搜索输入变化，先获取建议，然后执行搜索
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // 清除之前的所有定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // 如果搜索框为空，清除所有结果和建议
    if (!value.trim()) {
      setSearchResults(null);
      setAllItems([]);
      setSuggestions([]);
      setInlineSuggestion(prev => ({ ...prev, visible: false }));
      setSelectedSuggestionIndex(0); // 重置选中索引
      setShowResults(false);
      return;
    }

    // 立即获取内联建议
    fetchSuggestions(value);
    
    // 立即执行搜索，不再使用定时器延迟
    performSearch(value, false);
  };

  // 监控输入框选择状态变化
  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === searchInputRef.current) {
        updateCaretPosition();
      }
    };

    // 使用非被动模式，确保在某些上下文中可以调用preventDefault
    document.addEventListener('selectionchange', handleSelectionChange, { passive: false });
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateCaretPosition]);

  // 执行搜索
  const performSearch = async (searchQuery: string, isLoadMore: boolean = false, shouldNavigateToFirstResult: boolean = false) => {
    if (!wasmModule || !isIndexLoaded || !indexData || !searchQuery.trim()) {
      return;
    }

    // 取消之前的请求（虽然这是WASM调用，不是真正的网络请求，但保持一致性）
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    try {
      const page = isLoadMore ? currentPage : 1;
      
      if (isLoadMore) {
        setLoadingState(prev => ({ ...prev, status: 'loading_more' }));
      } else {
        setLoadingState(prev => ({ ...prev, status: 'loading_search' }));
        setAllItems([]); // 清空之前的所有结果
        setCurrentPage(1); // 重置页码
      }

      const req = {
        query: searchQuery,
        page_size: maxResults,
        page: page,
        search_type: "normal"
      };

      const resultJson = wasmModule.search_articles(indexData, JSON.stringify(req));
      
      // 检查组件是否仍然挂载
      if (!isMountedRef.current) return;
      
      if (!resultJson || resultJson.trim() === "") {
        console.error("返回的搜索结果为空");
        setLoadingState({
          status: 'error',
          error: "搜索返回结果为空"
        });
        return;
      }
      
      const result = JSON.parse(resultJson) as SearchResult;
      
      // 检查组件是否仍然挂载
      if (!isMountedRef.current) return;
      
      // 预处理搜索结果
      for (const item of result.items) {
        if (item.heading_tree) {
          processHeadingTreeContent(item.heading_tree);
        }
      }
      
      // 更新搜索结果状态
      if (isLoadMore) {
        setAllItems(prevItems => [...prevItems, ...result.items]);
      } else {
        setAllItems(result.items);
      }
      
      setSearchResults(result);
      setShowResults(true);
      
      // 检查是否还有更多页
      const hasMore = page < result.total_pages;
      setHasMoreResults(hasMore);
      
      // 如果是加载更多，则更新页码
      if (isLoadMore && hasMore) {
        setCurrentPage(page + 1);
      }
      
      // 更新加载状态
      setLoadingState(prev => ({ ...prev, status: 'success' }));
      
      // 如果需要导航到第一个结果，并且有结果
      if (shouldNavigateToFirstResult && result.items.length > 0) {
        // 关闭移动端搜索面板
        closeMobileSearchPanel();
        // 使用新的导航函数替代直接修改location
        navigateToUrl(result.items[0].url);
      }
    } catch (err) {
      // 检查组件是否仍然挂载
      if (!isMountedRef.current) return;
      
      console.error("搜索执行失败:", err);
      setLoadingState({
        status: 'error',
        error: `搜索执行时出错: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  // 自动补全内联建议 - 不使用useCallback，避免循环依赖
  const completeInlineSuggestion = (shouldNavigateToFirstResult = false) => {
    if (inlineSuggestion.visible && inlineSuggestion.text) {
      // 保存建议文本
      const textToComplete = inlineSuggestion.text;
      
      // 立即更新搜索框内容和状态
      setQuery(textToComplete);
      if (searchInputRef.current) {
        searchInputRef.current.value = textToComplete;
      }
      
      // 清除内联建议状态
      setInlineSuggestion({
        text: "",
        visible: false,
        caretPosition: 0,
        selection: {start: 0, end: 0},
        type: 'completion',
        matchedText: "",
        suggestionText: ""
      });
      
      // 如果需要导航到第一个结果，保持结果面板显示状态，立即执行搜索
      if (shouldNavigateToFirstResult) {
        // 立即关闭搜索面板，然后执行搜索
        setShowResults(false);
        closeMobileSearchPanel();
        performSearch(textToComplete, false, true);
      } else {
        // 如果不需要导航，关闭搜索结果面板，但仍然执行搜索以更新结果
        setShowResults(false);
        performSearch(textToComplete, false, false);
      }
      
      // 聚焦输入框并设置光标位置
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.setSelectionRange(
          textToComplete.length, 
          textToComplete.length
        );
      }
    }
  };
  
  // 高亮显示匹配文本 - 不再处理高亮，完全依赖后端
  const processHighlightedContent = (content: string) => {
    // 检查内容是否为空
    if (!content || content.trim() === '') {
      return '';
    }
    
    // 内容完全由后端处理，前端不再添加任何高亮标记
    // 直接返回后端提供的内容，假设已经包含了适当的高亮标记
    return content;
  };
  
  // 递归处理标题树中的内容
  const processHeadingTreeContent = (node: HeadingNode) => {
    // 处理当前节点的内容
    if (node.content) {
      node.content = processHighlightedContent(node.content);
    }
    
    // 递归处理子节点
    for (const child of node.children) {
      processHeadingTreeContent(child);
    }
  };

  // 处理提交搜索
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 执行搜索但不立即关闭结果面板，等待搜索完成
    performSearch(query, false);
    // 如果查询为空，关闭搜索结果面板
    if (!query.trim()) {
      setShowResults(false);
    }
  };

  // 加载更多结果
  const loadMoreResults = () => {
    if (!isLoadingMore && hasMoreResults && query.trim()) {
      performSearch(query, true);
    }
  };

  // 设置Intersection Observer来检测何时需要加载更多结果
  useEffect(() => {
    // 清除之前的观察器
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!loadMoreRef.current || !hasMoreResults) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && hasMoreResults) {
          loadMoreResults();
        }
      },
      { rootMargin: '100px' } // 提前100px触发
    );

    observer.observe(loadMoreRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreRef.current, hasMoreResults, isLoadingMore, query]);

  // 输入框获焦时处理
  const handleInputFocus = () => {
    updateCaretPosition();
    
    // 如果有查询内容，重新显示内联建议
    if (query.trim() && inlineSuggestion.text) {
      setInlineSuggestion(prev => ({ ...prev, visible: true }));
    }
    
    // 如果已有搜索结果，显示结果区域
    if (searchResults) {
      setShowResults(true);
    }
    
    // 如果有查询但没有内联建议，重新获取
    if (query.trim() && !inlineSuggestion.text) {
      fetchSuggestions(query);
    }
  };

  // 修改内联建议的样式，确保正确显示
  const getInlineSuggestionStyle = () => {
    const inputElement = searchInputRef.current;
    if (!inputElement) {
      return {};
    }
    
    const computedStyle = window.getComputedStyle(inputElement);
    const styleObj = {
      fontFamily: computedStyle.fontFamily,
      fontSize: computedStyle.fontSize,
      fontWeight: computedStyle.fontWeight,
      letterSpacing: computedStyle.letterSpacing,
      lineHeight: computedStyle.lineHeight,
      // 不直接设置padding，让内部元素自己控制位置
      boxSizing: 'border-box',
      width: '100%',
      backgroundColor: 'transparent',
      pointerEvents: 'none'
    };
    
    return styleObj;
  };

  // 确保内联建议样式与输入框一致的副作用
  useEffect(() => {
    if (inlineSuggestion.visible && inlineSuggestionRef.current && searchInputRef.current) {
      const updateSuggestionStyles = () => {
        const inputStyle = window.getComputedStyle(searchInputRef.current!);
        const suggestionEl = inlineSuggestionRef.current!;
        
        // 设置样式以完全匹配输入框
        suggestionEl.style.fontFamily = inputStyle.fontFamily;
        suggestionEl.style.fontSize = inputStyle.fontSize;
        suggestionEl.style.fontWeight = inputStyle.fontWeight;
        suggestionEl.style.letterSpacing = inputStyle.letterSpacing;
        suggestionEl.style.lineHeight = inputStyle.lineHeight;
        
        // 计算并调整可用空间
        if (inlineSuggestion.type === 'correction') {
          // 获取输入框宽度
          const inputWidth = searchInputRef.current!.offsetWidth;
          // 估算查询文本宽度 (使用更精确的字体宽度估算方法)
          // 创建一个临时元素用于测量实际宽度
          const tempMeasureEl = document.createElement('span');
          tempMeasureEl.style.visibility = 'hidden';
          tempMeasureEl.style.position = 'absolute';
          tempMeasureEl.style.whiteSpace = 'pre';
          tempMeasureEl.style.fontSize = inputStyle.fontSize;
          tempMeasureEl.style.fontFamily = inputStyle.fontFamily;
          tempMeasureEl.style.fontWeight = inputStyle.fontWeight;
          tempMeasureEl.style.letterSpacing = inputStyle.letterSpacing;
          tempMeasureEl.innerText = query;
          document.body.appendChild(tempMeasureEl);
          const queryTextWidth = tempMeasureEl.offsetWidth;
          document.body.removeChild(tempMeasureEl);
          
          // 计算右侧边距 (确保TAB按钮和清除按钮有足够空间)
          // 根据屏幕尺寸调整右侧边距
          let rightMargin = 90; // 默认桌面环境
          
          // 根据窗口宽度调整边距（响应式设计）
          if (window.innerWidth < 640) { // 小屏幕设备
            rightMargin = 100; // 移动设备上按钮占据更多相对空间
          } else if (window.innerWidth < 768) { // 中等屏幕设备
            rightMargin = 95;
          }
          
          // 计算建议可用最大宽度
          // 根据屏幕尺寸调整最大宽度百分比
          let maxWidthPercentage = 0.8; // 默认最大宽度百分比
          
          if (window.innerWidth < 640) {
            maxWidthPercentage = 0.7; // 在小屏幕上减少最大宽度百分比
          }
          
          const maxAllowedWidth = Math.floor(inputWidth * maxWidthPercentage);
          
          // 计算最终的可用宽度
          const availableWidth = Math.min(
            maxAllowedWidth,
            Math.max(inputWidth - queryTextWidth - rightMargin, 80) // 最小宽度降低到80px以适应更小的设备
          );
          
          // 设置最大宽度
          const suggestionTextContainer = suggestionEl.querySelector('div > div:nth-child(2) > span');
          if (suggestionTextContainer) {
            (suggestionTextContainer as HTMLElement).style.maxWidth = `${availableWidth}px`;
          }
        }
      };
      
      updateSuggestionStyles();
      
      // 监听窗口大小变化，确保响应式字体大小可以正确应用
      const resizeObserver = new ResizeObserver(updateSuggestionStyles);
      resizeObserver.observe(searchInputRef.current);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [inlineSuggestion.visible, query, inlineSuggestion.type]);

  // 处理Tab键盘事件 - 简化逻辑，改进处理方式
  useEffect(() => {
    // 创建键盘事件处理函数
    const handleTabKey = (e: KeyboardEvent) => {
      const isFocused = document.activeElement === searchInputRef.current;
      const hasVisibleSuggestion = inlineSuggestion.visible && inlineSuggestion.text;
      
      if (e.key === 'Tab' && isFocused && hasVisibleSuggestion) {
        e.preventDefault();
        e.stopPropagation();
        completeInlineSuggestion();
      }
    };
    
    // 添加键盘事件监听器，确保使用非被动模式
    document.addEventListener('keydown', handleTabKey, { passive: false, capture: true });
    
    return () => {
      document.removeEventListener('keydown', handleTabKey, { capture: true });
    };

  }, []);
  

  // 清除搜索
  const clearSearch = () => {
    // 清除查询和结果，但保持搜索框的可见状态
    setQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
    
    // 清除搜索结果
    setSearchResults(null);
    setAllItems([]);
    setSuggestions([]);
    
    // 清除内联建议
    setInlineSuggestion({
      text: "",
      visible: false,
      caretPosition: 0,
      selection: {start: 0, end: 0},
      type: 'completion',
      matchedText: "",
      suggestionText: ""
    });
    
    // 保持结果区域可见，但无内容
    setShowResults(true);
    setCurrentPage(1);
    setHasMoreResults(true);
    
    // 确保输入框保持焦点
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // 检查焦点状态
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const checkFocus = () => {
      if (document.activeElement === searchInputRef.current) {
        if (!isFocused) {
          setIsFocused(true);
        }
      } else {
        if (isFocused) {
          setIsFocused(false);
        }
      }
    };
    
    window.addEventListener('focus', checkFocus, { passive: false, capture: true });
    window.addEventListener('blur', checkFocus, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener('focus', checkFocus, { capture: true });
      window.removeEventListener('blur', checkFocus, { capture: true });
    };
  }, [isFocused]);
  
  // 获取当前placeholder文本
  const getCurrentPlaceholder = () => {
    if (isLoadingIndex) {
      return "正在加载搜索索引...";
    } else if (error) {
      return "加载搜索索引失败";
    }
    return placeholder; // 默认占位符
  };

  // 递归渲染标题树
  const renderHeadingTree = (node: HeadingNode, index: number, depth: number = 0) => {
    // 判断是否为根节点（根据ID或level来判断）
    const isRootNode = node.id.endsWith(':root') || node.level === 0;
    
    // 检查节点内容是否有匹配
    const hasContent = !!node.content;
    
    // 判断是否有子节点
    const hasChildren = node.children.length > 0;
    
    // 递归检查子节点是否包含匹配内容
    const hasMatchInChildren = hasChildren && node.children.some(child => {
      if (child.content) return true;
      if (child.children.length === 0) return false;
      
      // 递归检查子节点的子节点
      return child.children.some(grandchild => {
        // 递归检查所有层级
        const checkNodeContent = (n: HeadingNode): boolean => {
          if (n.content) return true;
          return n.children.some(c => checkNodeContent(c));
        };
        
        return checkNodeContent(grandchild);
      });
    });
    
    // 如果当前节点和其子树都没有匹配内容，则不渲染
    if (!hasContent && !hasMatchInChildren) {
      return null;
    }
    
    // 决定是否显示当前节点的内容
    const shouldShowContent = hasContent && (!isRootNode || !hasMatchInChildren);

    // 为递增的深度应用适当的缩进类
    const indentClass = depth > 0 ? `ml-${Math.min(depth * 2, 8)}` : '';
    
    // 过滤子节点 - 在这里直接内联过滤逻辑，不使用单独的函数
    const filteredChildren = hasChildren ? node.children.filter(child => {
      // 如果子节点有内容，保留
      if (child.content) return true;
      
      // 递归检查子节点的子节点
      const checkChildContent = (n: HeadingNode): boolean => {
        if (n.content) return true;
        return n.children.some(c => checkChildContent(c));
      };
      
      // 如果子节点的子树有内容，保留
      return child.children.some(grandchild => checkChildContent(grandchild));
    }) : [];
    
    return (
      <div key={`${node.id}-${index}`} className={indentClass}>
        {/* 只渲染非根节点的标题 */}
        {node.level > 0 && (
          <div className={`text-xs font-medium text-primary-600 dark:text-primary-400 mb-1 ${depth > 0 ? 'mt-2' : ''} break-words [&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-800`}>
            <span dangerouslySetInnerHTML={{ __html: node.text }} />
          </div>
        )}
        
        {/* 渲染当前节点的匹配内容 */}
        {shouldShowContent && (
          <div className="border-l-2 border-primary-500 pl-2 py-1 mb-2">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 [&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-800 break-words">
              <div dangerouslySetInnerHTML={{
                __html: node.content || ''
              }} />
            </div>
          </div>
        )}
        
        {/* 递归渲染过滤后的子节点 */}
        {filteredChildren.length > 0 && (
          <div className="pl-2">
            {filteredChildren.map((child, childIndex) => (
              renderHeadingTree(child, childIndex, depth + 1)
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染搜索结果
  const renderSearchResults = () => {
    // 只有在显示结果标志为true且有结果时才显示结果
    if (!showResults || !searchResults) {
      return null;
    }

    const { total, time_ms } = searchResults;

    return (
      <div 
        ref={searchResultsRef} 
        className="absolute z-40 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-96 overflow-y-auto"
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              找到 {total} 条结果 ({time_ms / 1000} 秒)
            </div>
          </div>

          {allItems.length > 0 ? (
            <ul className="space-y-4">
              {allItems.map((item, index) => (
                <li key={`${item.id}-${index}`} className="border-b border-gray-200/70 dark:border-gray-700/40 pb-4 last:border-0 last:pb-0">
                  <a 
                    href={item.url} 
                    className="group block hover:bg-primary-200/80 dark:hover:bg-primary-800/20 hover:shadow-md rounded-lg transition-all duration-200 ease-in-out p-2 -m-2 border border-transparent hover:border-primary-300/60 dark:hover:border-primary-700/30"
                    data-astro-prefetch="hover"
                    onClick={(e) => {
                      // 防止默认行为，由我们自己处理导航
                      e.preventDefault();
                      
                      // 使用导航函数处理跳转，它会关闭所有面板
                      navigateToUrl(item.url);
                    }}
                  >
                    <div className="flex items-start">
                      <div className="flex-grow min-w-0">
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200 break-words [&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-800">
                          <span dangerouslySetInnerHTML={{ __html: item.title }} />
                        </h3>
                        
                        {/* 渲染标题树和匹配内容 */}
                        <div className="mt-1 space-y-1">
                          {item.heading_tree ? (
                            renderHeadingTree(item.heading_tree, index)
                          ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-400 break-words">
                              {item.summary}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-gray-400">没有找到相关结果</p>
            </div>
          )}

          {/* 加载更多触发元素 */}
          {hasMoreResults && (
            <div 
              ref={loadMoreRef} 
              className="text-center py-4 mt-2"
            >
              {isLoadingMore ? (
                <div className="flex justify-center items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">加载更多结果...</span>
                </div>
              ) : (
                <div className="h-6"></div> // 占位元素，用于触发交叉观察器
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 组件卸载时清理
  useEffect(() => {
    // 设置组件已挂载状态
    isMountedRef.current = true;
    
    return () => {
      // 标记组件已卸载
      isMountedRef.current = false;
      
      // 清理所有定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      
      // 取消所有进行中的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // 清理观察器
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // 为搜索组件添加视图切换事件监听
  useEffect(() => {
    const handlePageChange = () => {
      // 确保在页面切换时关闭所有搜索相关界面
      setShowResults(false);
      setInlineSuggestion(prev => ({ ...prev, visible: false }));
      closeMobileSearchPanel();
    };
    
    // 监听Astro视图转换事件
    document.addEventListener('astro:after-swap', handlePageChange);
    document.addEventListener('astro:page-load', handlePageChange);
    
    return () => {
      document.removeEventListener('astro:after-swap', handlePageChange);
      document.removeEventListener('astro:page-load', handlePageChange);
    };
  }, [closeMobileSearchPanel]);

  // 渲染结束
  const returnBlock = (
    <div className="relative [&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-800">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          {/* 实际输入框 */}
          <input
            ref={searchInputRef}
            type="text"
            id="search-input"
            name="search-query"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={updateCaretPosition}
            onSelect={updateCaretPosition}
            onFocus={handleInputFocus}
            placeholder={getCurrentPlaceholder()}
            className="w-full py-2.5 md:py-1.5 lg:py-2.5 pl-10 md:pl-8 lg:pl-10 pr-10 md:pr-8 lg:pr-10 text-base md:text-sm lg:text-base bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-lg lg:rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent focus:shadow-md transition-all duration-200 relative z-10"
            disabled={isLoadingIndex || !isIndexLoaded}
            style={{ backgroundColor: 'transparent' }} // 确保背景是透明的，这样可以看到下面的建议
          />
          
          {/* 内联建议显示层 - 精确定位以匹配输入框 */}
          {inlineSuggestion.visible && inlineSuggestion.text && query.length > 0 && (
            <div 
              ref={inlineSuggestionRef}
              className="absolute left-0 top-0 w-full h-full pointer-events-none flex items-center overflow-hidden"
              style={{
                ...getInlineSuggestionStyle(),
                zIndex: 5 // 确保在输入框下面但在其他元素上面
              }}
            >
              {/* 修改显示方式，确保与输入文本对齐，同时支持响应式布局 */}
              <div className="flex w-full px-10 md:px-8 lg:px-10 overflow-hidden"> {/* 使用与输入框相同的水平内边距，添加溢出隐藏 */}
                {/* 纠正建议和补全建议都显示在已输入内容的右侧 */}
                <>
                  {/* 创建与输入文本宽度完全相等的不可见占位 */}
                  <div className="flex-shrink-0">
                    <span className="invisible whitespace-pre text-base md:text-sm lg:text-base">{query}</span>
                  </div>
                  {/* 显示建议的剩余部分 */}
                  <div className={`flex-shrink-0 ${
                    // 根据建议类型调整最大宽度
                    inlineSuggestion.type === 'correction' 
                      ? 'max-w-[calc(100%-1.25rem)]' // 纠正建议给予更多空间，但仍然保留一些边距
                      : 'max-w-[80%]' // 补全建议使用固定比例
                  }`}>
                    <span 
                      className={`whitespace-pre text-base md:text-sm lg:text-base ${
                        // 对纠正建议使用ellipsis确保文本不会溢出
                        inlineSuggestion.type === 'correction' 
                          ? 'text-amber-500/80 dark:text-amber-400/80 ml-1 block truncate' 
                          : 'text-gray-400/70 dark:text-gray-500/70'
                      }`}
                      style={{ 
                        fontWeight: inlineSuggestion.type === 'correction' ? '600' : 'bold',
                        textDecoration: inlineSuggestion.type === 'correction' ? 'underline dotted 1px' : 'none',
                        textUnderlineOffset: '2px',
                        marginLeft: inlineSuggestion.type === 'completion' ? '0px' : undefined,
                        // 确保溢出时有优雅的省略效果
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={inlineSuggestion.type === 'correction' ? inlineSuggestion.text : undefined} // 在纠正模式下添加完整文本提示
                    >
                      {inlineSuggestion.suggestionText}
                    </span>
                  </div>
                </>
              </div>
            </div>
          )}
          
          {/* 搜索图标 */}
          <div className="absolute left-3.5 md:left-2.5 lg:left-3.5 top-1/2 transform -translate-y-1/2 z-20">
            <svg className="h-5 w-5 md:h-3.5 md:w-3.5 lg:h-4.5 lg:w-4.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* 加载指示器或清除按钮 */}
          <div className="absolute right-3.5 md:right-2.5 lg:right-3.5 top-1/2 transform -translate-y-1/2 z-20 flex items-center">
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 md:h-3.5 md:w-3.5 lg:h-4.5 lg:w-4.5 border-2 border-primary-600 border-t-transparent"></div>
            ) : query ? (
              <>
                <button
                  type="button"
                  className="text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 focus:outline-none active:text-primary-600 dark:active:text-primary-300 flex items-center justify-center p-2 -m-1 clear-search-button"
                  title="清除搜索"
                  style={{ touchAction: 'none' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation(); // 阻止事件冒泡到document
                    // 只清除文本，始终不关闭搜索框
                    clearSearch();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation(); // 阻止事件冒泡到document
                    clearSearch();
                  }}
                >
                  <svg className="h-5 w-5 md:h-3.5 md:w-3.5 lg:h-4.5 lg:w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {inlineSuggestion.visible && inlineSuggestion.text && (
                  <div 
                    className={`text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 active:text-primary-600 dark:active:text-primary-300 flex items-center justify-center cursor-pointer p-1 ml-1 tab-completion-button ${
                      inlineSuggestion.type === 'correction' ? 'animate-pulse' : ''
                    }`}
                    title={inlineSuggestion.type === 'correction' ? "按Tab键接受纠正" : "按Tab键补全"}
                    onClick={(e) => {
                      // 阻止冒泡和默认行为 
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // 直接执行补全操作，不再使用延迟和多次更新
                      completeInlineSuggestion();
                    }}
                    onMouseDown={(e) => {
                      // 阻止失去焦点
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      completeInlineSuggestion();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        completeInlineSuggestion();
                      }
                    }}
                    style={{ touchAction: 'none' }}
                  >
                    <div className={`border ${
                      inlineSuggestion.type === 'correction' 
                        ? 'border-amber-500/80 text-amber-500/90 dark:border-amber-400/80 dark:text-amber-400/90' 
                        : 'border-current'
                    } rounded px-1 py-px text-[10px] md:text-[8px] lg:text-[8px] leading-none font-semibold flex items-center justify-center`}>
                      TAB
                    </div>
                  </div>
                )}
              </>
            ) : error ? (
              <div className="flex items-center">
                <div className="rounded-full h-3 w-3 md:h-2 md:w-2 lg:h-3 lg:w-3 bg-red-500 shadow-sm shadow-red-500/50"></div>
              </div>
            ) : isLoadingIndex ? (
              <div className="flex items-center">
                <div className="animate-pulse rounded-full h-3 w-3 md:h-2 md:w-2 lg:h-3 lg:w-3 bg-yellow-500 shadow-sm shadow-yellow-500/50"></div>
              </div>
            ) : null}
          </div>
        </div>
      </form>
      
      {/* 搜索结果 */}
      {renderSearchResults()}
    </div>
  );

  return returnBlock;
};

export default Search; 