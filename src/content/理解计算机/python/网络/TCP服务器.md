---
title: TCP服务器
date: 2024-06-06T23:51:47Z
tags: []
---

1. 使用 socket 类创建一个套接字对象
2. 使用 bind((ip.port))方法绑定 IP 地址和端口号
3. 使用 listen()方法开始 TCP 监听
4. 使用 accept()方法等待客户端的连接
5. 使用 recv()/send()方法接收/发送数据
6. 使用 close()关闭套接字
