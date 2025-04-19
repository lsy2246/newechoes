---
title: re模块
date: 2024-06-06T23:51:32Z
tags: []
---

## re.match

函数：
`re.matcj(pattern.string.flags=0)`
功能描述:
用于从字符串的开始位置进行匹配,如果起始成功,结果为 match 对象,否则结果为 None

## re.search

函数:
`re.search(pattern,string,flags=0)`
功能描述:
用于在整个字符串中搜索第一个匹配的值,匹配成功,结果为 match 对象,否则结果为 None

## re.findall

函数:
`re.findall(pattern,string,flags=0)`
功能描述:
用于在整个字符串搜索所有符合正则表达式的值,结果为一个列表类型

## re.sub

函数:
`re.sub(pattern,repl,string,count,flags=0)`
功能描述:
用于实现字符串中指定子串的替换

## re.split

函数
`re.split(pattern,string,maxsplit,flags=0`
功能描述:
字符串中的 split()方法功能相同,都是分隔字符串

## re.compile

函数:
`pattern = re.compile('正则表达式')`

> re.compile 的返回值是一个 Pattern 对象

功能:
预加载正则表达式

用法:
`result = pattern.findall('需要搜索的字符串')`
