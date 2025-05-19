// 统一初始化Swup和所有插件
import Swup from 'swup';
import SwupFragmentPlugin from '@swup/fragment-plugin';
// 添加Head插件解决CSS丢失问题
import SwupHeadPlugin from '@swup/head-plugin';
// 添加预加载插件 - 优化导航体验
import SwupPreloadPlugin from '@swup/preload-plugin';
// 添加Scripts插件 - 确保页面转场后脚本能重新执行
import SwupScriptsPlugin from '@swup/scripts-plugin';

// 创建加载动画元素
function createLoadingSpinner() {
  // 检查是否已存在加载动画元素
  const existingSpinner = document.getElementById('swup-loading-spinner');
  if (existingSpinner) {
    return existingSpinner;
  }
  
  // 创建加载动画容器
  const spinner = document.createElement('div');
  spinner.id = 'swup-loading-spinner';
  spinner.className = 'loading-spinner-container';
  
  // 创建内部旋转元素
  const spinnerInner = document.createElement('div');
  spinnerInner.className = 'loading-spinner';
  
  // 添加到页面
  spinner.appendChild(spinnerInner);
  
  // 默认隐藏
  spinner.style.display = 'none';
  
  return spinner;
}

// 将加载动画添加到body并固定在内容区域的中心
function addSpinnerToBody(spinner) {
  if (!spinner) return;
  
  try {
    // 先从DOM中移除(如果已存在)
    if (spinner.parentNode) {
      spinner.parentNode.removeChild(spinner);
    }
    
    // 获取当前活跃元素
    const activeElement = getActiveElement();
    
    // 添加到body而不是活跃容器，避免内容替换时被移除
    document.body.appendChild(spinner);
    
    // 如果有活跃元素，根据其位置调整加载动画的位置
    if (activeElement) {
      // 获取活跃元素的位置信息
      const rect = activeElement.getBoundingClientRect();
      
      // 计算中心点相对于视口的位置
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // 设置加载动画位置
      spinner.style.position = 'fixed';
      spinner.style.top = centerY + 'px';
      spinner.style.left = centerX + 'px';
      spinner.style.transform = 'translate(-50%, -50%)';
      spinner.style.zIndex = '9999'; // 确保在最顶层
    } else {
      // 如果没有活跃元素，则居中显示
      spinner.style.position = 'fixed';
      spinner.style.top = '50%';
      spinner.style.left = '50%';
      spinner.style.transform = 'translate(-50%, -50%)';
      spinner.style.zIndex = '9999'; // 确保在最顶层
    }
  } catch (error) {
    console.error('添加加载动画时出错:', error);
  }
}

// 显示加载动画
function showLoadingSpinner(spinner, forceNew = false) {
  if (!spinner) return;
  
  // 确保加载动画已添加到body
  addSpinnerToBody(spinner);
  
  // 检查加载动画是否已在显示
  if (spinner.classList.contains('is-active') && !forceNew) {
    return;
  }
  
  spinner.style.display = 'flex';
  spinner.classList.add('is-active');
}

// 隐藏加载动画
function hideLoadingSpinner(spinner) {
  if (!spinner || !document.body.contains(spinner) || !spinner.classList.contains('is-active')) {
    return;
  }
  
  spinner.classList.remove('is-active');
  
  // 添加淡出效果后移除
  setTimeout(() => {
    if (spinner && document.body.contains(spinner)) {
      spinner.style.display = 'none';
    }
  }, 300);
}

// 检查是否是文章相关页面
function isArticlePage() {
  const path = window.location.pathname;
  return path.includes('/articles') || path.includes('/filtered');
}

// 检查DOM中是否存在指定的容器
function containerExists(selector) {
  return document.querySelector(selector) !== null;
}

// 为元素设置过渡状态
function setElementTransition(element) {
  if (!element) return;
  
  // 添加data-swup属性标记
  element.setAttribute('data-swup-transition', 'true');
}

// 设置元素淡入/淡出效果
function setElementOpacity(element, opacity) {
  if (!element) return;
  element.style.opacity = opacity.toString();
}

