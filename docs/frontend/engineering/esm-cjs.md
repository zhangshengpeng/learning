# ESM vs CommonJS

## 静态 vs 动态

```js
// CommonJS：动态（运行时）
if (condition) {
  const module = require('./module-a')  // 条件加载
}
const name = 'module'
require(`./${name}`)  // 动态路径

// ESM：静态（编译时）
import module from './module-a'
// import(`./${name}`)  // 动态 import（特殊形式，返回 Promise）
// 顶层 import 不能放在条件/循环里
```

## 导出方式差异

```js
// CommonJS：导出的是值的拷贝
// module-a.js
let count = 0
module.exports = {
  count,
  increment() { count++ }
}

// index.js
const { count, increment } = require('./module-a')
console.log(count)  // 0
increment()
console.log(count)  // 0  ← 还是 0！因为 count 是值的拷贝

// ESM：导出的是值的引用（活绑定）
// module-a.mjs
export let count = 0
export function increment() { count++ }

// index.mjs
import { count, increment } from './module-a.mjs'
console.log(count)  // 0
increment()
console.log(count)  // 1  ← 变了！
```

### 活绑定

```js
// ESM 的 import 是"只读活绑定"
import { count } from './module.mjs'
count = 1  // ✗ TypeError: Assignment to constant variable
// 只能读，不能写。如果模块内部改了，这里会跟着变
```

## 循环依赖处理

```js
// CommonJS：可能拿到不完整的导出
// a.js
const b = require('./b')
module.exports = { done: true, b }

// b.js
const a = require('./a')
module.exports = { fromB: true, a: a }
// a 此时只导出了已执行到的部分 → 可能 undefined

// ESM：会正确处理循环依赖
// 编译时已经确定了导出关系
// 即使循环引用，也能拿到最终值（因为有活绑定）
```

## Tree Shaking 支持

```yaml
CommonJS:
  → 动态加载 → 构建工具无法静态分析
  → 不能 tree-shake
  → require('lodash') → 全部打包

ESM:
  → 静态 import/export → 构建工具可以分析
  → 支持 tree-shake
  → import { debounce } from 'lodash-es' → 只有 debounce 打包

这就是为什么打包优化必须用 ESM
```

## 互操作

```js
// Node.js package.json
{
  "type": "module"  // 告诉 Node.js 该项目是 ESM
}

// .mjs = 始终作为 ESM
// .cjs = 始终作为 CommonJS

// 工具（esbuild、Rollup、Webpack）自动处理互转
// import CJS module from ESM:
import axios from 'axios'  // axios 是 CJS，工具自动处理

// require ESM from CJS:
const mod = await import('./esm-module.mjs')
```

## 对比总结

| | CommonJS | ESM |
|:--|:--|:--|
| 加载时机 | 运行时（同步） | 编译时（静态） |
| 导出 | 值拷贝 | 活绑定（只读引用） |
| this | 指向 modules.exports | undefined |
| require/import | `require()` 函数 | `import` 声明 / `import()` 动态 |
| 条件加载 | 支持 | 仅 `import()` 支持 |
| Tree Shaking | ❌ | ✅ |
| 环境 | Node.js 原生 | 浏览器 + Node.js |
| 循环依赖 | 可能出问题 | 正确处理 |

## 在 Vue 项目中的体现

```js
// Vue 3 源码本身使用 ESM
// 构建工具（Vite/Rollup）用 ESM 做 Tree Shaking

// 包引用对比：
import { ref, computed } from 'vue'
// 只有 ref 和 computed 被打包 → Tree Shaking

// 如果你写 CJS：
const { ref, computed } = require('vue')
// 整个 vue 被打包 → 体积大很多

// Vite 对 CJS 依赖做预构建：
// node_modules 里的 CJS → esbuild → ESM → 浏览器可用
```