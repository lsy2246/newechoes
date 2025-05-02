export const SITE_URL = 'https://blog.lsy22.com';
export const SITE_NAME = "echoes";
export const SITE_DESCRIPTION = "记录生活，分享所思";

// 原始导航链接（保留用于兼容）
export const NAV_LINKS = [
    { href: '/', text: '首页' },
    { href: '/filtered', text: '筛选' },
    { href: '/articles', text: '文章' },
    { href: '/movies', text: '观影' },
    { href: '/books', text: '读书' },
    { href: '/projects', text: '项目' },
    { href: '/other', text: '其他' },
];

// 新的导航结构 - 支持分层导航
export const NAV_STRUCTURE = [
    {
        id: 'home',
        text: '首页',
        href: '/'
    },
    {
        id: 'douban',
        text: '豆瓣',
        items: [
            { id: 'movies', text: '观影', href: '/movies' },
            { id: 'books', text: '读书', href: '/books' }
        ]
    },
    {
        id: 'articles',
        text: '文章',
        items: [
            { id: 'filter', text: '筛选', href: '/filtered' },
            { id: 'path', text: '文章', href: '/articles' }
        ]
    },
    {
        id: 'others',
        text: '其他',
        items: [
            { id: 'other', text: '其他', href: '/other' },
            { id: 'projects', text: '项目', href: '/projects' }
        ]
    }
];

export const ICP = '渝ICP备2022009272号';
export const PSB_ICP = '渝公网安备50011902000520号';
export const PSB_ICP_URL = 'http://www.beian.gov.cn/portal/registerSystemInfo';

export const VISITED_PLACES = ['中国-黑龙江', '中国-吉林', '中国-辽宁', '中国-北京', '中国-天津', '中国-广东', '中国-西藏', '中国-河北', '中国-山东', '中国-湖南', '中国-重庆', '中国-四川', "马来西亚", "印度尼西亚", "泰国"];

export const DOUBAN_ID = 'lsy22';

export const ARTICLE_EXPIRY_CONFIG = {
    enabled: true, // 是否启用文章过期提醒
    expiryDays: 365, // 文章过期天数
    warningMessage: '这篇文章已经发布超过一年了，内容可能已经过时，请谨慎参考。' // 提醒消息
};

