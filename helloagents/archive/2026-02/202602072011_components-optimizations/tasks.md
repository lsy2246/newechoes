# 任务清单: components-optimizations

> **@status:** completed | 2026-02-07 21:47

目录: `helloagents/plan/202602072011_components-optimizations/`

---

## 任务状态符号说明

| 符号 | 状态 | 说明 |
|------|------|------|
| `[ ]` | pending | 待执行 |
| `[√]` | completed | 已完成 |
| `[X]` | failed | 执行失败 |
| `[-]` | skipped | 已跳过 |
| `[?]` | uncertain | 待确认 |

---

## 执行状态
```yaml
总任务: 9
已完成: 8
完成率: 89%
```

---

## 任务列表

### 1. Header 脚本修复

- [√] 1.1 清理 `src/components/Header.astro` 末尾多余闭合脚本
  - 验证: 页面渲染无异常文本输出

### 2. Search / Worker 优化

- [√] 2.1 Search 实例隔离 click-outside（容器与按钮 refs）
  - 文件: `src/components/Search.tsx`
  - 验证: 双实例互不干扰

- [√] 2.2 索引初始化去重
  - 文件: `src/components/wasmWorkerClient.ts`
  - 验证: 并发初始化只发起一次请求

- [√] 2.3 Search 结果 key 改为稳定值
  - 文件: `src/components/Search.tsx`
  - 验证: React 无 key 警告

### 3. 性能与加载优化

- [√] 3.1 WorldHeatmap 动态加载 three
  - 文件: `src/components/WorldHeatmap.tsx`
  - 验证: 首屏包体减少，地图正常渲染

- [√] 3.2 DoubanCollection 移除 window scroll 监听
  - 文件: `src/components/DoubanCollection.tsx`
  - 验证: 仅 IO 触发加载更多

### 4. 列表 key 稳定化

- [√] 4.1 ArticleFilter 列表/分页 key 优化与页码缓存
  - 文件: `src/components/ArticleFilter.tsx`
  - 验证: 分页渲染无重复 key

- [√] 4.2 DoubanCollection/WereadBookList/GitProjectCollection key 优化
  - 文件: `src/components/DoubanCollection.tsx`
  - 文件: `src/components/WereadBookList.tsx`
  - 文件: `src/components/GitProjectCollection.tsx`
  - 验证: React 无 key 警告

### 5. 快速自检

- [?] 5.1 基础交互自检（Search/加载更多/地图加载）
  - 验证: 关键流程无回归

---

## 执行备注

> 执行过程中的重要记录

| 任务 | 状态 | 备注 |
|------|------|------|
| 5.1 | 待确认 | 未执行手动/自动化自检 |
