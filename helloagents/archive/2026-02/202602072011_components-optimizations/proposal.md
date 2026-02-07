# 变更提案: components-optimizations

## 元信息
```yaml
类型: 优化/修复
方案类型: implementation
优先级: P1
状态: 草稿
创建: 2026-02-07
```

---

## 1. 需求

### 背景
- Header.astro 尾部多余脚本闭合导致页面输出异常风险
- Search 组件双实例存在 click-outside 误判、重复初始化索引
- WorldHeatmap 引入 three 造成首包偏大
- DoubanCollection 同时绑定滚动监听与 IO，重复触发
- 多处列表 key 使用 index，存在重排风险

### 目标
- 修复 Header.astro 脚本闭合异常
- Search 实例隔离，索引初始化去重
- WorldHeatmap 延迟加载 three，减少首屏包体
- DoubanCollection 仅保留 IO 触发加载
- 列表 key 使用稳定标识

### 约束条件
```yaml
时间约束: 无
性能约束: 不增加主线程负担，首屏包体更小
兼容性约束: 保持现有 Astro/React 行为与 UI 不变
业务约束: 不改接口协议与数据结构
```

### 验收标准
- [ ] Header.astro 末尾多余脚本闭合清理，页面无异常文本输出
- [ ] Search 双实例互不干扰，外部点击只关闭自身
- [ ] 搜索索引仅初始化一次（并发去重）
- [ ] WorldHeatmap 初始包体减少，首次进入再加载 three
- [ ] DoubanCollection 仅使用 IntersectionObserver 触发加载
- [ ] 列表 key 改为稳定标识，分页按钮不重复计算页码

---

## 2. 方案

### 技术方案
1. Header.astro 移除尾部冗余 `})(); </script>`
2. Search.tsx：
   - 新增容器 ref 与 clear/tab 按钮 ref，click-outside 以实例容器判断
   - wasmWorkerClient 增加 initSearchIndex/initFilterIndex 去重
3. WorldHeatmap.tsx：three 改为动态 import，类型使用 type-only import
4. DoubanCollection.tsx：移除 window scroll 监听，仅保留 IO 触发
5. 列表 key：ArticleFilter/DoubanCollection/WereadBookList/GitProjectCollection/Search 改为稳定 key

### 影响范围
```yaml
涉及模块:
  - components: Header/Search/WorldHeatmap/DoubanCollection 等
  - workers: wasmWorkerClient（索引初始化去重）
预计变更文件: 8
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| WorldHeatmap 动态加载导致首帧延迟 | 中 | 保持既有加载态与错误提示 |
| Search click-outside 逻辑调整影响交互 | 低 | 使用实例容器判断并保留原流程 |
| key 替换导致潜在重排 | 低 | 使用稳定字段，不改变排序 |

---

## 3. 技术设计（可选）

无架构/API 变更，略。

---

## 4. 核心场景

### 场景: 搜索组件双实例共存
**模块**: components  
**条件**: Header 同时渲染桌面/移动 Search  
**行为**: 点击任一实例外部时仅关闭该实例  
**结果**: 双实例互不干扰  

### 场景: WorldHeatmap 首次加载
**模块**: components  
**条件**: 页面进入但 three 尚未加载  
**行为**: 先展示加载态，随后动态加载 three 并渲染  
**结果**: 首屏包体更小，功能正常  

---

## 5. 技术决策

不涉及技术选型或架构决策。
