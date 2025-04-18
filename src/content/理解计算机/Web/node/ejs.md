---
title: ejs
date: 2024-10-09T14:00:02Z
tags: []
---

模块名：`ejs`​

语法：

* 语句： `<% sentence %>`​
* 变量：`<%= variable %>`​

‍

### 使用教程

文件

```node
<%= name1 %>
<%= name2 %>
```

主文件

```node
import ejs from ejs
import fs from FS
const name1 = "1"
const name2 = "2"
const str =fs.readFileSync('<文件位置>').toString()
const content = ejs.render(str,{name1:name1,name2:name2})
console.log(content)
```

输出结果

```node
1
2
```

### express中使用

需要提取安装好ejs

主模块

```node
//导入模块
import express from 'express'
import path from 'path'
//创建路由
const app = express()
//设置模板引擎
app.set('view engine', 'ejs')
//设置模板模板文件存放位置 path.resolve(__dirname,'./views')是模板的位置
app.set('views',path.resolve(__dirname,'./views'))

app.get("/home", (req: express.Request, res: express.Response) => {
    let title="hello,world"
    // 使用的模板,和需要替换的字符串
    res.render('home',{title:title})
})
app.listen(8080)
```

模板文件

位置`./views/home.ejs`​

```node
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Title</title>
</head>
<body>
    <h1>Welcome</h1>
    <h2><%= title %></h2>
</body>
</html>
```
