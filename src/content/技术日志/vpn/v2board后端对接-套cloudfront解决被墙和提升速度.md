---
title: "v2board后端对接 套cloudfront解决被墙和提升速度"
date: 2023-05-13T22:05:00Z
tags: ["v2board"]
---

## 一、准备工作

参照文章`v2board后端对接-XrayR`创建一个可用的节点。

## 二、配置 AWS CloudFront

1. 创建aws账号
2. 在aws后台直接搜-`CloudFront`-创建分配
3. 创建分配配置：
    - 源域：cloudflared托管的域名
    - 协议：仅 HTTPS
    - 最低源 SSL 协议：TLSv1.1
    - 自动压缩对象：否
    - 缓存键和源请求：Legacy cache settings
    - Web Application Firewall (WAF)：Do not enable security protections
    - 其他设置默认

## 三、添加节点

1. 复制一份创造成功的节点
2. 修改复制节点：
    - 后台 > 节点管理 > 添加节点
        - 节点名称：随便填写
        - 权限组：随便填写
        - 节点地址：CloudFront分配的域名
        - TLS：关闭
        - 端口：80
        - 父节点：选择创造好的节点
        - 传输协议：选择websocket
        - 配置协议：

          ```json
          {
            "path": "/随便",
            "headers": {
              "Host": "CloudFront分配的域名"
            }
          }
          ```
