---
title: "CentOS 7 查看、开放端口"
date: 2022-06-26T00:20:00+00:00
tags: []
---

## 开放和关闭端口

### 开放 8888 端口

```bash
firewall-cmd --zone=public --add-port=8888/tcp --permanent
```

### 关闭 8888 端口

```bash
firewall-cmd --zone=public --remove-port=8888/tcp --permanent
```

### 配置立即生效

```bash
firewall-cmd --reload
```

## 查看防火墙所有开放的端口

```bash
firewall-cmd --zone=public --list-ports
```

## 关闭防火墙

如果要开放的端口太多，嫌麻烦，可以关闭防火墙，安全性自行评估

```bash
systemctl stop firewalld.service
```

## 查看防火墙状态

### 方式一

```bash
firewall-cmd --state
```

### 方式二

```bash
systemctl status firewalld.service
```

## 查看监听的端口

```bash
netstat -ntlp
```

> PS: CentOS 7 默认没有 netstat 命令，需要安装 net-tools 工具，yum install -y net-tools
