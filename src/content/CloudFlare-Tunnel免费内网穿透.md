---
title: "CloudFlare-Tunnel免费内网穿透"
date: 2026-03-05T12:53:42+08:00
tags: []
---

### 1. 将域名托管到CloudFlare

### 2. 打开CloudFlare-Tunnel按照要求进行按照到需要穿透的主机

### 3. 添加路线

1.导航路径

```text
CloudFlare->Tunnel->Routes-Add >published application
```

2.配置案例

- 其他按实际需求

  例如
  Subdomain (optional):ssh
  Domain:lsy22.com

- Service URL部分例子

  openclaw：`http://localhost:18789`
  ssh:`ssh://localhost:22`

### 4.访问

- 浏览器直接访问url

- ssh

  ```shell
  ssh -o 'ProxyCommand=cloudflared access ssh --hostname ssh.lsy22.com' root@ssh.lsy22.com
  ```
