---
title: "v2board后端对接v2ray-warp使用Cloudflare-WARP解锁chatgpt-流媒体"
date: 2023-05-13T22:48:00Z
tags: ["v2board"]
---

## 一、部署安装

GitHub 项目地址：[https://github.com/FranzKafkaYu/x-ui][1]

1. 复制粘贴以下代码，并运行：

    ```bash
    bash <(curl -Ls https://raw.githubusercontent.com/FranzKafkaYu/x-ui/master/install.sh)
    ```

   注意：在 IPv6 Only 的 VPS 中（例如：Euserv、Hax），请先安装 warp，否则无法访问 Github API 而报错。

2. 设置用户名密码、面板访问端口。

   待出现 X-ui 的菜单时，就已经成功一半了！

## 二、配置

系统状态 - xray 状态 - 切换版本 - 切换为最新版本

配置节点：

- 入站列表 - 添加入站
  - 端口：443
  - reality：开启
  - 添加用户：+
    - flow 选择 xtls-rprx-vision
  - 其他默认

## 三、使用

点击"操作" → "二维码"，导出节点。

[1]: https://github.com/FranzKafkaYu/x-ui
