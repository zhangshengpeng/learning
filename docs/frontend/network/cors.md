# 跨域（CORS）

> 面试 100% 会问，前后端协作必知。

## 同源策略

**协议 + 域名 + 端口** 三者相同 = 同源。

```
https://example.com:443/page → https://example.com:443/api  ✅ 同源
http://example.com           → https://example.com           ❌ 协议不同
https://example.com          → https://api.example.com       ❌ 子域名不同
https://example.com:443      → https://example.com:8443      ❌ 端口不同
```

### 同源策略限制了什么？

```
✓ 允许：通过 <script>、<link>、<img>、<iframe>、<video> 加载跨域资源
✗ 限制：JS 发起的 AJAX/Fetch 请求（XHR、Fetch API）
✗ 限制：跨域 iframe 的 DOM 访问
✗ 限制：跨域的 Cookie、LocalStorage 读取
```

## CORS 机制

### 简单请求

```
同时满足以下条件 = 简单请求：
  ① 方法：GET / HEAD / POST
  ② Content-Type 为以下之一：
     - text/plain
     - multipart/form-data
     - application/x-www-form-urlencoded
  ③ 无自定义 Header

流程：
  浏览器直接发出请求，自动带上 Origin 头
  → 服务端返回 Access-Control-Allow-Origin
  → 浏览器检查是否匹配
  → 匹配：正常
  → 不匹配：JS 无法读取响应（但请求其实已经到了服务器）
```

### 预检请求（Preflight）

```
不满足简单请求条件时，浏览器先发 OPTIONS 请求：

  OPTIONS /api/data HTTP/1.1
  Origin: https://example.com
  Access-Control-Request-Method: DELETE
  Access-Control-Request-Headers: X-Custom-Token, Content-Type

服务端响应：
  Access-Control-Allow-Origin: https://example.com
  Access-Control-Allow-Methods: GET, POST, DELETE
  Access-Control-Allow-Headers: Content-Type, X-Custom-Token
  Access-Control-Max-Age: 86400  （预检缓存 24h）

→ 预检通过 → 浏览器才发真正的 DELETE 请求
```

### 服务端 CORS 头

```
Access-Control-Allow-Origin: https://example.com  或 *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true  （允许携带 Cookie）
Access-Control-Max-Age: 86400  （预检缓存时间/秒）
Access-Control-Expose-Headers: X-Total-Count  （暴露给 JS 的自定义头）
```

### 携带 Cookie

```
场景：跨域请求需要带上 Cookie（用户身份）

前端：
  fetch(url, { credentials: 'include' })
  // XMLHttpRequest: xhr.withCredentials = true

后端：
  Access-Control-Allow-Origin: https://example.com  // 不能是 *
  Access-Control-Allow-Credentials: true

注意：
  - 如果设置了 withCredentials，Allow-Origin 必须指定具体域名，不能是 *
  - Cookie 的 SameSite 必须不是 Strict
```

## JSONP（仅 GET）

```html
<script>
  // 前端：
  function handleResponse(data) {
    console.log(data)  // { user: 'Alice' }
  }
</script>
<script src="https://api.example.com/user?callback=handleResponse"></script>

<!-- 服务端返回： -->
<!-- handleResponse({ "user": "Alice" }) -->
<!-- 浏览器当作 JS 执行 → 调用 handleResponse -->
```

## 其他跨域方案

### ① 代理（开发环境最常用）

```js
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
// 前端请求 /api/user → Vite Dev Server 转发到 https://api.example.com/user
// 对浏览器而言是同源请求
```

### ② Nginx 反向代理

```nginx
server {
    listen 80;
    server_name example.com;

    location /api/ {
        proxy_pass https://api.example.com/;
        proxy_set_header Host $host;
    }

    location / {
        root /var/www/dist;
        try_files $uri $uri/ /index.html;
    }
}
// 前端部署在 example.com，API 走同一个域名的 /api 路径
// Nginx 转发到真正的 API 服务器
```

### ③ WebSocket（天然跨域）

```js
const ws = new WebSocket('wss://api.example.com/ws')
// WebSocket 不受同源策略限制
// 但服务端需验证 Origin 防止跨站点 WebSocket 劫持
```

### ④ postMessage（跨窗口通信）

```js
// 父页面
const iframe = document.querySelector('iframe')
iframe.contentWindow.postMessage('data', 'https://child.example.com')

// 子页面
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://parent.example.com') return  // 验证来源
  console.log(e.data)
})
```

## 在 Vue 项目中的应用

### Axios 跨域配置

```js
// 统一配置
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 10000,
  withCredentials: true  // 跨域携带 Cookie
})

// 开发环境走 Vite Proxy
// 生产环境走 Nginx 反向代理或同域部署

// 代理模式下不需要 CORS 头
// 直接请求跨域 API 时才需要 CORS
```

## 经典面试题

### 题1：简单请求 vs 预检请求

```
简单请求：
  → 直接发请求 → 浏览器检查响应头的 Allow-Origin
  → 不匹配：请求已到服务器（可能已修改了数据），只是 JS 读不到响应

预检请求：
  → 先发 OPTIONS → 通过才发真正的请求
  → 不通过：真正的请求根本不发
  → 目的是保护服务器不被非授权的方法调用
```

### 题2：跨域时 Cookie 需要什么条件？

```
前端：
  - withCredentials: true（或 credentials: 'include'）

后端：
  - Access-Control-Allow-Credentials: true
  - Access-Control-Allow-Origin 必须是具体域名（不能是 *）
  - Cookie 的 SameSite=None; Secure（https下）
```