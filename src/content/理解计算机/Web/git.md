---
title: git
date: 2024-06-06T23:48:36Z
tags: []
---

## 一.安装 git

[git 官网下载](https://git-scm.com/downloads)

## 二.建立仓库

### 本地仓库

> 例如我的本地项目在`D:\data\code\C`

### 1.进入项目

```bash
cd d:
cd D:\data\code\C
```

### 2.变成 Git 可以管理的仓库

```git
git init
```

### 3.在 GitHub （类似 Gitee 的代码托管服务）创建一个仓库

## 三.本地仓库关联 GitHub （类似 Gitee 的代码托管服务）仓库

### 连接代码托管平台

> 你需要添加一个新的远程仓库并将其命名为`github`或其他你喜欢的名称。**任选其一**

HTTPS URL，命令如下

```git
git remote add github https://<你的 github 用户名>:<你的 github 密码>@github.com/<你的 github 用户名>/<你的仓库名称>.git
```

SSH URL，命令可能如下

```bash
git remote add gitee git@github.com:<你的 github 用户名>/<你的仓库名称>.git
```

### 绑定用户

#### 1. 设置用户信息

绑定邮箱

```git
git config --global user.email "you@example.com"
```

绑定用户名

```git
git config --global user.name "Your Name"
```

#### 2. 创建密钥

在用户主目录下，看看有没有.ssh 目录，如果有，再看看这个目录下有没有 id_rsa 和 id_rsa.pub 这两个文件，如果已经有了，可直接跳到下一步。如果没有，打开 Shell（Windows 下打开 Git Bash），创建 SSH Key

```bash
ssh-keygen -t rsa -C "youremail@example.com"
```

> 你需要把邮件地址换成你自己的邮件地址，然后一路回车，使用默认值即可

#### 3. 绑定密钥

登陆 GitHub，打开`Account settings`，`SSH Keys`页面，点`Add SSH Key`，
填上任意 Title，在 Key 文本框里粘贴`id_rsa.pub`文件的内

#### 4. 验证远程仓库

```git
git remote -v
```

## 四. 上传本地代码

### 1.添加工作目录中的所有更改到暂存区

```git
git add .
```

> 如果需要添加单个文件或文件夹将`.`换成文件或或文件夹所在的地址(例如`git add README.md`)

### 2.提交已暂存的更改

```git
git commit -m "提交注释"
```

### 3.上传本地代码到代码托管服务平台

```git
git push github master
```

> github 是之前给仓库的命名,main 是分支的名称

## 常用的 Git 命令

- 推送

  ```git
  git push <origin> <master>
  ```

- 强制将推送本地分支

  ```git
  git push -f <origin> <master>
  ```

- 拉取

  ```git
  git pull <origin> <master>
  ```

- 强制将分支的最新内容拉取到本地的分支

  ```git
  git pull --force <origin> <master>
  ```

- 将本地分支重置为远程分支的最新状态

  ```git
  git reset --hard <origin>/<master>
  ```

- 克隆仓库

  ```git
  git clone <url>
  ```

- 添加所有更改到暂存区

  ```git
  git add .
  ```

- 撤销部分文件的暂存

  ```git
  git reset <file1> <file2>
  ```

- 将文件从缓存区中移除，但物理文件仍然存在

  ```git
  git rm --cached <path>
  ```

- 查看暂存区的内容

  ```git
  git ls-files
  ```

- 提交已暂存的更改

  ```git
  git commit -m "Commit message"
  ```

- 查看分支

  ```git
  git branch
  ```

- 创建并切换到新分支

  ```git
  git checkout -b <new_branch_name>
  ```

- 删除本地分支

  ```git
  git branch -d <branch_nam>
  ```

- 添加远程仓库

  ```git
  git remote add <origin> <remote_repository_url>
  ```

- 移除与远程仓库的关联

  ```git
  git remote remove <origin>
  ```

- 版本回退

  > HEAD 相当与当前、HEAD~1 退回上一个版本、HEAD~2 退回上两个版本，依次类推。

  ```git
  git reset --hard HEAD~1
  ```

  或者

  ```git
  git reset --hard (目标版本号)
  ```

  ‍

## 报错

### LF will be replaced by CRLF the next time Git touches it

> 这个警告是由于 Windows 和 Unix 系统之间的换行符 (\n 和 \r\n) 不同引起的。在 Windows
> 上，文本文件的行尾通常由 \r\n 表示，而在 Unix/Linux 等系统上，行尾通常由 \n 表示。
>
> 这个警告通常出现在文件的换行符混合使用时，比如在 Windows 系统上使用的 CRLF（\r\n）格式的换行符，而在 Git 中又配置了
> core.autocrlf 为 true 的情况下。

#### 1.禁用 core.autocrlf

```git
git config --global core.autocrlf false
```

> 这将禁用自动换行符转换，保留文件中原有的换行符。

#### 2.设置 core.eol

如果你希望在提交时保持换行符转换，但希望检出时保持原样，你可以尝试设置 core.eol

```git
git config --global core.eol lf
```

或者

```git
git config --global core.eol crlf
```

这将设置 Git 使用指定的换行符风格。

#### 3.手动修复文件

如果只是个别文件出现这个问题，你也可以手动修复，将文件的行尾调整为你希望的格式。

可以使用文本编辑器或者 Git 提供的工具。

注意，上述设置是全局的，对所有 Git 仓库有效。如果只想在当前仓库中应用这些设置，去掉 --global 即可。

## 进阶

### 上传需要忽略的文件

在项目根目录下创建一个名为`.gitignore`​ 的文件，然后在文件中列出你想要忽略的文件和目录例如

```git
# 忽略 test.c 文件
test.c
# 忽略 practice_test/ 目录下的文件
practice_test/
# 忽略 所有test.c 文件
**/test.c
```

在项目根目录下创建一个名为`.gitignore`​ 的文件，然后在文件中列出你想要忽略的文件和目

```markdown
# 忽略 test.c 文件

practice_code/test.c

# 忽略 practice_test/ 目录下的文件

practice_test/

# 忽略 所有 test.c 文件

\*\*/test.c 每次提交自动同步到代码托管服务平台
```

#### 2.将已被追踪的文件的更改加入到暂存区

```git
git add -u
```

### 每次提交自动同步到代码托管服务平台

1.创建钩子

在本地仓库的`.git/hooks`​ 目录下，你可以创建一个名为`post-commit`​ 的文件，该文件是在每次提交后运行的钩子

```git
#!/bin/bash

# 自动同步到 Gitee
git push gitee master

# 自动同步到 GitHub
git push github master
```

#### 2.设置脚本执行权限

```bash
chmod +x .git/hooks/post-commit
```

#### 3.测试自动同步

```git
git commit -m "Your commit message"
```

### Git Bash 的默认工作目录设置

#### 例如将 Git Bash 的默认工作目录设置为 `D:\data\code\C`​

编辑`~/.profile`​ 或 `~/.bashrc`​ 文件

在文件末尾加上

```bash
cd d:/data/code
```

现在，每次你打开 Git Bash，它都应该默认定位到 `D:\data`​ 目录。确保路径设置正确，并且没有其他地方覆盖了这个设置。

### 保存 SSH 密钥的通行短语

1. 启动 ssh-agent

2. 编辑 `~/.profile`​ 或 `~/.bashrc`​ 文件

   在文件末尾加上

   ```powershell
   env=~/.ssh/agent.env

   agent_load_env () { test -f "$env" && . "$env" >| /dev/null ; }

   agent_start () {
       (umask 077; ssh-agent >| "$env")
       . "$env" >| /dev/null ; }

   agent_load_env

   # agent_run_state: 0=agent running w/ key; 1=agent w/o key; 2=agent not running
   agent_run_state=$(ssh-add -l >| /dev/null 2>&1; echo $?)

   if [ ! "$SSH_AUTH_SOCK" ] || [ $agent_run_state = 2 ]; then
       agent_start
       ssh-add
   elif [ "$SSH_AUTH_SOCK" ] && [ $agent_run_state = 1 ]; then
       ssh-add
   fi

   unset env
   ```

3. 再次运行 Git Bash 时，系统将提示您输入密码
