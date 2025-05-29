---
title: "使用LNMP搭建网站"
date: 2024-04-05T15:08:45+08:00
tags: []
---

## 搭建网站 (以 Typecho 为例)

### 系统：Debian 12

### 第一步：绑定域名

1. 修改 hosts 配置

    ```bash
    vim /etc/hosts
    ```

   添加需要绑定的域名，格式如下：

    ```text
    公网IP 域名
    ```

### 第二步：配置 MySQL 数据库

1. 进入 MySQL

    ```bash
    mysql -u root -p
    ```

2. 创建数据库和用户，并授权

    ```sql
    CREATE DATABASE typecho_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER 'typecho_user'@'localhost' IDENTIFIED BY 'your_password';
    GRANT ALL PRIVILEGES ON typecho_db.* TO 'typecho_user'@'localhost';
    FLUSH PRIVILEGES;
    EXIT;
    ```

   > 替换数据库名：typecho_db  
   > 替换用户名：typecho_user  
   > 替换密码：your_password

#### 导入备份数据 (如果有)

1. 切换到目标数据库

    ```sql
    USE existing_database_name;
    ```

   > 替换为现有数据库的名称。
2. 导入备份数据

    ```sql
    SOURCE /path/to/backup_file.sql;
    ```

   > 替换为备份文件的路径。

### 第三步：配置 Nginx

1. 创建 Nginx 网站配置文件

    ```bash
    sudo vim /etc/nginx/sites-available/typecho.conf
    ```

2. 添加 Typecho 的反向代理配置信息

    ```nginx
    server {
        listen 80;
        listen [::]:80;
        listen 443 ssl http2;
        listen [::]:443 ssl http2;

        server_name your_domain.com;  # 替换为您的域名
        
        ssl_certificate /**/**/*.cer;  # 填入SSL证书路径
        ssl_certificate_key /*/*/*.key;# 填入SSL证书路径
        
        root /var/www/typecho;  # 替换为 Typecho 系统文件夹路径

        index index.php index.html index.htm;

        location / {
            try_files $uri $uri/ /index.php?$args;
        }

        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/run/php/php7.4-fpm.sock;  # 替换为您的 PHP 版本配置
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
        }

        location ~* \.(jpg|jpeg|gif|png|webp|ico|bmp|tiff|css|js|svg)$ {
            expires max;
            log_not_found off;
        }

        location = /favicon.ico { access_log off; log_not_found off; }
        location = /robots.txt  { access_log off; log_not_found off; }

        access_log /var/log/nginx/typecho_access.log;
        error_log /var/log/nginx/typecho_error.log;

        gzip on;
        gzip_disable "msie6";
        gzip_vary on;
        gzip_comp_level 6;
        gzip_min_length 1100;
        gzip_buffers 16 8k;
        gzip_proxied any;
        gzip_types text/plain text/css text/xml application/xml application/javascript application/rss+xml application/atom+xml image/svg+xml;
    }
    ```

3. 创建软链接至 sites-enabled

    ```bash
    sudo ln -s "/etc/nginx/sites-available/typecho.conf" "/etc/nginx/sites-enabled"
    ```

4. 重启服务器

    ```bash
    nginx -t  # 检查配置文件语法错误
    nginx -s reload  # 重新加载配置文件
    ```

### 第四步：申请 SSL 证书

1. 手动安装 acme.sh

    ```bash
    git clone --depth=1 https://github.com/acmesh-official/acme.sh && cd acme.sh
    ```

   或使用国内镜像

    ```bash
    git clone --depth=1 https://gitee.com/neilpang/acme.sh && cd acme.sh
    ```

2. 安装 acme.sh

    ```bash
    ./acme.sh --install
    ```

3. 注册账号

    ```bash
    acme.sh --register-account -m my@example.com
    ```

4. 生成证书

    ```bash
    ./acme.sh --issue -d mydomain.com -d www.mydomain.com --webroot /home/wwwroot/mydomain.com/
    ```

5. 配置 SSL 证书和密钥路径

    ```nginx
    ssl_certificate /path/to/your_certificate.cer;  # SSL 证书路径
    ssl_certificate_key /path/to/your_certificate.key;  # SSL 证书密钥路径
    ```

6. 重启 Nginx

    ```bash
    nginx -t  # 检查配置文件语法错误
    nginx -s reload  # 重新加载配置文件
    ```
