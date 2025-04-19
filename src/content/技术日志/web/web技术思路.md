---
title: web技术思路
date: 2025-01-15T00:34:11Z
tags: []
---

## 前端

## tailwind

> 快速构建 css 样式器

### 可响应式布局

利用媒体查询器

### 黑暗模式

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "all",
  content: ["./src/**/*.{rs,html,css}", "./dist/**/*.html"],
  theme: {}, //自定义配置
  plugins: [],
  darkMode: ['data-theme="dark"'], //以自定义数据theme的方式生成对应的css文件
};
```

‍

## 后端

### 安全

1. json web token：保证用户令牌不是篡改或伪造，注意是明文传输
2. hash 密码：避免数据库泄漏带来的隐私风险
3. cors：可以避免其他站点的非法请求，不过只适用用浏览器
4. 构建 sql 查询器中间件：使 sql 语句可以结构化，可以根据危险等级构建不同的查询等级，最大程度避免 xxs

### 接口

1. 适用 restful 接口具有很好的可读性

## 其他

1.设计尽量无状态，低耦合，使后期即使出现问题也是独立的状态

‍

‍

‍
