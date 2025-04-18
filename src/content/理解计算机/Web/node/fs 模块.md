---
title: fs 模块
date: 2024-10-06T18:16:44Z
tags: []
---

### 文件

* 导入模块

  ```node
  import * as fs from "fs"
  ```

* 写入(默认异步)

  ```node
  fs.writeFile('<filePath>',<str>,<err>=>{
      //写入成功null，写入失败错误对象
  })
  ```

  同步写入

  ```node
  fs.writeFileSync('<filePath>',<str>)
  ```

  流式写入

  ```node
  let <name> = fs.createWriteStream('<filePath>')//创建写入流通道
  <name>.weite(<str>)//写入文件
  <name>.weite(<str>)//写入文件
  <name>.end()//关闭通道
  ```

* 追加(默认异步)

  ```node
  fs.appendFile('<filePath>',<str>,<err>=>{
      //写入成功null，写入失败错误对象
  })
  ```

  同步追加
* 读取(默认异步)

  ```node
  fs.readFile('<filePath>',(<err>,<res>)=>{
      //<err> 写入成功null，写入失败错误对象
      //<res> 读取文件的内容
      <res>.toString()//将读取的文件转成字符串
  })
  ```

  同步读取

  ```node
  fs.readFileSync('<filePath>',(<err>,<res>)=>{
      //<err> 写入成功null，写入失败错误对象
      //<res> 读取文件的内容
      <res>.toString()//将读取的文件转成字符串
  })
  ```

  流式读取

  ```node
  const <name> = fs.createReadStream('<filePath>')// 创建读取流对象
  // 绑定data事件读取
  <name>.on('data',<chunk> => {
      // 会不断的读取
      // console.log(<chunk>.length) // 64KB 每次读写最多64kb
  })
  // end 可选事件
  <name>.on('end',() = {
      //读取完成之后可触发
  })
  ```

* 文件重命名(默认异步)

  ```node
  fs.rename('<oldPath>','<newPath>',<err>=>{})
  ```

  同步重命名
* 删除文件

  ```node
  fs.unlink('<Path>',<err> =>{})
  ```

  ```node
  fs.rm('<Path>',<err> =>{})
  ```

  同步删除

### 文件夹

* 创建文件夹

  mkdir / mkdirSync
* 读取文件夹

  readdir / readdirSync
* 删除文件夹

  rmdir / rmdirSync
* 查看状态

  ```node
  fs.stat('<Path>',(<err>,<data>) =>{
      <data>.isFile() //是不是文件
      <data>.isDirectory
  })
  ```

###
