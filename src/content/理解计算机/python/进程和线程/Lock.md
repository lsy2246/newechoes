---
title: Lock
date: 2024-06-06T23:51:40Z
tags: []
---

## 导入函数

​`import threading`​

## 创建一个锁对象

​`lock = threading.Lock()`​

## 在需要保护的代码段前加锁

​`lock.acquire()`​

## 在代码执行完毕后释放锁

​`lock.release()`​
