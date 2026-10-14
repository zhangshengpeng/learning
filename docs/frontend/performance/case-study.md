# 实战案例 & 优化清单

## 面试案例模板

> 必须有**数据对比**，否则面试官不感兴趣。

```
项目背景：XX 后台管理系统，Vue 2 + Element UI + Webpack

问题：
  首屏 LCP 4.2s
  Lighthouse Performance 评分 45
  用户反馈"打开很慢"

排查过程：
  ① webpack-bundle-analyzer → vendor.js 高达 2.1MB
  ② Chrome Coverage 分析 → 首屏只用到 30% 的代码
  ③ Network 面板 → 20+ 个 JS 串行加载

原因分析：
  ① echarts 全量引入（600KB）→ 首屏不需要图表
  ② moment + locale（230KB）→ 只用中文格式
  ③ element-ui 全量引入（400KB）→ 只用到 20 个组件
  ④ 无路由懒加载 → 所有页面打到一个 chunk
  ⑤ 无 Gzip → 传输体积 = 源体积

优化措施及收益：
  ① echarts 改 CDN 外链            → vendor 减 600KB
  ② moment → dayjs                 → 减 230KB
  ③ element-ui 按需引入            → 减 400KB
  ④ 路由懒加载                     → 首屏 JS 减 40%
  ⑤ Nginx Gzip                     → 传输体积减 60%
  ⑥ 图片 WebP + loading="lazy"     → 图片加载时间减 50%
  ⑦ 第三方库分包（splitChunks）    → 缓存命中率提升

最终结果：
  首屏 LCP：4.2s → 1.3s  （↓69%）
  Lighthouse：45 → 82     （↑82%）
  vendor.js：2.1MB → 180KB + 300KB(CDN)
```

## 按类别优化清单

### 网络

```
✅ DNS 预解析（dns-prefetch）
✅ 预连接（preconnect）→ API、CDN 域名
✅ HTTP/2 多路复用
✅ CDN 加速静态资源
✅ Gzip / Brotli 压缩
```

### 资源

```
✅ 路由懒加载（() => import()）
✅ 异步组件（defineAsyncComponent）
✅ 第三方库按需引入
✅ 替代重库（moment → dayjs）
✅ 代码分割（splitChunks/manualChunks）
✅ Tree Shaking（ESM + sideEffects）
```

### 缓存

```
✅ 强缓存：hash 文件 max-age=31536000
✅ 协商缓存：HTML no-cache
✅ Service Worker（离线缓存）
✅ CDN 缓存策略
```

### 渲染

```
✅ 虚拟列表（大数据场景）
✅ v-once（静态内容）
✅ v-memo（依赖不变不重渲染）
✅ shallowRef（大对象）
✅ 防抖节流（频繁操作）
✅ CSS transform/opacity 动画
✅ content-visibility（长页面）
```

### 图片

```
✅ WebP/AVIF 格式
✅ loading="lazy"
✅ 响应式图片（srcset + picture）
✅ CDN 裁剪压缩
✅ 渐进式加载（模糊占位 → 高清）
✅ 雪碧图 / SVG Sprite
```

### 构建

```
✅ 构建分析（bundle-analyzer/visualizer）
✅ 并行压缩（terser parallel）
✅ 构建缓存（webpack cache / Vite .vite）
✅ 外部 CDN（echarts、monaco-editor 等大库）
✅ 移除 console/debugger（生产）
```

### 监控

```
✅ Lighthouse CI（每次 PR 检查）
✅ web-vitals（RUM 真实数据）
✅ Sentry（错误监控 + 性能）
✅ 自定义埋点（关键路径耗时）
✅ Performance API（Navigation Timing）
```

## 性能预算

```js
// 设定性能预算，CI 中检查
// .lighthouserc.json
{
  "assert": {
    "assertions": {
      "categories:performance": ["error", { "minScore": 0.8 }],
      "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
      "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
      "total-byte-weight": ["error", { "maxNumericValue": 500000 }]
    }
  }
}
```