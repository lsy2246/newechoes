# 构建命令

## 构建wasm

```bash
wasm-pack build --target web
```

## 构建应用

### windows

```bash
cargo build --release --target x86_64-pc-windows-msvc
```

> 如果在window上交叉编译先安装Linux工具链，cross，wsl，docker

### linux

```bash
rustup target add x86_64-unknown-linux-musl
```
