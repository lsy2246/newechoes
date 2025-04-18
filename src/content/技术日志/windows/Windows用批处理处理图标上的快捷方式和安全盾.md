---
title: "Windows用批处理处理图标上的快捷方式和安全盾"
date: 2023-05-23T23:22:00+08:00
tags: []
---

## 去除桌面图标上的快捷方式

1. 打开记事本或其他文本编辑器，将下面这段代码复制粘贴到文本编辑器中。

    ```batch
    @echo off
    reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons" /v 29 /d "%systemroot%\system32\imageres.dll,197" /t reg_sz /f
    taskkill /f /im explorer.exe
    attrib -s -r -h %userprofile%\AppData\Local\IconCache.db
    del %userprofile%\AppData\Local\IconCache.db
    start explorer.exe
    ```

2. 将文本编辑器中的代码另存为.bat文件，例如 remove_shortcut.bat，保存在桌面上。

3. 点击双击打开保存在桌面上的 remove_shortcut.bat 文件，代码会自动执行，去除桌面图标上的快捷方式。

4. 如果您的Windows系统账户没有管理员权限，请使用管理员权限运行 remove_shortcut.bat 文件。

5. 执行完毕后，命令行窗口会闪一下，随后资源管理器（explorer.exe）会立即自动重启。

## 去除桌面图标上的安全盾

1. 打开记事本或其他文本编辑器，将下面这段代码复制粘贴到文本编辑器中。

    ```batch
    @echo off
    reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons" /v 29 /d "%systemroot%\system32\imageres.dll,197" /t reg_sz /f
    reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons" /v 77 /d "%systemroot%\system32\imageres.dll,197" /t reg_sz /f
    taskkill /f /im explorer.exe
    attrib -s -r -h %userprofile%\AppData\Local\IconCache.db
    del %userprofile%\AppData\Local\IconCache.db
    start explorer.exe
    ```

2. 将文本编辑器中的代码另存为.bat文件，例如 remove_security.bat，保存在桌面上。

3. 点击双击打开保存在桌面上的 remove_security.bat 文件，代码会自动执行，去除桌面图标上的安全盾标志。

4. 如果您的Windows系统账户没有管理员权限，请使用管理员权限运行 remove_security.bat 文件。

5. 执行完毕后，命令行窗口会闪一下，随后资源管理器（explorer.exe）会立即自动重启。
