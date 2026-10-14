# 打包优化

## 分析工具

```bash
# Webpack
webpack --config webpack.config.js --json > stats.json
# 然后上传到 https://webpack.github.io/analyse/

# 或者用 webpack-bundle-analyzer
# vue-cli: npm run build -- --report

# Rollup / Vite
npm install rollup-plugin-visualizer
# 在 vite.config.ts 中引入
```

## 优化策略

### ① Code Splitting（分包）

```js
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // Vue 核心单独打包
        'vue-vendor': ['vue', 'vue-router', 'pinia'],
        // UI 库单独打包
        'ui-vendor': ['element-plus'],
        // 工具库单独打包
        'utils-vendor': ['axios', 'lodash-es', 'dayjs'],
      }
    }
  }
}

// Webpack splitChunks
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vue: {
        test: /[\\/]node_modules[\\/](vue|vue-router|pinia)[\\/]/,
        name: 'vue-vendor',
        priority: 10,
      },
      ui: {
        test: /[\\/]node_modules[\\/]element-plus[\\/]/,
        name: 'ui-vendor',
        priority: 10,
      },
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: -10,
      },
    }
  }
}
```

### ② Tree Shaking

```js
// 前提：必须使用 ESM（import/export）
// 效果：未使用的导出在构建时被移除

// ❌ 无法 tree-shake
import _ from 'lodash'
_.debounce(...)

// ✅ 可以 tree-shake
import { debounce } from 'lodash-es'
debounce(...)

// ❌ 副作用代码阻止 tree-shake
// side-effects.js
console.log('loaded')  // 有副作用 → 不会被移除

// ✅ 在 package.json 中声明无副作用
// "sideEffects": false
// 或指定有副作用的文件： "sideEffects": ["*.css", "*.scss"]
```

### ③ 外部 CDN

```js
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['vue', 'vue-router', 'axios'],  // 不打进 bundle
    }
  }
})

// index.html
<script src="https://cdn.jsdelivr.net/npm/vue@3.4/dist/vue.global.prod.js"></script>
<script src="https://cdn.jsdelivr.net/npm/vue-router@4/dist/vue-router.global.prod.js"></script>
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

// main.js
// import { createApp } from 'vue'  → 不需要了，window.Vue 已存在
```

### ④ 压缩

```js
// CSS 压缩（cssnano）
// 自动合并相同规则、删除注释和空白

// JS 压缩（Terser / esbuild）
// Webpack：terser-webpack-plugin
// Vite build.minify: 'esbuild' | 'terser'

// 图片压缩
// image-webpack-loader（Webpack）
// 或用压缩过的衍生格式：WebP、AVIF

// Gzip / Brotli 预压缩
// compression-webpack-plugin（Webpack）
// vite-plugin-compression（Vite）
→ 打包时生成 .gz 文件
→ Nginx 直接返回，省去实时压缩
```

### ⑤ 并行构建

```js
// Webpack
// thread-loader / happypack（多进程编译）
// TerserPlugin 的 parallel: true（多进程压缩）

// Vite（默认并行）
// esbuild 天然 Go 并行
// Rollup 构建也可开启并行
```

### ⑥ 构建缓存

```js
// Webpack
cache: {
  type: 'filesystem',  // 磁盘缓存
}

// Vite（默认缓存）
// node_modules/.vite/  → 依赖预构建缓存
// 下次构建大幅提速
```

## 构建速度 vs 体积权衡

```
问题：速度快的配置通常体积大，体积小的配置通常构建慢

取舍：
  - 开发环境：追求速度（热更新快）
    - 关闭压缩 → 快
    - 减少 loader → 快
  
  - 生产环境：追求体积（加载快）
    - 开启压缩 → 慢但体积小
    - Tree Shaking → 慢但体积小
    - Code Splitting → 体积分块更合理
```

## 实战数据对比模板

```yaml
优化前：
  vendor.js: 2.1MB
  main.js:   800KB
  总 load time: 4.2s
  Lighthouse: 45

优化后：
  分包后 vendor: vue(180KB) + ui(300KB) + axios(50KB) + main(150KB)
  CDN echarts: 从 bundle 移除 600KB
  Gzip: 压缩比 60%
  总 load time: 1.3s
  Lighthouse: 82
```