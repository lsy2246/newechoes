export const SITE_URL = 'https://blog.lsy22.com';
export const SITE_TITLE = "echoes";
export const SITE_DESCRIPTION = "记录生活，分享所思";
// 新的导航结构 - 支持分层导航
export const NAV_STRUCTURE = [
    { id: "home", text: "首页", href: "/" },
    {
        id: 'articles',
        text: '文章',
        items: [
            { id: 'path', text: '网格', href: '/articles' },
            { id: 'filter', text: '筛选', href: '/filtered' }
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

// 主页 diorama —— 笔记本屏幕上显示的个人信息
// 所有字段都可以改。rows 可加可减；typewriter 列表里的每一条都会被轮播打字-删除。
export const HOME_PROFILE = {
    title: 'lsy',                               // 屏幕上的大字
    subtitle: 'full-stack engineer',            // 大字下方副标题
    rows: [
        { label: 'stack', value: 'Rust · TypeScript' },
        { label: 'contact', value: 'lsy22@vip.qq.com' },
    ] as { label: string; value: string }[],
    typewriter: [
        'echo "Hello, World!"',
        'sudo su -',
        'rm -rf /*',
    ] as string[],
};

