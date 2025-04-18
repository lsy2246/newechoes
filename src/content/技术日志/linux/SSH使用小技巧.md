---
title: "SSH使用小技巧"
date: 2024-06-30T23:46:05+08:00
tags: []
---

## 更改root密码

> 将`password`更改为所需的密码

1. 修改密码

    ```bash
    echo root:`password` |sudo chpasswd root
    ```

2. 开启root登录

    ```bash
    sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/g' /etc/ssh/sshd_config;
    ```

3. 开启密码登录

    ```bash
    sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication yes/g' /etc/ssh/sshd_config;
    ```

4. 重启ssh服务

    ```bash
    systemctl restart sshd.service
    ```

## 配置使用密钥登录

1. 生成密钥和公钥，请执行以下命令：

    ```bash
    ssh-keygen -t rsa -b 4096 
    ```

   > 连续执行回车即可生成密钥和公钥对。如果需要设置密码，请在密码提示处输入密码。

2. 安装ssh公钥

    ```bash
    cp "$HOME/.ssh/id_rsa.pub" "$HOME/.ssh/authorized_keys"
    ```

3. 设置公钥权限

    ```bash
    chmod 600 "$HOME/.ssh/authorized_keys"
    chmod 700 "$HOME/.ssh"
    ```

4. ssh配置文件

   1. 开启密钥登录

       ```bash
       sudo sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/g' /etc/ssh/sshd_config
       ```

   2. 关闭密码登录

       ```bash
       sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/g' /etc/ssh/sshd_config  
       ```

5. 重启sshd服务

    ```bash
    systemctl restart sshd.service
    ```

## ssh登录后闲置时间过长而断开连接

```bash
echo "ServerAliveInterval 60" >> "$HOME/.ssh/config"
```

> ssh客户端会每隔一段60s，自动与ssh服务器通信一次

## 存放ssh密钥密码

### 启动`ssh-agent`

#### Linux

```bash
ssh-agent bash
```

#### Windows

1. 打开服务
2. 将`OpenSSH Authentication Agent`服务启动
3. 设置自启动

### 添加默认的私钥

```bash
ssh-add
```

> 添加私钥时，会要求输入密码。以后，在这个对话里面再使用密钥时，就不需要输入私钥的密码了，因为私钥已经加载到内存里面了。

### 使用命令将本地公钥发送给服务端

```bash
ssh-copy-id username@hostname
```
