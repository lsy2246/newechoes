// 统一初始化Swup和所有插件
import Swup from 'swup';
import SwupFragmentPlugin from '@swup/fragment-plugin';
// 添加Head插件解决CSS丢失问题
import SwupHeadPlugin from '@swup/head-plugin';
// 添加预加载插件 - 优化导航体验
import SwupPreloadPlugin from '@swup/preload-plugin';

// 检查是否是文章相关页面
function isArticlePage() {
  const path = window.location.pathname;
  return path.includes('/articles') || path.includes('/filtered');
}

// 为元素应用动画样式
function applyAnimationStyles(element, className, duration = 300) {
  if (!element) return;
  
  // 添加动画类
  element.classList.add(className);
  
  // 设置过渡属性
  element.style.transition = 'opacity 0.3s ease';
  element.style.animationDuration = '0.3s';
  element.style.opacity = '1';
  
  // 添加data-swup属性标记
  element.setAttribute('data-swup-transition', 'true');
  element.setAttribute('data-swup-animation-duration', duration.toString());
}

// 设置元素淡入/淡出效果
function setElementOpacity(element, opacity) {
  if (!element) return;
  element.style.opacity = opacity.toString();
  if (opacity === 0) {
    element.style.transition = 'opacity 0.3s ease';
  }
}

// 直接应用样式到元素上
function applyStylesDirectly() {
  // 应用到主容器 - 只在非文章页面
  const mainElement = document.querySelector('main');
  if (mainElement) {
    mainElement.classList.add('transition-fade');
    
    // 只有在非文章页面时，才为main添加必要的动画样式
    if (!isArticlePage()) {
      applyAnimationStyles(mainElement, 'transition-fade');
    }
  }
  
  // 应用到文章内容 - 只在文章页面
  const articleContent = document.querySelector('#article-content');
  if (articleContent) {
    applyAnimationStyles(articleContent, 'swup-transition-article');
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
  // 直接应用样式
  applyStylesDirectly();
  
  // 创建Swup实例
  const swup = new Swup({
    // Swup的基本配置
    animationSelector: '[class*="transition-"], #article-content, .swup-transition-article, main',
    cache: true,
    containers: ['main'],
    animationScope: 'html', // 确保动画状态类添加到html元素
    linkSelector: 'a[href^="/"]:not([data-no-swup]), a[href^="' + window.location.origin + '"]:not([data-no-swup])',
    skipPopStateHandling: (event) => {
      return event.state && event.state.source === 'swup';
    },
    plugins: [] // 手动添加插件以控制顺序
  });
  
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
  
  // 创建Fragment插件 - 简化规则避免匹配问题
  const fragmentPlugin = new SwupFragmentPlugin({
    debug: false, // 关闭调试模式
    // 简化规则，确保基本匹配
    rules: [
      {
        // 文章页面之间的导航
        name: 'article-pages',
        from: '/articles', // 简化匹配规则
        to: '/articles',
        containers: ['#article-content']
      },
      {
        // 从文章到筛选页面
        name: 'article-to-filter',
        from: '/articles',
        to: '/filtered',
        containers: ['#article-content']
      },
      {
        // 从筛选到文章页面
        name: 'filter-to-article',
        from: '/filtered',
        to: '/articles',
        containers: ['#article-content']
      },
      {
        // 筛选页面内部导航
        name: 'filter-pages',
        from: '/filtered',
        to: '/filtered',
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
  
  // 强制应用动画样式到特定元素
  function setupTransition() {
    // 直接应用样式 - 会根据页面类型自动选择正确的元素
    applyStylesDirectly();
    
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
    
    // 重新应用适当的类和属性
    if (isArticlePage() && activeElement.id === 'article-content') {
      applyAnimationStyles(activeElement, 'swup-transition-article');
    } else if (!isArticlePage() && activeElement.tagName.toLowerCase() === 'main') {
      applyAnimationStyles(activeElement, 'transition-fade');
    }
    
    // 延迟后淡入
    setTimeout(() => {
      setElementOpacity(activeElement, 1);
    }, 50);
  });
  
  // 监听URL变化以更新动画行为
  swup.hooks.on('visit:start', (visit) => {
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
        // 移除main的动画效果
        mainElement.style.transition = '';
        mainElement.style.opacity = '1';
      }
    }
  });
  
  // Fragment导航后手动更新面包屑
  function updateBreadcrumb(url) {
    // 1. 获取新页面的HTML以提取面包屑
    fetch(url)
      .then(response => response.text())
      .then(html => {
        // 创建一个临时的DOM解析新页面
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(html, 'text/html');
        
        // 获取新页面的面包屑容器 - 使用更精确的选择器
        const newBreadcrumbContainer = newDoc.querySelector('.bg-white.dark\\:bg-gray-800.rounded-xl.mb-4, .bg-white.dark\\:bg-gray-800.rounded-xl.p-4');
        
        // 获取当前页面的面包屑容器
        const currentBreadcrumbContainer = document.querySelector('.bg-white.dark\\:bg-gray-800.rounded-xl.mb-4, .bg-white.dark\\:bg-gray-800.rounded-xl.p-4');
        
        if (newBreadcrumbContainer && currentBreadcrumbContainer) {
          // 更新面包屑内容
          currentBreadcrumbContainer.innerHTML = newBreadcrumbContainer.innerHTML;
          
          // 重新初始化面包屑相关脚本
          const breadcrumbScript = currentBreadcrumbContainer.querySelector('script');
          if (breadcrumbScript) {
            const newScript = document.createElement('script');
            newScript.textContent = breadcrumbScript.textContent;
            breadcrumbScript.parentNode.replaceChild(newScript, breadcrumbScript);
          }
        }
      })
      .catch(error => {
        // 出错时静默处理
      });
  }
  
  // 在每次页面转换结束后更新面包屑
  swup.hooks.on('visit:end', (visit) => {
    // 所有导航都更新面包屑
    updateBreadcrumb(visit.to.url);
    
    // 确保在页面加载完成后元素有正确样式
    setTimeout(() => {
      setupTransition();
      
      // 加载完成后重新扫描预加载链接
      setTimeout(() => {
        swup.preloadLinks();
      }, 500);
    }, 50);
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
    if (swup) {
      swup.unuse(fragmentPlugin);
      swup.unuse(headPlugin);
      swup.unuse(preloadPlugin);
      swup.destroy();
    }
  };

  // 注册清理事件
  window.addEventListener('beforeunload', cleanup, { once: true });
  document.addEventListener('astro:before-swap', cleanup, { once: true });
}); 