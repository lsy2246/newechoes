# pages

## 职责

定义站点路由与页面结构（src/pages，Astro 路由）。

## 接口定义（可选）

无对外公共 API。

## 行为规范

### 页面渲染
**条件**: 访问路由或进行静态构建。
**行为**: 组合 components、styles 与内容数据。
**结果**: 生成可访问的静态页面。

### Git 项目 API 分页
**条件**: 访问 `/api/git-projects` 获取 GitHub 项目。
**行为**: 基于 GitHub Link header 解析是否有下一页与总页数。
**结果**: 分页准确，避免出现空的第二页。

## 依赖关系

```yaml
依赖: components, styles, content（待确认）
被依赖: 无（路由入口）
```
