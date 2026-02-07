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

## 依赖关系

```yaml
依赖: assets
被依赖: components
```
