---
title: "搭建本地图床 API 可搭配 Chevereto 使用"
date: 2023-04-27T19:10:00+08:00
tags: []
---

首先，你需要在你的网站服务器上安装 PHP，并确保它能够正常运行。

然后，你需要在你的网站目录下创建一个名为 `images` 的文件夹，并将你想要用作随机图片的图片文件上传到该文件夹中。

接下来，你可以将以下 PHP 代码保存为一个 PHP 文件，例如 `api.php`，并将它上传到你的网站目录下。

```php
<?php
    $dir = 'images'; // 图片存放目录
    $arr = scandir($dir); // 列出目录下所有的文件
    $arr = array_filter($arr, function($file) {
        return strpos($file, '.th') === false && strpos($file, '.md') === false;
    }); // 需要过滤的元素(不需要可以删除)
    array_splice($arr, 0, 2); // 移除数组中的元素，因为获取到的第一个和第二个元素是 . 和 .. 代表当前目录和上一级目录
    shuffle($arr); // 把数组中的元素按随机顺序重新排列
    $image = $arr[0]; // 读取重新排列后的数组中的第一个元素
    Header("Location: $dir/$image");
?>
```

现在，你可以通过访问`http://your_website.com/api.php` 来使用这个随机图片API了。每次访问这个URL时，它都会随机选择一个图片文件并重定向到该图片的URL。
