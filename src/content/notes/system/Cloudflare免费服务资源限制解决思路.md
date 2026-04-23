---
title: "Cloudflare 免费服务资源限制解决思路"
date: 2026-04-23T00:00:00+08:00
tags: ["cloudflare"]
---

## 1. Worker CPU 限制

Cloudflare Worker 触发 CPU 限制时，常见错误：

- `Error 1102`
- `Worker exceeded resource limits`
- `Worker exceeded CPU time limit`
- `Exceeded CPU Time Limits`
- `exceededCpu`

官方说明中，CPU 时间主要指代码实际执行时间，例如循环、JSON 解析、数据处理等。网络请求等待时间不算 CPU 时间。

解决思路：

(1) 使用 `Queues` 拆分任务。

主 `Worker` 负责接收请求和任务调度，小 `Worker` 或 Queue Consumer 负责执行具体任务。  
大任务拆成多个小任务后，单次执行时间会降低。

(2) 使用多个 `Worker` 分摊逻辑。

主 `Worker` 处理入口和状态控制，辅助 `Worker` 处理耗时任务，避免所有逻辑堆在一个入口中。

(3) 使用 `WASM` 处理计算密集逻辑。

部分算法、解析、压缩等逻辑可以尝试放到 `WASM`，减少 JavaScript 执行压力。

## 2. D1 免费额度限制

`D1` 免费额度主要容易卡在读取、写入和存储上。

解决思路：

(1) 增加本地缓存。

高频读取的数据优先从缓存中取，减少直接访问 `D1`。

(2) 使用 `KV` 和 `Durable Objects` 做主要读层。

常用数据先读 `KV` 或 `Durable Objects`，没有缓存再回源到 `D1`。

(3) `D1` 作为辅助数据库。

核心数据写入 `D1`，读取尽量走缓存层。  
不重要或允许丢失的数据，可以直接放在 `KV` 或 `Durable Objects` 中。

## 3. 参考

- [Cloudflare Worker Error 1102][1]
- [Cloudflare Workers Limits][2]
- [Cloudflare D1 Pricing][3]
- [Cloudflare D1 Limits][4]

[1]: https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1102/
[2]: https://developers.cloudflare.com/workers/platform/limits/
[3]: https://developers.cloudflare.com/d1/platform/pricing/
[4]: https://developers.cloudflare.com/d1/platform/limits/
