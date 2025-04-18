---
title: IP_子网
date: 2024-07-03T14:58:01Z
tags: []
---

IP 地址：在一个网段中唯一标识计算机的地址

子网掩码：是一个 32 位的二进制数（对于 IPv4），它用来指示 IP 地址中哪些位是网络部分(1)，哪些位是主机部分(0)

子网：将大型的网络化为更小型的网络

网络地址：在 IP 网络中，网络地址是用来标识网络中特定网络段（即子网）的 IP 地址,主机号为全 0 的地址

广播地址：用于向网络中的所有设备发送消息或数据包的 ip 地址,主机号为全 1 的地址

CIDR：CIDR 实际上是将 IP 地址和子网掩码的概念结合起来，用“/数字”的形式来表示子网掩码中前面有多少位是网络部分（即 1 的位数）。

|      | 二进制开头 | 第一位  | 默认子网掩码(二进制) | 默认子网掩码  | **CIDR**       |
| ---- | ---------- | ------- | -------------------- | ------------- | -------------- |
| A 类 | 0          | 1-127   | 1111 0000 0000 0000  | 255.0.0.0     | 1.0.0.0/8      |
| B 类 | 10         | 128-191 | 1111 1111 0000 0000  | 255.255.0.0   | 128.0.0.0/16   |
| C 类 | 110        | 192-223 | 1111 1111 1111 0000  | 255.255.255.0 | 192.0.0.0.0/24 |

例如 CIDR：`202.168.0.128/25`​

计算出对于的 2 进制地址`11000000.10101000.00000000.10000000`​

末尾的`25`​ 知道前 25 位为网络号,所有只有最后七位为主机号

| 网络号                       | 主机号  |
| ---------------------------- | ------- |
| 11000000.10101000.00000000.1 | 0000000 |

转换为十进制 IP 地址范围，

网络地址是`202.168.0.128`​

广播地址是`202.168.0.255`​

可用的主机地址范围是`202.168.0.129`​ 到`202.168.0.254`​
