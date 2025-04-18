---
title: express
date: 2024-10-08T13:05:35Z
tags: []
---


```node
// 导入 express
improt express from 'express'
// 创建应用对象
const <app> = express()
// 创建路由
<app>.<method>(<path>,(<request>,<respond>)=>{
    // 原生操作
    // express 请求
    request.path //路径
    request.query //查询字符串
    request.ip //请求ip
    request.get(<attribute>) //请求头
    // express 请求
    request.cookies //cookies
    // express 响应
    respond.status(<code>) //响应代码
    respond.set('<key>','<value>') //设置响应头
    respond.send(<str>) //设置响应体，中文不乱码
    respond.cookie('<key>','<value>',{maxAge:<time>}) //设置cookie,maxAge是最大销毁时间，单位s，如果不设置默认关闭浏览器销毁
    respond.clearCookie('<key>')
    //其他
    respond.redirect('<url>') //重定向
    respond.download('<path>') //下载响应
    respond.json() //响应json
    respond.sendFile('<path>') //响应文件内容
})
```

method：`all`​,代表全部路由

### 获取路由参数

```node
app.get('/:<name>.html',<request>,<respond>)=>{
    <request>.params.<name>
})
```

占位符是`:<name>`​这个`<name>`​可以替换为任何合法字符

如果usl是`http://127.0.0.1/a.html`​那么`<request>.params.<name>`​为`a`​

### 定义中间件

```node
function <name>(request,respond,next){
    //操作
    next()
}
// 创建路由
```

### 静态资源中间件

```node
app.use(express.static(<dirPath>))
```

### 路由模块化

子模块

```node
// 导入express模块
// 创建路由对象
const <route> = <express>.Router()
// 创建路由
// 暴露对象

```

主模块

```node
// 导入 express
// 导入路由对象（子模块）
import
// 创建应用对象
const <app> = express()
// 使用路由对象
<app>.use
// 创建路由
```

### session 中间件

需要安装，导入`express-session`​

#### 使用

```node
app.use(session(){
    name : '<name>',//设置cook的名字，默认值是：connect.sid
    secre : '<key>', //参与加密的字符串（又称签名）
    saveUninitialized : false, //是否为每次请求都设置一个cookie来储存session的id
    resave : true, //是否在每次请求时重新保存session
    store : function(),
    cookie : {
        httpOnly : true, //开启后前端无法通过JS操作
        maxAge : <time> //设置sessionID的过期时间
    }  
})
```
