---
title: "手动搭建LNMP"
date: 2024-04-05T01:48:16+08:00
tags: []
---

## 系统更新和软件安装

### 更新系统的软件包列表

在开始安装任何软件之前，最好先更新系统的软件包列表：

```bash
sudo apt update
```

### 第一步：安装 Nginx

1. **安装 Nginx**：

   ```bash
   sudo apt install nginx
   ```

2. **启动 Nginx 并检查状态**：

   ```bash
   sudo systemctl status nginx
   ```

### 第二步：安装 PHP

1. **安装 php-fpm 模块**：

   ```bash
   sudo apt install php-fpm
   ```

   > 安装 php-fpm 模块而不是 PHP。如果 PHP 先安装，它可能会默认配置 Apache 服务器而不是 Nginx。`php-fpm` 包包含 PHP 的所有核心模块。

2. **（可选）安装其他 PHP 模块**，例如 `php-mysql`，运行 Typecho 所必需的软件包：

   ```bash
   sudo apt install php-common php-mysql php-cgi php-mbstring php-curl php-gd php-xml php-xmlrpc php-pear
   ```

3. **确认 PHP 版本**：

   ```bash
   php -v
   ```

4. **确认 php-fpm 服务正在运行**（替换为您的 PHP 版本）：

   ```bash
   sudo systemctl status php8.3-fpm
   ```

### 第三步：安装 MySQL

1. **安装 gnupg 包**，用于处理密钥：

   ```bash
   sudo apt install gnupg
   ```

2. **下载 MySQL 的官方 DEB 软件包**。先查询[最新的官方 DEB 包](https://dev.mysql.com/downloads/repo/apt/)，然后使用 `wget` 下载：

   ```bash
   wget [MySQL DEB Package URL]
   ```

3. **安装 DEB 包**：

   ```bash
   sudo dpkg -i [package-name.deb]
   ```

   > 将 `[package-name.deb]` 替换为下载的包名。

4. **刷新 apt 软件包缓存**，以使新软件包可用：

   ```bash
   sudo apt update
   ```

5. **安装 MySQL 服务器**：

   ```bash
   sudo apt install mysql-server
   ```

6. **检查 MySQL 服务状态**：

   ```bash
   sudo systemctl status mysql
   ```

7. **测试 MySQL**：

   ```bash
   mysqladmin -u root -p version
   ```
