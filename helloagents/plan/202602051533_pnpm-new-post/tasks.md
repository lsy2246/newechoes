# 任务清单: pnpm-new-post

目录: `helloagents/plan/202602051533_pnpm-new-post/`

---

## 任务状态符号说明

| 符号 | 状态 | 说明 |
|------|------|------|
| `[ ]` | pending | 待执行 |
| `[√]` | completed | 已完成 |
| `[X]` | failed | 执行失败 |
| `[-]` | skipped | 已跳过 |
| `[?]` | uncertain | 待确认 |

---

## 执行状态
```yaml
总任务: 5
已完成: 5
完成率: 100%
```

---

## 任务列表

### 1. 脚本与命令

- [√] 1.1 在 `src/plugins/new-post.mjs` 实现新文章生成逻辑（默认 src/content、参数校验、日期格式、重复检查）
  - 验证: `pnpm new-post "测试文章"` 生成新文件

- [√] 1.2 在 `package.json` 添加 `new-post` 脚本入口
  - 依赖: 1.1

- [√] 1.3 在 `tests/scripts/new-post.test.mjs` 添加单元测试（正常/边界/异常）
  - 依赖: 1.1

### 2. 兼容与文档

- [√] 2.1 将 `create_post.sh` 标记为废弃并提示使用 `pnpm new-post`
  - 验证: 运行脚本输出废弃提示并退出

- [√] 2.2 更新 `src/content/echoes博客使用说明.md` 的创建文章说明
  - 验证: 文档示例与实际命令一致

---

## 执行备注

> 执行过程中的重要记录

| 任务 | 状态 | 备注 |
|------|------|------|
