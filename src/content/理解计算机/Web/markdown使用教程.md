---
title: "markdown使用教程"
date: 2023-03-03
tags: []
---

## 1. Markdown 语法部分

### 1.1 标题语法

```markdown
# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题
```

### 1.2 文本格式化

#### 1.2.1 粗体文本

```markdown
**这是粗体文本**
```

**这是粗体文本**

#### 1.2.2 斜体文本

```markdown
*这是斜体文本*
```

*这是斜体文本*

#### 1.2.3 粗斜体文本

```markdown
***这是粗斜体文本***
```

***这是粗斜体文本***

#### 1.2.4 删除线文本

```markdown
~~这是删除线文本~~
```

~~这是删除线文本~~

### 1.3 列表

#### 1.3.1 无序列表

```markdown
- 第一项
  - 子项 1
  - 子项 2
- 第二项
- 第三项
```

- 第一项
  - 子项 1
  - 子项 2
- 第二项
- 第三项

#### 1.3.2 有序列表

```markdown
1. 第一步
   1. 子步骤 1
   2. 子步骤 2
2. 第二步
3. 第三步
```

1. 第一步
   1. 子步骤 1
   2. 子步骤 2
2. 第二步
3. 第三步

#### 1.3.3 任务列表

```markdown
- [x] 已完成任务
- [ ] 未完成任务
- [x] 又一个已完成任务
```

- [x] 已完成任务
- [ ] 未完成任务
- [x] 又一个已完成任务

### 1.4 代码

#### 1.4.1 行内代码

```markdown
这是一段包含`const greeting = "Hello World";`的行内代码
```

这是一段包含`const greeting = "Hello World";`的行内代码

#### 1.4.2 代码块

````markdown
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function greet(user: User): string {
  return `Hello, ${user.name}!`;
}
```
````

<br/>

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function greet(user: User): string {
  return `Hello, ${user.name}!`;
}
```

### 1.5 表格

```markdown
| 功能 | 基础版 | 高级版 |
|:-----|:------:|-------:|
| 文本编辑 | ✓ | ✓ |
| 实时预览 | ✗ | ✓ |
| 导出格式 | 2种 | 5种 |
```

| 功能 | 基础版 | 高级版 |
|:-----|:------:|-------:|
| 文本编辑 | ✓ | ✓ |
| 实时预览 | ✗ | ✓ |
| 导出格式 | 2种 | 5种 |

### 1.6 引用

```markdown
> 📌 **最佳实践**
> 
> 好的文章需要有清晰的结构和流畅的表达。
> 
> 可以包含多个段落
```

> 📌 **最佳实践**
>
> 好的文章需要有清晰的结构和流畅的表达。
>
> 可以包含多个段落

### 1.7 链接和图片

#### 1.7.1 链接

```markdown
[MDX 官方文档](https://mdxjs.com)
[相对路径链接](../path/to/file.md)
```

[MDX 官方文档](https://mdxjs.com)
[相对路径链接](../path/to/file.md)

#### 1.7.2 图片

```markdown
![图片描述](https://example.com/image.jpg "图片标题")
```

### 1.8 水平分割线

```markdown
---
```

<br/>

---