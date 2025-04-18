---
title: "哪吒面板 - 服务器状态监控面板 Linux与Windows部署"
date: 2022-03-26T09:19:00+00:00
tags: ["服务器探针", "cloudflare"]
---

## Linux 客户端部署

### 一、域名解析需要的操作

开始之前，请先确定你搭建探针的域名。强烈建议使用两个(子)域名进行解析：

1. 第一个是面板的域名，套 CDN 比较方便。
2. 第二个仅仅解析到面板服务器的域名，用于客户端连接服务端试用（这个可以没有，但是不建议，如果直接用 IP 的话，迁移面板后会非常麻烦）。

比如 `lsy.plus` 作为面板的域名，还有一个 `ip.lsy.plus` 是用来记录面板服务器的 IP。

也可以使用服务器 IP 来做面板域名。将这两个域名都解析到部署面板服务器的 IP。

### 二、配置 GitHub

先打开：[GitHub OAuth Apps](https://github.com/settings/developers)，然后点击 New OAuth App 按钮：

- **Application name:** 名字随便
- **Homepage URL:** 面板的域名，例如 `https://lsy.plus`
- **Authorization callback URL:** 面板的域名 + `/oauth2/callback`，例如 `https://lsy.plus/oauth2/callback`

然后在这个页面点击 Generate a new client secret 创建你的 client secrets。

### 三、配置你的服务器

需要放行 `8008`、`5555` 两个端口，这是默认的，如果你程序中改为其他的，防火墙放行相应的端口。

#### 部署面板服务

github镜像

```bash
curl -L https://raw.githubusercontent.com/naiba/nezha/master/script/install.sh -o nezha.sh && chmod +x nezha.sh
./nezha.sh
```

国内机器可以使用：

```bash
curl -L https://raw.sevencdn.com/naiba/nezha/master/script/install.sh -o nezha.sh && chmod +x nezha.sh
CN=true ./nezha.sh
```

运行后选择安装面板端回复数字，接着输入前面记录下来的 GitHub 账号 ID、OAuth Apps 的 Client ID、OAuth Apps 的 Client secrets。

到这里面板服务算是完成了大部分了。可以访问 `http://域名:8008` 查看，用你的 GitHub 账号验证登录。

#### 宝塔配置反代

```nginx
location / {
proxy_pass http://127.0.0.1:8008;
proxy_set_header Host $host;
}

location /ws {
proxy_pass http://127.0.0.1:8008;
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "Upgrade";
proxy_set_header Host $host;
}

location /terminal {
proxy_pass http://127.0.0.1:8008;
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "Upgrade";
proxy_set_header Host $host;
}
```

配置 SSL 就不用说了，常规建站怎么配置，这个就怎么配置。如果没有问题，就可以通过 `https://域名/` 来访问了。改好之后就可以对 8008 端口取消放行了。

关于套 CDN，就和常规建站一样，比如将 `tz.a0s.cc` 解析到 CDN 服务商，回源地址填部署面板的服务器 IP，但要注意 CDN 需要支持 WebSocket 协议。

### 四、关于客户端(被监控机器)需要的操作

通过 `lsy.plus` 登录后台，如果没配置反代、SSL，那它将是 `http://lsy.plus:8008`。用你的 GitHub 账号验证登录后跳转到 `http://lsy.plus`。后台添加主机。

到需要被监控的机器执行脚本，点击小企鹅图标，会自动复制代码，到被控主机执行就行了。

## Windows 客户端部署

### 一、下载必须软件

[哪吒探针](https://github.com/naiba/nezha/releases)

[nssm](http://nssm.cc/download)

下载软件后，解压到任意位置，然后按 Win + R 打开运行窗口，cd nssm解压的位置。

### 二、设置 NSSM

管理员启动 CMD，输入：

```bash
nssm install <servername>
```

>如: nssm install nezha

弹出 UI，设置如下：

```bash
Path: 选择哪吒探针客户端
Startup directory: 选择了客户端会自动填充
Arguments: 启动参数
```

启动参数格式为：

```bash
-i {AgentID} -s {Serverip}:{Port} -p {AgentKey} -d
```

>例如：
>
>-i 10 -s 8.8.8.8:55555 -p 8aeccc7babe9c3cb0 -d
>
>自己对应修改，填写完毕后，点击 Install Servce。

### 三、启动服务

此时退回到 CMD 界面，`nssm start nezha`，

然后按 Win + R 打开运行窗口，输入 `services.msc`，

查看是否有叫 `nezha` 的服务，然后查看启动情况，如果失败了，请查看一下配置是否出错。

### 四、nssm 命令参考

#### 安装服务命令

```bash
nssm install <servicename>
nssm install <servicename> <program>
nssm install <servicename> <program> [<arguments>]
```

#### 删除服务

```bash
nssm remove
nssm remove <servicename>
nssm remove <servicename> confirm
```

#### 启动、停止服务

```bash
nssm start <servicename>
nssm stop <servicename>
nssm restart <servicename>
```

#### 查询服务状态

```bash
nssm status <servicename>
```

#### 服务控制命令

```bash
nssm pause <servicename>
nssm continue <servicename>
nssm rotate <servicename>
```

有多台被监控机器时，按照此步骤在控制面板添加服务器
