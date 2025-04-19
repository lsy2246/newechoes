---
title: numpy
date: 2024-06-06T23:51:22Z
tags: []
---

​`import numpy`​  
数组转 numpy  
​`对象名 = numpy.array(数组)`​

1. 随机生成列表

   |                                  作用                                   | 语句                                       |
   | :---------------------------------------------------------------------: | ------------------------------------------ |
   |                                                                         | ​`numpy.arange(起始,结束,步长)`​           |
   |                                  全 0                                   | ​`numpy.zeros(shape)`​                     |
   |                                  全 1                                   | ​`numpy.ones(shape)`​                      |
   |                                 对角线                                  | ​`numpy.eye(number)`​                      |
   |              创建 d0 到 dn 维度的随机数组,浮点数,范围 0,1               | ​`numpy.random.rand(d0,dn)`​               |
   |     创建 d0 到 dn 维度的标准正太分布随机数,浮点数,平均数 0,标准值 1     | ​`numpy.random.randn(d0,dn)`​              |
   |         从给定上下限范围选取随机整数,范围 low,high,形状是 shape         | ​`numpy.random.randint(low,high,(shape))`​ |
   |          产生均有分布的数组,low 起始值,high 结束值,size 是形状          | ​`numpy.random.uniform(low,high,(shape))`​ |
   | 冲指定的正太分布中心中心 loc(概率分布的均值),标准差是 scale,形状是 size | ​`numpy.random.normal(loc,scale,(shape))`​ |
   |                               随机数种子                                | ​`numpy.random.seed(s)`​                   |

2. 设置数组  
   通过设置不同个数的元组,生成不同的  
   ​`numpy.reshape(shape)`​

   1. 读取数据  
      ​`numpy.loadtxt(frame,dtype=numpy.float,delimiter=None,skiprows=0,usecols=None,unpack=False)`​

   > frame:文件,字符串,产生器,可以是.gz 或 bz2 压缩文件
   > dtype:数据类型,可选,csv 的字符串可以声明数据类型读入数组中,默认 numpy.float
   > delimiter:分割字符串,默认是任何空格
   > skiprows:跳过前 x 行,一般跳过第一行
   > usecols:读取指定的列,索引,元组类型
   > unpack:如果为 True,读入属性将分别写入不同的数组变量,False 读入数据值写入一个数组变量,默认为 False

3. 取不同的行和列

   | 作用           | 语句                                            |
   | -------------- | ----------------------------------------------- |
   | 取两个元素     | ​`元素名[[number1,number2],[number1,number2]]`​ |
   | 取单独的列     | ​`元素名[:,number]`​                            |
   | 取单独的行     | ​`元素名[number,:]`​                            |
   | 取连续的列     | ​`元素名[:,number1,number2]`​                   |
   | 取连续的行     | ​`元素名[number1,number2,:]`​                   |
   | 取指定的行和列 | ​`元素[number1:number2,number1:number2]`​       |

4. 条件操作  
   三元运算:`numpy.where(条件,True,False)`​
5. 行和列交换  
   ​`元素名1[number1:number2,number1:number2] = 元素名2[number1:number2,number1:number2]`​
6. 获取最大值最小值的位置  
   ​`numpy.argmax(元素名,axis=0/1)`​  
   ​`numpy.argmin(元素名,axis=0/1)`​

   > 0 代表纵列
   > 1 代表横排

7. nan 和 inf  
   nan 表示不是一个具体的数据,float 有缺失时,不合适计算的  
   inf 表示正无穷  
   nan 和任何一个值计算都是 nan

8. 常用统计函数

   | 作用     | 语句                               | 描述               |
   | -------- | ---------------------------------- | ------------------ |
   | 求和     | ​`元素名.sum(axis=None)`​          |                    |
   | 均值     | ​`元素名.mean(axis=None)`​         | 受离群点影响比较大 |
   | 中值     | ​`numpy.median(元素名.axis=None)`​ |                    |
   | 最大值   | ​`元素名.max(axis=None)`​          |                    |
   | 最小值   | ​`元素名.min(axis=None)`​          |                    |
   | 极值     | ​`元素名.ptp(axis=None)`​          | 最大值和最小值之差 |
   | 标准差   | ​`元素名.std(axis=None)`​          |                    |
   | 矩阵长度 | ​`元素名.shape[0/1]`​              |                    |
