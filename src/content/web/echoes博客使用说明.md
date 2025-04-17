---
title: "echoes博客使用说明"
date: 2025-03-09T01:07:23Z
tags: []
---

这是一个基于 Astro + React 构建的个人博客系统，具有文章管理、项目展示、观影记录、读书记录等功能。本文将详细介绍如何使用和配置这个博客系统。

## 功能特点

1. **响应式设计**：完美适配桌面端和移动端
2. **深色模式**：支持自动和手动切换深色/浅色主题
3. **文章系统**：支持 Markdown 写作，带有标签和分类
4. **项目展示**：支持展示 GitHub、Gitea 和 Gitee 的项目
5. **观影记录**：集成豆瓣观影数据
6. **读书记录**：集成豆瓣读书数据
7. **旅行足迹**：支持展示全球旅行足迹热力图

## 基础配置

主要配置文件位于 `src/consts.ts`，你需要修改以下内容：

```typescript
// 网站基本信息
export const SITE_URL = 'https://your-domain.com';
export const SITE_NAME = "你的网站名称";
export const SITE_DESCRIPTION = "网站描述";

// 导航链接
export const NAV_LINKS = [
    { href: '/', text: '首页' },
    { href: '/articles', text: '文章' },
    { href: '/movies', text: '观影' },
    { href: '/books', text: '读书' },
    { href: '/projects', text: '项目' },
    { href: '/other', text: '其他' }
];

// 备案信息（如果需要）
export const ICP = '你的ICP备案号';
export const PSB_ICP = '你的公安备案号';
export const PSB_ICP_URL = '备案链接';

// 豆瓣配置
export const DOUBAN_ID = '你的豆瓣ID';

// 旅行足迹
export const VISITED_PLACES = ['中国-北京', '中国-上海', '美国-纽约'];
```

## 文章写作

### 创建新文章

你可以通过以下两种方式创建新文章：

#### 1. 使用创建脚本（推荐）

项目根目录下提供了 `create_post.sh` 脚本来快速创建文章：

```bash
# 添加执行权限（首次使用时）
chmod +x create_post.sh

# 方式1：交互式创建
./create_post.sh
# 按提示输入文章标题和路径

# 方式2：命令行参数创建
./create_post.sh "文章标题" "目录/文章路径"
# 例如：./create_post.sh "我的新文章" "web/my-post"
```

脚本会自动：

- 在指定位置创建文章文件
- 添加必要的 frontmatter（标题、日期、标签）
- 检查文件是否已存在
- 显示文件的绝对路径

#### 2. 手动创建

在 `src/content/articles` 目录下创建 `.md` 或 `.mdx` 文件。文章需要包含以下前置信息：

```markdown
---
title: "文章标题"
date: YYYY-MM-DD
tags: ["标签1", "标签2"]
---

文章内容...
```

### 文章过期提醒

博客系统支持文章过期提醒功能，可以在 `src/consts.ts` 中配置：

```typescript
export const ARTICLE_EXPIRY_CONFIG = {
    enabled: true, // 是否启用文章过期提醒
    expiryDays: 365, // 文章过期天数
    warningMessage: '这篇文章已经发布超过一年了，内容可能已经过时，请谨慎参考。' // 提醒消息
};
```

### 文章列表展示

文章列表页面会自动获取所有文章并按日期排序展示，支持：

- 文章标题和摘要
- 发布日期
- 标签系统
- 阅读时间估算

## 项目展示

项目展示页面支持从 GitHub、Gitea 和 Gitee 获取和展示项目信息。

### GitProjectCollection 组件

用于展示 Git 平台的项目列表。

基本用法：

```astro
---
import GitProjectCollection from '@/components/GitProjectCollection';
import { GitPlatform } from '@/components/GitProjectCollection';
---

<GitProjectCollection 
  platform={GitPlatform.GITEA}   // 平台类型：GITHUB、GITEA、GITEE
  username="your-username"       // 必填：用户名
  title="Git 项目"               // 可选：显示标题
  url="https://your-gitea.com"   // 可选：Gitea 实例 URL（Gitea 必填，GitHub/Gitee 无需填写）
  token="your-token"             // 可选：访问令牌，用于访问私有仓库
  perPage={10}                   // 可选：每页显示数量，默认 10
  client:load                    // Astro 指令：客户端加载
/>
```

