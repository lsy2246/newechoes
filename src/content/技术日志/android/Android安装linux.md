---
title: "Android 安装 Linux"
date: 2023-12-11T20:53:00Z
tags: []
---

## 一. 安装 Termux

[官方版本](https://termux.dev/cn/)
[ZeroTermux (魔改)](https://github.com/hanxinhao000/ZeroTermux)

## 二. 安装 Linux

1. 下载容器脚本并使用

    ```bash
    curl -LO https://gitee.com/mo2/linux/raw/2/2.awk
    awk -f 2.awk
    ```

2. 安装容器
    - 选择 `1. proot 容器`
    - 选择 `1. arm64 发行版列表`
    - 选择需要的镜像
    - 选择需要的版本
    - 如果显示没有权限读写文件，给软件 root 权限，重新开始
    - 请问是否新建 sudo 用户: 否
    - 遇到选择默认回车
    - tmoe-Tools: 不需要图形化界面直接选 `0` 退出
