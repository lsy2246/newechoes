---
title: socket
date: 2024-06-06T23:51:47Z
tags: []
---

`bind(ip,port)`:绑定ip地址和端口
`listen(N)`:开始TCP监听,N表示操作系统挂起的最大连接数量,取值范围1-6之间,一般设置为5
`accept()`:被动接收TCP客户端连接,阻塞式
`connect((ip,port))`:主动初始化TCP服务器连接
`recv(size)`:接收TCP数据,返回值为字符串类型,size表示要接收的最大数据量
`send(str)`:发送TCP数据,返回值是要发送的字节数量
`sebdall(str)`:完整发送TCP数据,将str中的数据发送到连接的套接字,返回之前尝试发送所有数据,如果成功为None,失败抛出异常
`recvfrom()`:接收UDP数据,返回值为一个元组(data,address),data表示接收的数据,address表示发送数据的套接字地址
`sendto(data,(ip,port))`:发送UDP数据,返回值是发送的字节数
`close()`:关闭套接字
