---
title: "Adobe Photoshop (Beta) 使用教程"
date: 2023-10-13T12:47:00Z
tags: []
---

## 软件

[Adobe Photoshop (Beta) 下载链接](https://pan.baidu.com/s/1f6WhLHig1AODurU2yo-HhQ?pwd=fyr7)

## 报错处理

### 出现黄色更新弹窗

1. 打开文件目录：
    - Mac 修改文件目录：`/Applications/Adobe Photoshop (Beta)/Adobe Photoshop (Beta).app/Contents/Required/UXP/com.adobe.photoshop.inAppMessaging/js/0.js`
    - Windows 目录（如果是 C 盘）：`C:\Program Files\Adobe\Adobe Photoshop 2023\Required\UXP\com.adobe.photoshop.inAppMessaging\js\0.js`

2. 修改 `0.js` 文件：
    - 搜索 `"996633",`，结果有两处。找到第一处，在后面加上 `",display:none",`（别忘了英文逗号）。
    - 保存文件，退出 Photoshop，重启 Photoshop。提示框应消失。

### Adobe Creative Cloud 丢失或损坏提示

解决方法一：使用独立安装包安装，例如使用 PS CC 2017 的安装包直接安装。

解决方法二：

1. 在弹出页面之后，别关闭，打开任务管理器，你会看到这个进程（同时有一个 Adobe IPC 的分进程）。
2. 找到 Cloud，右键打开文件所在位置。
3. 关闭这个对话框，然后删除文件夹里 `Adobe Desktop Service` 名字的 `EXE` 文件。
4. 重启 Photoshop。

提示：如果任务管理器当时没出现这个进程，可能过一会出现，或者直接用 Everything 搜索 `Adobe Desktop Service` 去到 `C:\Program Files (x86)\Common Files\Adobe\Adobe Desktop Common\ADS` 目录也行。

> 解决原理：这个 ADS 文件夹是 Adobe Creative Cloud 附带的一个负责检查软件状态的应用程序，如果检测到当前电脑未安装 Adobe Creative Cloud，那么它就会提示让你安装软件，但是并不影响 Photoshop 本身的功能以及使用。
