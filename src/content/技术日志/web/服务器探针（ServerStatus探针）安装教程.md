---
title: "服务器探针（ServerStatus探针）安装教程"
date: 2021-07-31T10:02:00+08:00
tags: [ "服务器探针" ]
---

## 食用方式

PS：（以下使用方式二，方式一直接运行傻瓜安装即可）

### 脚本进行安装（会要求安装Caddy，与Nginx不能同时安装，有能力的自行DIY）

```bash
wget https://raw.githubusercontent.com/CokeMine/ServerStatus-Hotaru/master/status.sh
bash status.sh
```

### 手动编译安装，可搭配宝塔使用Nginx提供服务

#### 下载ServerStatus-USee

```bash
git clone https://gitee.com/useenet/serverTZ.git
mv serverTZ /usr/serverTZ
```

## 安装服务端

### 使用宝塔创建一个空网页（PS：域名框使用域名或IP均可）

### 复制监控展示页到宝塔新建的网站目录中

```bash
cp -r /usr/serverTZ/web/* /www/wwwroot/自己的站点
```

### 进入服务端配置目录

```bash
cd /usr/serverTZ/server
```

### 安装环境并进行编译

```bash
apt-get install gcc gcc-c++ kernel-devel
make
```

### 配置服务端信息

```bash
vim config.json
```

内容:

```json
{
  "servers": [
  {
    "username": "username",
    "password": "password",
    "name": "vpsname",
    "type": "type",
    "host": "No",
    "location": "China",
    "disabled": false,
    "region": "CN"
    },
    {
    "username": "连接用户名",
    "password": "连接密码",
    "name": "监控显示名称",
    "type": "监控显示类型",
    "host": "No",
    "location": "国家",
    "disabled": false,
    "region": "国旗"
    }
  ]
}
```

### 在宝塔中打开serverTZ默认端口

> 35601

### 编辑完成后，在server目下进行测试,webdir为web站点路径

```bash
./sergate --config=config.json --web-dir=/www/wwwroot/站点
```

进入对应的监控站点查看是否有监控网页模板

### 将此进程注册为系统服务

关闭之前进程,进入`/usr/serverTZ/systemd/`

> ctrl + c

```bash
cd /usr/serverTZ/systemd/
```

注册过程，系统服务文件我已经编辑好，直接使用即可

```bash
chmod +x serverTZs.service
cp serverTZs.service /lib/systemd/system
systemctl daemon-reload
systemctl start serverTZs.service
systemctl enable serverTZs.service
```

> #赋权  
> #拷贝进系统服务目录
> #重新加载系统服务
> #启动服务端并设置开机自启  

### 在配置文件中增加服务器主机后重启

```bash
systemctl restart serverTZs.service  
```

## 安装客户端

此处在服务端中部署客户端监控本机为例

### 下载、更名、移动目录到指定文件夹

```bash
git clone https://gitee.com/useenet/serverTZ.git
mv serverTZ /usr/serverTZ
```

### 进入客户端配置目录

```bash
cd /usr/serverTZ/clients
```

### 检查已安装的python版本,版本需要2.7及以上

```python
python -V
```

若无执行客户端运行环境

```bash
apt-get install epel-release python-pip
apt-get update
apt-get install gcc python-devel
pip install psutil
```

### 修改客户端配置文件

```bash
vim status-client.py
```

```python
SERVER = "127.0.0.1"        #修改为服务端地址
PORT = 35601      
USER = "USER"       #客户端用户名
PASSWORD = "USER_PASSWORD"  #客户端密码
INTERVAL = 1        #更新间隔
```

### 运行测试

```python
python status-client.py
```

### 将客户端进程注册为系统服务

### 关闭之前进程,进入`/usr/serverTZ/systemd/`

> ctrl + c

```bash
cd /usr/serverTZ/systemd/
```

注册过程，系统服务文件我已经编辑好，直接使用即可

```bash
chmod +x serverTZc.service
cp serverTZc.service /lib/systemd/system
systemctl daemon-reload
systemctl start serverTZc.service  
systemctl enable serverTZc.service
```

> #赋权  
> #拷贝进系统服务目录
> #重新加载系统服务  
> #启动服务端并设置开机自启

在配置文件中增加服务器主机后重启

```bash
systemctl restart serverTZc.service
```
