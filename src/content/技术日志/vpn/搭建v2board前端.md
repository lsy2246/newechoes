---
title: "搭建v2board前端"
date: 2021-07-31T00:06:00+08:00
tags: ["v2board"]
---

## 一、配置宝塔

你需要在宝塔选择你的系统获得安装方式。这里以 CentOS 7+ 作为系统环境进行安装。

[宝塔官方](https://www.bt.cn/bbs/thread-19376-1-1.html)

安装完成后我们登陆宝塔进行环境的安装。

选择使用LNMP的环境安装方式勾选如下信息：

- ☑️ Nginx 1.17
- ☑️ MySQL 5.6
- ☑️ PHP 7.3

选择快速编译后进行安装。

## 二、安装Redis和文件信息

宝塔面板 > 软件商店 > 找到PHP 7.3点击设置 > 安装扩展 > `redis` `fileinfo`进行安装。

## 三、解除被禁止的函数

宝塔面板 > 软件商店 > 找到PHP 7.3点击设置 > 禁用功能，将 `putenv` `proc_open` `pcntl_alarm` `pcntl_signal` 从列表中删除。

## 四、添加站点

宝塔面板 > 网站 > 添加站点：

- 在域名填入你的域名
- 在数据库中选择MySQL
- 在 PHP 版本中选择 PHP-73

## 五、安装V2Board

### 进入站点目录

```bash
cd /www/wwwroot/你的站点域名
```

### 删除目录下文件

```bash
chattr -i .user.ini
rm -rf .htaccess 404.html index.html .user.ini
```

### 从 Github 克隆到当前目录

```bash
git clone https://github.com/v2board/v2board.git ./
```

### 安装依赖包以及V2board

```bash
sh init.sh
```

## 六、配置站点目录及伪静态

1. 添加完成后编辑添加的站点 > 站点目录 > 运行目录，选择 /public 保存。
2. 添加完成后编辑添加的站点 > 伪静态，填入：

   ```nginx
   location /downloads {
   }
   
   location / {  
       try_files $uri $uri/ /index.php$is_args$query_string;  
   }
   
   location ~ .*\.(js|css)?$
   {
       expires      1h;
       error_log off;
       access_log /dev/null; 
   }
   ```

## 七、配置定时任务

宝塔面板 > 计划任务，配置：

- 任务类型：选择 Shell 脚本
- 任务名称：填写`v2board`
- 执行周期：选择`N 分钟 1 分钟`
- 脚本内容：

  ```php
  php /www/wwwroot/路径/artisan schedule:run
  ```

根据上述信息添加每1分钟执行一次的定时任务。

## 八、启动队列服务

V2board的邮件系统强依赖队列服务，你想要使用邮件验证及群发邮件必须启动队列服务。下面以宝塔中`supervisor`服务来守护队列服务作为演示。

宝塔面板 > 软件商店 > 部署 > 找到Supervisor进行安装，安装完成后点击设置 > 添加守护进程，按照如下填写：

- 名称：填写 `V2board`
- 运行目录：选择站点目录
- 启动命令：填写 `php artisan horizon`
- 启动数量：填写 `1`

填写后点击添加即可运行。

## 常见问题

### 500错误

可能的原因：

1. 检查站点根目录权限，递归755，保证目录有可写文件的权限。
2. Redis扩展没有安装或者Redis没有安装造成的。
3. 可以通过查看storage/logs下的日志来排查错误或者开启debug模式。
4. 重启php7.3。
