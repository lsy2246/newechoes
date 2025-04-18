---
title: "v2board后端对接-XrayR-V2ray-ws-tls-cdn"
date: 2023-04-06T19:23:00Z
tags: ["v2board"]
---

确保v2board版本在1.2.5及以上

## 一、安装与更新

```bash
bash <(curl -Ls https://raw.githubusercontent.com/XrayR-project/XrayR-release/master/install.sh)
```

## 二、域名配置

将域名托管到cloudflared

## 三、同步时间（重要）

v2ray 节点需要进行时间同步，时间若与客户端相差太大则无法连接

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

## 四、面板节点配置

### 添加节点

在后台 > 节点管理 > 添加节点：

- 节点名称：随便填写
- 权限组：随便填写
- 节点地址：填cf的ip或者伪装的域名
- TLS：伪装的域名
- 端口：443
- 传输协议：选择websocket

### 配置协议

```json
{
    "path": "/随便",
    "headers": 
    {
        "Host": "伪装的域名"
    }
}
```

## 五、配置 XrayR

第一次安装完成后，编辑配置文件：

配置文件位置在 `/etc/XrayR/config.yml`

```yaml
Log:
  Level: warning # Log level: none, error, warning, info, debug 
  AccessPath: # /etc/XrayR/access.Log
  ErrorPath: # /etc/XrayR/error.log
DnsConfigPath: # /etc/XrayR/dns.json # Path to dns config, check https://xtls.github.io/config/dns.html for help
RouteConfigPath: #/etc/XrayR/route.json # Path to route config, check https://xtls.github.io/config/routing.html for help
InboundConfigPath: #/etc/XrayR/custom_inbound.json # Path to custom inbound config, check https://xtls.github.io/config/inbound.html for help
OutboundConfigPath: #/etc/XrayR/custom_outbound.json # Path to custom outbound config, check https://xtls.github.io/config/outbound.html for help
ConnectionConfig:
  Handshake: 4 # Handshake time limit, Second
  ConnIdle: 30 # Connection idle time limit, Second
  UplinkOnly: 2 # Time limit when the connection downstream is closed, Second
  DownlinkOnly: 4 # Time limit when the connection is closed after the uplink is closed, Second
  BufferSize: 64 # The internal cache size of each connection, kB
Nodes:
  -
    PanelType: "NewV2board" ## 对接的面板类型: SSpanel, V2board, NewV2board, PMpanel, Proxypanel, V2RaySocks
    ApiConfig:
      ApiHost: "https://****.com"  ## 面板域名地址，或自定义个专用后端对接不提供访问的域名
      ApiKey: "*****"   ## 面板设置的通讯密钥
      NodeID: 1  ## 前端节点id
      NodeType: V2ray  ## 对接的节点类型:可选V2ray, Shadowsocks, Trojan
      Timeout: 30 # Timeout for the api request
      EnableVless: false # Enable Vless for V2ray Type
      EnableXTLS: false # Enable XTLS for V2ray and Trojan
      SpeedLimit: 0 # Mbps, Local settings will replace remote settings
      DeviceLimit: 0 # Local settings will replace remote settings
    ControllerConfig:
      ListenIP: 0.0.0.0 # IP address you want to listen
      UpdatePeriodic: 100 # Time to update the nodeinfo, how many sec.
CertConfig:
  CertMode: dns # Option about how to get certificate: none, file, http, dns. Choose "none" will forcedly disable the tls config.
  CertDomain: "***.com" # 伪装的域名
  Provider: cloudflare # DNS cert provider, Get the full support list here: https://go-acme.github.io/lego/dns/
  Email: test@me.com
  DNSEnv: # DNS ENV option used by DNS provider
    CLOUDFLARE_EMAIL: test@me.com        ##CF登录邮箱
    CLOUDFLARE_API_KEY: 57b4d8ec82ec3e    ##CF全局api
```

## 六、启动 XrayR

```bash
xrayr start
```

或者

```bash
XrayR
```
