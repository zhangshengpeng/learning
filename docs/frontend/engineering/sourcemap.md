# Source Map

## 为什么需要 Source Map？

```
压缩后的代码：
eval("var a=1;var b=2;console.log(a+b);")

线上报错：
Uncaught TypeError at line 1, column 3645
→ 完全无法定位到源码位置

Source Map：建立压缩代码和源码的映射关系
→ 线上报错 → 直接定位到源文件和行号
```

## Source Map 原理

```json
{
  "version": 3,
  "sources": ["original.ts"],
  "names": ["count", "increment"],
  "mappings": "AAAA,SAASA,KAAKA,CAACC...",
  "file": "bundle.min.js"
}
```

### mappings 解析

```
VLQ 编码（Variable Length Quantity）
把位置映射信息编码为 Base64 字符串

映射流程：
  编译后代码的第 1 列 → 对应 源码第 3 行第 10 列 → 原始变量名 count
  编译后代码的第 2 列 → 对应 源码第 3 行第 14 列 → 原始变量名 increment
  ...
```

## 常见配置

```js
// webpack.config.js
devtool: 'source-map'       // 最完整 .map 文件
devtool: 'cheap-source-map' // 只映射行（不映射列）+ 不映射 loader
devtool: 'eval-source-map'  // eval 包裹，速度快
devtool: 'hidden-source-map' // 生成但不引用，只给 Sentry
devtool: 'nosources-source-map' // 不暴露源码内容

// Vite
build: {
  sourcemap: true
}
```

| devtool | 构建速度 | 重构速度 | 生产环境 | 质量 |
|:--|:--|:--|:--|:--|
| eval | +++ | +++ | ❌ | 映射到打包后 |
| eval-source-map | -- | + | ❌ | 映射到源码行 |
| source-map | -- | -- | ✅ | 映射到源码行列 |
| hidden-source-map | -- | -- | ✅ | 不自动引用 |
| nosources-source-map | -- | -- | ✅ | 无源码内容 |

## 生产环境安全

```yaml
⚠ 错误做法：
  .map 文件公开访问 → 源码完全暴露
  → 任何人都能看到你的完整源代码

✅ 正确做法：
  ① hidden-source-map
    生成 .map 但不在 JS 结尾加 //# sourceMappingURL
    浏览器不会自动加载
    手动上传到 Sentry 等监控平台
  
  ② nosources-source-map
    .map 里不含 sourcesContent → 看不到源码
    只有行列映射信息
  
  ③ 只上传给监控平台
    构建产物的 .map 不部署到 CDN
    只有 Sentry Webpack Plugin 获取

// Sentry Webpack Plugin 配置
new SentryWebpackPlugin({
  include: './dist',
  ignore: ['node_modules'],
  urlPrefix: '~/assets/'
})
// 自动把 .map 上传到 Sentry 服务器
// dist 里不留 .map 文件
```

## 在 Vue 项目中的应用

```js
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: process.env.NODE_ENV === 'production'
      ? 'hidden'  // 生产：生成 .map 但不引用（给 Sentry）
      : true       // 开发：完整 sourcemap
  }
})

// Sentry 接入
import * as Sentry from '@sentry/vue'

Sentry.init({
  app,
  dsn: 'https://xxx@sentry.io/xxx',
  release: 'my-app@1.0.0',
  // 上传 sourcemap 到 Sentry
})
```

## 经典面试题

### 题1：线上排错后如何定位源码？

```
方案：
  sourcemap + Sentry（自动）
  或
  sourcemap + 本地还原：
    保留每次发布的 .map 文件
    线上报错行列号 → 本地用 source-map 库解析
    → 得到源文件路径和行号
```

### 题2：为什么开发和生产用不同的 sourcemap？

```
开发：eval-source-map
  → 快（增量编译）
  → 映射到源码行列
  → 内容在内存中

生产：source-map / hidden-source-map
  → 慢但完整
  → 独立 .map 文件
  → 可选择性上传/隐藏
```