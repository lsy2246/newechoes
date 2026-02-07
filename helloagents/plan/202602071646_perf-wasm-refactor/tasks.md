# 任务清单: perf-wasm-refactor

目录: `helloagents/plan/202602071646_perf-wasm-refactor/`

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
总任务: 17
已完成: 15
完成率: 88%
```

---

## 任务列表

### 1. Worker 基础设施

- [√] 1.1 在 `src/workers/wasm-worker.ts` 实现消息协议、WASM 懒加载与索引缓存
  - 验证: Worker 可初始化并返回 ready 状态

- [√] 1.2 在 `src/lib/wasmWorkerClient.ts` 实现单例请求封装（requestId + Promise）
  - 验证: 多并发请求可正确匹配响应

### 2. WASM Search API 改造

- [√] 2.1 在 `wasm/search/src/lib.rs` 添加索引缓存与 `init_search_index`/`search_cached`
  - 验证: 索引仅初始化一次，后续查询不再解压

- [√] 2.2 在 `wasm/search/Cargo.toml` 增加必要依赖并更新 wasm 产物
  - 验证: `src/assets/wasm/search/*` 产物可正常加载

### 3. Search 组件接入 Worker

- [√] 3.1 在 `src/components/Search.tsx` 替换 wasm 直连逻辑，改为 worker 初始化与调用
  - 验证: 搜索/建议正常返回，加载状态一致

- [√] 3.2 在 `src/components/Search.tsx` 引入节流/合并请求策略与请求过期处理
  - 验证: 快速输入时 UI 无错乱、结果不闪烁

### 4. ArticleFilter 组件接入 Worker

- [√] 4.1 在 `src/components/ArticleFilter.tsx` 替换 wasm 直连逻辑，改为 worker 调用
  - 验证: 标签加载与筛选正常

- [√] 4.2 在 `src/components/ArticleFilter.tsx` 处理筛选结果与分页更新流程
  - 验证: URL 参数与分页行为保持一致

### 5. WorldHeatmap 性能优化

- [√] 5.1 在 `src/components/WorldHeatmap.tsx` 复用 Raycaster / SphereMesh
  - 验证: hover 期间无新增对象创建峰值

- [√] 5.2 在 `src/components/WorldHeatmap.tsx` 实现最小高亮更新（按国家增量更新）
  - 验证: hover 切换仅更新相关线条

### 6. Geo WASM 访问优化

- [√] 6.1 在 `wasm/geo/src/lib.rs` 将 visited_places 转为 HashSet 查询
  - 验证: 访问判断复杂度降为 O(1)

### 7. 验证

- [?] 7.1 手动回归：搜索、自动补全、筛选、地图 hover
  - 验证: 关键流程无回归

- [?] 7.2 运行构建或最小启动验证（按本地可用命令）
  - 验证: build/dev 通过，控制台无错误

### 8. WASM 体积优化

- [√] 8.1 release 关闭 panic hook（仅 debug 启用）
  - 验证: release 构建不注入 console_error_panic_hook

- [√] 8.2 启用 wee_alloc 并以 `--features wee_alloc` 构建
  - 验证: wasm-pack release 产物正常

- [√] 8.3 使用 wasm-opt -Oz 对 wasm 产物二次压缩
  - 验证: assets 体积下降

### 9. Worker 文件结构调整

- [√] 9.1 将 wasmWorkerClient 与 wasm-worker 移至 src/components 并更新引用
  - 验证: 构建与运行路径正常

---

## 执行备注

> 执行过程中的重要记录

| 任务 | 状态 | 备注 |
|------|------|------|
| 7.1/7.2 | 待确认 | 构建曾因 worker.format=iife 失败，已在 astro.config.mjs 固定为 es，待复验 |
| 8.3 | 已完成 | search_wasm_bg: 314922→305250; article_filter_bg: 253918→245051; geo_wasm_bg: 143098→132200 |
| 9.1 | 已完成 | wasmWorkerClient/wasm-worker 移至 src/components |
