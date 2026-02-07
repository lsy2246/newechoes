# workers

## 职责

Web Worker 计算与 WASM 桥接（当前位于 src/lib/wasm-worker.ts）。

## 接口定义（可选）

- wasm-worker: 处理 init/search/suggest/filter/getTags 消息协议。

## 行为规范

### WASM 计算下沉
**条件**: Search / ArticleFilter 需要执行 WASM 计算。
**行为**: Worker 内加载 wasm 资源并缓存索引；主线程通过消息请求。
**结果**: 降低主线程阻塞，交互更顺畅。

### Worker 初始化去重
**条件**: 多组件并发初始化搜索/筛选索引。
**行为**: lib/wasmWorkerClient 复用初始化 Promise，避免重复初始化。
**结果**: 减少重复下载/解压与启动开销。

## 依赖关系

```yaml
依赖: wasm, assets
被依赖: lib, components
```
