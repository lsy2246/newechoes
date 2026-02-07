# components

## 职责

可复用 UI 组件（src/components）。

## 接口定义（可选）

无对外公共 API（内部组件为主）。

## 行为规范

### 组件复用
**条件**: 页面需要复用 UI 片段。
**行为**: 通过 props/slots 组合组件。
**结果**: 统一外观与交互体验。

### WASM 计算下沉
**条件**: Search / ArticleFilter 需要执行检索或筛选。
**行为**: 通过 lib/wasmWorkerClient 与 Worker 通信，异步获取结果。
**结果**: 主线程渲染与交互更顺畅。

### 搜索实例隔离
**条件**: 同时渲染多个 Search 实例（桌面/移动）。
**行为**: 组件内部使用实例容器判断 click-outside，避免跨实例干扰；索引初始化去重。
**结果**: 交互互不影响，避免重复初始化开销。

### 三维组件按需加载
**条件**: 首次进入 WorldHeatmap。
**行为**: three 运行时动态加载后再初始化场景。
**结果**: 首屏包体更小，加载更平滑。

## 依赖关系

```yaml
依赖: styles, assets, lib, wasm
被依赖: pages
```
