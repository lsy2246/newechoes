---
title: "Windows终端美化PowerShell+OhMyPosh"
date: 2024-06-28T02:51:52+08:00
tags: []
---

## 安装 PowerShell

在 Microsoft Store 搜索 Windows Terminal，点击安装即可。

## 安装 [Oh My Posh](https://ohmyposh.dev/)

官方安装文档：[Oh My Posh 安装指南](https://ohmyposh.dev/docs/installation/windows)

## 设置主题

在终端输入命令 `Get-PoshThemes`，即可查看支持的主题列表。

选择一个主题，例如 `negligible`，并修改 `Microsoft.PowerShell_profile.ps1` 文件中的主题内容。

### 临时切换主题

```bash
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH/negligible.omp.json" | Invoke-Expression
```

### 永久切换主题

将上述命令加入 `Microsoft.PowerShell_profile.ps1` 文件中。

`Microsoft.PowerShell_profile.ps1` 文件的路径一般为 `C:\Users\用户名\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`。

输入下方命令来打开该文件：

```powershell
profile
if (!(Test-Path -Path $PROFILE )) { New-Item -Type File -Path $PROFILE -Force }
notepad $PROFILE
```
