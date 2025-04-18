---
title: "一键搭建Telegram的MTProto代理"
date: 2021-08-09T00:07:00+08:00
tags: []
---

1.同步时间
------

CentOS 7

    yum install -y ntp
    systemctl enable ntpd
    ntpdate -q 0.rhel.pool.ntp.org
    systemctl restart ntpd

Debian 9 / Ubuntu 16

    apt-get install -y ntp
    systemctl enable ntp
    systemctl restart ntp

或者（时间同步为上海）

    rm -rf /etc/localtime
    ln -s /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
    ntpdate time.nist.gov

2.一键安装
------

    mkdir /home/mtproxy && cd /home/mtproxy
    curl -s -o mtproxy.sh https://raw.githubusercontent.com/ellermister/mtproxy/master/mtproxy.sh && chmod +x mtproxy.sh && bash mtproxy.sh
