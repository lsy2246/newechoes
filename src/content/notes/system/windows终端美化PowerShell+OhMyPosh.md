---
title: "Windows终端美化PowerShell+OhMyPosh"
date: 2024-06-28T02:51:52+08:00
tags: []
---

## 1. 安装 Windows Terminal

在 Microsoft Store 搜索 `Windows Terminal`，安装即可。

## 2. 安装 PowerShell 7

在 Microsoft Store 搜索 `PowerShell`，安装即可。

安装完成后，打开 `Windows Terminal`，确认能进入 `pwsh`。

## 3. 安装 Oh My Posh

官方文档：  
[Oh My Posh 安装指南](https://ohmyposh.dev/docs/installation/windows)

一般安装完成后，就可以在 PowerShell 里使用 `oh-my-posh` 命令。

## 4. 查看可用主题

```powershell
Get-PoshThemes
```

你可以先挑一个自己喜欢的主题，例如 `negligible`。

## 5. 临时切换主题

```powershell
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH/negligible.omp.json" | Invoke-Expression
```

关闭窗口后，主题就会消失。

## 6. 永久启用主题

打开 PowerShell 配置文件：

```powershell
if (!(Test-Path -Path $PROFILE)) { New-Item -Type File -Path $PROFILE -Force }
notepad $PROFILE
```

加入下面这一行：

```powershell
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH/negligible.omp.json" | Invoke-Expression
```

保存后，重新打开 `Windows Terminal`，主题就会自动生效。

## 7. `$PROFILE` 文件在哪

直接用 `$PROFILE` 即可，不用手动写路径。

## 8. 字体乱码

很多 `Oh My Posh` 主题会用到特殊图标。

如果显示成方框或乱码，需要安装 `Nerd Font`，然后在 `Windows Terminal` 设置中切换到对应字体。

## 9. 更换主题

把配置文件里的主题名改掉即可，例如：

```powershell
oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH/jandedobbeleer.omp.json" | Invoke-Expression
```
