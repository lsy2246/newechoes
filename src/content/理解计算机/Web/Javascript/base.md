---
title: base
date: 2024-06-07T14:57:39Z
tags: []
---


## content_position

1. inside  
   prompt : The best position is in front of the `body`​
2. external  
   prompt : this sentence will be ignore if placed in the middle  
   ​`<script src='[position]'></scripy>`​
3. line

## annotation

1. line

   ​`//`​
2. block

   ​`/* */`​

‍

‍

## end_mark

​`;`​ Ther is no constraint, suggest uniformity throughout entire item

‍

## input-output

### input

​`prompt()`​

### output

1. window

   ​`slert()`​
2. write to body

   ​`document.write()`​

   ​`Html`​ will be explained as write
3. console print

   ​`console.log()`​

## variable

### declare

​`let variable`​

1. let assign value
2. Isolate and declare several variable using a comma `,`​

​`var variable`​

This is obsolete , do not use it

1. It is irrational to declare variable before using it

2. It is irrational to declare variable before variable

3. variable hint , global variable , not block scope , a series of

​`const variable`​

recommend use

1. second assign value
2. Force the assignment of a value at the time of declaretion

‍

### law

1. Do not use the keyword
2. Variable names use must underline , letter , number , or the `$`​ symbol but must not begin with a number
3. Strict case sensitivity of letter

### rule

1. name have meaning
2. name use Camel-case

   Use lowercase for the first letter and uppercase for initial letters of subsequent words

‍

## 基本数据类型

1. number数值型  
    包含所有数值
2. string字符串

    * 单引号
    * 双引号
    * 反引号  
      字符串拼接`${}`​
3. boolean布尔类型

    * true
    * flase
4. undefined未定义类型

    只声明未定义
5. null空  
    官方解释将null作为尚未创建的对象
6. 检测

    typecho 变量  
    typecho (变量)

‍

## 转换

### 隐式转换

规则:

* ​`+`​号两边只要有一个是字符串,就会把另外一个也转为字符串
* 除​一位的算数运算符,比如`- * /`​等都会把数据转为数字类型

小技巧

* +号作为正号解析可以转为数字型
* 任何数据和字符串相加都是字符串

### 显示转换

​`数据类型(变量)`​

* 数字型

  * Number

    转换失败为NaN
  * parseInt

    只保留整数
  * parseFloat  
    只保留小数

‍

## 运算符

|优先级|运算符|顺序|
| :------: | :----------: | :-----------------: |
|1|小括号|()|
|2|一元运算|++ -- !|
|3|算数运算|先* / % 后 + -|
|4|关系运算符|> >= < <=|
|5|相等运算符|== != === !==|
|6|逻辑运算符|先&& 后\|\||
|7|赋值运算符|=|
|8|逗号运算符|,|

‍

## 数组

### 声明

1. let 变量 = []
2. let 变量 = new Array()

‍

### 操作

* 增  
  ​`arr.push(新增的内容)`​:将一个或多个元素添加到数组的末尾,并返回数组的新长度

  ​`arr.unshift(新增的内容)`​:将一个或多个元素添加到数组的开头,并返回数组的新长度
* 删  
  ​`arr.pop()`​  
  ​`arr.shift()`​

  ​`arr.splice(start,deletecount)`​  

  start : 指定修改的起始位置(默认从0开始)  
  deletecount : 要移除的元素的个数,可选,如果省略默认从起始删到最后
* 改  
  ​`数组[下标] = 新值`​
* 查

  ​`数组[下标]`​

‍

## 语句

### 分支语句

1. if

    ```javascript
    if ()
    {}
    else if()
    {}
    else
    {}
    ```

2. 三元运算

    ```javascript
    条件?true:false
    ```

3. switch

    ```javascript
    switch(data){
        case value1:
            code1
            break
        case value2:
            code2
            break
        default:
            coden
            break
    }
    ```

### 循环语句

1. while

    ```javascript
    while(循环条件){
        循环体
    }
    ```

2. for

    ```javascript
    for(;;){
        循环体
    }
    ```

3. 退出循环

    ​`continue`​:退出本次循环

    ​`break`​:退出整个循环

‍

## 函数

### 声明函数

```javascript
function 函数名(){
    函数体
}
```

> * 形参创建不需要声明
> * 推荐给形参赋一个初始值

### 传参

* 如果传入实参过多,会被忽略;传入过少,没接收到的形参为undefined

### 返回

​`return 数据`​

### 作用域

如果在函数内使用变量,没有声明直接使用,该变量会变成全局变量

### 匿名函数

```sql
let 变量=function (){
    函数体
}
```

> 具名函数可以随意位置调用
>
> 匿名函数只能声明后调用

### 立即执行

* 先创建函数,再调用

  ```sql
  (function(){})();
  ```

  > 第一个小括号为创建函数,第二个小括号为调用函数
  >
* 创建好函数,直接调用

  ```sql
  (function(){}())
  ```

  > 里面第一个小括号为函数参数,里面第二个小括号为调用函数
  >

> 必须要加`;`​,也能加在前面

‍

‍

### 逻辑运算符里的短路

只存在`&&`​或`||`​中

|符号|短路条件|
| :------: | :-----------------: |
|​`&&`|左边为false就短路|
|​`\|\|`​|左边为true就短路|

‍

‍

### Object

#### declare Object

​`let name = {}`​

​`let name = new Object()`​

* let assign value/function
* anonymity function if use

#### opration

* Find/Use value

  ​`object.attribute`​

  ​`object['attribute']`​
* Add/Alter value/function

  ​`object.attribute=value/function`​
* Use function

  ​`object.attribute.function(value1,value2)`​

#### iterate

```javascript
for (let i in object){
    i //'key'
    object[i] //value
}
```

#### Built-in math object

​`Math.random()`​: random number [0,1)

​`Math.ceil()`​: method for rounding up

​`Math.floor()`​: method for rounding down

​`Math.max()`​: find max number

​`Math.min()`​: find min number

​`Math.pow()`​: exponentiation

​`Math.abs()`​: absolute value

‍

‍
