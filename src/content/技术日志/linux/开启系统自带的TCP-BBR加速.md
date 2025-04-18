---
title: "开启系统自带的TCP BBR加速"
date: 2024-07-02T17:19:38+08:00
tags: []
---

> **系统自带内核高于4.9 则默认已包含 BBR**

### 1. 检查内核版本

```bash
uname -r
```

> 内核版本高于 4.9 就行。

### 2. 开启BBR

通过向 `/etc/sysctl.conf`文件添加配置来启用BBR

```bash
echo "net.core.default_qdisc=fq" | sudo tee -a /etc/sysctl.conf 
echo "net.ipv4.tcp_congestion_control=bbr" | sudo tee -a /etc/sysctl.conf
```

### 3. 生效更改

```bash
su root -c "sudo sysctl -p"
```

### 4. 生效检测

**执行下面命令，如果结果中带有**​**[bbr](https://www.moeelf.com/tag/bbr "View all posts in bbr")**  **，则证明你的内核已开启**​**[bbr](https://www.moeelf.com/tag/bbr "View all posts in bbr")**  **。**

```bash
sysctl net.ipv4.tcp_available_congestion_control
```

**注：也可以执行下面命令，如果结果中有**​**[bbr](https://www.moeelf.com/tag/bbr "View all posts in bbr")**  **，也可以证明你的内核已开启**​**[bbr](https://www.moeelf.com/tag/bbr "View all posts in bbr")**  **。**

```bash
lsmod | grep bbr
```
