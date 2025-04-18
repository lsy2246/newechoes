---
title: http模块
date: 2024-10-07T11:05:56Z
tags: []
---

* 导入模块

  ```node
  import * as http from http
  ```
  
* 创建服务体对象

  ```node
  const server =http.createServer((request,response)=>{
    response.end(<data>) //设置响应体
    let <data>:string // 用来储存请求数据
    // 绑定data事件
    request.on('data', <chunk> =>{
      <data> += <chunk>
    })
    //可以用url模块解析链接各个部分
    // 绑定 end 事件
    request.on('end',() => {
      // 响应
      // 响应状态码
      response.statusCode = <code>
      // 响应状态描述
      response.statusMessage = '<str>'
      // 响应头
      response.setHeader('<key>','<value>')
      response.setHeader('<key>',['<value1>','<value2>'])// 可以设置多个同名响应头
      // 响应体
      response.write('<content>') //可选,可写多个
      response.end("<content>")// 必须,只能写一个
    })
  })
  ```

* 监听端口,启动服务

  ```node
  server.listen(<port>,()=>{})
  ```
  
* 设置

#### 响应头

* content-type

  * mine

    > 默认有mine嗅探功能
    >

    ```node
    html:'text/html',
    css:'text/css',
    js:'text/javascript',
    png:'image/png',
    jpg:'image/jpeg',
    gif:'image/gif',
    mp4:'video/mp4',
    mp3:'video/mpeg'
    json:'application/json'
    ```

    对于未知资源类型，可以选择`application/octet-stream`​类型，浏览器遇到该类型会进行独立储存，俗称下载

#### get和post请求的区别

1. get获取数据，post请求数据
2. get将请求参数加到URL后，post放在请求体中
3. post相对比get安全，因为会将请求参数放在地址栏中
4. GET请求大小有限制，一般为2KB，POST没有限制
