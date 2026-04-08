# wasm

## 职责

WebAssembly 资源与相关代码（wasm/）。

## 接口定义（可选）

- search_wasm: init_search_index / search_cached
- article_filter: init / filter_articles / get_all_tags

## 行为规范

### WASM 加载
**条件**: 页面/组件需要使用 WASM。
**行为**: 按加载约定引入 wasm 资源。
**结果**: 功能正常运行。

### 搜索索引缓存
**条件**: Worker 初始化搜索索引。
**行为**: 在 wasm 内缓存解压后的索引并复用。
**结果**: 避免重复解压，降低 CPU/GC 压力。

### 构建优化
**条件**: release 构建 wasm。
**行为**: 启用 wee_alloc 特性，panic hook 仅在 debug 注入，产物使用 wasm-opt -Oz 二次压缩。
**结果**: wasm 体积更小。

## 依赖关系

```yaml
依赖: assets
被依赖: components, workers
```