## 观影和读书记录

### MediaGrid 组件

`MediaGrid` 组件用于展示豆瓣的观影和读书记录。

#### 基本用法

```astro
---
import MediaGrid from '@/components/MediaGrid.astro';
---

// 展示电影记录
<MediaGrid 
  type="movie"              // 类型：movie 或 book
  title="我看过的电影"      // 显示标题
  doubanId={DOUBAN_ID}     // 使用配置文件中的豆瓣ID
/>

// 展示读书记录
<MediaGrid 
  type="book"
  title="我读过的书"
  doubanId={DOUBAN_ID}
/>
```

## 旅行足迹

### WorldHeatmap 组件

`WorldHeatmap` 组件用于展示你去过的地方，以热力图的形式在世界地图上显示。

#### 基本用法

在 `src/consts.ts` 中配置你去过的地方：

```typescript
// 配置你去过的地方
export const VISITED_PLACES = [
  // 国内地区格式：'中国-省份/城市'
  '中国-黑龙江', 
  '中国-北京', 
  '中国-上海',
  // 国外地区直接使用国家名
  '马来西亚',
  '泰国',
  '美国'
];
```

然后在页面中使用：

```astro
---
import Layout from "@/components/Layout.astro";
import WorldHeatmap from '@/components/WorldHeatmap';
import { VISITED_PLACES } from '@/consts';
---

<Layout title="旅行足迹">
  <section>
    <h2 class="text-3xl font-semibold text-center mb-6">我的旅行足迹</h2>
    <div class="mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <WorldHeatmap 
        client:only="react" 
        visitedPlaces={VISITED_PLACES}
      />
    </div>
  </section>
</Layout>
```


## 主题切换

系统支持三种主题模式：

1. 跟随系统
2. 手动切换浅色模式
3. 手动切换深色模式

主题设置会被保存在浏览器的 localStorage 中。

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装步骤

1. 克隆项目

 ```bash
  git clone https://github.com/your-username/echoes.git
  cd echoes
  ```

2. 安装依赖

  ```bash
  npm install
  # 或者使用 pnpm
  pnpm install
  ```

3. 修改配置

  编辑 `src/consts.ts` 文件，更新网站配置信息。

4. 本地运行
  
```bash
npm run dev
```

访问 `http://localhost:4321` 查看效果。

## 部署说明

### 部署方式选择

1. **Vercel 部署（推荐）**
   - 支持所有功能
   - 自动部署和 HTTPS
   - 支持 API 路由和动态数据
   - 可配合多吉云CDN实现自动刷新缓存

2. **静态托管（如腾讯云）**
   - 仅支持静态文件
   - 不支持的功能：
     - API 路由（豆瓣数据、Git 项目等）
     - 动态数据获取
   - 需要手动配置和上传

### CDN加速配置

博客支持通过多吉云CDN进行加速，并可通过GitHub Actions实现自动刷新缓存：

1. 按照[CDN配置指南](./cdn配置)配置多吉云CDN
2. 按照[GitHub Actions自动刷新CDN缓存指南](./github-actions自动刷新多吉云_cdn缓存)配置自动刷新
3. 配置完成后，每次博客更新时，CDN缓存将自动刷新

### 部署步骤

#### Vercel 部署

1. Fork 项目到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量（如果需要）
4. 点击部署

#### 静态托管部署

1. 修改 `astro.config.mjs`：

  ```javascript
  export default defineConfig({
    site: SITE_URL,
    output: "static",
    adapter: undefined,
  });
  ```

2. 构建并上传：

  ```bash
  npm run build
  # 上传 dist/client 目录到静态托管服务
  ```

## 常见问题

1. **图片无法显示**
   - 检查图片路径是否正确
   - 确保图片已放入 `public` 目录

2. **豆瓣数据无法获取**
   - 确认豆瓣 ID 配置正确
   - 检查豆瓣记录是否公开

3. **Git 项目无法显示**
   - 验证用户名配置
   - 确认 API 访问限制

4. **静态托管部署后功能异常**
   - 确认是否使用了需要服务器端支持的功能
   - 检查是否已将动态数据改为静态数据
   - 确认构建输出目录是否为 `dist/client`
