---
title: "Linux实现定时备份网站到网盘"
date: 2024-05-03T20:32:15+08:00
tags: []
---

## 安装bypy

### 安装 pip 和虚拟环境

1. 安装虚拟环境创建工具：

    ```bash
    sudo apt-get install python3-venv -y
    ```

2. 创建一个新的虚拟环境：

    ```bash
    python3 -m venv "/var/script/venv"
    ```

3. 激活虚拟环境：

    ```bash
    source "/var/script/venv/bin/activate"
    ```

4. 安装 Python 库

    1. 安装 bypy：

        ```bash
        pip install bypy
        ```

    2. 安装 requests：

        ```bash
        pip install requests
        ```

### bypy 设置

#### 授权登录

##### 运行 `bypy info` 后按照提示进行

1. 将提示中的链接粘贴到浏览器中登录。
2. 输入账号密码登录后授权，获取授权码。
3. 将授权码粘贴回终端并按回车。

##### bypy 基本操作

* `bypy info`：查看空间使用信息。
* `bypy list`：查看目录信息。
* `bypy upload`：上传根目录所有文件。
* `bypy downdir`：把云盘上的内容同步到本地。
* `bypy compare`：比较本地当前目录和云盘根目录。

## 安装阿里网盘备份工具

Github项目地址:[https://github.com/tickstep/aliyunpan](https://github.com/tickstep/aliyunpan)

1. 下载工具包

    ```bash
    wget -P "/var/script" https://github.com/tickstep/aliyunpan/releases/download/v0.3.2/aliyunpan-v0.3.2-linux-amd64.zip -O "/var/script/aliyunpan.zip"
    ```

2. 解压工具包

    ```bash
    unzip "/var/script/aliyunpan.zip" -d "/var/script"
    ```

3. 删除压缩包

    ```bash
    rm "/var/script/aliyunpan.zip"
    ```

4. 重命名工具包名

    ```bash
    mv "/var/script/$(ls "/var/script" | grep "aliyunpan")" "/var/script/aliyunpan"
    ```

5. 登录阿里云盘

    ```bash
    /var/script/aliyunpan/aliyunpan login
    ```

## Shell 备份脚本

> 将`数据路径`，`网站根目录名称`，`数据库名称`，`数据库用户名`，`数据库密码`改为自己的

### 使用于只用docker-compose搭建,只需要备份文件,并上传到网盘

```bash
#!/bin/bash

web_path="/var/www" # 数据路径
date_time=$(date +"%Y_%m_%d") # 日期格式
year=$(date +"%Y") #年份
aliyunpan="/var/script/aliyunpan/aliyunpan" #阿里云盘可执行文件路径

# 激活百度网盘环境
source "/var/script/venv/bin/activate"

for item in "$web_path"/*; do
    item_name=$(basename "$item")
    # 切换到网站目录进行压缩
    cd "$item" || exit
    tar -czf "${item_name}_${date_time}.tar.gz" .
    # 上传到百度网盘存储
    bypy upload "${item_name}_${date_time}.tar.gz" "/${item_name}/"
    # 上传到阿里云盘
    $aliyunpan upload "${item_name}_${date_time}.tar.gz" "/网站/${item_name}/${year}/"
    # 删除文件
    rm "${item_name}_${date_time}.tar.gz"
done
```

### 适用于 mysql+nginx的网站,需要备份文件和数据库,并上传到网盘

```bash
#!/bin/bash

web_path="/var/www" # 数据路径
web_arry=("alist" "bitwarden" "blog") # 网站根目录名称
mysql_arry=("blog") # 数据库名称
date_time=$(date +"%Y_%m_%d") # 日期格式
year=$(date +"%Y") #年份
user="root" # 数据库用户名
password="lsy22.com" # 数据库密码
original_dir=$(pwd) # 记录原始目录

# 激活百度网盘环境
source ~/myvenv/bin/activate

# 组合备份
for item in "${mysql_arry[@]}"; do
    # 创建SQL备份
    mysqldump -u $user -p$password ${item} > "${item}_${date_time}.sql"
  
    # 检查是否有同名的网站目录
    if [[ " ${web_arry[@]} " =~ " ${item} " ]]; then
        # 切换到网站目录进行压缩
        cd "${web_path}/${item}/" || exit
        zip -r "${item}_web_${date_time}.zip" .
        # 将数据库SQL文件和网站压缩包一起压缩
        zip "${item}_${date_time}.zip" "${item}_${date_time}.sql" "${item}_web_${date_time}.zip"
        # 删除临时的网站压缩包
        rm "${item}_web_${date_time}.zip"
        # 返回原始目录
        cd "$original_dir" || exit
    else
        # 否则，只压缩数据库
        zip "${item}_${date_time}.zip" "${item}_${date_time}.sql"
    fi
    rm "${item}_${date_time}.sql"
    # 上传到云存储
    bypy upload "${item}_${date_time}.zip" "/${item}/${year}/"
    # 上传到百度网盘存储
    bypy upload "${item}_${date_time}.zip" "/${item}/"
    # 上传到阿里云盘
    aliyunpan upload "${item}_${date_time}.zip" "/网站/${item}/${year}/"
    # 删除文件
    rm "${item}_${date_time}.zip"
done

# 单独备份那些没有同名数据库的网站目录
for item in "${web_arry[@]}"; do
    if [[ ! " ${mysql_arry[@]} " =~ " ${item} " ]]; then
        # 切换到网站目录进行压缩
        cd "${web_path}/${item}/" || exit
        zip -r "${item}_${date_time}_data.zip" .
        # 上传到百度网盘存储
        bypy upload "${item}_${date_time}.zip" "/${item}/"
        # 上传到阿里云盘
        aliyunpan upload "${item}_${date_time}.zip" "/网站/${item}/${year}/"
        # 删除文件
        rm "${item}_${date_time}_data.zip"
        # 返回原始目录
        cd "$original_dir" || exit
    fi
done
```

### 适用于 mysql+nginx的网站,需要备份文件和数据库

```bash
#!/bin/bash

web_path="/var/www"  # 数据路径
web_arry=("alist" "bitwarden" "blog")  # 网站根目录名称
mysql_arry=("blog" "study") # 数据库名称
date_time=$(date +"%Y_%m_%d")
year=$(date +"%Y") 
user=""  # 数据库用户名
password="" # 数据库密码

for item in ${mysql_arry[@]};do
    mkdir -p "$item/$year"
    mysqldump -u $user -p$password ${item} > "${item}_${date_time}.sql"
    zip "./$item/$year/${item}_${date_time}.zip"  "./${item}_${date_time}.sql"
    rm "./${item}_${date_time}.sql"
done

for item in ${web_arry[@]};do
    mkdir -p "./$item/$year"
    zip -r "./${item}_${date_time}_data.zip" "${web_path}/${item}"
    if [ -f "./$item/$year/${item}_${date_time}.zip" ];then
        zip -u "./$item/$year/${item}_${date_time}.zip" "./${item}_${date_time}_data.zip"
    else
         zip "./$item/$year/${item}_${date_time}.zip" "./${item}_${date_time}_data.zip"
    fi
    rm "./${item}_${date_time}_data.zip"
done
```

## 添加执行权限

```bash
chmod +x backups.sh
```

## 设置定时任务

1.编辑 crontab 以自动执行备份脚本：

```bash
crontab -e
```

添加以下内容，调整脚本路径为实际路径：

```cron
0 0 1 * * /var/script/backups.sh  # 每个月的第一天的午夜（00:00）执行
```

2.重启 cron 服务以应用更改：

```bash
sudo systemctl restart cron
```
