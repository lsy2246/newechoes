---
title: "CDN配置"
date: 2023-12-25T12:07:21+08:00
tags: []
---

## 域名绑定

1. 绑定到需要加速的服务器(源站)
2. 配置到 cdn 平台(加速域名)

## 配置

以[多吉云](https://www.dogecloud.com/)为例(毕竟免费 20G，还能设置封顶策略)

进入域名管理添加域名

- 加速域名:（加速域名）
- 回源域名填写:（源站）
- 回源 host 选择:与回源域名一致

改动回源 host 的目的是为了让 vercel 那边知道你需要回源到的域名。
