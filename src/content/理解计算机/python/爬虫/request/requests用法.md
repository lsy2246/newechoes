---
title: requests用法
date: 2024-06-06T23:51:47Z
tags: []
---

```python
import requests #请求
from threading import Thread#多线程
from lxml import etree#xpath
import re#正则
from bs4 import BeautifulSoup #bs4

#UA
UA = {"User-Agent":
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"}


# 设置 SOCKS 代理
proxy_address = '127.0.0.1'  # 代理地址
proxy_port = '1080'  # 代理端口号

# 构建 SOCKS 代理地址
proxy_url = f'socks5://{proxy_address}:{proxy_port}'

# 设置 HTTP 代理
proxy_username = 'P55fRHQTMd'  # 代理用户名
proxy_password = 'CmFA0OVr8X'  # 代理密码
proxy_address = '23.106.140.216'  # 代理地址
proxy_port = '21443'  # 代理端口号


# 构建 HTTP 代理地址
proxy_url = f'http://{proxy_username}:{proxy_password}@{proxy_address}:{proxy_port}'

#GET
get = requests.get(domain, headers=UA , proxies={'http': proxy_url, 'https': proxy_url})


#bs4
page = BeautifulSoup(get.text, "html.parser")
名称 = page.find("标签", class_="内容")
#正则表达式
obj = re.compile(r'正则表所式',re.S)
名称 = obj.findall(get.text)
#xpath
html = etree.HTML(get.text)
名称 = html.xpath("路径/text()")
```
