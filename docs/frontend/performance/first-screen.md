# 首屏加载优化

## 加载链路分析

```
首屏时间 = DNS + TCP + TLS + 请求HTML + 解析HTML + 加载CSS/JS + 渲染

每个阶段都可以优化
```

## 网络阶段优化

### DNS 预解析

```html
<link rel="dns-prefetch" href="//api.example.com">
<link rel="dns-prefetch" href="//cdn.example.com">
```

### TCP/TLS 优化

```yaml
HTTP/2 多路复用 → 减少 TCP 连接数
TLS 1.3 → 减少握手 RTT
```

## HTML 阶段优化

### 关键 CSS 内联

```html
<head>
  <!-- 把首屏需要的 CSS 直接内联 -->
  <style>
    /* 首屏关键样式 */
    .hero { ... }
    .header { ... }
  </style>
  <!-- 非关键 CSS 延迟加载 -->
  <link rel="preload" href="/styles/full.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
</head>
```

### 资源预加载

```html
<!-- 预加载 -->
<link rel="preload" href="/fonts/main.woff2" as="font" crossorigin>

<!-- 预连接 -->
<link rel="preconnect" href="https://api.example.com">

<!-- 预获取（下个页面） -->
<link rel="prefetch" href="/page2.html">
```

## 资源加载优化

### 路由懒加载

```js
const router = createRouter({
  routes: [
    {
      path: '/dashboard',
      component: () => import('@/views/Dashboard.vue')  // 按需加载
    }
  ]
})
```

### 组件异步加载

```js
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() =>
  import('@/components/HeavyChart.vue')
)
```

### 第三方库优化

```js
// 按需引入
import { debounce } from 'lodash-es'

// 用轻量替代
// moment (230KB) → dayjs (2KB)
// lodash (70KB) → lodash-es + tree-shaking
```

## 压缩传输

```nginx
# Nginx Gzip
gzip on;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
gzip_min_length 256;
gzip_comp_level 6;

# Brotli（更好的压缩率）
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/javascript application/json;
```

## 缓存优化

```
hash 文件（js/css/img）→ 强缓存（Cache-Control: max-age=31536000）
HTML 入口文件 → 协商缓存（Cache-Control: no-cache）

分开部署：
  dist/assets/* → CDN（1年缓存）
  dist/index.html → 服务器（不缓存/短缓存）
```

## SSR / SSG

| | SPA | SSR | SSG |
|:--|:--|:--|:--|
| 首屏 | 慢 | 快 | 最快 |
| SEO | ❌ | ✅ | ✅ |
| 服务器压力 | 无 | 高 | 无 |
| 适合 | 后台 | C端动态 | 博客/文档 |

## 优化检查清单

```
✅ DNS 预解析第三方域名
✅ HTTP/2 启用
✅ 路由懒加载
✅ 第三方库按需引入
✅ 图片 WebP + 懒加载
✅ Gzip/Brotli
✅ CDN 加速
✅ HTML 不缓存 + 资源强缓存
✅ 预加载关键资源
✅ 关键 CSS 内联
✅ 异步加载非关键 JS
```