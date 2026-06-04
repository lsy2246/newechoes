/**
 * 站点元信息。
 *
 * - url: 站点根地址。用于 canonical、sitemap、RSS、Open Graph、JSON-LD URL。
 * - title: 站点名。用于默认网页标题、RSS 标题、JSON-LD WebSite.name。
 * - author: 作者名。用于 Article.author、RSS author、JSON-LD Person.name。
 */
export const SITE_META = {
    url: "https://b.u.cd",
    title: "echoes",
    author: "lsy",
} as const;
// 可选：外部静态资源代理模板，使用 {url} 和 {headers} 作为占位符；未配置时使用站点内置后端代理。
export const ASSET_RELAY_URL = "https://proxy.u.cd/download?url={url}&headers={headers}";
// 可选：源码仓库地址。未配置 url 时，文章历史只显示本地 Git 信息，不生成提交或历史快照外链。
export const SOURCE_REPOSITORY_CONFIG = {
    url: "https://github.com/lsy2246/newechoes",
    provider: "github",
};
// 新的导航结构 - 支持分层导航
export const NAV_STRUCTURE = [
    { id: "home", text: "首页", href: "/" },
    {
        id: 'articles',
        text: '文章',
        items: [
            { id: 'path', text: '网格', href: '/articles' },
            { id: 'filter', text: '筛选', href: '/filtered' },
            { id: 'timeline', text: '时间轴', href: '/timeline' },
        ]
    },
    {
        id: 'art',
        text: '艺术',
        items: [
            { id: 'movies', text: '观影', href: '/movies' },
            { id: 'books', text: '读书', href: '/books' }
        ]
    },
    { id: 'albums', text: '相册', href: '/albums' },
    {
        id: 'other',
        text: '其他',
        items: [
            { id: 'about', text: '关于', href: '/about' },
            { id: 'projects', text: '项目', href: '/projects' }
        ]
    }
];

export const ARTICLE_EXPIRY_CONFIG = {
    enabled: true, // 是否启用文章过期提醒
    expiryDays: 365, // 文章过期天数
    warningMessage: '这篇文章最近一次更新距离现在已经超过一年了，内容可能已经过时，请谨慎参考。' // 提醒消息
};

