# HTTPS & TLS 握手

> 必考题。不只是背握手过程，要理解前向安全和证书链。

## 为什么需要 HTTPS？

```
HTTP 明文传输 → 中间人可以：
  ① 窃听：看到密码、Token
  ② 篡改：插入广告、恶意脚本
  ③ 冒充：伪造服务器（DNS 劫持）
```

## 对称加密 vs 非对称加密

```yaml
对称加密（AES、ChaCha20）：
  加密解密用同一把钥匙
  快 → 适合加密大量数据（实际通信内容）

非对称加密（RSA、ECDHE）：
  公钥加密、私钥解密 / 私钥签名、公钥验签
  慢 → 只用来交换对称密钥（握手阶段）
```

## TLS 1.2 握手（4 次 RTT）

```
ClientHello                     →
                                  ←  ServerHello + 证书 + ServerHelloDone
ClientKeyExchange + ChangeCipherSpec + Finished  →
                                  ←  ChangeCipherSpec + Finished

详细流程：
  Client → Server: ClientHello
          支持的 TLS 版本、加密套件、Client Random

  Server → Client: ServerHello
          选择的 TLS 版本、加密套件、Server Random
          Certificate（服务器的证书）
          ServerHelloDone

  Client → Server: ClientKeyExchange
          生成 Premaster Secret
          用服务器公钥加密 → 发送
          ChangeCipherSpec（通知切换加密）
          Finished（加密的握手完成）

  Server → Client: ChangeCipherSpec
          Finished（加密的握手完成）

  双方用 Client Random + Server Random + Premaster Secret → Master Secret
  → 对称加密密钥
```

### 数字证书 & 证书链

```
为什么需要证书？
  Client 用服务器公钥加密 Premaster Secret
  但怎么确定公钥是真正服务器的，还是中间人的？
  → 需要 CA（证书颁发机构）做信任担保

证书链验证：
  Root CA 证书（内置在操作系统/浏览器中，天然受信任）
    ↓ 签名
  中间 CA 证书
    ↓ 签名
  服务器证书（包含公钥、域名等）

  浏览器验证：
  ① 证书是否在有效期内
  ② CN/SAN 是否匹配当前域名
  ③ 向上逐级验证签名，直到 Root CA
  ④ 检查是否被吊销（OCSP/CRL）
```

## TLS 1.3 握手（1-RTT）

```
TLS 1.3 的主要改进：

① 1-RTT 握手（TLS 1.2 = 2-RTT）
  Client → Server: ClientHello + 密钥协商材料
  Server → Client: ServerHello + 密钥协商材料 + 证书 + Finished
  → 数据已经可以发送了！

② 只支持前向安全的算法（移除 RSA 密钥交换）
  必须用 ECDHE 或 DHE
  RSA 密钥交换：用服务器公钥加密 Premaster Secret
    服务器私钥泄露 → 所有的历史会话可被解密
  ECDHE：用临时密钥对（Ephemeral）
    每次握手生成新的临时密钥 → 私钥泄露不影响历史会话
    → 这就是"前向安全"（Forward Secrecy）

③ 0-RTT 模式
  再次访问同一服务器时：
  Client → Server: 0-RTT 数据（已加密）+ ClientHello
  → 不等握手完成就直接发数据
  → 0 个 RTT！
  代价：0-RTT 数据可能被重放 → 幂等操作才安全
```

## HTTPS 性能优化

```yaml
① Session Ticket / Session ID（TLS 1.2）
  下次访问复用之前的 session → 跳过完整握手
  → 会话恢复

② OCSP Stapling
  正常：客户端查 OCSP 验证证书是否被吊销 → 1 次额外查询
  Stapling：服务器自己查询 OCSP，附在证书里发给客户端
  → 客户端不用单独查询

③ 证书链优化
  证书链不要过长（2~3 个最合理）
  ECC 证书比 RSA 小、验证快

④ HSTS（HTTP Strict-Transport-Security）
  强制浏览器只能通过 HTTPS 访问
  浏览器收到这个头后，后续 HTTP 请求自动转换为 HTTPS
```

## 在 Vue 项目中的应用

```js
// Nginx 配置 HTTPS
server {
    listen 443 ssl http2;  // 开启 HTTP/2
    server_name example.com;

    # 证书路径
    ssl_certificate     /etc/nginx/ssl/example.com.pem;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;

    # TLS 优化
    ssl_protocols TLSv1.2 TLSv1.3;  // 只支持安全版本
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:...;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;
}
```

## 经典面试题

### 题1：TLS 1.2 vs 1.3 区别

```
1. 握手轮次：2-RTT → 1-RTT
2. 加密套件：从 37 种 → 5 种（减少协商复杂度）
3. 只支持前向安全的密钥交换（废弃 RSA 密钥交换）
4. 支持 0-RTT
5. 加密更多握手过程消息（ServerHello 之后全加密）
```

### 题2：前向安全

```
问题：假设有人记录了所有历史加密流量，N 年后获取了服务器私钥

RSA 密钥交换：❌ 私钥解密历史 Premaster Secret → 所有历史会话破解
ECDHE 密钥交换：✅ 每次握手生成临时密钥对，用完丢弃 → 历史会话无法解密
```