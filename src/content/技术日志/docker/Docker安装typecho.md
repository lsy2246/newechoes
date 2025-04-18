---
title: "Docker安装typecho"
date: 2024-06-17T02:19:34+08:00
tags: ["Docker-compose"]
---

## 创建 `nginx` 站点配置文件

### 网站目录结构

```text
.
├── docker-compose.yml
├── data                       # 网站源代码
├── php
│   └── Dockerfile             # 构建PHP配置文件
├── nginx                      # 用于存储nginx相关文件
│   ├── logs                   # 日志文件
│   └── conf                   # 配置文件
│       └── default.conf
└── mysql                      # 用于存储mysql相关文件
    ├── data                   # 数据文件
    ├── logs                   # 日志文件
    └── conf                   # 配置文件
```

### 需要配置文件详细说明

1. **PHP 容器配置文件**

   文件路径: `./php/Dockerfile`

   构建 PHP 容器，安装 PDO_MySQL 扩展并配置 PHP.ini：

    ```dockerfile
    FROM php:fpm

    # 更新包列表并安装 pdo_mysql 扩展
    RUN apt-get update && \
        apt-get install -y libpq-dev && \
        docker-php-ext-install pdo_mysql && \
        rm -rf /var/lib/apt/lists/*

    # 设置 PHP 配置
    RUN { \
            echo "output_buffering = 4096"; \
            echo "date.timezone = PRC"; \
        } > /usr/local/etc/php/conf.d/custom.ini
    ```

2. **Nginx 服务器配置**

   文件路径:`./nginx/conf/default.conf`

   Nginx 服务器配置文件，包括服务器监听、根目录设置、重写规则和 PHP 处理：

    ```nginx
    server {
        listen 80 default_server;     # 监听 80 端口
        root /var/www/html;           # 网站根目录
        index index.php index.html index.htm;

        access_log /var/log/nginx/typecho_access.log main;  # 访问日志
        if (!-e $request_filename) {
            rewrite ^(.*)$ /index.php$1 last;  # 重写 URL 到 index.php
        }

        location / {
            if (!-e $request_filename) {
                rewrite . /index.php last;  # 如果文件不存在，重写到 index.php
            }
        }

        location ~ \.php(.*)$ {
            fastcgi_pass   php:9000;                   # 转发 PHP 请求到 php-fpm 服务
            fastcgi_index  index.php;
            fastcgi_param  SCRIPT_FILENAME $document_root$fastcgi_script_name;  # 设置脚本文件名参数
            include        fastcgi_params;             # 包含 fastcgi 参数
        }
    }
    ```

3. **Typecho 源代码部署**

   创建 `./data` 文件夹，并将 [Typecho](https://github.com/typecho/typecho/releases) 源代码放入此文件夹。

   docker容器不以root权限运行,无法访问文件,需要赋权

    ```bash
    chmod -R 777 data
    ```

4. **Docker Compose 配置**

   路径: `./docker-compose.yml`

   定义和启动多个服务的 Docker Compose 文件：

   可自行更改

    * nginx 中的端口，默认为`9757`
    * MySQL中的 root的密码 和 需要创建的数据库名称，默认都为`typecho`

    ```yaml
    services: # 定义多个服务

        nginx: # 服务名称
            image: nginx # 使用的镜像
            ports: # 映射的端口
                - "9575:80" # 宿主机端口 9575 映射到容器端口 80
            restart: always # 容器重启策略
            volumes: # 映射文件
                - ./data:/var/www/html # 网站源代码
                - ./nginx/conf:/etc/nginx/conf.d # nginx 站点配置文件
                - ./nginx/logs:/var/log/nginx # nginx 日志文件
            depends_on: # 定义依赖关系
                - php # 依赖 php 服务
            networks: # 要加入的网络
                - typecho # 加入 typecho 网络
            
        php: # 服务名称
            build: ./php # 构建文件的目录
            restart: always # 容器重启策略
            volumes: # 映射文件
                - ./data:/var/www/html # 网站源代码
            depends_on: # 定义依赖关系
                - mysql # 依赖 mysql 服务
            networks: # 要加入的网络
                - typecho # 加入 typecho 网络
      
        mysql: # 服务名称
            image: mysql:5.7 # 指定 5.7 版本的 mysql 镜像
            restart: always # 容器重启策略
            volumes: # 要映射的文件
                - ./mysql/data:/var/lib/mysql # mysql 数据
                - ./mysql/logs:/var/log/mysql # mysql 日志
                - ./mysql/conf:/etc/mysql/conf.d # mysql 配置文件
            environment: # 环境变量
                MYSQL_ROOT_PASSWORD: typecho # MySQL root 用户的密码
                MYSQL_DATABASE: typecho # 创建的数据库名称
            networks: # 要加入的网络
                - typecho # 加入 typecho 网络

    networks: # 定义的内部网络
        typecho: # 网络名称
    ```

## 安装

### 启动

```bash
docker compose up -d
```

### 配置

如果修改过`docker-compose.yml`

* 数据库地址: `mysql`

  ```text
  因为docker内部网络可以用过容器名访问
  ```

* 数据库用户名: `root`
* 数据库密码: `typecho`
* 数据库名: `typecho`
* 启用数据库 SSL 服务端证书验证: 关闭
* 其他默认或随意

## 问题

### 恢复直接用nginx+MySQL搭建的网站

1. 将原来的文件放入data

2. 进入mysql容器,导入数据库文件

3. 在`docker-compose.yml`的环境变量中加入

    ```yaml
    MYSQL_USER=typecho           # 原有 MySQL 用户名
    MYSQL_PASSWORD=typecho       # 原有 MySQL 用户密码
    ```

4. 进入mysql容器,将数据库赋权给原用户

### 排版错误

`config.inc.php` 末尾加入

```php
define('__TYPECHO_SECURE__',true);
```
