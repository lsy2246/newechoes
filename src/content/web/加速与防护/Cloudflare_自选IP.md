---
title: "Cloudflare_自选IP"
date: 2024-06-18T16:16:35+08:00
tags: ["cloudflare"]
---

## Workers

1. DNS 解析

   1. 删除现有 Workers 解析（自定义域）
   2. 将要用的域名解析到自选 IP 上，注意**不要开启**代理（小云朵）

2. 自定义路由

   设置->触发器->路由

   我要使用`proxy.example.com`作为 Workers 域名，且要访问全部内容

   ```text
   proxy.example.com/*
   ```
