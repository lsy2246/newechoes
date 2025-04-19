---
title: "vscode配置"
date: 2025-04-19T11:10:57+08:00
tags: []
---



## 自动补全，语法检查

| 语言     | 插件                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| rust     | [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)               |
| tailwind | [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) |
| markdown | [markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint)         |
| toml     | [Even Better TOML](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml)           |

## 格式化

### 格式化插件

| 插件                                                                                             | 格式化言语          |
| ------------------------------------------------------------------------------------------------ | ------------------- |
| [prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)           | js,md,css,html,yaml |
| [Black Formatter](https://marketplace.visualstudio.com/items?itemName=ms-python.black-formatter) | python              |
| [shell-format](https://marketplace.visualstudio.com/items?itemName=foxundermoon.shell-format)    | shell               |

### 保存自动格式化

`settings.json`增加以下代码

```txt
"editor.formatOnSave": true // 保存时自动规范代码
```

## 其他

| 名称                                                                                                                          | 作用                   |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| [Atom Material Icons](https://marketplace.visualstudio.com/items?itemName=AtomMaterial.a-file-icon-vscode)                    | 美化图标               |
| [Atom One Dark Theme](https://marketplace.visualstudio.com/items?itemName=akamud.vscode-theme-onedark)                        | 美化主题               |
| [Live Preview](https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server)                                     | 提供在线预览web项目    |
| [Markdown Preview Github Styling](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-preview-github-styles) | 提供markdown代码块样式 |
| [Chinese (Simplified)](https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-zh-hans)            | 简体中文语言包         |

## 非html文件中启用tailwind高亮提示

### 安装高亮插件

- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [PostCSS Language Support](https://marketplace.visualstudio.com/items?itemName=csstools.postcss)

### 启动高亮配置

>以rust为例

修改`setting.json`文件

```json
// 配置识别的正则表达式
"tailwindCSS.experimental.classRegex": [
    "class:\\s?\"(.*?)\"",
    "class:\\s?format!\\((\"(.*?)\")\\)"
],
// 配置识别的语言
"tailwindCSS.includeLanguages": {
    "rust": "html"
},
```
