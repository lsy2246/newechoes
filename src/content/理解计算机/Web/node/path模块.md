---
title: path模块
date: 2024-10-07T10:36:04Z
tags: []
---

* 导入模块

  ```node
  import * as path from "path"
  ```

* 当前文件的目录的绝对路径

  ```node
  __dirname
  ```

* 路径的目录名

  ```node
  path.dirname(<path>)
  ```

* 当前文件的绝对路径

  ```node
  __filename
  ```

* 文件的基础名

  ```node
  path.basename(<path>)
  ```

* 拼接出规范的绝对路径

  ```node
  path.resolve('<path1>','<path2>',...)
  ```

  注意除了第一个不要填绝对路径`/<file>`​不然会以他为路径开始
* sep 分隔符

  ```node
  path.sep
  ```

  不同系统不同windows：\ Linux：/
* 路径各个部分的信息

  ```node
  path.parse(<path>)
  ```

* 文件扩展名

  ```node
  path.extname(<path>)
  ```
