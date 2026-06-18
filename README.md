# New Echoes

一个可直接运行的 Astro 个人站点模板。

这个仓库保留通用代码、组件调用示例和一篇博客使用教程，适合作为 fork 后持续同步的公共代码库。个人文章、个人首页文案、个人部署配置建议维护在自己的站点仓库中，避免后续同步上游时被公共仓库内容干扰。

## 配置

- 实际生效配置：`src/consts.ts`
- 完整注释示例：`src/consts.example.ts`
- 默认示例文章：`src/content/echoes博客使用说明.md`

`src/consts.ts` SEO/RSS/sitemap/robots/llms 默认开启；文章过期提醒、源码仓库外链、资源代理等可选配置不填也能运行，需要时从 `src/consts.example.ts` 复制对应配置块到 `src/consts.ts`。首页文案在 `src/pages/index.astro` 的 `homeProfile` 中配置，其他页面的组件示例参数也保留在各自调用处。

## 内容

公共模板只保留一篇教程文章。自己的文章可以继续按 Astro Content Collection 的方式放入 `src/content`，但建议在个人站点仓库中维护。

**使用教程**：[点击查看](src/content/echoes博客使用说明.md)

## 在线部署参考

- Cloudflare Pages：https://newechoes.pages.dev/
- Vercel：https://echoes-git-master-lsy22s-projects.vercel.app/
- EdgeOne Pages：https://newechoes.edgeone.app/
