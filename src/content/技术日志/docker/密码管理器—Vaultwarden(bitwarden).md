---
title: "密码管理器—Vaultwarden(bitwarden)"
date: 2023-05-18T21:47:00+00:00
tags: ["Docker-compose"]

---

## 1. 安装 Vaultwarden

使用以下 `docker-compose.yml` 文件部署 Vaultwarden：

```yaml
version: '3.8'
services:
  bitwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    restart: always
    environment:
      - SIGNUPS_ALLOWED=true # 是否开启用户注册
      - WEBSOCKET_ENABLED=true
      - TZ=Asia/Shanghai
      - ADMIN_TOKEN="<password>" # 管理员密码
    volumes:
      - ./:/data/
    ports:
      - "6666:80"
      - "3012:3012"
```

## 2. 设置反向代理

使用 Nginx 设置反向代理，以下是基本的配置示例：

> **需要修改的参数**
>
> 1. `ssl_certificate` : SSL证书路径
> 2. `ssl_certificate_key` : SSL证书路径
> 3. `server_name`: 跟你前面配置的domain相同,案例中为`b.lsy22.com`
> 4. `proxy_pass` : 运行Vaultwarden的服务器地址和端口，比如本机为127.0.0.1:6666

```nginx
server {
    listen 80;
    listen [::]:80;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name b.lsy22.com;  # 将 your_domain.com 替换为您的域名
  
    ssl_certificate /root/.acme.sh/b.lsy22.com/fullchain.cer;  # 填入SSL证书路径
    ssl_certificate_key /root/.acme.sh/b.lsy22.com/b.lsy22.com.key;# 填入SSL证书路径
  
    location / {
        proxy_pass http://127.0.0.1:6666;
        proxy_http_version 1.1;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }

    location /notifications/hub {
        proxy_pass http://127.0.0.1:3012;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /notifications/hub/negotiate {
        proxy_pass http://127.0.0.1:6666;
    }
}
```

## 3. 创建账号

访问 Vaultwarden 的 Web 界面创建账号。

## 其他

### 翻译模板

将翻译好的模板放到`templates`目录下，如果没有创建一个

模板下载链接：[https://github.com/wcjxixi/vaultwarden-lang-zhcn](https://github.com/wcjxixi/vaultwarden-lang-zhcn)
