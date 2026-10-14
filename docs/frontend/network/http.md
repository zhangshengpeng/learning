# HTTP 各版本

## HTTP/1.0

```
特点：
  - 每个请求建立一次 TCP 连接（用完就断）
  - 只支持 GET、POST、HEAD
  - 无 Host 头（一个 IP 只能挂一个站点）

问题：请求 10 个文件 = 10 次 TCP 三次握手 → 巨慢
```

## HTTP/1.1

### 改进

```
① 持久连接（Connection: keep-alive）
   → 一个 TCP 连接可以发多个请求
   → 不用每次都三次握手

② 管道化（Pipelining）
   → 不用等上一个响应回来，可以继续发下一个请求
   → 但响应必须按顺序返回 → 队头阻塞（HOL Blocking）
   → 浏览器基本没实现此特性

③ Host 头
   → 一个 IP 可以挂多个域名（虚拟主机）

④ 更多方法：PUT、DELETE、OPTIONS 等

⑤ 分块传输（Transfer-Encoding: chunked）
   → 服务端可以分批发送响应
```

### HTTP/1.1 的队头阻塞

```
TCP 连接上：
  请求1 ──────── 响应1
        请求2 ──────── 响应2
              请求3 ──────── 响应3

如果响应1 卡住了（比如查数据库慢），响应2、3 必须等
即使响应2 已经准备好了，也不能发送
→ 这就是 HTTP/1.1 的队头阻塞
```

### 浏览器如何绕过？

```
浏览器对同一域名最多开启 6 个 TCP 连接
→ 用多个连接并行加载资源
→ 域名分片：a.example.com、b.example.com、c.example.com
  多域名增加并发连接数（但增加了 DNS 和 TLS 开销）
```

## HTTP/2

### 核心改进

```yaml
① 二进制分帧（Binary Framing）
  HTTP/2 把数据切分为二进制帧
  帧是 HTTP/2 最小通信单位
  所有帧都在同一个 TCP 连接上双向传输

② 多路复用（Multiplexing）
  一个 TCP 连接可以并发多个请求/响应
  帧有流标识（Stream ID）
  不同流的帧可以交替发送

  请求1 帧 ─→  请求2 帧 ─→  响应1 帧 ─→  请求3 帧 ─→  响应2 帧 ─→ ...
  请求和响应可以乱序到达，接收方根据 Stream ID 重组成完整消息
  解决了 HTTP/1.1 应用层的队头阻塞

③ 头部压缩（HPACK）
  HTTP/1.1 每次请求带完整头部（Cookie、User-Agent 等几百字节）
  HTTP/2 用 HPACK 字典对头部进行压缩
  相同头部只发一次索引号

④ 服务端推送（Server Push）
  服务端可以主动推送资源（CSS、JS），不用等浏览器解析 HTML 再请求
  实际使用效果不佳，Chrome 已移除支持

⑤ 流量控制 & 优先级
  可以给不同资源的流设置优先级
```

### HTTP/2 的队头阻塞（TCP 层面）

```
HTTP/2 解决了应用层（HTTP 层面）的队头阻塞
但无法解决 TCP 层面的队头阻塞：

TCP 是可靠传输，数据包必须按序到达
如果某个 TCP 包丢了 → TCP 重传 → 后续所有包都要等这个包重传
→ HTTP/2 的所有流都被这一个丢失的包阻塞
→ 这就是 TCP 的队头阻塞
```

## HTTP/3 (QUIC)

### 核心：用 UDP 代替 TCP

```
QUIC（Quick UDP Internet Connections）= HTTP/3 的传输层

特点：
  ① 基于 UDP → 无 TCP 队头阻塞
     QUIC 在 UDP 之上实现多路复用
     一个流丢包不影响其他流

  ② 0-RTT 建连
     TLS 1.3 + QUIC → 首次 1-RTT，再次访问 0-RTT
     （HTTP/2 over TCP：TCP 1 RTT + TLS 2/3 RTT = 3~4 RTT，HTTP/3：1~0 RTT）

  ③ 连接迁移
     TCP 用四元组（src IP, src port, dst IP, dst port）标识连接
     Wi-Fi 切换到 4G → IP 变了 → TCP 连接断开
     QUIC 用 Connection ID → IP 变了连接不受影响

  ④ 前向纠错（FEC）
     每个包携带其他包的部分数据
     丢包时可能不需要重传，直接用冗余数据恢复
```

## 版本对比总结

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|:--|:--|:--|:--|
| 传输层 | TCP | TCP | QUIC (UDP) |
| 多路复用 | ❌（队头阻塞） | ✅（应用层） | ✅（完全解决） |
| 头部压缩 | ❌ | HPACK | QPACK |
| 服务端推送 | ❌ | ✅（已废弃） | ✅ |
| 建连 RTT | 1+ | 3~4 | 0~1 |
| 连接迁移 | ❌ | ❌ | ✅ |
| 普及度 | 全部 | 主流 | 20%~30% |

## 在 Vue 项目中的体现

```js
// Vite/Webpack 项目通过 vite.config.ts 配置 HTTPS 和 HTTP/2

// vite.config.ts
export default defineConfig({
  server: {
    https: true,  // 启用 HTTPS（HTTP/2 要求 HTTPS）
  }
})
// Vite 开发时自动启用 HTTP/2（如果 https 为 true）

// Nginx 配置 HTTP/2
// listen 443 ssl http2;
// 静态资源加载速度显著提升（多路复用）
```