// 应用过渡效果到相关元素
function applyTransitions() {
  // 应用到主容器 - 只在非文章页面
  const mainElement = document.querySelector('main');
  if (mainElement) {
    mainElement.classList.add('transition-fade');
    
    // 只有在非文章页面时，才为main添加必要的过渡标记
    if (!isArticlePage()) {
      setElementTransition(mainElement);
    }
  }
  
  // 应用到文章内容 - 只在文章页面
  const articleContent = document.querySelector('#article-content');
  if (articleContent) {
    articleContent.classList.add('swup-transition-article');
    setElementTransition(articleContent);
  }
}

// 获取当前页面的活跃元素（用于动画）
function getActiveElement() {
  if (isArticlePage()) {
    return document.querySelector('#article-content');
  } else {
    return document.querySelector('main');
  }
}

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 应用过渡效果
  applyTransitions();
  
  // 创建加载动画元素
  const spinner = createLoadingSpinner();
  
  // 页面状态跟踪
  let animationInProgress = false;
  // 添加状态变量
  let isLoading = false;
  let contentReady = false;
  
  // 根据当前页面动态确定容器配置
  const containers = ['main']; // 主容器始终存在
  
  // 只有当文章内容容器存在时才添加
  if (containerExists('#article-content')) {
    containers.push('#article-content');
  }
  
  // 创建Swup实例
  const swup = new Swup({
    // Swup的基本配置
    animationSelector: '[class*="transition-"], .swup-transition-article, #article-content',
    cache: true,
    containers: containers, // 使用动态容器配置
    animationScope: 'html', // 确保动画状态类添加到html元素
    linkSelector: 'a[href^="/"]:not([data-no-swup]), a[href^="' + window.location.origin + '"]:not([data-no-swup])',
    // 使用默认的skipPopStateHandling设置，只处理由swup创建的历史记录
    skipPopStateHandling: (event) => event.state?.source !== 'swup',
    // 修复resolveUrl实现，确保返回URL字符串而不是对象
    resolveUrl: function(url) {
      // 直接返回URL字符串
      return url;
    },
    // 增加自定义容器解析，解决容器不匹配的问题
    resolveContainers: async function(visit) {
      // 根据URL路径动态决定要使用哪些容器
      const isFromArticlePage = visit?.from?.url.includes('/articles') || visit?.from?.url.includes('/filtered');
      const isToArticlePage = visit?.to?.url.includes('/articles') || visit?.to?.url.includes('/filtered');
      
      // 当从文章页到非文章页，或从非文章页到文章页时
      if (isFromArticlePage !== isToArticlePage) {
        return ['main'];
      }
      
      // 对于文章页面之间的导航，使用两个容器
      if (isFromArticlePage && isToArticlePage) {
        return ['main', '#article-content'];
      }
      
      // 默认情况：使用main容器
      return ['main'];
    },
    plugins: [] // 手动添加插件以控制顺序
  });
  
  // 发送页面转换事件 - 自定义全局事件
  function sendPageTransitionEvent() {
    // 创建自定义事件并触发
    const event = new CustomEvent('page-transition', {
      bubbles: true,
      cancelable: false,
      detail: { timestamp: Date.now() }
    });
    document.dispatchEvent(event);
  }
  
  // 添加预加载插件 - 代替原有的预加载功能
  const preloadPlugin = new SwupPreloadPlugin({
    // 最多同时预加载5个链接
    throttle: 5,
    // 开启鼠标悬停预加载
    preloadHoveredLinks: true,
    // 开启视口内链接预加载，自定义配置
    preloadVisibleLinks: {
      // 链接可见面积达到30%时预加载
      threshold: 0.3,
      // 链接可见500毫秒后开始预加载
      delay: 500,
      // 在哪些容器内寻找链接
      containers: ['body'],
      // 忽略带有data-no-preload属性的链接
      ignore: (el) => el.hasAttribute('data-no-preload')
    },
    // 预加载初始页面，以便"后退"导航更快
    preloadInitialPage: true
  });
  swup.use(preloadPlugin);
  
  // 创建并注册Head插件，用于解决CSS丢失问题
  const headPlugin = new SwupHeadPlugin({
    persistTags: 'link[rel="stylesheet"], style, meta',  // 保留所有样式表和相关标签
    persistAssets: true, // 保留已加载的资源
    keepScrollOnReload: true, // 保持滚动位置
    awaitAssets: true // 等待资源加载完成再显示页面
  });
  swup.use(headPlugin);
  
  // 添加Scripts插件 - 确保页面转场后脚本能重新执行
  const scriptsPlugin = new SwupScriptsPlugin({
    // 以下选项确定哪些脚本会被重新执行
    head: true,         // 重新执行head中的脚本
    body: true,         // 重新执行body中的脚本
    optin: false,       // 是否只执行带有[data-swup-reload-script]属性的脚本
    oprout: false,      // 是否排除带有[data-no-swup]属性的脚本
    once: true         // 是否每个脚本只执行一次
  });
  swup.use(scriptsPlugin);
  
  // 创建Fragment插件 - 只在需要的页面使用
  const fragmentPlugin = new SwupFragmentPlugin({
    debug: false, // 关闭调试模式
    // 修改规则，增加更细致的配置
    rules: [
      {
        name: 'article-pages',
        from: ['/articles', '/filtered'],
        to: ['/articles', '/filtered'],
        containers: ['#article-content']
      }
    ],
    // 默认情况下忽略URL片段，只使用路径部分
    considerFragment: false
  });
  
  // 修改Fragment插件的加载逻辑 - 始终加载，但根据页面类型动态启用/禁用
  swup.use(fragmentPlugin);
  
  // 初始化后手动扫描并预加载带有data-swup-preload属性的链接
  const preloadLinks = document.querySelectorAll('[data-swup-preload]');
  if (preloadLinks.length > 0) {
    preloadLinks.forEach(link => {
      // 检查链接是否符合预加载条件
      if (link.tagName.toLowerCase() === 'a' && link.href) {
        // 调用预加载插件的方法
        preloadPlugin.preloadPage(link.href);
      }
    });
  }
  
  // 重新设置过渡元素
  function setupTransition() {
    // 应用过渡效果
    applyTransitions();
    
    // 确保初始状态正确
    setTimeout(() => {
      // 获取并设置当前活跃元素的不透明度
      const activeElement = getActiveElement();
      if (activeElement) {
        activeElement.style.opacity = '1';
      }
    }, 0);
  }
  
  // 初始化时设置
  setupTransition();

  // ===== 生命周期钩子 =====
  
  // 1. 访问开始 - 显示加载动画，准备页面退出
  swup.hooks.on('visit:start', (visit) => {
    isLoading = true;
    contentReady = false;
    animationInProgress = true;
    
    // 发送页面切换事件
    sendPageTransitionEvent();
    
    // 显示加载动画
    showLoadingSpinner(spinner);
    
    // 检查目标URL是否为文章相关页面
    const isTargetArticlePage = visit.to.url.includes('/articles') || visit.to.url.includes('/filtered');
    const isCurrentArticlePage = isArticlePage();
    
    // 如果当前是文章页面，但目标不是，恢复main动画
    if (isCurrentArticlePage && !isTargetArticlePage) {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        setElementOpacity(mainElement, 0);
      }
    }
    // 如果当前不是文章页面，但目标是，准备article-content动画
    else if (!isCurrentArticlePage && isTargetArticlePage) {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        // 移除main的过渡效果
        mainElement.style.transition = '';
        mainElement.style.opacity = '1';
      }
    }
  });
  
  // 2. 内容已加载但尚未替换 - 设置内容状态
  swup.hooks.on('page:load', (visit) => {
    contentReady = true;
    // 如果是载入文章页面但Fragment插件未加载，则加载它
    if ((visit.to.url.includes('/articles') || visit.to.url.includes('/filtered')) && 
        !swup.findPlugin('fragment')) {
      swup.use(fragmentPlugin);
    }
    
    // 如果快速加载，先检查动画是否完成
    if (!animationInProgress) {
      // 如果动画已经完成，允许加载动画淡出
      setTimeout(() => {
        hideLoadingSpinner(spinner);
      }, 50);
    }
  });
  
  // 3. 页面退出动画开始 - 添加动画逻辑
  swup.hooks.on('animation:out:start', () => {
    animationInProgress = true;
    
    // 获取并淡出当前活跃元素
    const activeElement = getActiveElement();
    setElementOpacity(activeElement, 0);
  });
  
  swup.hooks.on('content:replace', () => {
    // 重新设置过渡样式，但不要立即隐藏加载动画
    setTimeout(() => {
      setupTransition();
    }, 10);
  });
  
  // 5. 页面进入动画开始 - 控制新内容的显示
  swup.hooks.on('animation:in:start', () => {
    setTimeout(() => {
      // 获取并淡入当前活跃元素
      const activeElement = getActiveElement();
      setElementOpacity(activeElement, 1);
      
      hideLoadingSpinner(spinner);
    }, 50);
  });
  
  // 7. 页面进入动画结束 - 完成所有过渡
  swup.hooks.on('animation:in:end', () => {
    animationInProgress = false;
    isLoading = false;
    
    // 确保隐藏加载动画
    hideLoadingSpinner(spinner);
  });
  
  // 8. 页面完全加载完成
  swup.hooks.on('page:view', () => {
    isLoading = false;
    contentReady = false;
    animationInProgress = false;
    
    // 最终确保隐藏加载动画
    hideLoadingSpinner(spinner);
  });
  
  // 加载失败处理
  swup.hooks.on('fetch:error', (error) => {
    isLoading = false;
    contentReady = false;
    animationInProgress = false;
    hideLoadingSpinner(spinner);
    
    console.error('Fetch error:', error);
    
    // 在严重错误时回退到页面刷新
    try {
      const targetUrl = error?.visit?.to?.url || window.location.pathname;
      window.location.href = targetUrl;
    } catch (e) {
      // 如果获取目标URL失败，刷新当前页面
      window.location.reload();
    }
  });
  
  // 处理容器不匹配错误
  const originalErrorHandler = window.console.error;
  window.console.error = function(...args) {
    // 调用原始错误处理器
    originalErrorHandler.apply(this, args);
    
    // 检查是否是容器不匹配错误
    if (
      args.length > 0 && 
      typeof args[0] === 'string' && 
      (args[0].includes('Container missing') || args[0].includes('Container mismatch'))
    ) {
      // 尝试恢复
      try {
        // 隐藏加载动画
        hideLoadingSpinner(spinner);
        
        // 重置状态
        animationInProgress = false;
        isLoading = false;
        contentReady = false;
        
        // 检查是否可以使用备用容器
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
          // 强制使用main容器
          swup.options.containers = ['main'];
          
          // 手动为main容器添加过渡状态
          mainContainer.classList.add('transition-fade');
          setElementTransition(mainContainer);
          setElementOpacity(mainContainer, 1);
        }
        
        // 发送页面转换事件
        sendPageTransitionEvent();
      } catch (e) {
        console.error('Recovery failed:', e);
      }
    }
  };
  
  // 在页面内容替换后确保新内容动画正确显示
  document.addEventListener('swup:contentReplaced', () => {
    // 获取活跃元素
    const activeElement = getActiveElement();
    if (!activeElement) return;
    
    // 先设置透明
    setElementOpacity(activeElement, 0);
    
    // 重新应用适当的类
    if (isArticlePage() && activeElement.id === 'article-content') {
      activeElement.classList.add('swup-transition-article');
      setElementTransition(activeElement);
    } else if (!isArticlePage() && activeElement.tagName.toLowerCase() === 'main') {
      activeElement.classList.add('transition-fade');
      setElementTransition(activeElement);
    }
    
    // 延迟后淡入 - 但不要立刻隐藏加载动画
    setTimeout(() => {
      setElementOpacity(activeElement, 1);
    }, 50);
  });
  
  // 监听Fragment插件是否成功应用
  document.addEventListener('swup:fragmentReplaced', () => {
    // 确保新内容有正确的过渡样式
    setTimeout(() => {
      setupTransition();
      
      hideLoadingSpinner(spinner);
    }, 10);
  });

  // 在页面卸载和Astro视图转换时清理资源
  const cleanup = () => {
    // 发送页面切换事件
    sendPageTransitionEvent();
    
    if (swup) {
      // 移除所有已使用的插件
      if (swup.findPlugin('fragment')) {
        swup.unuse(fragmentPlugin);
      }
      swup.unuse(headPlugin);
      swup.unuse(preloadPlugin);
      swup.unuse(scriptsPlugin);
      swup.destroy();
    }
  };

  // 注册清理事件
  window.addEventListener('beforeunload', cleanup, { once: true });
  document.addEventListener('astro:before-swap', cleanup, { once: true });
}); 