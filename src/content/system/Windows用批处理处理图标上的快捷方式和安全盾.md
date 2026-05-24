---
title: "Windows用批处理处理图标上的快捷方式和安全盾"
date: 2023-05-23T23:22:00+08:00
tags: []
---

## 批处理脚本

### 1. 移除快捷方式箭头

```batch
@echo off
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons" /v 29 /d "%systemroot%\system32\imageres.dll,197" /t reg_sz /f
taskkill /f /im explorer.exe
attrib -s -r -h %userprofile%\AppData\Local\IconCache.db
del %userprofile%\AppData\Local\IconCache.db
start explorer.exe
```

### 2. 移除安全盾牌标志

```batch
@echo off
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons" /v 29 /d "%systemroot%\system32\imageres.dll,197" /t reg_sz /f
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Shell Icons" /v 77 /d "%systemroot%\system32\imageres.dll,197" /t reg_sz /f
taskkill /f /im explorer.exe
attrib -s -r -h %userprofile%\AppData\Local\IconCache.db
del %userprofile%\AppData\Local\IconCache.db
start explorer.exe
```

## 使用方法

1. 选择您需要的批处理脚本（移除快捷方式箭头或移除安全盾牌）
2. 打开记事本或其他文本编辑器，复制对应的代码
3. 将文本另存为`.bat`文件（例如`remove_shortcut.bat`或`remove_shield.bat`）
4. **以管理员身份运行**保存的批处理文件
5. 脚本执行后，资源管理器(explorer.exe)会自动重启，变更立即生效

## 注意事项

- 这些操作会修改系统注册表，请确保您了解其影响
- 必须使用管理员权限运行批处理文件
- 如需恢复默认设置，可删除添加的注册表项
