export const SITE_URL = 'https://b.u.cd';
export const SITE_TITLE = "echoes";
export const SITE_DESCRIPTION = "记录生活，分享所思";
// 可选：外部静态资源代理模板，使用 {url} 和 {headers} 作为占位符；未配置时使用站点内置后端代理。
export const ASSET_RELAY_URL = "https://proxy.u.cd/download?url={url}&headers={headers}";
// 可选：源码仓库地址。未配置 url 时，文章历史只显示本地 Git 信息，不生成提交或历史快照外链。
// 常见平台会根据 url 识别；自建服务可额外配置 provider: "gitea" 等真实平台名。
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
    warningMessage: '这篇文章已经发布超过一年了，内容可能已经过时，请谨慎参考。' // 提醒消息
};

