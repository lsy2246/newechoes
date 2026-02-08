# 变更日志

## [0.0.16] - 2026-02-08

### 修复

- **[components/ArticleFilter]**: 拆分标签加载与筛选加载状态，稳定标签提示，避免无标签清除触发刷新
  - 方案: [202602081301_article-filter-flicker](archive/2026-02/202602081301_article-filter-flicker/)

## [0.0.15] - 2026-02-08

### 变更

- **[components/ThemeToggle]**: 主题切换过渡资源缓存与波纹复用，避免重复初始化带来的抖动
  - 方案: [202602081013_theme-toggle-perf](archive/2026-02/202602081013_theme-toggle-perf/)

### 修复

- **[styles/global]**: 为根滚动容器预留滚动条空间，避免页面加载后左右抖动
  - 类型: 微调（无方案包）
  - 文件: src/styles/global.css

## [0.0.14] - 2026-02-07

### 修复

- **[lib/wasmWorkerClient]**: 修复请求类型定义导致的泛型与 payload 报错
  - 类型: 微调（无方案包）
  - 文件: src/lib/wasmWorkerClient.ts:9-86

## [0.0.13] - 2026-02-07

### 变更

- **[components/lib]**: 拆分非 UI 逻辑到 lib（wasm worker 与 swup 初始化）
  - 类型: 微调（无方案包）
  - 文件: src/lib/wasmWorkerClient.ts
  - 文件: src/lib/wasm-worker.ts
  - 文件: src/lib/swup-init.js
  - 文件: src/components/Search.tsx
  - 文件: src/components/ArticleFilter.tsx
  - 文件: src/components/Layout.astro

## [0.0.12] - 2026-02-07

### 微调

- **[components/GitProjectCollection]**: 移除分页调试日志与请求日志输出
  - 类型: 微调（无方案包）
  - 文件: src/components/GitProjectCollection.tsx:81-210
- **[pages/api/git-projects]**: 移除请求重试的控制台日志
  - 类型: 微调（无方案包）
  - 文件: src/pages/api/git-projects.ts:168-250

## [0.0.11] - 2026-02-07

### 修复

- **[pages/api/git-projects]**: GitHub 分页改为解析 Link header，避免误报第二页
  - 类型: 微调（无方案包）
  - 文件: src/pages/api/git-projects.ts:206-312

## [0.0.10] - 2026-02-07

### 微调

- **[components/DoubanCollection]**: 移除豆瓣追加日志输出
  - 类型: 微调（无方案包）
  - 文件: src/components/DoubanCollection.tsx:31-133
- **[components/GitProjectCollection]**: 增加分页异常的开发日志（第二页空数据诊断）
  - 类型: 微调（无方案包）
  - 文件: src/components/GitProjectCollection.tsx:62-114

## [0.0.9] - 2026-02-07

### 微调

- **[components/DoubanCollection]**: 仅保留追加异常的开发日志，便于定位第二页空数据
  - 类型: 微调（无方案包）
  - 文件: src/components/DoubanCollection.tsx:136

## [0.0.8] - 2026-02-07

### 微调

- **[components/DoubanCollection]**: 首屏不足一屏时自动触发加载，避免滚动无法触发
  - 类型: 微调（无方案包）
  - 文件: src/components/DoubanCollection.tsx:231-336

## [0.0.7] - 2026-02-07

### 微调

- **[components/DoubanCollection]**: 修复滚动加载第二页不触发
  - 类型: 微调（无方案包）
  - 文件: src/components/DoubanCollection.tsx:231-396

## [0.0.6] - 2026-02-07

### 修复

- **[components]**: 修复 Header 脚本闭合异常并隔离 Search click-outside
  - 方案: [202602072011_components-optimizations](archive/2026-02/202602072011_components-optimizations/)

### 变更

- **[components]**: WorldHeatmap 动态加载 three，列表 key 稳定化，DoubanCollection 仅 IO 触发
  - 方案: [202602072011_components-optimizations](archive/2026-02/202602072011_components-optimizations/)
- **[workers]**: wasmWorkerClient 初始化去重，避免重复拉取索引
  - 方案: [202602072011_components-optimizations](archive/2026-02/202602072011_components-optimizations/)

## [0.0.5] - 2026-02-07

### 变更

- **[components]**: 将 wasmWorkerClient 与 wasm-worker 移至 components 并更新引用
  - 方案: [202602071646_perf-wasm-refactor](archive/2026-02/202602071646_perf-wasm-refactor/)

## [0.0.4] - 2026-02-07

### 变更

- **[wasm]**: release 启用 wee_alloc，panic hook 仅在 debug 注入，并对 wasm 产物执行 wasm-opt -Oz
  - 方案: [202602071646_perf-wasm-refactor](archive/2026-02/202602071646_perf-wasm-refactor/)
  - 决策: perf-wasm-refactor#D002(release 体积优化)

## [0.0.3] - 2026-02-07

### 微调

- **[components/Header]**: 为导航结构补充类型定义并消除 item.href 类型错误
  - 类型: 微调（无方案包）
  - 文件: src/components/Header.astro:7-246

## [0.0.2] - 2026-02-05

### 微调

- **[pages]**: 将首页改为直接显示文章列表（无重定向）
  - 类型: 微调（无方案包）
  - 文件: src/pages/index.astro:1-240

## [Unreleased]

- 初始化知识库结构
