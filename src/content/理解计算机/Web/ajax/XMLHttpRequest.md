---
title: XMLHttpRequest
date: 2024-10-03T14:12:38Z
tags: []
---

### 请求代码

* GET 获取

  ```javascript
  //创建XMLHttpRequest对象
  const <xhr> = new XMLHttpRequest()
  //配置请求方法和url
  <xhr>.open('<method>','https://xxx.com/xxx/xxxx?参数名1=值1&参数名2=值')
  //监听 loadend 事件,接收响应结果
  <xhr>.addEventListener('<loadend>',() => {
      //响应结果
      console.log(<xhr>.response)
  })
  //发起请求
  <xhr>.send()
  ```

* POST 提交

  ```javascript
  //创建XMLHttpRequest对象
  const <xhr> = new XMLHttpRequest()
  //配置请求方法和url
  <xhr>.open('<method>','<url>')
  //监听 loadend 事件,接收响应结果
  <xhr>.addEventListener('<loadend>',() => {
      //响应结果
      console.log(<xhr>.response)
  })
  //设置请求头 传输的类型
  <xhr>.setRequestHeader('Content-Type','application/json')
  //将数据转成json
  const <data>= JSON.stringify(<data>)
  //发起请求数据
  <xhr>.send(<data>)
  ```

* PUT 修改(全部)
* DELETE 删除
* PATCH 修改(部分)
