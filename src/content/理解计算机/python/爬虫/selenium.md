---
title: selenium
date: 2024-06-06T23:51:47Z
tags: []
---


```python
from selenium import webdriver  # 驱动 
from selenium.webdriver.common.by import By  # 解析方式
from selenium.webdriver.common.keys import Keys  # 模拟按键

# 开启无头浏览器
from selenium.webdriver.chrome.options import Options
options = Options()
options.add_argument("--headless")
options.add_argument("--disable-gpu")

driver = webdriver.Chrome(options=options)  # 创建浏览器对象
driver.get("url")  # 请求网页

driver.find_element(By.XPATH, value="xpath路径").send_keys("输入内容", Keys.ENTER) # 用 xpath找到输入框输入内容并点击

driver.switch_to.window(driver.window_handles[-1]) # 切换到最后一个网页

driver.close() # 关闭当前网页

driver.switch_to.window(driver.window_handles[0]) # 切换到第一个网页
```

‍
