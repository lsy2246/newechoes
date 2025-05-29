---
title: "用Rust实现WebAssembly模块"
date: 2024-10-19T15:09:25+08:00
tags: ["rust", "webassembly"]
---

## 准备工作

### 1. 安装Rust

确保已安装Rust环境：

```bash
rustc --version
```

如果未安装，可以访问[Rust官网](https://www.rust-lang.org/tools/install)按照指引进行安装。

### 2. 安装wasm-pack

wasm-pack是将Rust代码编译为WebAssembly的工具：

```bash
cargo install wasm-pack
```

## 创建和构建WebAssembly模块

### 1. 创建Rust库项目

```bash
cargo new --lib my_wasm
cd my_wasm
```

### 2. 配置Cargo.toml

修改`Cargo.toml`文件，添加必要的依赖和配置：

```toml
[package]
name = "my_wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2.95"
# 以下是可选依赖，根据项目需求添加
js-sys = "0.3.64"
web-sys = { version = "0.3.64", features = ["console"] }
```

### 3. 编写Rust代码

在`src/lib.rs`中编写导出到WebAssembly的代码：

```rust
use wasm_bindgen::prelude::*;

// 导入JavaScript函数
#[wasm_bindgen]
extern "C" {
    // 导入JavaScript的console.log函数
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// 简单的结构体示例
#[wasm_bindgen]
pub struct Processor {
    value: i32,
}

#[wasm_bindgen]
impl Processor {
    // 构造函数
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Processor { value: 0 }
    }

    // 简单的方法
    pub fn increment(&mut self, amount: i32) -> i32 {
        self.value += amount;
        self.value
    }
    
    // 返回处理结果的方法
    pub fn process_data(&self, input: &str) -> String {
        log(&format!("Processing data: {}", input));
        format!("Processed: {} (value={})", input, self.value)
    }
}

// 单独的函数也可以导出
#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

### 4. 构建WebAssembly模块

使用wasm-pack构建WebAssembly模块，指定target为web：

```bash
wasm-pack build --target web
```

这将在`pkg/`目录下生成以下文件：

- `my_wasm.js` - JavaScript包装代码
- `my_wasm_bg.wasm` - WebAssembly二进制文件
- `my_wasm_bg.js` - JavaScript胶水代码
- 其他类型定义和元数据文件

## 在Web应用中使用WebAssembly模块

在React组件中使用WebAssembly模块的示例：

```tsx
import React, { useEffect, useState } from 'react';

interface MyWasmModule {
  Processor: new () => {
    increment: (amount: number) => number;
    process_data: (input: string) => string;
  };
  add: (a: number, b: number) => number;
  default?: () => Promise<any>;
}

const WasmExample: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [wasmModule, setWasmModule] = useState<MyWasmModule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWasm = async () => {
      try {
        // 动态导入WASM模块
        const wasm = await import('@/assets/wasm/my_wasm/my_wasm.js');
        
        // 初始化WASM模块
        if (typeof wasm.default === 'function') {
          await wasm.default();
        }
        
        setWasmModule(wasm as unknown as MyWasmModule);
      } catch (err) {
        console.error('加载WASM模块失败:', err);
        setError(`WASM模块加载失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    loadWasm();
  }, []);

  useEffect(() => {
    if (!wasmModule) return;
    
    try {
      // 使用WASM模块中的函数
      const sum = wasmModule.add(10, 20);
      console.log(`10 + 20 = ${sum}`);
      
      // 使用WASM模块中的类
      const processor = new wasmModule.Processor();
      processor.increment(15);
      const processResult = processor.process_data("React与WASM");
      
      setResult(processResult);
    } catch (err) {
      console.error('使用WASM模块失败:', err);
      setError(`WASM操作失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [wasmModule]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="wasm-example">
      <h2>WebAssembly示例</h2>
      {!wasmModule ? (
        <p>正在加载WASM模块...</p>
      ) : (
        <div>
          <p>WASM处理结果:</p>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
};

export default WasmExample;
```
