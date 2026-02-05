# wasm

## 职责

WebAssembly 资源与相关代码（wasm/）。

## 接口定义（可选）

无对外公共 API。

## 行为规范

### WASM 加载
**条件**: 页面/组件需要使用 WASM。
**行为**: 按加载约定引入 wasm 资源。
**结果**: 功能正常运行。

## 依赖关系

```yaml
依赖: assets（待确认）
被依赖: pages, components（待确认）
```
