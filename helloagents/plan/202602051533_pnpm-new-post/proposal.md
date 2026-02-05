# 变更提案: pnpm-new-post

## 元信息
```yaml
类型: 新功能
方案类型: implementation
优先级: P1
状态: 草稿
创建: 2026-02-05
```

---

## 1. 需求

### 背景
当前通过 `create_post.sh` 生成文章，需要 Bash 环境且需输入路径参数；用户希望完全使用 pnpm，并默认生成到文章根目录。

### 目标
- 提供 `pnpm new-post <文章名称>` 命令，一键生成新文章文件
- 生成位置默认 `src/content` 根目录（无需传入路径）
- Frontmatter 与现有文章/使用说明一致（title/date/tags）
- 保持不覆盖已有文章，输出明确提示
- `create_post.sh` 标记为废弃并提示新用法
- 更新 `src/content/echoes博客使用说明.md` 的创建说明

### 约束条件
```yaml
时间约束: 无
性能约束: 无
兼容性约束: 跨平台（Windows/macOS/Linux）可用
业务约束: 仅使用 pnpm 作为入口命令，默认目录为 src/content
```

### 验收标准
- [ ] 执行 `pnpm new-post "测试文章"` 会在 `src/content/` 下生成 `测试文章.md`
- [ ] 生成文件包含 `title/date/tags` Frontmatter，date 为带时区的 ISO 8601
- [ ] 目标文件已存在时，命令报错并不覆盖
- [ ] `create_post.sh` 执行时提示已废弃并指向 `pnpm new-post`
- [ ] `src/content/echoes博客使用说明.md` 中示例命令已改为 pnpm

---

## 2. 方案

### 技术方案
- 新增 `src/plugins/new-post.mjs`（ESM），读取 `process.argv` 获取标题
- 以脚本自身位置计算项目根目录，默认输出到 `src/content`
- 使用 `path.basename(title)` 作为文件名，写入模板内容
- 生成本地时间+时区偏移的 ISO 8601 日期
- 在 `package.json` 中新增 `new-post` 脚本调用该文件
- 新增 `tests/scripts/new-post.test.mjs` 覆盖正常/边界/异常用例
- 将 `create_post.sh` 改为废弃提示脚本，避免继续使用
- 更新 `src/content/echoes博客使用说明.md` 的推荐命令与手动创建说明

### 影响范围
```yaml
涉及模块:
  - config: 新增 pnpm 脚本
  - content: 文章创建说明与默认目录
  - plugins: 新增 Node 脚本、废弃 shell 脚本
预计变更文件: 5
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 日期格式与现有文章不一致 | 低 | 沿用 create_post.sh 的本地时区 ISO 8601 |
| 标题包含路径分隔符导致目录错位 | 低 | 使用 `path.basename` 规避 |
| 文档与实际行为不一致 | 低 | 同步更新使用说明 |

---

## 3. 技术设计（可选）

本次变更为明确实现路径，不涉及架构/API/数据模型调整，略。

---

## 4. 核心场景

### 场景: 创建新文章
**模块**: content / tooling  
**条件**: 用户执行 `pnpm new-post "文章标题"`  
**行为**: 生成 `src/content/文章标题.md`，写入默认 Frontmatter 与模板正文  
**结果**: 文章文件创建成功并输出绝对路径

---

## 5. 技术决策

本次变更不涉及技术选型或架构决策，无需记录决策项。
