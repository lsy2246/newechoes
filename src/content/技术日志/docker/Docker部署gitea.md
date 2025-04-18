---
title: "Docker部署gitea"
date: 2023-05-26T20:21:00+00:00
tags: ["Docker-compose"]
---

## 准备数据库

### 1. 登录到数据库

```bash
mysql -u root -p
```

### 2. 创建一个将被 Gitea 使用的数据库用户，并使用密码进行身份验证

```sql
CREATE USER 'gitea' IDENTIFIED BY 'Password';
```

> 将`Password`改为自己的密码

### 3. 使用 UTF-8 字符集和大小写敏感的排序规则创建数据库

```sql
CREATE DATABASE giteadb CHARACTER SET 'utf8mb4' COLLATE 'utf8mb4_bin';
```

### 4. 将数据库上的所有权限授予上述创建的数据库用户

```sql
GRANT ALL PRIVILEGES ON giteadb.* TO 'gitea';
FLUSH PRIVILEGES;
```

## 直通配置

### 1. 创建一个名为 `git` 的用户

```bash
sudo useradd -m git
```

### 2. 配置`git`用户登录密钥

```bash
su git -c  'ssh-keygen -t rsa -b 4096 -C "Gitea Host Key"'
su git -c 'cat /home/git/.ssh/id_rsa.pub >> /home/git/.ssh/authorized_keys'
```

### 3. 查看 uid 和 gid

```bash
id git
```

记住 uid 和 gid

### 4. SSH 容器直通

在主机上创建一个名为 `/usr/local/bin/gitea` 的**文件**，该文件将发出从主机到容器的 `SSH` 转发

```bash
ssh -p 7222 -o StrictHostKeyChecking=no git@127.0.0.1 "SSH_ORIGINAL_COMMAND=\"$SSH_ORIGINAL_COMMAND\" $0 $@"
```

## Docker 安装

### 1. 创建数据持久化的存储路径

### 2. 进入该文件夹

### 3. 创建`docker-compose.yml` 文件并配置

> 将下面的USER_UID=1000 USER_GID=1000 换为得到uid 和 gid

```yaml
version: "3"
networks:
  gitea:
    external: false
services:
  server:
    image: gitea/gitea:latest
    container_name: gitea
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - GITEA__database__DB_TYPE=mysql
      - GITEA__database__HOST=db:3306
      - GITEA__database__NAME=gitea
      - GITEA__database__USER=gitea
      - GITEA__database__PASSWD=gitea
    restart: always
    networks:
      - gitea
    volumes:
      - ./data:/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
      - /home/git/.ssh/:/data/git/.ssh
    ports:
      - "7200:3000"
      - "7222:22"
    depends_on:
      - db
  db:
    image: mysql:8
    restart: always
    environment:
      - MYSQL_ROOT_PASSWORD=gitea
      - MYSQL_USER=gitea
      - MYSQL_PASSWORD=gitea
      - MYSQL_DATABASE=gitea
    networks:
      - gitea
    volumes:
      - ./mysql:/var/lib/mysql
```

### 4. 启动 Docker 容器

```bash
sudo docker compose up -d
```

## 反向代理

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name g.lsy22.com;  # 替换为您的域名
    return 301 https://$host$request_uri;  # 将所有HTTP请求重定向到HTTPS
}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name g.lsy22.com;  # 替换为您的域名
    ssl_certificate /root/.acme.sh/g.lsy22.com/fullchain.cer;  # SSL证书路径
    ssl_certificate_key /root/.acme.sh/g.lsy22.com/g.lsy22.com.key; # SSL密钥路径
    location / {
        proxy_pass http://localhost:7200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}
