---
title: scrapy操作
date: 2024-06-06T23:51:36Z
tags: []
---

## 创建工程

scrapy startproject (projectname)

## 进入工程文件

## 创建爬虫源文件

​`scrapy genspider (spidename) (url)`​

## 编写对应的代码在爬虫文件中

1. parse 中的 response 解析
   想要使用数据,必须使用 extract()提取数据
   extract():返回列表
   extract_first():返回一个数据
2. 创建项目对象,将数据放入项目
3. 用 yield 将项目传入管道

## 在 pipeline 中完成数据的储存

```python
class 类名():
    def process_item(self, item, spider):
        item #数据
        spider #爬虫
        return item #如果不return下一个管道收不到数据
```

## 设置 setting 将 pipeline 进行生效设置

## 执行工程

​`scrapy crawl  (spidename)`​  
默认会输出工程的默认信息

‍
