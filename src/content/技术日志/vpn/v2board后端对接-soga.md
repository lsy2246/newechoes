---
title: "v2board后端对接 soga"
date: 2021-07-31T01:17:00+08:00
tags: ["v2board"]
---

确保v2board版本在1.2.5及以上

## 一、安装与更新

```bash
bash <(curl -Ls https://raw.githubusercontent.com/sprov065/soga/master/install.sh)
```

## 二、同步时间（重要）

v2ray 节点需要进行时间同步，时间若与客户端相差太大则无法连接。

### CentOS 7

```bash
yum install -y ntp
systemctl enable ntpd
ntpdate -q 0.rhel.pool.ntp.org
systemctl restart ntpd
```

### Debian 9 / Ubuntu 16

```bash
apt-get install -y ntp
systemctl enable ntp
systemctl restart ntp
```

### 或者（时间同步为上海）

```bash
rm -rf /etc/localtime
ln -s /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
ntpdate time.nist.gov
```

## 三、面板节点配置

### 添加节点

在面板后台 > 节点管理 > 添加节点：

- 节点名称：随便填写
- 权限组：随便填写
- 节点地址：填v2borad的域名或ip
- TLS：填v2borad的域名或不填
- 传输协议：选择websocket

### 配置协议

```json
{
  "lsy": "/"
}
```

## 四、配置 soga

### 查看配置

```bash
soga config
```

### 自动配置

可以一行填写任意数量的配置信息，示例：

```bash
soga config type=v2board server_type=v2ray
```

### 编辑配置文件

配置文件位置：`/etc/soga/soga.conf`

基础配置示例：

```ini
type=v2board       ## 对接的面板类型，可选SSpanel, V2board, NewV2board, PMpanel, Proxypanel, V2RaySocks
server_type=v2ray  ## 对接的节点类型，可选V2ray, Shadowsocks, Trojan
api=webapi         ## 对接的方式，可选webapi 或 db，表示 webapi 对接或数据库对接
node_id=1   ## 前端节点id
soga_key=  ## 授权密钥，社区版无需填写，最多支持88用户，商业版无限制

##webapi 对接
webapi_url=https://*******.com/  ## 面板域名地址，或自定义个专用后端对接不提供访问的域名
webapi_mukey=*********************    ## 面板设置的通讯密钥

##数据库对接
db_host=db.xxx.com  ## 数据库地址
db_port=3306  ## 数据库端口
db_name=name  ## 数据库名
db_user=root  ## 数据库用户名
db_password=asdasdasd  ## 数据库密码

user_conn_limit=0  ## 限制用户连接数，0代表无限制，v2board 必填！！！
user_speed_limit=0   ## 用户限速，0代表无限制，单位 Mbps，v2board 必填！！！
check_interval=100   ## 同步前端用户、上报服务器信息等间隔时间（秒），近似值
force_close_ssl=false ## 设为true可强制关闭tls，即使前端开启tls，soga也不会开启tls，方便用户自行使用nginx、caddy等反代
forbidden_bit_torrent=true  ## 设为true可禁用bt下载
default_dns=8.8.8.8,1.1.1.1  ## 配置默认dns，可在此配置流媒体解锁的dns，以逗号分隔
```

## 五、启动 soga

```bash
soga start
```

或者

```bash
soga
```
