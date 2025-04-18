---
title: "Windows虚拟化和子系统安装指南"
date: 2023-12-11T17:08:00Z
tags: []
---

## 准备工作

### 一、开启 CPU 虚拟化

1. 重启电脑并进入 **BIOS** 设置。
2. 在 BIOS 设置中找到带有 `virtualization` 字样的选项，启用所有相关的虚拟化功能。

### 二、安装 Hyper-V 服务

1. 打开控制面板：开始 → 运行 → 输入 `control.exe`。
2. 选择 `程序和功能`。
3. 点击左侧的 `启用或关闭Windows功能`。
4. 勾选 `Hyper-V` 和 `虚拟机平台` 选项，点击确定完成安装。
5. 重启电脑以应用更改。

## Windows Subsystem for Android (WSA)

### 一、下载离线安装包

1. 访问微软离线应用提取网站：[store.rg-adguard.net](https://store.rg-adguard.net)
2. 复制 WSA 在微软应用商店的地址并粘贴至 URL 输入框中，选择 Slow，点击对勾开始搜索。
3. 选择适合您系统架构的最新版本的 WSA 安装包（通常为 `.Msixbundle` 后缀），并下载。

   > 注意：忽略带有 BlockMap 后缀的文件。

4. 也可访问 [MustardChef 的 GitHub 页面](https://github.com/MustardChef/WSABuilds) 下载经过修改的 WSA 安装包。

### 二、安装 WSA 环境

1. 以管理员身份打开 PowerShell（"开始"菜单 >"PowerShell" >右键 >"以管理员身份运行"）。
2. 使用以下命令安装下载的 WSA 包：

    ```bash
    Add-AppxPackage "路径\下载的wsa.Msixbundle"
    ```

## Windows Subsystem for Linux (WSL)

### 一、启用 WSL

1. 以管理员身份打开 PowerShell 并运行：

    ```bash
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
    ```

### 二、检查 WSL2 的要求

按 Win+R 打开运行，输入 `winver` 检查 Windows 版本要求：

* 对于 x64 系统：版本 1903 或更高，内部版本 18362.1049 或更高。
* 对于 ARM64 系统：版本 2004 或更高，内部版本 19041 或更高。

### 三、启用虚拟机功能

以管理员身份打开 PowerShell 并运行：

```bash
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

### 四、下载 Linux 内核更新包

下载适用于您的计算机架构的 WSL2 Linux 内核更新包：[下载链接](https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi)

### 五、设置 WSL 默认版本

打开 PowerShell 并运行以下命令，将 WSL 2 设置为默认版本：

```bash
wsl --set-default-version 2
```

### 六、安装 Linux 分发版

1. 访问Microsoft Store，下载想要安装的 Linux 分发版"
2. 切换到 root 用户登录（如需）：

   在 PowerShell 中运行

    1. 获取linux名称

        ```bash
        wsl --list
        ```

    2. 切换root用户

        ```bash
        指定的Linux分发版 config --default-user root
        ```

## 常见问题处理

* **关闭 WSL 自动挂载 Windows 分区**：
  编辑 WSL 配置文件 `/etc/wsl.conf` 并添加内容以禁用自动挂载和 Windows 路径的添加。

  ```bash
  # 不加载Windows中的PATH内容
  [interop]
  appendWindowsPath = false

  # 不自动挂载Windows系统所有磁盘分区
  [automount]
  enabled = false
  ```

* **解决无法定位 package screen 的问题**：
  在 Linux 分发版中运行 `apt-get update` 来更新软件包列表。
* **WSL 卸载**：
  查看已安装的 WSL 环境并卸载指定的 Linux 分发版。

  ```bash
  wsl --unregister 指定的Linux分发版
  ```

* **解决 WSLRegisterDistribution 错误**：
  在 PowerShell 中运行

  ```bash
  Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
  ```
  