---
title: "Ubuntu安装C语言编译器"
date: 2023-12-11T17:51:00Z
tags: []
---

## 安装

### 一、安装 Vim（文件编辑器）

```bash
apt-get install vim  # 注：如果没有在超级用户的操作下需要提权
```

### 二、安装 GCC（编译器）

```bash
apt-get install gcc
```

### 三、安装 build-essential

```bash
apt-get install build-essential
```

## 使用

### 1. 创建一个 hello.c 文件，并编辑第一个程序

```c
#include <stdio.h>

int main(void)
{
    printf("hello world! \n");
    return 0;
}
```

### 2. 执行编译命令

```bash
gcc -Wall hello.c -o hello
```

### 3. 执行程序

```bash
./hello
```

## GCC 常用命令

### 编译源文件并生成可执行文件

```bash
gcc source.c -o output
```

这里 source.c 是你的源文件的名称，output 是你希望生成的可执行文件的名称。

### 只进行编译，生成目标文件

```bash
gcc -c source.c -o output.o
```

这会生成名为`output.o`的目标文件，而不是可执行文件。

### 链接多个目标文件生成可执行文件

```bash
gcc file1.o file2.o -o output
```

如果你已经分别编译了多个源文件并生成了相应的目标文件，你可以将它们链接在一起生成可执行文件。

### 预处理并输出到文件

```bash
gcc -E source.c -o output.i
```

这个命令会执行预处理过程，并将结果输出到 output.i 文件中。

### 查看编译器的版本信息

```bash
gcc --version
```

### 生成调试信息

```bash
gcc -g source.c -o output
```

使用`-g`选项可以生成包含调试信息的可执行文件，方便调试器进行调试。

### 优化编译

```bash
gcc -O2 source.c -o output
```

使用`-O2`选项进行优化编译，提高程序运行效率。

### 开启一系列警告信息

```bash
gcc -Wall source.c -o output
```

`-Wall`选项涵盖了许多常见的警告，但并不包括所有的警告。

如果你想开启更严格的警告，可以考虑使用`-Wextra`：

```bash
gcc -Wall -Wextra source.c -o output
```

这将启用一些额外的警告，帮助你更全面地检查代码。
