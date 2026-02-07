# 模块索引

> 通过此文件快速定位模块文档

## 模块清单

| 模块 | 职责 | 状态 | 文档 |
|------|------|------|------|
| config | 项目构建与运行配置 | ✅ | [config.md](./config.md) |
| content | 文章内容与内容结构定义（未扫描内容） | 📝 | [content.md](./content.md) |
| pages | 站点路由与页面结构 | ✅ | [pages.md](./pages.md) |
| components | 可复用 UI 组件 | ✅ | [components.md](./components.md) |
| styles | 样式与主题 | ✅ | [styles.md](./styles.md) |
| plugins | 构建/内容处理插件 | ✅ | [plugins.md](./plugins.md) |
| assets | 静态资源 | ✅ | [assets.md](./assets.md) |
| lib | 前端共享工具模块 | ✅ | [lib.md](./lib.md) |
| workers | Web Worker 计算与WASM桥接 | ✅ | [workers.md](./workers.md) |
| wasm | WebAssembly 资源 | 📝 | [wasm.md](./wasm.md) |

## 模块依赖关系

```
（待补充：依赖关系未完整梳理）
pages → components → styles
pages → content
components → assets
plugins → config
```

## 状态说明
- ✅ 稳定
- 🚧 开发中
- 📝 规划中
