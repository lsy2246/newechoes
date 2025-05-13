// 统一初始化Swup和所有插件
import Swup from 'swup';
import SwupFragmentPlugin from '@swup/fragment-plugin';
// 添加Head插件解决CSS丢失问题
import SwupHeadPlugin from '@swup/head-plugin';
// 添加预加载插件 - 优化导航体验
import SwupPreloadPlugin from '@swup/preload-plugin';
// 添加Scripts插件 - 确保页面转场后脚本能重新执行
import SwupScriptsPlugin from '@swup/scripts-plugin';

// 检查是否是文章相关页面
function isArticlePage() {
  const path = window.location.pathname;
  return path.includes('/articles') || path.includes('/filtered');
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
  
  // 创建Swup实例
  const swup = new Swup({
    // Swup的基本配置
    animationSelector: '[class*="transition-"], .swup-transition-article, #article-content',
    cache: true,
    containers: ['main'],
    animationScope: 'html', // 确保动画状态类添加到html元素
    linkSelector: 'a[href^="/"]:not([data-no-swup]), a[href^="' + window.location.origin + '"]:not([data-no-swup])',
    skipPopStateHandling: (event) => {
      return event.state && event.state.source === 'swup';
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
  const headPlugin = new SwupHeadPlugin();
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
  
  // 创建Fragment插件 - 简化规则避免匹配问题
  const fragmentPlugin = new SwupFragmentPlugin({
    debug: false, // 关闭调试模式
    rules: [
      {
        name: 'article-pages',
        from: ['/articles', '/filtered'],
        to: ['/articles', '/filtered'],
        containers: ['#article-content']
      }
    ]
  });
  
  // 添加Fragment插件到Swup
  swup.use(fragmentPlugin);
  
  // 初始化后手动扫描并预加载带有data-swup-preload属性的链接
  setTimeout(() => {
    swup.preloadLinks();
  }, 1000);
  
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
  
  // 在页面内容加载后重新应用样式
  swup.hooks.on('content:replace', () => {
    // 重新设置过渡样式
    setTimeout(() => {
      setupTransition();
    }, 10);
  });
  
  // 监听动画开始和结束
  swup.hooks.on('animation:out:start', () => {
    // 发送页面切换事件
    sendPageTransitionEvent();
    
    // 获取并淡出当前活跃元素
    const activeElement = getActiveElement();
    setElementOpacity(activeElement, 0);
  });
  
  swup.hooks.on('animation:in:start', () => {
    // 等待短暂延迟后恢复可见度
    setTimeout(() => {
      // 获取并淡入当前活跃元素
      const activeElement = getActiveElement();
      setElementOpacity(activeElement, 1);
    }, 50); // 短暂延迟确保可以看到效果
  });
  
  // 添加手动强制动画事件
  document.addEventListener('swup:willReplaceContent', () => {
    // 发送页面切换事件
    sendPageTransitionEvent();
    
    // 获取并淡出当前活跃元素
    const activeElement = getActiveElement();
    setElementOpacity(activeElement, 0);
  });

  // 在页面内容替换后强制应用动画
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
    
    // 延迟后淡入
    setTimeout(() => {
      setElementOpacity(activeElement, 1);
    }, 50);
  });
  
  // 监听URL变化以更新动画行为
  swup.hooks.on('visit:start', (visit) => {
    // 发送页面切换事件
    sendPageTransitionEvent();
    
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
  
  
  // 监听Fragment插件是否成功应用
  document.addEventListener('swup:fragmentReplaced', () => {
    // 确保新内容有正确的过渡样式
    setTimeout(() => {
      setupTransition();
    }, 10);
  });

  // 在页面卸载和Astro视图转换时清理资源
  const cleanup = () => {
    // 发送页面切换事件
    sendPageTransitionEvent();
    
    if (swup) {
      swup.unuse(fragmentPlugin);
      swup.unuse(headPlugin);
      swup.unuse(preloadPlugin);
      swup.unuse(scriptsPlugin); // 也需要卸载Scripts插件
      swup.destroy();
    }
  };

  // 注册清理事件
  window.addEventListener('beforeunload', cleanup, { once: true });
  document.addEventListener('astro:before-swap', cleanup, { once: true });
}); 