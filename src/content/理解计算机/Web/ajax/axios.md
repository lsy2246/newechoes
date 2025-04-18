---
title: axios
date: 2024-10-02T22:59:48Z
tags: []
---

### 请求代码

```javascript
axios({
    //请求选项
    url: '<url>',
    method: '<method>', //可以不写,默认是get
    params:{
        <params1>:'<value>',
        <params2>:'<value>'
    }
}).then(<res> => {
    //成功 处理数据
    console.log(<res>)
}).catch(function (error) {
    //失败 处理错误
    console.error("请求失败", error); 
})
```

1. 如果属性名和变量名同名可以省略

### 请求方法

* GET 获取

```javascript
params:{
    <params1>:'<value>',
    <params2>:'<value>'
}
```

* POST 提交

  ```javascript
  data:{
      <params1>:'<value>',
      <params2>:'<value>'
  }
  ```

* PUT 修改(全部)
* DELETE 删除
* PATCH 修改(部分)

### 默认设置

* 设置基地址

  ```javascript
  axios.default.baseURL = 'https://xxx.xx'
  ```

* ‍

### 拦截器

#### 请求

发起请求之前，触发的配置函数，对请求参数进行额外配置

```javascript
axios.interceptors.request.use(function (config){
    // 在请求之前配置token
    const token = location.getItem('token') //获取本地储存的token
    token && config.headers.Authorization= `${token}`
    // 返回需要发起的请求
    return config
}, function(error){
    // 如果请求错误
})
```

#### 响应

```javascript
axios.interceptors.respoonse.use(function (response) {
    // 2xx 范围内的状态码都会触发该函数
}, function (error) {
    // 超出2xx状态码就会触发该函数
})
```
