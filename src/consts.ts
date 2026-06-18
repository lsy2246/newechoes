/**
 * 公共模板默认配置。
 *
 * 这里只保留站点必选配置。组件示例参数直接写在对应页面里，方便使用者在调用处修改。
 * 可选功能配置可以按需从 `src/consts.example.ts` 复制过来。
 */
export const SITE_META = {
  url: "https://example.com",
  title: "Echoes",
  author: "Site Owner",
  description: "A personal writing, projects, and knowledge site.",
} as const;

export const NAV_STRUCTURE = [
  { id: "home", text: "首页", href: "/" },
  {
    id: "articles",
    text: "文章",
    items: [
      { id: "path", text: "网格", href: "/articles" },
      { id: "filter", text: "筛选", href: "/filtered" },
      { id: "timeline", text: "时间轴", href: "/timeline" },
    ],
  },
  {
    id: "art",
    text: "艺术",
    items: [
      { id: "movies", text: "观影", href: "/movies" },
      { id: "books", text: "读书", href: "/books" },
    ],
  },
  { id: "albums", text: "相册", href: "/albums" },
  {
    id: "other",
    text: "其他",
    items: [
      { id: "about", text: "关于", href: "/about" },
      { id: "projects", text: "项目", href: "/projects" },
    ],
  },
];
