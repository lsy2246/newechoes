// 统一初始化Swup和所有插件
import Swup from 'swup';
import SwupFragmentPlugin from '@swup/fragment-plugin';
// 添加Head插件解决CSS丢失问题
import SwupHeadPlugin from '@swup/head-plugin';
// 添加预加载插件 - 优化导航体验
import SwupPreloadPlugin from '@swup/preload-plugin';
// 添加Scripts插件 - 确保页面转场后脚本能重新执行
import SwupScriptsPlugin from '@swup/scripts-plugin';

const LOADING_SPINNER_MIN_VISIBLE_MS = 360;
let loadingSpinnerHideTimer = 0;
let loadingSpinnerShownAt = 0;
let lastNavigationError = null;

function setSwupLoadingState(isLoading) {
  document.body?.setAttribute('data-swup-loading', isLoading ? 'true' : 'false');
}

function setSwupNavigationError(targetUrl, reason) {
  const detail = {
    targetUrl: targetUrl || window.location.pathname,
    reason,
    timestamp: Date.now(),
  };

  lastNavigationError = detail;
  document.documentElement?.setAttribute('data-swup-navigation-error', 'true');
  window.dispatchEvent(new CustomEvent('swup:navigation-error', { detail }));
}

function clearSwupNavigationError() {
  lastNavigationError = null;
  document.documentElement?.removeAttribute('data-swup-navigation-error');
}

function formatSwupError(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  return 'unknown_fetch_error';
}

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
  spinner.setAttribute('aria-hidden', 'true');
  
  // 创建内部旋转元素
  const spinnerInner = document.createElement('div');
  spinnerInner.className = 'loading-spinner';
  
  // 添加到页面
  spinner.appendChild(spinnerInner);
  
  // 默认隐藏
  spinner.style.display = 'none';
  
  return spinner;
}

// 将加载动画添加到body并固定在当前视口中心。
function addSpinnerToBody(spinner) {
  if (!spinner) return;
  
  try {
    // 先从DOM中移除(如果已存在)
    if (spinner.parentNode) {
      spinner.parentNode.removeChild(spinner);
    }
    
    // 添加到body而不是活跃容器，避免内容替换时被移除
    document.body.appendChild(spinner);

    // 首页 main 高度远大于视口，按元素中心定位会把 spinner 放到屏幕外。
    spinner.style.position = 'fixed';
    spinner.style.top = '50%';
    spinner.style.left = '50%';
    spinner.style.transform = 'translate(-50%, -50%)';
    spinner.style.zIndex = '9999';
  } catch (error) {
    console.error('添加加载动画时出错:', error);
  }
}

// 显示加载动画
function showLoadingSpinner(spinner, forceNew = false) {
  if (!spinner) return;

  if (loadingSpinnerHideTimer) {
    clearTimeout(loadingSpinnerHideTimer);
    loadingSpinnerHideTimer = 0;
  }
  
  // 确保加载动画已添加到body
  addSpinnerToBody(spinner);
  
  // 检查加载动画是否已在显示
  if (spinner.classList.contains('is-active') && !forceNew) {
    return;
  }
  
  spinner.style.display = 'flex';
  spinner.classList.add('is-active');
  loadingSpinnerShownAt = Date.now();
  setSwupLoadingState(true);
}

// 隐藏加载动画
function hideLoadingSpinner(spinner) {
  if (!spinner || !document.body.contains(spinner) || !spinner.classList.contains('is-active')) {
    return;
  }

  if (loadingSpinnerHideTimer) {
    clearTimeout(loadingSpinnerHideTimer);
    loadingSpinnerHideTimer = 0;
  }

  const visibleFor = Date.now() - loadingSpinnerShownAt;
  const hideDelay = Math.max(0, LOADING_SPINNER_MIN_VISIBLE_MS - visibleFor);

  loadingSpinnerHideTimer = window.setTimeout(() => {
    loadingSpinnerHideTimer = 0;
    spinner.classList.remove('is-active');
  
    // 添加淡出效果后移除
    setTimeout(() => {
      if (spinner && document.body.contains(spinner)) {
        spinner.style.display = 'none';
      }
      setSwupLoadingState(false);
    }, 300);
  }, hideDelay);
}

