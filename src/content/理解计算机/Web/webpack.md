---
title: webpack
date: 2024-10-19T12:56:00Z
tags: []
---


```javascript
const path = require('path'); // Node.js 内置模块，用于处理文件路径
const HtmlWebpackPlugin = require('html-webpack-plugin'); // 自动生成 HTML 文件的插件
const MiniCssExtractPlugin = require('mini-css-extract-plugin'); // 将 CSS 抽取到独立文件的插件
const { CleanWebpackPlugin } = require('clean-webpack-plugin'); // 每次打包前清理 /dist 文件夹的插件

module.exports = (env, argv) => { // 导出 Webpack 配置函数，env 和 argv 参数用于获取环境变量和命令行参数
  const isProduction = argv.mode === 'production'; // 判断当前是否为生产模式

  return {
    entry: './src/index.js', // 入口文件，Webpack 从这里开始打包
    output: {
      filename: 'bundle.[contenthash].js', // 打包后的输出文件名，[contenthash] 用于版本控制和缓存
      path: path.resolve(__dirname, 'dist'), // 输出目录，使用绝对路径，将文件输出到 /dist 文件夹
    },
    mode: isProduction ? 'production' : 'development', // 根据是否为生产模式设置打包模式
    devtool: isProduction ? 'source-map' : 'eval-source-map', // 设置 source map，生产模式使用 source-map，开发模式使用 eval-source-map
    experiments: {
      asyncWebAssembly: true, // 启用 WebAssembly 支持，使用异步方式加载
    },
    module: { // 配置加载器，用于处理不同类型的文件
      rules: [
        {
          test: /\.js$/, // 使用正则匹配所有 .js 文件
          exclude: /node_modules/, // 排除 node_modules 文件夹中的文件，不进行处理
          use: 'babel-loader', // 使用 Babel 转译 ES6+ 语法到 ES5 兼容版本
        },
        {
          test: /\.css$/, // 匹配所有 .css 文件
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader', // 生产模式使用 MiniCssExtractPlugin 抽取 CSS，开发模式使用 style-loader 将 CSS 注入到 HTML
            'css-loader', // 解析 CSS 文件，允许在 JS 文件中 import CSS
          ],
        },
        {
          test: /\.(png|jpg|gif|svg)$/, // 匹配图片文件（png, jpg, gif, svg）
          type: 'asset/resource', // 使用 Webpack 5 的资源模块处理图片，将图片打包为独立的文件
        },
        {
          test: /\.wasm$/, // 匹配 WebAssembly 文件 (.wasm)
          type: 'webassembly/async', // 将 WebAssembly 文件异步加载
        },
      ],
    },
    plugins: [ // 配置插件
      new CleanWebpackPlugin(), // 每次构建前清理 /dist 文件夹，确保输出目录干净
      new HtmlWebpackPlugin({
        template: './src/index.html', // 自动生成 HTML 文件，并将打包后的 JS/CSS 注入到 HTML 中
      }),
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css', // 抽取出的 CSS 文件名，[name] 是入口名称，[contenthash] 用于缓存优化
      }),
    ],
    devServer: { // 开发服务器配置
      contentBase: path.join(__dirname, 'dist'), // 设置开发服务器的根目录为 /dist 文件夹
      compress: true, // 启用 gzip 压缩，提升性能
      port: 9000, // 开发服务器的端口号
      open: true, // 自动打开默认浏览器
      hot: true, // 启用热模块替换（HMR），修改代码后无需刷新浏览器
    },
    optimization: { // 优化选项
      splitChunks: {
        chunks: 'all', // 分离第三方库，将它们打包到单独的文件，提升缓存和加载效率
      },
    },
  };
};

```
