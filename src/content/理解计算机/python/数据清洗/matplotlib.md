---
title: matplotlib
date: 2024-06-06T23:51:10Z
tags: []
---

## 导入模块

​`from matplotlib import pyplot`​

## 设置中文

​`plt.rcParams['font.sans-serif'] = ['SimHei']`​

## 设置图片大小

​`pyplot.frgure(figsize=(x,y),dpi=sizenumber)`​

## 绘图

1. 折线图:`plot`​
2. 柱状图:`bar`​
3. 直方图:`hist`​
4. 饼图:`pie`​
5. 散点图:`scatter`​
6. 条形图:`barh`​

## 调整x(y)轴的刻度

​`pyplot.xticks()`​

​`pyplot.yticks()`​

### 调整间距

传入一个参数(包含数字的可迭代对象),步长合适即可

### 添加字符串到x(y)轴

传入两个参数,分别是两个可迭代对象,数字和字符串会一一对应,只显示字符串

## 显示

​`pyplot.show()`​  
​`pyplot.legend()`​ #添加图例

## 保存

pyplot.savefig(path, transparent=True, bbox_inches='tight')

> path:文件路径
>
> transparent:透明  
> bbox_inches:是否紧凑布局

## 图形表述

x轴:`pyplot.xlabel()`​  
y轴:`pyplot.ylabel()`​  
标题:`pyplot.title()`​

## 网格

​`pyplot.grid(alpha=(0,1),linestyle='--')`​

> alpha:区间
> linestyle:样式