function hideLoadingSpinnerImmediately(spinner) {
  if (!spinner) return;

  if (loadingSpinnerHideTimer) {
    clearTimeout(loadingSpinnerHideTimer);
    loadingSpinnerHideTimer = 0;
  }

  spinner.classList.remove('is-active');
  spinner.style.display = 'none';
  setSwupLoadingState(false);
}

function dispatchAstroNavigationEvent(name, detail) {
  document.dispatchEvent(new CustomEvent(name, {
    bubbles: true,
    detail,
  }));
}

function dispatchAstroNavigationLifecycle(visit) {
  if (!visit?.to?.url) return;

  const detail = {
    source: 'swup',
    from: visit?.from?.url || window.location.href,
    to: visit.to.url,
    timestamp: Date.now(),
  };

  dispatchAstroNavigationEvent('astro:after-swap', detail);
  dispatchAstroNavigationEvent('astro:page-load', detail);
}

// 根据当前路径同步首页专属的 body class
// (home page 走 overlay header + full-bleed；其他页面不能带这些 class)
function isHomeUrl(url = window.location.pathname) {
  const path = getUrlPathname(url);
  return path === '/' || path === '';
}

function isHomePath() {
  return isHomeUrl(window.location.pathname);
}

function readLayoutFlag(element, attribute, fallback = false) {
  const value = element?.getAttribute(attribute);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function syncLayoutFooterVisibility(hideFooter = false) {
  const footer = document.querySelector('[data-layout-footer]');
  if (!footer) return;

  footer.hidden = hideFooter;
  footer.classList.toggle('hidden', hideFooter);
  footer.setAttribute('data-layout-footer-hidden', hideFooter ? 'true' : 'false');
  footer.setAttribute('aria-hidden', hideFooter ? 'true' : 'false');
}

function syncLayoutHeaderVisibility(hideHeader = false) {
  const header = document.getElementById('main-header');
  if (!header) return;

  header.hidden = hideHeader;
  header.classList.toggle('hidden', hideHeader);
  header.setAttribute('data-layout-header-hidden', hideHeader ? 'true' : 'false');
  header.setAttribute('aria-hidden', hideHeader ? 'true' : 'false');
}

function readPageShellStateFromRoot(root = document, url = window.location.pathname) {
  const mainElement = root.querySelector?.('main[data-layout-background]');
  const backgroundMode = mainElement?.getAttribute('data-layout-background') || 'default';
  const headerMode = mainElement?.getAttribute('data-layout-header-mode') || (isHomeUrl(url) ? 'overlay' : 'default');
  const pageType = mainElement?.getAttribute('data-layout-page-type') || 'page';
  const isCardPreview = readLayoutFlag(mainElement, 'data-layout-card-preview');
  const isFullBleed = readLayoutFlag(mainElement, 'data-layout-full-bleed', isHomeUrl(url));
  const hideFooter = isCardPreview || readLayoutFlag(mainElement, 'data-layout-hide-footer', isHomeUrl(url));
  const hideHeader = isCardPreview || readLayoutFlag(mainElement, 'data-layout-hide-header');
  const useOverlayHeader = headerMode === 'overlay';

  return {
    backgroundMode,
    pageType,
    isCardPreview,
    isFullBleed,
    hideFooter,
    hideHeader,
    useOverlayHeader,
    useHomeHeader: isHomeUrl(url)
  };
}

function readPageShellState() {
  return readPageShellStateFromRoot(document, window.location.pathname);
}

function clearHomePageState(shellState = readPageShellState()) {
  if (shellState.useHomeHeader) return;

  const docEl = document.documentElement;
  docEl.removeAttribute("data-home-header-phase");
  docEl.style.removeProperty("--home-progress");
  docEl.style.removeProperty("--scene-opacity");
  docEl.style.removeProperty("--story-opacity");
  docEl.style.removeProperty("--story-progress");
  docEl.style.removeProperty("--story-local");
}

function updateHeaderScrollState(shellState = readPageShellState()) {
  const headerBg = document.getElementById('header-bg');
  if (!headerBg) return;

  const shouldUseScrolledHeader = !shellState.useHomeHeader && window.scrollY > 8;
  headerBg.classList.toggle('scrolled', shouldUseScrolledHeader);
}

function syncHeaderShellState(shellState = readPageShellState()) {
  const header = document.getElementById('main-header');
  const headerBg = document.getElementById('header-bg');
  if (!header || !headerBg) return;

  syncLayoutHeaderVisibility(shellState.hideHeader);

  if (shellState.useHomeHeader) {
    header.setAttribute('data-home-header', 'true');
  } else {
    header.removeAttribute('data-home-header');
  }

  headerBg.classList.add('absolute', 'inset-0');
  headerBg.classList.toggle('header-bg-surface', !shellState.useHomeHeader);
  updateHeaderScrollState(shellState);
}

function primeIncomingHeaderBackground(shellState) {
  const headerBg = document.getElementById('header-bg');
  if (!headerBg || !shellState) return;

  if (shellState.useHomeHeader) {
    headerBg.classList.remove('scrolled');
    headerBg.classList.remove('header-bg-surface');
    headerBg.style.background = 'transparent';
    headerBg.style.backdropFilter = 'none';
    headerBg.style.webkitBackdropFilter = 'none';
    headerBg.style.boxShadow = 'none';
    return;
  }

  headerBg.style.removeProperty('background');
  headerBg.style.removeProperty('backdrop-filter');
  headerBg.style.removeProperty('-webkit-backdrop-filter');
  headerBg.style.removeProperty('box-shadow');
}

// Swup only replaces page containers, so body/header-level layout state needs syncing.
function syncLayoutBodyClasses(shellState = readPageShellState()) {
  document.body.classList.toggle('article-card-preview-body', shellState.isCardPreview);
  document.body.classList.toggle('site-monochrome-page', !shellState.useOverlayHeader && !shellState.isCardPreview);
  document.body.classList.toggle('layout-article-page', shellState.pageType === 'article');
  document.body.classList.toggle('layout-directory-page', shellState.pageType === 'directory');
  document.body.classList.toggle('layout-overlay-header', shellState.useOverlayHeader);
  document.body.classList.toggle('layout-full-bleed', shellState.isFullBleed);
  document.body.classList.toggle('layout-bg-starry', shellState.backgroundMode === 'starry');
  document.body.classList.toggle('layout-no-header', shellState.hideHeader);
  syncLayoutFooterVisibility(shellState.hideFooter);
}

function syncPageShellState(shellState = readPageShellState()) {
  syncLayoutBodyClasses(shellState);
  syncHeaderShellState(shellState);
  clearHomePageState(shellState);
}

function getVisitShellState(visit) {
  const nextDocument = visit?.to?.document;
  const nextUrl = visit?.to?.url || window.location.pathname;
  if (!nextDocument) return null;

  return readPageShellStateFromRoot(nextDocument, nextUrl);
}

const ROUTE_STYLESHEET_SELECTOR = 'link[rel="stylesheet"][href]';
const PERSISTED_STYLESHEET_ATTRIBUTE = 'data-swup-persisted-stylesheet';
const VITE_DEV_STYLE_SELECTOR = 'style[data-vite-dev-id]';

function normalizeStylesheetHref(stylesheet) {
  const href = stylesheet?.getAttribute('href') || stylesheet?.href;
  if (!href) return '';

  try {
    return new URL(href, window.location.origin).href;
  } catch (error) {
    return stylesheet.href || href;
  }
}

function getTargetStylesheetHrefs(visit) {
  const targetHead = visit?.to?.document?.head;
  if (!targetHead) return null;

  return new Set(
    Array.from(targetHead.querySelectorAll(ROUTE_STYLESHEET_SELECTOR))
      .map(normalizeStylesheetHref)
      .filter(Boolean)
  );
}

function prepareStylesheetPersistenceForHeadSync(visit) {
  const targetStylesheetHrefs = getTargetStylesheetHrefs(visit);
  if (!targetStylesheetHrefs) return;

  document.head.querySelectorAll(ROUTE_STYLESHEET_SELECTOR).forEach((stylesheet) => {
    const href = normalizeStylesheetHref(stylesheet);
    if (!href || targetStylesheetHrefs.has(href)) return;

    stylesheet.setAttribute(PERSISTED_STYLESHEET_ATTRIBUTE, '');
  });
}

function shouldPersistStylesheetDuringHeadSync(tag) {
  return tag.matches?.(ROUTE_STYLESHEET_SELECTOR) &&
    tag.hasAttribute(PERSISTED_STYLESHEET_ATTRIBUTE);
}

function cleanupPersistedStylesheetsForHeadSync(visit) {
  const targetStylesheetHrefs = getTargetStylesheetHrefs(visit);
  const persistedSelector = `${ROUTE_STYLESHEET_SELECTOR}[${PERSISTED_STYLESHEET_ATTRIBUTE}]`;

  document.head.querySelectorAll(persistedSelector).forEach((stylesheet) => {
    const href = normalizeStylesheetHref(stylesheet);
    const isStillNeeded = targetStylesheetHrefs?.has(href);

    if (!targetStylesheetHrefs || isStillNeeded) {
      stylesheet.removeAttribute(PERSISTED_STYLESHEET_ATTRIBUTE);
      return;
    }

    stylesheet.remove();
  });
}

function preserveViteDevStylesForHeadSync(visit) {
  document.querySelectorAll(VITE_DEV_STYLE_SELECTOR).forEach((style) => {
    style.setAttribute('data-swup-theme', '');
  });

  const currentStyleIds = new Set(
    Array.from(document.querySelectorAll(VITE_DEV_STYLE_SELECTOR))
      .map((style) => style.getAttribute('data-vite-dev-id'))
      .filter(Boolean)
  );

  visit?.to?.document?.head
    ?.querySelectorAll(VITE_DEV_STYLE_SELECTOR)
    .forEach((style) => {
      const viteDevStyleId = style.getAttribute('data-vite-dev-id');
      if (!viteDevStyleId || !currentStyleIds.has(viteDevStyleId)) {
        return;
      }

      style.remove();
    });
}

function getUrlPathname(url = window.location.pathname) {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch (error) {
    return String(url).split('?')[0].split('#')[0];
  }
}

function isArticlePageUrl(url = window.location.pathname) {
  const path = getUrlPathname(url);
  return path === '/articles' || path.startsWith('/articles/');
}

function isFilteredPageUrl(url = window.location.pathname) {
  const path = getUrlPathname(url);
  return path === '/filtered' || path.startsWith('/filtered/');
}

function isArticleTransitionPageUrl(url = window.location.pathname) {
  return isArticlePageUrl(url);
}

// 只让真正的文章目录/详情页使用 article-content 级过渡。
function isArticleTransitionPage() {
  return isArticleTransitionPageUrl();
}

const timelineYearSpy = {
  cleanup: null,

  init() {
    this.cleanup?.();

    const links = Array.from(document.querySelectorAll('[data-timeline-year-link]'));
    const sections = Array.from(document.querySelectorAll('[data-timeline-year-section]'));

    if (!links.length || !sections.length) {
      this.cleanup = null;
      return;
    }

    let frameId = 0;
    let ticking = false;

    const setActiveYear = (year) => {
      links.forEach((link) => {
        const isActive = link.dataset.timelineYearLink === year;
        link.classList.toggle('active', isActive);

        if (isActive) {
          link.setAttribute('aria-current', 'true');
          link.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    const getCurrentYear = () => {
      const readingLine = window.innerHeight * 0.26;
      let currentYear = sections[0]?.getAttribute('data-timeline-year-section') || '';

      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= readingLine) {
          currentYear = section.getAttribute('data-timeline-year-section') || currentYear;
        } else {
          break;
        }
      }

      return currentYear;
    };

    const updateActiveYear = () => {
      frameId = 0;
      ticking = false;
      setActiveYear(getCurrentYear());
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      frameId = window.requestAnimationFrame(updateActiveYear);
    };

    const observer = new IntersectionObserver(requestUpdate, {
      root: null,
      rootMargin: '-18% 0px -64% 0px',
      threshold: [0, 0.2, 0.6, 1]
    });

    sections.forEach((section) => observer.observe(section));
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    requestUpdate();
    window.requestAnimationFrame(requestUpdate);

    this.cleanup = () => {
      observer.disconnect();
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      this.cleanup = null;
    };
  }
};

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
  const shouldUseArticleTransition = isArticleTransitionPage();

  // 应用到主容器 - 只在非文章内容过渡页
  const mainElement = document.querySelector('main');
  if (mainElement) {
    if (shouldUseArticleTransition) {
      mainElement.classList.remove('transition-fade');
      mainElement.removeAttribute('data-swup-transition');
      mainElement.style.removeProperty('opacity');
    } else {
      mainElement.classList.add('transition-fade');
      setElementTransition(mainElement);
    }
  }
  
  // 应用到文章内容 - 只在真正的文章内容过渡页
  const articleContent = document.querySelector('#article-content');
  if (articleContent) {
    if (shouldUseArticleTransition) {
      articleContent.classList.add('swup-transition-article');
      setElementTransition(articleContent);
    } else {
      articleContent.classList.remove('swup-transition-article');
      articleContent.removeAttribute('data-swup-transition');
      articleContent.style.removeProperty('opacity');
    }
  }
}

// 获取当前页面的活跃元素（用于动画）
function getActiveElement() {
  if (isArticleTransitionPage()) {
    return document.querySelector('#article-content');
  }

  return document.querySelector('main');
}

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  if (window.swup) return;

  // 应用过渡效果
  applyTransitions();
  
  // 创建加载动画元素
  const spinner = createLoadingSpinner();
  
  // 页面状态跟踪
  let animationInProgress = false;
  // 添加状态变量
  let isLoading = false;
  let contentReady = false;
  
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

  // 根据当前页面动态确定容器配置
  const containers = ['main']; // 主容器始终存在
  
  // 只有当文章内容容器存在时才添加
  if (isArticleTransitionPage() && containerExists('#article-content')) {
    containers.push('#article-content');
  }
  
  // 创建Swup实例
  const swup = new Swup({
    // Swup的基本配置
    animationSelector: '[class*="transition-"], .swup-transition-article',
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
      const isFromFilterPage = isFilteredPageUrl(visit?.from?.url);
      const isToFilterPage = isFilteredPageUrl(visit?.to?.url);
      const isFromArticlePage = isArticlePageUrl(visit?.from?.url);
      const isToArticlePage = isArticlePageUrl(visit?.to?.url);

      // 筛选页的布局壳和文章页不同，必须完整替换 main，避免路径栏残留。
      if (isFromFilterPage || isToFilterPage) {
        return ['main'];
      }
      
      // 文章目录、正文和路径栏分属不同层级，文章区内部导航统一替换 main。
      if (isFromArticlePage || isToArticlePage) {
        return ['main'];
      }
      
      // 默认情况：使用main容器
      return ['main'];
    },
    plugins: [] // 手动添加插件以控制顺序
  });
  window.swup = swup;
  
  // 添加预加载插件 - 代替原有的预加载功能
  const preloadPlugin = new SwupPreloadPlugin({
    // 早初始化 Swup，但降低首屏资源争用。
    throttle: window.matchMedia('(max-width: 767px)').matches ? 1 : 2,
    // 开启鼠标悬停预加载
    preloadHoveredLinks: true,
    preloadInitialPage: false
  });
  swup.use(preloadPlugin);

  swup.hooks.before('content:replace', prepareStylesheetPersistenceForHeadSync, {
    priority: -110
  });

  swup.hooks.before('content:replace', preserveViteDevStylesForHeadSync, {
    priority: -100
  });
  
  // 创建并注册Head插件，用于解决CSS丢失问题
  const headPlugin = new SwupHeadPlugin({
    persistTags: shouldPersistStylesheetDuringHeadSync,
    persistAssets: false,
    keepScrollOnReload: true, // 保持滚动位置
    awaitAssets: false // 优先展示新页面，避免首跳卡在资源同步上
  });
  swup.use(headPlugin);
  
  // 添加Scripts插件 - 确保页面转场后脚本能重新执行
  const scriptsPlugin = new SwupScriptsPlugin({
    // 以下选项确定哪些脚本会被重新执行
    head: false,        // head 由 HeadPlugin 同步，重复执行容易造成全局脚本二次注册
    body: true,         // 重新执行body中的脚本
    optin: false        // 是否只执行带有[data-swup-reload-script]属性的脚本
  });
  swup.use(scriptsPlugin);
  
  // 创建Fragment插件 - 只在需要的页面使用
  const fragmentPlugin = new SwupFragmentPlugin({
    debug: false, // 关闭调试模式
    // 修改规则，增加更细致的配置
    rules: [
      {
        name: 'article-pages',
        from: ['/articles'],
        to: ['/articles'],
        containers: ['main']
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
  syncPageShellState();
  timelineYearSpy.init();
  window.addEventListener('scroll', updateHeaderScrollState, { passive: true });
  setSwupLoadingState(false);

  
  // 1. 访问开始 - 显示加载动画，准备页面退出
  swup.hooks.on('visit:start', (visit) => {
    isLoading = true;
    contentReady = false;
    animationInProgress = true;
    timelineYearSpy.cleanup?.();
    primeIncomingHeaderBackground(getVisitShellState(visit));
    
    // 发送页面切换事件
    sendPageTransitionEvent();
    
    // 显示加载动画
    showLoadingSpinner(spinner);
    
    // 检查目标URL是否为文章相关页面
    const isTargetArticleTransitionPage = isArticleTransitionPageUrl(visit.to.url);
    const isCurrentArticleTransitionPage = isArticleTransitionPage();
    
    // 如果当前是文章内容过渡页，但目标不是，恢复main动画
    if (isCurrentArticleTransitionPage && !isTargetArticleTransitionPage) {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        setElementOpacity(mainElement, 0);
      }
    }
    // 如果当前不是文章内容过渡页，但目标是，准备article-content动画
    else if (!isCurrentArticleTransitionPage && isTargetArticleTransitionPage) {
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
    const nextShellState = getVisitShellState(visit);
    if (nextShellState) {
      syncPageShellState(nextShellState);
    }

    if (isHomeUrl(visit?.to?.url)) {
      hideLoadingSpinnerImmediately(spinner);
    }

    // 如果是载入文章页面但Fragment插件未加载，则加载它
    if (isArticleTransitionPageUrl(visit.to.url) &&
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
    syncPageShellState();
    timelineYearSpy.init();

    const activeElement = getActiveElement();
    if (activeElement) {
      if (isArticleTransitionPage() && activeElement.id === 'article-content') {
        activeElement.classList.add('swup-transition-article');
        setElementTransition(activeElement);
      } else if (!isArticleTransitionPage() && activeElement.tagName.toLowerCase() === 'main') {
        activeElement.classList.add('transition-fade');
        setElementTransition(activeElement);
      }

      setElementOpacity(activeElement, 1);
    }

    // 重新设置过渡样式，但不要立即隐藏加载动画
    setTimeout(() => {
      setupTransition();
    }, 10);
  });

  swup.hooks.on('content:replace', cleanupPersistedStylesheetsForHeadSync);
  
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
  swup.hooks.on('page:view', (visit) => {
    isLoading = false;
    contentReady = false;
    animationInProgress = false;
    clearSwupNavigationError();

    // 最终确保隐藏加载动画
    hideLoadingSpinner(spinner);

    // 同步 body 上的页面级 layout class —— swup 不会自动替换 body 属性
    syncPageShellState();
    timelineYearSpy.init();
    dispatchAstroNavigationLifecycle(visit);
  });
  
  // 加载失败处理
  swup.hooks.on('fetch:error', (error) => {
    isLoading = false;
    contentReady = false;
    animationInProgress = false;
    hideLoadingSpinner(spinner);
    setSwupLoadingState(false);
    
    console.error('Fetch error:', error);

    const targetUrl = error?.visit?.to?.url || window.location.pathname;
    const reason = formatSwupError(error);
    setSwupNavigationError(targetUrl, reason);

    console.warn('Swup fetch fallback suppressed to avoid reload loops.', {
      targetUrl,
      currentUrl: window.location.pathname,
      reason,
      lastNavigationError,
    });
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
  
  // 在页面卸载和Astro视图转换时清理资源
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    window.removeEventListener('scroll', updateHeaderScrollState, { passive: true });
    timelineYearSpy.cleanup?.();

    // 发送页面切换事件
    sendPageTransitionEvent();
    window.console.error = originalErrorHandler;
    setSwupLoadingState(false);
    
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

    if (window.swup === swup) {
      delete window.swup;
    }
  };

  // 注册清理事件
  window.addEventListener('beforeunload', cleanup, { once: true });
  document.addEventListener('astro:before-swap', cleanup, { once: true });
}); 
