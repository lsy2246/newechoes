# content

## 职责

存放站点文章与内容结构定义（src/content、content.config.ts）。未扫描具体文章内容。

## 接口定义（可选）

无对外公共 API。

## 行为规范

### 内容新增
**条件**: 新增或更新文章内容。
**行为**: 遵循 content.config.ts 中的 schema 约束（如有），推荐使用 `pnpm new-post` 在 `src/content` 根目录创建文章。
**结果**: 页面可正确渲染内容。

## 依赖关系

```yaml
依赖: content.config.ts
被依赖: pages（内容渲染层，待确认）
```
