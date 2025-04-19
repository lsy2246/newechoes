---
title: scrapy文件详情
date: 2024-06-06T23:51:21Z
tags: []
---

## 爬虫源文件

```txt
name:当前源文件的唯一标识
allowed_domains:允许请求的域名
start_urls:起始的 url 列表,作用:列表中存储的 url 会被 get 发送
parse 方法:解析服务器返回的响应对象的解析方法
```

## settings

1. 选择日志类型
   LOG_LEVEL = "日志的级别"
   日志的级别
   - DEBUG
   - INFO
   - WARNING
   - ERROR
   - CRITICAL
2. 是否遵守 robots
   ROBOTSTXT_OBEY
3. UA
   USER_AGENT
4. 管道
   ITEM_PIPELINES
   key:管道路径
   value:管道的优先级,数越小,优先级越高

## items

定义项目格式
name = scrapy.Field()

## pipelines

优先级越高,先执行
ImagesPipeline:处理图片的下载
