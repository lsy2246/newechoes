---
title: "Docker部署思源笔记"
date: 2024-06-07T21:01:46+08:00
tags: ["Docker-compose"]
---

## `docker-compose.yml` 文件配置

### 替换说明

* 将 `/var/www/siyuan/` 替换为你的实际物理路径。
* 将 `Password` 替换为你的访问密码。

```yaml
version: "3.9"
services:
  siyuan:
    image: b3log/siyuan
    container_name: siyuan
    restart: always
    ports:
      - 6806:6806
    volumes:
      - ./:/siyuan/workspace
    command:
      - "--workspace=/siyuan/workspace/"
      - "--lang=zh_CN"
      - "--accessAuthCode=<password>"
```

## 反向代理配置

### Nginx配置替换说明

* 将 `your_domain.com` 替换为你自己的域名。
* 将 `path` 替换为你的SSL证书的实际路径。

```nginx
upstream siyuan {
    server 127.0.0.1:6806;  # 将流量定向到本地的6806端口
}

server {
    listen 80;
    listen [::]:80;
    server_name your_domain.com;  # 设置服务器域名

    # 将所有 HTTP 请求重定向到 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name your_domain.com;  # 设置服务器域名

    # 配置 SSL 证书路径
    ssl_certificate path/fullchain.cer;
    ssl_certificate_key path/file.key;

    client_max_body_size 0;  # 不限制请求体大小

    location / {
        proxy_pass http://siyuan;  # 反向代理到上游 siyuan
        proxy_set_header HOST $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location /ws {
        proxy_pass http://siyuan;
        proxy_read_timeout 60s;  # 设置读取超时时间
        proxy_http_version 1.1;  # 使用 HTTP 1.1
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'Upgrade';  # 支持 WebSocket
    }
}
