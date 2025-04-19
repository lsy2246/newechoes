---
title: "网盘直链程序—AList"
date: 2023-05-26T20:21:00+00:00
tags: ["Docker-compose", "WebDAV"]
---

## 1. 项目展示

- **GitHub 项目地址**：[Alist on GitHub](https://github.com/Xhofe/alist)
- **Demo 演示站点**：[访问 Demo](https://alist.nn.ci)
- **Alist 文档地址**：[阅读文档](https://alist-doc.nn.ci/en/)

## 2. 搭建 Docker

- [Docker 官方部署教程](https://docs.docker.com/engine/install/debian/)

## 3. 搭建 Alist

运行以下 Docker Compose 文件进行 Alist 的安装：

```yaml
version: "3.8"
services:
  alist:
    image: xhofe/alist:latest
    container_name: alist
    restart: always
    volumes:
      - ./:/opt/alist/data
    ports:
      - "7777:5244"
```

- **查看初始化密码**：运行`docker logs alist`命令，可以查看 Alist 的初始密码。
- **更改密码建议**：建议更改一个自己能够记住的密码。

## 4. 配置反向代理

配置 Nginx 反向代理，以便安全访问 Alist 站点：

```nginx
server {
    listen 80;
    listen [::]:80;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name o.lsy22.com;  # 替换为您的域名

    ssl_certificate /root/.acme.sh/o.lsy22.com/fullchain.cer;  # SSL证书路径
    ssl_certificate_key /root/.acme.sh/o.lsy22.com/o.lsy22.com.key; # SSL密钥路径

    location / {
      proxy_pass http://127.0.0.1:7777/;
      rewrite ^/(.*)$ /$1 break;
      proxy_redirect off;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header Upgrade-Insecure-Requests 1;
      proxy_set_header X-Forwarded-Proto https;
    }
}
```

## 5. 账号管理

- **随机生成密码**：运行`docker exec -it alist ./alist admin random`。
- **手动设置密码**：运行`docker exec -it alist ./alist admin set NEW_PASSWORD`，其中`NEW_PASSWORD`替换为您想要的密码。

## 6. 挂载配置

- **挂载路径**：`/`
- **根目录路径**：`/opt/alist/data/`对应 VPS 上的`/www/wwwroot/alist`目录。

如果需要进一步的目录细分，可以设置路径为`/opt/alist/data/Userdata/`，在`/www/wwwroot/alist`下创建`Userdata`文件夹，并存放文件。

- **其他网盘添加方式**：请参考[Alist 文档](https://alist-doc.nn.ci/en/)

## 7. 更新 Alist

若需更新 Alist，请按以下步骤操作：

1. **停止容器**：运行`docker stop alist`
2. **删除容器**：运行`docker rm -f alist`（此操作不会删除数据）
3. **备份数据**（可选）：运行`cp -r /root/data/docker_data/alist /root/data/docker_data/alist.bak`
4. **拉取最新镜像**：运行`docker pull xhofe/alist:latest`
5. **重新运行安装**：运行`docker run -d --restart=always -v /www/wwwroot/alist:/opt/alist/data -p 7777:5244 --name="alist" xhofe/alist:latest`
