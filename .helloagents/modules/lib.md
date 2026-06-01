# lib

## 职责

前端共享工具模块（src/lib）。

## 接口定义（可选）

暂无。

## 行为规范

### WASM Worker 客户端
**条件**: Search / ArticleFilter 需要调用 Worker 进行检索与筛选。
**行为**: 通过 lib/wasmWorkerClient 初始化与复用 Worker。
**结果**: 逻辑集中、组件更轻量。

### Swup 页面转场初始化
**条件**: Layout 加载时需要启动 Swup 与插件。
**行为**: 通过 lib/swup-init.js 执行初始化与清理。
**结果**: 过渡逻辑集中，组件目录更清爽。

### 平台能力分层
**条件**: 共享布局、服务端 API 或构建辅助逻辑需要按部署平台切换行为。
**行为**: 通过 `src/lib/runtime/platform.ts` 暴露统一的平台判断、能力开关和监控注入描述；`article-history` 与 `google-photos` 统一整理为 `index/shared/node` 目录分层，其中 `shared` 放纯共享逻辑，`node` 放 Node 专属实现，`index` 作为统一入口与运行时分流点。
**结果**: 平台专属逻辑集中管理，不把 `if/else` 散落到页面与组件里，并让跨平台能力模块遵循同一套结构规则。

## 依赖关系

```yaml
依赖: assets
被依赖: components
```
