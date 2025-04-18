---
title: "VMware虚拟机上Mac OS系统"
date: 2023-12-15T20:53:00Z
tags: []
---

## 一、安装VMware Workstation Pro

官方下载链接: [VMware Workstation Pro](https://www.vmware.com/cn/products/workstation-pro/workstation-pro-evaluation.html)
激活教程: 百度

## 二、unlocker解锁VM以支持macOS系统

下载链接: [Unlocker Releases](https://github.com/DrDonk/unlocker/releases)

1. 完全关闭VMware
2. 下载完成后，解压压缩包，右键点击`windows/unlock.exe`，选择以管理员模式运行。
3. 提示`press enter key to continue`说明安装成功

## 三.下载 `macOS Recovery` 镜像

> macOS Recovery模式可以用来给mac 电脑恢复和重新安装操作系统，而虚拟机也可以通过此模式来安装 macOS
> 操作系统，所以我们需要下载一个 macOS Recovery 镜像来引导虚拟机进入macOS Recovery模式。

### 1. 下载python(如果有可以跳过)

Python官方下载地址：[Python下载地址](https://www.python.org/downloads/)

Microsoft下载地址: [Microsoft下载地址](https://apps.microsoft.com/search?query=pyhon&hl=zh-cn&gl=CN)

### 2. 下载 macOS Recovery 镜像

获取 python 脚本:

```bash
curl -OL https://raw.githubusercontent.com/acidanthera/OpenCorePkg/master/Utilities/macrecovery/macrecovery.py
```

下载 macOS Recovery:

版本：Monterey (12）

```bash
python3 macrecovery.py -b Mac-FFE5EF870D7BA81A -m 00000000000000000 download
```

> 下载完成后，可以看到当前文件夹多出了一个com.apple.recovery.boot
>
> 文件夹，打开之后有一个BaseSystem.dmg
>
> 文件，这就是macOSRecovery镜像；但是此镜像不能直接用来引导虚拟机，需要转换一下格式才能用来引导虚拟机。

下载macOSRecovery镜像的教程来自[这里](https://dortania.github.io/OpenCore-Install-Guide/installer-guide/windows-install.html)

### 3. 转换 macOS Recovery 镜像

镜像需要用到 qemu-img 工具
下载链接: [QEMU下载链接](https://qemu.weilnetz.de/w64/)

#### Ⅰ. 下载 qemu 之后，双击 qemu-w64-setup 程序进行安装

安装完毕后，和之前打开命令行的方法一样,打开cmd命令行进入`com.apple.recovery.boot`文件夹

Ⅱ. 打开此路径后，如果qemu-w64是默认安装就输入

```bash
c:\"Program Files"\qemu\qemu-img convert -O vmdk -o compat6 BaseSystem.dmg recovery.vmdk
```

如果不是替换 `c:\"Program Files"\`,输入完即可将 macOS Recovery 镜像转换为 VMWare 虚拟机需要的格式

转换教程来自[这里](https://www.insanelymac.com/forum/topic/342603-guide-simple-steps-to-create-macos-installer-for-vmware-on-linux-or-windows/)

## 四.创建虚拟机

```bash
安装来源：选择以后再安装操作系统，创建一个空白硬盘
客户端操作系统：macOS13
CPU配置，处理器数量:1,内核数量:自定义
内存，看自己物理机内存大小
网络选项：桥接
磁盘：创建新的磁盘
其他未说明选项，默认或随意
```

## 五.设置引导硬盘

点击虚拟机名字->编辑虚拟机设置->添加->硬盘->磁盘类型默认->使用现在已有虚拟磁盘 ->将选择第三步生成的recovery.vmdk->选择保持原有格式->然后保存

## 六.开始安装

### 1.打开VMWare虚拟机，开启虚拟机电源，虚拟机会自动进入引导界面

### 2.选择语言

### 3.格式化硬盘

1. 点击磁盘工具旁边的图标选择显示所有设备
2. 选择之前创建的空白硬盘，看大小可以分辨出来
3. 点击抹掉 - 抹除磁盘
4. 关闭磁盘工具，选择重新安装 macOS ‍

## 七.安装完成之后

安装完成进入系统之后，需要安装 vmware-tools 工具，这样才可以调整窗口分辨率以及开启 HiDPI。右键点击 VMware 虚拟机管理界面的虚拟机选项即可看到  安装 vmware-tools 工具选项，点击后虚拟机内会弹出安装界面，按照提示一步步安装，然后重启即可。

## vmware安装苹果虚拟机卡在苹果图标位置不动或者最新AMD客户机操作系统已禁用 CPU。请关闭或重置虚拟机

修改虚拟机目录下`macOS 13.vmx`文件末尾加入

> `macOS 13`：为虚拟机名字

`board-id = "Mac-4B682C642B45593E"`为安装的版本号

```bash
cpuid.0.eax = "0000:0000:0000:0000:0000:0000:0000:1011"
cpuid.0.ebx = "0111:0101:0110:1110:0110:0101:0100:0111"
cpuid.0.ecx = "0110:1100:0110:0101:0111:0100:0110:1110"
cpuid.0.edx = "0100:1001:0110:0101:0110:1110:0110:1001"
cpuid.1.eax = "0000:0000:0000:0001:0000:0110:0111:0001"
cpuid.1.ebx = "0000:0010:0000:0001:0000:1000:0000:0000"
cpuid.1.ecx = "1000:0010:1001:1000:0010:0010:0000:0011"
cpuid.1.edx = "0000:0111:1000:1011:1111:1011:1111:1111"
smbios.reflectHost = "TRUE"
hw.model = "MacBookPro14,3"
board-id = "Mac-FFE5EF870D7BA81A"
keyboard.vusb.enable = "TRUE"
mouse.vusb.enable = "TRUE"
```

## 未能启动虚拟机

修改虚拟机目录下`macOS 13.vmx`的配置选项

> `macOS 13`：为虚拟机名字

将`virtualHW.version`的值改为`"11"`

```bash
virtualHW.version = "11"；
```
