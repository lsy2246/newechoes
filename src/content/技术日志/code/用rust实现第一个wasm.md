---
title: "用rust实现第一个wasm"
date: 2024-10-19T15:09:25+08:00
tags: ["rust", "webassembly"]
---

## 文件结构

```text
wasm-project/
│
├── Cargo.toml                  # Rust包的配置文件
├── package.json                # npm项目配置文件
├── webpack.config.js           # Webpack配置文件
├── src/                        # 源代码目录
│   ├── lib.rs                  # Rust代码，导出到WebAssembly
│   ├── index.js                # JavaScript代码，调用WebAssembly模块
│   └── index.html              # 简单的HTML页面，用于测试WebAssembly
├── pkg/                        # wasm-pack生成的WebAssembly相关文件
│   ├── package.json            # WebAssembly模块的npm配置
│   ├── wasm.d.ts              # TypeScript类型定义文件
│   ├── wasm.js                # WebAssembly模块的JavaScript接口
│   ├── wasm_bg.js             # WebAssembly模块的绑定代码
│   ├── wasm_bg.wasm           # 编译生成的WebAssembly二进制文件
│   └── wasm_bg.wasm.d.ts      # WebAssembly二进制文件的TypeScript声明
└── dist/                       # Webpack打包生成的文件
    ├── main.js                 # 打包后的JavaScript文件
    ├── pkg_wasm_js.js         # WebAssembly模块的打包文件
    └── 22e4d62519dd44a7c412.module.wasm  # 各种生成的WebAssembly模块文件
```

## 一、安装必要软件

1. **安装Rust**
   确保你已安装Rust环境，可以通过以下命令来确认是否安装成功：

    ```bash
    rustc --version
    ```

2. **安装wasm-pack**
   `wasm-pack`用于将Rust代码编译为WebAssembly格式。通过以下命令安装：

    ```bash
    cargo install wasm-pack
    ```

3. **安装npm**
   npm是JavaScript包管理工具，确保安装最新版本。

## 二、编写代码

1. **构建一个新的Rust包**
   在项目目录下创建一个新的Rust库项目：

    ```bash
    cargo new --lib wasm
    ```

2. **配置** **`Cargo.toml`**
   修改`Cargo.toml`来添加WebAssembly的依赖和输出配置：

    ```toml
    [package]
    name = "wasm"
    version = "0.1.0"
    edition = "2021"

    [dependencies]
    wasm-bindgen = "0.2.95"

    [lib]
    crate-type = ["cdylib", "rlib"]
    ```

3. **编写Rust文件** **`src/lib.rs`**
   使用`wasm-bindgen`库将Rust函数暴露给JavaScript。编写如下代码：

    ```rust
    extern crate wasm_bindgen;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    extern {
        pub fn alert(s: &str);
    }

    #[wasm_bindgen]
    pub fn greet(name: &str) {
        alert(&format!("Hello, {}!", name));
    }
    ```

4. **将Rust代码编译为WebAssembly**
   使用`wasm-pack`进行编译：

    ```bash
    wasm-pack build
    ```

   编译后的WebAssembly文件将生成在`pkg/`目录下。

## 三、打包代码

1. **初始化npm项目**
   创建一个`package.json`文件：

    ```bash
    npm init -y
    ```

2. **安装Webpack及相关工具**
   安装Webpack及开发服务器，用于打包和本地运行JavaScript与WebAssembly：

    ```bash
    npm install --save-dev webpack webpack-cli webpack-dev-server
    ```

3. **编写JavaScript调用代码** **`src/index.js`**
   在`index.js`中，调用由Rust编译出的WebAssembly模块：

    ```javascript
    const js = import("../pkg/wasm");

    js.then((js) => {
        js.greet("world");
    });
    ```

4. **编写Webpack配置文件** **`webpack.config.js`**
   该配置文件用于打包项目并支持WebAssembly异步加载：

    ```javascript
    module.exports = {
        entry: './src/index.js',
        mode: 'development',  // 开发模式，可切换为'production'
        experiments: {
            asyncWebAssembly: true,  // 异步加载WebAssembly
        },
        module: {
            rules: [
                {
                    test: /\.wasm$/,
                    type: "webassembly/async"  // 使用异步加载WebAssembly
                }
            ]
        },
    };
    ```

5. **打包JavaScript文件**
   使用Webpack打包项目：

    ```bash
    npx webpack
    ```

## 四、运行代码

1. **编写HTML文件** **`src/index.html`**
   在HTML文件中引入打包后的`main.js`：

    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WebAssembly Example</title>
    </head>
    <body>
    <h1>WebAssembly Example</h1>
    <script src="../dist/main.js"></script>
    </body>
    </html>
    ```

2. **运行HTML文件**
   打开`src/index.html`，在浏览器中运行此文件，应该会看到弹窗显示"Hello, world"。
