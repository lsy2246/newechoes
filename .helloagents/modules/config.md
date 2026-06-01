# config

## 职责

管理项目构建与运行配置（astro.config.mjs、tsconfig.json、vercel.json、package.json、pnpm-lock.yaml、package-lock.json、content.config.ts）。

## 接口定义（可选）

无对外公共 API。

## 行为规范

### 配置变更
**条件**: 需要调整构建/部署/内容 schema 行为时。
**行为**: 修改对应配置文件，并保持脚本与配置一致。
**结果**: 开发/构建/部署流程按预期运行。

### 脚本入口
**条件**: 需要新增或维护项目脚本能力时。
**行为**: 在 `package.json` 维护 `pnpm new-post` 脚本，指向 `src/plugins/new-post.mjs`。
**结果**: 跨平台命令可直接创建文章。

### 多平台部署骨架
**条件**: 需要针对 `Vercel`、`EdgeOne`、`Cloudflare` 产出不同部署结果时。
**行为**: `astro.config.mjs` 根据 `DEPLOY_TARGET` 切换 adapter；`package.json` 提供 `build:vercel`、`build:edgeone`、`build:cloudflare` 三个构建脚本；Cloudflare 额外使用 `prerenderEnvironment: "node"` 避免内容页预渲染阶段被 workerd 的 Node 限制阻断；平台专属监控能力再通过运行时平台层注入。
**结果**: 同一代码库可按目标平台产出对应构建结果，同时保留统一业务代码，并为平台专属监控优化保留稳定接线方式。

## 依赖关系

```yaml
依赖: 无
被依赖: 全局构建与运行流程（Astro）
```
