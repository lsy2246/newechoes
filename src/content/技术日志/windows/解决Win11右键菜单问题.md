---
title: "解决 Win11 右键菜单问题"
date: 2021-12-11T18:53:00Z
tags: []
---

首先，按下 Win+X 打开 Windows PowerShell（管理员）。

1. 切换回经典右键菜单：

    ```powershell
    reg add "HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" /f /ve
    ```

2. 恢复到新版右键菜单（不建议执行）：

    ```powershell
    reg delete "HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}" /f
    ```

然后，按下 Win+E 打开 Windows 资源管理器，接着按下 Ctrl+Shift+Esc 打开任务管理器，找到并重启 Windows 资源管理器。

现在，右键单击应该已经恢复正常了。
