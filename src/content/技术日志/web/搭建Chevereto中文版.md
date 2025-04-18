---
title: "搭建Chevereto中文版"
date: 2021-08-14T20:23:00+08:00
tags: []
---

## 1. 环境准备

* [宝塔面板](https://www.bt.cn/new/index.html)
* PHP 7.4
* MySQL 5.7 / 8 或 MariaDB 10
* Apache HTTP Web Server 或 Nginx

## 2. 下载

中文修改版: [https://github.com/rodber/chevereto-free/releases](https://github.com/rodber/chevereto-free/releases)

官方原版: [https://github.com/chevereto/chevereto/releases](https://github.com/chevereto/chevereto/releases)

## 3. 伪静态

在安装之前需要先设置伪静态，代码如下：

```nginx
location ~ /(app|content|lib|importer)/.*\.(po|php|lock|sql|txt)$ {
    deny all;
}

# Enable CORS header (needed for CDN)
location ~* \.(ttf|ttc|otf|eot|woff|woff2|css|js)$ {
    add_header Access-Control-Allow-Origin "*";
}

# Force serve upload path as static content (match your upload folder if needed)
location /images {}

# Route dynamic request to index.php
location / {
    try_files $uri $uri/ /index.php$is_args$query_string;
}
```

## 4. 安装

浏览器打开你的域名访问，开始安装。

## 5. 常见问题

### 5.1 图床上传大图片提示 Internal Server Error

#### 设置 PHP 参数

```ini
max_execution_time
max_input_time
memory_limit
post_max_size
upload_max_filesize
```

把这些值调大一些，然后重启 PHP。

### 5.2 邮件模板

支持：

1. 账号更换邮箱
2. 新账户注册验证
3. 账户重置密码
4. 新用户注册欢迎
5. 更改邮件模板头图

上传邮件模板文件至 Chevereto `/app/themes/Peafowl/mails` 文件目录下即可，或者直接替换掉 `mails` 目录亦可。

文件: [https://lsy22.lanzouf.com/i9crn0u8anhe](https://lsy22.lanzouf.com/i9crn0u8anhe)
