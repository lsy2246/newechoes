---
title: "Linux美化终端 zsh+ohmyzsh"
date: 2023-12-14T13:21:00Z
tags: []
---

## 1. 安装 zsh

[使用包管理器安装 zsh](https://github.com/ohmyzsh/ohmyzsh/wiki/Installing-ZSH)

将 zsh 设置成默认 shell：

```bash
chsh -s /bin/zsh
```

## 2. 安装 [oh-my-zsh](https://ohmyz.sh/)

通过 curl 安装 oh-my-zsh：

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

通过 wget 安装 oh-my-zsh：

```bash
sh -c "$(wget https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh -O -)"
```

## 3. 更改主题

内置主题: [oh-my-zsh 主题](https://github.com/ohmyzsh/ohmyzsh/wiki/Themes)

打开 `~/.zshrc` 配置文件，找到 `ZSH_THEME` 变量，将其修改为想要的主题名称。保存后重开终端或者执行 `exec $SHELL` 命令即可生效。

## 4. 安装插件

`oh-my-zsh` 默认自带了很多插件，放置在 `~/.oh-my-zsh/plugins` 目录下。

打开 `~/.zshrc` 配置文件，找到 `plugins` 变量，将您想启用的插件加入进去，不同插件名称之间以空格隔开。

### 主题

* [powerlevel10k](https://github.com/romkatv/powerlevel10k)

### 插件

* [zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions): 根据历史记录和完成情况在您输入时建议命令
* [zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting): 输入命令时提供语法高亮

#### oh-my-zsh 自带插件

直接按照上述方法在 `.zshrc` 配置的 `plugins` 中加入即可：

* [command-not-found](https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/command-not-found): 在 `zsh` 找不到命令时提供建议的安装包
* [extract](https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/extract): 使用 `x` 命令解压任何压缩文件
* [pip](https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/pip): 为 `python` 包管理器 `pip` 提供补全
* [docker](https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/docker): 为 `docker` 命令添加自动补全支持
* [docker-compose](https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/docker-compose): 为 `docker-compose` 命令添加自动补全支持
  