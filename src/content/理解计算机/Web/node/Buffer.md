---
title: Buffer
date: 2024-10-06T16:39:48Z
tags: []
---

>缓冲器

#### 概念

类似于数组的对象，表示固定长度的字节序列

本质是一段内存空间，专门用来处理二进制数据

#### 特点

1. 大小固定且无法调节
2. 性能较好，可以直接对计算机内存进行操作
3. 每个元素大小为1字节

#### 使用

1. alloc

    ```node
    let <name> = Buffer.alloc(<size>)
    ```

    size为比特大小

    每个创建的内存都会清0
2. allocUnsafe

    ```node
    let <name> = Buffer.allocUnsafe(<size>)
    ```

    内存中可能会残留以前的数据
3. from

    ```node
    let <name> = Buffer.from(<variable>)
    ```

    可以将对象转为比特
4. 将buffer对象转字符串

    ```node
    <buffer>.toString
    ```

#### 溢出

数组中如果出现了溢出，那一个bit位就会舍弃高位

```node
0001 0110 1001 => 0110 1001
```

‍
