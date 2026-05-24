---
title: "centos7.x搭建Tor私人网桥"
date: 2021-07-30T23:11:00Z
tags: []
---

## 1. 下载并安装 Tor

```bash
yum install tor -y
```

## 2. 安装 obfs4

### 通过 python 进行编译安装

#### 安装所需依赖软件模块

```bash
yum install make automake gcc python-pip python-devel libyaml-devel
```

#### 安装 obfs4proxy

```bash
pip install obfsproxy
```

### 通过 go 进行编译安装

#### 下载 go 的 obfs4 项目

```bash
git clone http://www.github.com/Yawning/obfs4
```

#### 进入 obfs4 目录进行编译

```bash
go build -o obfs4proxy/obfs4proxy ./obfs4proxy
```

#### 复制 bofs4proxy 到系统工作目录下

```bash
cp ./obfs4proxy/obfs4proxy /usr/bin/obfs4proxy
```

## 3. 配置 Tor Bridges

### 编辑配置文件

```bash
vim /etc/tor/torrc
```

定义一个 ORPort，不作为出口节点，设置成 Bridge：

```text
Log notice file /var/log/tor/notices.log
RunAsDaemon 1
ORPort 6666
Exitpolicy reject *:*
BridgeRelay 1
ServerTransportPlugin obfs4 exec /usr/bin/obfs4proxy
ExtORPort auto
PublishServerDescriptor 0
```

### 重启 tor 服务

```bash
systemctl restart tor
```

### 查看 tor 服务状态

```bash
systemctl status tor
```

## 4. 使用网桥

查看日志文件：

```bash
tail -F /var/log/tor/notices.log
```

内容如下：

```text
[notice] Your Tor server's identity key fingerprint is 'Unnamed
530FA95A79B9145D315F15F01215BE2F3BE921EB' [notice] Your Tor bridge's
hashed identity key fingerprint is 'Unnamed
83D1AC9EC2F15D7024278461DC91A8B2E9BBF43A' [notice] Registered server
transport 'obfs4' at '[::]:46396' [notice] Tor has successfully opened
a circuit. Looks like client functionality is working. [notice]
Bootstrapped 100%: Done [notice] Now checking whether ORPort
<redacted>:6666 is reachable... (this may take up to 20 minutes --
look for log messages indicating success) [notice] Self-testing
indicates your ORPort is reachable from the outside. Excellent.
```

注意：记住输出中 obfs4 监听的端口（本例中是 46396）。并且还能找到你的 server identity fingerprint（本例中是 530FA95A79B9145D315F15F01215BE2F3BE921EB），也复制下来。

在 `/var/lib/tor/pt_state/obfs4_bridgeline.txt` 文件中可以看到类似如下的内容：

```text
Bridge obfs4 <IP ADDRESS>:<PORT> <FINGERPRINT>
cert=oG6a3K7CtearIloUp2OCUk60oNMgw+jVgCNhGumMkODS659UEgRRx7yxZuoEo9Crp9GGXg
iat-mode=0
```

根据日志中的信息获得最终的网桥配置：

```text
obfs4 <IP ADDRESS>:46396 530FA95A79B9145D315F15F01215BE2F3BE921EB
cert=6LMNcXh6MIfApbZiMksnS4Kj+2sffZ5pybSqtcOO5YoHgfrMpkBJqvLxhuR2Ppau0L2seg
iatmode=0
```

## 5. 防火墙配置

编辑防火墙公共配置文件：

```bash
vim /etc/firewalld/zones/public.xml
```

内容如下(本例 ORPort 端口 => 6666, obfs4 端口 => 46396)：

```xml
<port protocol="tcp" port="ORPort端口"/>
<port protocol="udp" port="ORPort端口"/>
<port protocol="tcp" port="obfs4端口"/>
<port protocol="udp" port="obfs4端口"/>
```

使防火墙配置生效：

```bash
firewall-cmd --complete-reload
```

[Tor 浏览器下载地址](https://www.torproject.org/download/)
