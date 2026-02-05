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

## 依赖关系

```yaml
依赖: styles, assets（待确认）
被依赖: pages
```
