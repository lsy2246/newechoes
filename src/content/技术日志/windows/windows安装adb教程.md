---
title: "windows安装adb教程"
date: 2021-08-12T20:27:00+08:00
tags: []
---

## 1. 下载adb工具

(1) 打开Android开发网，搜索"SDK Platform Tools"，打开如下所示的[网站][1]，可以看到有Windows\Mac\Linux三个版本的SDK Platform Tools，点击符合你电脑的版本下载它。adb工具就包含在这个工具中。

(2) 如果打不开Android开发网，则需要魔法，确保能访问Google之后再来下载和安装adb。
或者在一些第三方的网站上下载SDK Platform Tools。

(3) 站长提供的[platform-tools_r31.0.3-windows][2]蓝奏云下载

## 2. adb安装和配置

(1) SDK Platform Tools下载后，在"platform-tools"路径下可以看到三个adb相关的文件。现在需要将这个路径添加到系统环境变量中。

(2) 添加环境变量：

- windows10: 打开我的电脑——高级系统设置——系统属性——高级——环境变量——编辑Path，将步骤3个文件所在路径添加到Path变量值中。最后点击"确定"。
- windows7: 右击我的电脑——属性——高级系统设置——高级——环境变量——编辑Path

(3) 重新打开一个cmd窗口，输入adb，可以看到如下的窗口，有显示adb的版本和用法，这就说明adb正确安装好啦。

## 3. 下载驱动

去谷歌中国开发者网站上下载oem usb驱动程序,并在设备管理器选择正确的驱动程序
驱动程序：[https://developer.android.google.cn/studio/run/oem-usb?hl=zh-cn][3]

[1]: https://developer.android.google.cn/studio/releases/platform-tools?hl=en
[2]: https://lsy22.lanzoui.com/iFIUqsjzyvc
[3]: https://developer.android.google.cn/studio/run/oem-usb?hl=zh-cn
