---
title: "GitHub Actions自动刷新多吉云CDN缓存"
date: 2024-05-06T13:49:43+08:00
tags: []
---

## 1. 创建自动刷新脚本

在项目根目录创建一个文件名为 `RefreshCDN.py`。修改下列代码中的密钥和域名为你自己的信息。

```python
from hashlib import sha1
import hmac
import requests
import json
import urllib
import os

def dogecloud_api(api_path, data={}, json_mode=False):
    """
    调用多吉云API。

    :param api_path: 调用的 API 接口地址，包含 URL 请求参数 QueryString。
    :param data: POST 的数据，字典格式。
    :param json_mode: 数据 data 是否以 JSON 格式请求，默认为 false 则使用表单形式。

    :return dict: 返回的数据。
    """
    access_key = '你的AccessKey'  # 替换为自己的 AccessKey
    secret_key = '你的SecretKey'  # 替换为自己的 SecretKey

    body = ''
    mime = ''
    if json_mode:
        body = json.dumps(data)
        mime = 'application/json'
    else:
        body = urllib.parse.urlencode(data)
        mime = 'application/x-www-form-urlencoded'

    sign_str = api_path + "\n" + body
    signed_data = hmac.new(secret_key.encode('utf-8'), sign_str.encode('utf-8'), sha1)
    sign = signed_data.digest().hex()
    authorization = 'TOKEN ' + access_key + ':' + sign

    response = requests.post('https://api.dogecloud.com' + api_path, data=body, headers={
        'Authorization': authorization,
        'Content-Type': mime
    })
    return response.json()

url_list = ['https://xxxxx/']  # 替换为你的博客域名

api = dogecloud_api('/cdn/refresh/add.json', {
    'rtype': 'path',
    'urls': json.dumps(url_list)
})
if api['code'] == 200:
    print(api['data']['task_id'])
else:
    print("API failed: " + api['msg'])
```

## 2. 创建 GitHub Actions 脚本

在项目根目录创建 `.github/workflows` 目录（如果还没有的话），并在该目录下新建 `RefreshCDN.yml`。

```yaml
name: Refresh CDN

on:
  push:
    branches:
      - master

jobs:
  refresh-cdn:
    runs-on: ubuntu-latest
    steps:
      - name: 检出代码
        uses: actions/checkout@v2
      - name: 安装 Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.x'
      - name: 安装依赖
        run: pip install requests
      - name: 等待源站部署
        run: sleep 1m  # 这里用了个笨办法，等待 1 分钟后进行刷新
      - name: 刷新 CDN
        run: python RefreshCDN.py
```

这样设置后，每次推送到 `master` 分支时，GitHub Actions 会自动运行这个脚本来刷新 CDN。
