---
title: "将hugo部署在vercel"
date: 2023-12-20T22:52:16+08:00
tags: []
---

## 一. 准备

**安装 [git](https://git-scm.com/book/zh/v2/%E8%B5%B7%E6%AD%A5-%E5%AE%89%E8%A3%85-Git)** (如果不会使用可以去看我写的 `Git 使用方法`)

**安装 [vercel](https://vercel.com/docs/cli)** (需要先安装 [npm](https://nodejs.cn/npm/cli/v8/configuring-npm/install/))

**下载 [hugo](https://github.com/gohugoio/hugo/releases)**

## 二. 生成站点文件

### 2.1 使用 hugo 生成

将 hugo 转到你准备存放博客的文件夹：
PowerShell 进入这个文件夹(将 myblog 替换为想要的博客文件夹名)

```powershell
.\hugo new site myblog
```

### 2.2 变成 Git 可以管理的仓库

cmd 进入刚刚创建的博客文件夹

```bash
git init
```

## 三. 配置主题

先去 [hugo 主题官网](https://themes.gohugo.io/) 找到自己喜欢的主题，然后点击下载会跳转到主题的 github。

把终端的路径调整到博客文件夹的 themes 目录下。

使用该主题的方法就是在站点文件夹下的配置文件里输入主题的名字:

```yaml
theme: 主题名字 # 主题名字，和 themes 文件夹下的一致
```

## 四. 配置文件

### 4.1 站点配置文件

站点配置文件推荐改成 .yaml 后缀的写法，因为更适合阅读，反正 .toml 的写法我是不习惯，详细的可以看 [hugo 的官方文档](https://gohugo.io/getting-started/configuration)。

我使用的是 [sulv-hugo-papermod](https://github.com/xyming108/sulv-hugo-papermod) 配置好的 [PaperMod](https://github.com/adityatelange/hugo-PaperMod)。

### 4.2 添加 Hugo 的版本号

1. 将 hugo 复制到站点文件夹
2. 打开 PowerShell 进入站点文件夹
3. 查看 Hugo 版本号
  
  ```powershell
  ./hugo version
  ```

4. 设置 Hugo 版本号

例如我的版本号是 `hugo v0.121.1-00b46fed8e47f7bb0a85d7cfc2d9f1356379b740 windows/amd64 BuildDate=2023-12-08T08:47:45Z VendorInfo=gohugoio`

添加：

```yaml
build:
  environment:
    HUGO_VERSION: "0.121.1"
```

或者：

```toml
[build.environment]
  HUGO_VERSION = "0.121.1"
```

### 4.3 屏蔽 git 可上传文件

在根目录新建文件 `.gitignore`，添加内容：

```gitignore
# 屏蔽运行产生文件
.hugo_build.lock
# 屏蔽本文件
.gitignore
# 其他文件
**/.git
**/.github
**/.vercel
**/public
# 构建文件
hugo.exe
.vercel
```

## 五. 目录设置

注意：content 里每个文件夹内都要添加一个 `_index.md` 文件，该文件里面可以加 Front Matter 用来控制标题或其它的展示。

## 六. 启动博客

在终端进入站点目录直接输入：

```bash
./hugo server -D
```

或：

```bash
vercel dev
```

就可以在本地预览了。

## 七. 写文章

输入 `hugo new 文章名称.md` 就会在 content 目录下生成 "文章名称.md" 名字的文件，所有文章都是放在 content 这个文件夹里。

如果自己还定义了分类目录，如在 content 目录的 posts 目录下有 blog、read、tech、life 等文章分类，那么在用命令生成文章的时候，如果要把文章生成到指定目录，可以用命令：`hugo new posts/tech/文章名称.md`，这样就会把文章生成到 tech 目录下。

也可以直接到 `\content\posts` 下去添加 `.md` 文件直接写。

生成的文章内部头部配置信息包括一些文章名称，时间之类的信息，可以事先在目录 `archetypes/default.md` 下使用模板，这样在用命令 `hugo new` 生成文章后会自动加上模板里的配置。

我的模板如下(里面有一些字段是我自己自定义的，不是 papermod 默认带有的，直接使用该字段可能会无效，请酌情使用)(注意：这是 PaperMod 主题的配置，通用的请看 [官方文档的 Front Matter 配置](https://gohugo.io/content-management/front-matter) 或各个主题自己的配置):

```yaml
title: "{{ replace .Name "-" " " | title }}" # 标题
date: {{ .Date }} # 创建时间
lastmod: {{ .Date }} # 更新时间
author: ["Lsy"] # 作者
categories: 
- 分类1
- 分类2
tags: 
- 标签1
- 标签2
description: "" # 描述
weight: # 输入1可以顶置文章，用来给文章展示排序，不填就默认按时间排序
slug: ""
draft: false # 是否为草稿
comments: true # 是否展示评论
showToc: true # 显示目录
TocOpen: true # 自动展开目录
hidemeta: false # 是否隐藏文章的元信息，如发布日期、作者等
disableShare: true # 底部不显示分享栏
showbreadcrumbs: true # 顶部显示当前路径
cover:
    image: "" # 图片路径：posts/tech/文章1/picture.png
    caption: "" # 图片底部描述
    alt: ""
    relative: false
```

## 八. 上传 hugo 到托管平台

不会看我写的 `Git 使用方法`。

## 九. 部署到 Vercel

### 9.1 注册 Vercel

注册一个 [Vercel](https://vercel.com/) 账号，这里我们直接使用 GitHub 账号进行登录，因为这样方便导入仓库。

### 9.2 新建项目

选择刚刚保存 hugo 的项目：

```yaml
Framework Preset: Hugo
Environment Variables:
  - Key: HUGO_VERSION
  - Value: 0.121.1  # 第四步里面的版本号
其他默认
```

点击发布，完成。

## 十. 使用 Cloudflare 加速

> vercel 的节点速度不错但是会莫名无法访问

### 10.1 解析到 vercel

进入 CF 中域名控制台，点击上方 DNS 图标，添加记录，A 记录或者 CNAME 记录解析到你部署在 vercel 的项目。但是这个时候 vercel 仍然会显示未正确配置，并且这个时候访问很有可能返回错误。因为当 vercel 构建项目时，构建过程的最后一步是颁发 SSL 证书。作为此步骤的一部分，vercel 向 域名/.well-known/acme-challenge 发出 HTTP 请求。如果此 HTTP 请求被重定向到 HTTPS，Vercel 将无法颁发 SSL 证书。

### 10.2 创建 https 例外页面规则

在 CF 控制台的 `规则` 选项卡中选择 `创建页面规则`。

在"如果 URL 匹配"文本字段中输入：

```text
*example.com/.well-known/*
```

选择设置 `SSL` 并在下拉列表中选择 `关`。

点击 `保存并部署` 按钮。
