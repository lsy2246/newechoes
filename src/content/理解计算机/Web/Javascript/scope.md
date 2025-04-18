---
title: scope
date: 2024-09-19T08:42:53Z
tags: []
---

### part scope

#### function scope

1. variables declared inside a function cannot be accessed externally
2. after the funnction is executed,it will be cleared

#### block scope

1. package code blocks with `{}`​

### global scope

1. ​`<script>`​ `.js`​

### scope chain

Essentially,if is asearch machanism for underlying variables

1. when the function is executed, it will ifrst search for the current scope variable
2. if the current function cannot be found,the parent will be searched step by step

### garbage recycling mechanism

Track the number of times it is referenced,add 1 for every reference,subtract 1 for every reference,and release memory if it is 0

#### disadvantage

if nested refernces are used,they cannot be released

### mark clearing method

Scheduled scanning will mark objects that cannot be reached from the root as unusable, and then recycle them
