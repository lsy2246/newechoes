---
title: "X-UI面板快速搭建和配置"
date: 2023-07-11T00:17:00+08:00
tags: ["x-ui"]
---

## 一、部署安装

GitHub项目地址：[https://github.com/FranzKafkaYu/x-ui](https://github.com/FranzKafkaYu/x-ui)

1. 复制粘贴以下代码，并运行：

    ```bash
    bash <(curl -Ls https://raw.githubusercontent.com/FranzKafkaYu/x-ui/master/install.sh)
    ```

   注意：在IPv6 Only的VPS中（例如：Euserv、Hax），请先安装warp，否则无法访问Github API而报错。

2. 设置用户名密码、面板访问端口。

   待出现X-ui的菜单时，就已经成功一半了！

## 二、配置

系统状态 - xray 状态 - 切换版本 - 切换为最新版本

配置节点：

- 入站列表 - 添加入站
  - 协议：`vless`
  - 端口：`443`
  - reality：`开启`
  - 添加用户：+
    - flow选择xtls-rprx-vision
    - 其他默认

## 三、使用

点击"操作"→"二维码"，导出节点。
