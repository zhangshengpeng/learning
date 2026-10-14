# HTTP 缓存策略

## 缓存流程全景

```
浏览器请求资源：
  ↓
检查强缓存（Cache-Control / Expires）
  → 命中：直接用缓存，不发请求（200 from disk/memory cache）
  → 未命中/过期：
       ↓
    发请求到服务器，带上协商缓存头
    检查协商缓存（Etag / Last-Modified）
      → 命中：返回 304 Not Modified，用本地缓存
      → 未命中：返回 200 + 新内容 → 更新本地缓存
```

## 强缓存

### Cache-Control（HTTP/1.1）

```yaml
Cache-Control: max-age=31536000
  → 缓存 1 年，在此期间完全不发请求

Cache-Control: no-cache
  → 可以用缓存，但每次必须向服务器验证（走协商缓存）

Cache-Control: no-store
  → 完全不缓存（最严格）

Cache-Control: public
  → 可以被任何中间节点缓存（CDN、代理等）

Cache-Control: private
  → 只能被浏览器缓存（登录态页面推荐）

Cache-Control: immutable
  → 资源永不改变，强制重新加载时才请求
```

### Expires（HTTP/1.0）

```yaml
Expires: Wed, 21 Oct 2026 07:28:00 GMT
  → 绝对时间，客户端和服务器时间不一致时可能出问题
  → Cache-Control 的 max-age 优先级更高
```

### 最佳实践

```nginx
# 带 hash 的静态资源（Vite/Webpack 构建产物）
# hash 不变内容不变 → 放心长期缓存
location ~* \.(js|css|png|jpg|svg|woff2)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# HTML 入口文件（hash 可能变）
location / {
    add_header Cache-Control "no-cache";  # 每次验证
}
```

## 协商缓存

### ETag / If-None-Match（推荐）

```yaml
响应：
  ETag: "abc123-v1"

下次请求：
  If-None-Match: "abc123-v1"

服务器判断：
  ETag 没变 → 304 Not Modified
  ETag 变了 → 200 + 新内容 + 新 ETag
```

**ETag 的优势**：

```
① 精确匹配内容（哈希），内容不变 ETag 就不变
② Last-Modified 精度只到秒，ETag 无此限制
③ 可以配合版本号，内容不变但版本升级时也能更新
```

### Last-Modified / If-Modified-Since

```yaml
响应：
  Last-Modified: Tue, 01 Jan 2026 00:00:00 GMT

下次请求：
  If-Modified-Since: Tue, 01 Jan 2026 00:00:00 GMT

服务器判断：
  文件修改时间 > If-Modified-Since → 200 + 新内容
  文件修改时间 ≤ If-Modified-Since → 304
```

**ETag vs Last-Modified**：

```yaml
ETag 优先级高于 Last-Modified

缺点：
  Last-Modified 只精确到秒，1s 内多次修改无法区分
  定期生成的静态文件即使内容不变，mtime 也会变
  负载均衡环境下不同服务器生成的 ETag 可能不同
```

## Service Worker 缓存

```js
// 离线缓存（PWA 核心能力）
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('v1').then(cache =>
      cache.addAll(['/index.html', '/app.js', '/style.css'])
    )
  )
})

self.addEventListener('fetch', (e) => {
  e.respondWith(
    // 缓存优先策略
    caches.match(e.request).then(cached => cached || fetch(e.request))
  )
})
```

## 在 Vue 项目中的应用

### Vite 构建产物缓存

```js
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 手动分块，提高缓存命中率
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          ui: ['element-plus'],
          vendors: ['axios', 'lodash-es'],
        },
        // 文件名 hash
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    }
  }
})

// 结果：
// 改业务代码 → 只有业务 chunk hash 变 → 用户只下载改动的文件
// vue/vendors 缓存命中 → 秒加载
```

### HTML 不缓存的原因

```html
<!-- index.html 引用 -->
<script src="/js/app-abc123.js"></script>

<!-- 如果 index.html 被缓存 -->
<!-- 发布新版本 app-def456.js -->
<!-- 用户拿到的 index.html 还是老的 → 还是加载 app-abc123.js → 实际是旧版！ -->

<!-- 所以 HTML 必须 no-cache -->
```

## 经典面试题

### 题1：用户如何强制刷新？

```
Ctrl+F5 / Shift+刷新：
  浏览器发请求时带 Cache-Control: no-cache + Pragma: no-cache
  跳过强缓存，走协商缓存

勾选 Disable cache（DevTools）：
  发请求带 Cache-Control: no-cache
```

### 题2：文件 hash 变了但没更新？

```
可能是 CDN 缓存了 HTML
  → CDN 上 HTML 缓存时间不要过长（1~5min）
  → 配合 CDN 刷新机制

可能是 HTML 用了强缓存
  → HTML 必须 no-cache 或 max-age=0
```