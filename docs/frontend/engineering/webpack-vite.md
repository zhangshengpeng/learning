# Webpack vs Vite

> 面试必问。不只是比速度，要讲原理。

## 为什么 Vite 这么快？

### Webpack 的瓶颈

```
Webpack 冷启动流程：
  ① 从入口文件开始
  ② 递归解析所有模块依赖
  ③ 所有模块转译（babel/ts → JS）
  ④ 打包成一个或多个 bundle
  ⑤ 启动 dev server

项目越大 → 依赖越多 → 启动越慢
1000+ 个模块 → 可能需要 30s~60s
```

### Vite 的解法

```
Vite 冷启动流程：
  ① 启动 dev server（Koa/Connect）
  ② 预构建第三方依赖（esbuild → 10x~100x faster）
  ③ 浏览器请求 → 按需编译 → 返回 ESM

依赖预构建：
  - 用 esbuild 把所有第三方依赖打包成单个 ESM 文件
  - node_modules 里上百个文件 → 几个文件
  - 浏览器请求数大幅减少

按需编译：
  - 浏览器请求 /src/App.vue → 编译 App.vue → 返回
  - 浏览器请求 /src/components/Header.vue → 编译 Header.vue → 返回
  - 只编译浏览器实际请求的模块
```

### 原理对比

| | Webpack | Vite |
|:--|:--|:--|
| 启动 | 全部打包 → 启动 | 预构建依赖 → 启动 |
| 编译 | 全部模块一次性编译 | 浏览器请求时按需编译 |
| 模块格式 | 打包为 Bundle | 原生 ESM |
| 冷启动（1000模块） | 30~60s | 1~3s |
| HMR | 修改模块 → 重新打包 → 替换 | 直接替换 ESM 模块 |
| HMR 速度 | 随项目增长变慢 | 始终快（O(1)） |
| 生产构建 | webpack + terser | rollup + esbuild/terser |
| 生态 | 最丰富 loader/plugin | 兼容 Rollup 插件 |

### Vite HMR 为什么快？

```
Webpack HMR：
  修改 a.js → a.js 重新编译 → 找出 a.js 影响的模块 → 重新编译 → 推送
  影响范围越大 → 重新编译越多

Vite HMR：
  修改 a.js → Vite 只需编译 a.js → 返回 ESM
  浏览器在模块图中替换 a.js → 无需重新编译依赖链
  因为浏览器本身就理解 ESM 模块图
```

## esbuild 为什么快？

```
① Go 语言编写 → 编译为原生代码 → 比 JS 快 10~100x

② 并行处理：
  Webpack 的 JS 处理是单线程（多进程用 thread-loader）
  esbuild 内部充分利用多核 CPU

③ 内存效率：
  Go 的内存管理比 JS/V8 更高效
  不需要 AST → 中间表示 → 代码生成的多步骤
  esbuild 精简了转换流程

④ 无 AST：
  esbuild 在解析和生成时共享数据结构
  Webpack/Babel 每个 loader 都要 parse → transform → generate
```

## 实际配置对比

### Webpack

```js
// webpack.config.js
module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js'
  },
  module: {
    rules: [
      { test: /\.vue$/, loader: 'vue-loader' },
      { test: /\.js$/, loader: 'babel-loader' },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './index.html' }),
    new VueLoaderPlugin()
  ],
  devServer: {
    port: 3000,
    hot: true
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  }
}
```

### Vite

```js
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': '/src' }
  },
  server: {
    port: 3000
  }
})
```

## 何时不适用 Vite？

```yaml
① 需要兼容 IE 的项目：
  Vite 基于 ESM → IE 不支持 ESM
  → 必须用 Webpack + babel + polyfill

② 复杂构建链：
  非常定制化的构建流程，Webpack 生态更成熟

③ 旧项目迁移成本高：
  Webpack 配置复杂但稳定运行 → 迁移成本 > 收益

④ React Native / 小程序：
  目前 Webpack 仍是主流方案
```

## 经典面试题

### 题1：Vite 生产构建用什么？

```
开发：esbuild（Go，快）
生产：Rollup（JS，插件生态完善，Tree-Shaking 更成熟）

为什么不生产也用 esbuild？
  - esbuild 的代码分割不如 Rollup 完善
  - esbuild 对 CSS 处理、插件生态不够成熟
  - esbuild 缺少某些高级优化
```

### 题2：Vite 如何处理 CommonJS 依赖？

```
Vite 预构建阶段：
  扫描 node_modules 中的 CJS 模块
  esbuild 将 CJS → ESM 转换
  打包为单个 ESM 文件

// 例如：
// node_modules/axios → CJS
// esbuild 转：export default axios
// 缓存到 node_modules/.vite/
// 浏览器直接用 ESM import
```