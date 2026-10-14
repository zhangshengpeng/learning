# 声明文件 & tsconfig

## .d.ts 声明文件

### 作用

```
.ts  → 可执行的 TypeScript 代码 → 编译为 .js
.d.ts → 纯类型声明 → 不编译为 .js（只给 IDE 和 tsc 看）

.d.ts 是"类型说明书"，告诉 TS：
  "这个 JS 模块暴露了这些方法，类型是这样的"
```

### 全局类型声明

```ts
// types/global.d.ts

// 扩展 window
declare global {
  interface Window {
    __APP_VERSION__: string
    __BUILD_TIME__: string
  }
}

// 声明全局变量
declare const APP_NAME: string

// 声明全局函数
declare function trackEvent(event: string, data: Record<string, any>): void

export {}  // 确保这是一个模块
```

### 声明模块

```ts
// 声明没有类型的第三方包
declare module 'lodash' {
  export function debounce(fn: Function, wait: number): Function
  export function throttle(fn: Function, wait: number): Function
}

// 声明 .vue 文件
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 声明资源文件
declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
```

### 模块扩展

```ts
// 给 vue-router 的 meta 加类型
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    requiresAuth?: boolean
    permissions?: string[]
  }
}

// 给 @vue/runtime-core 加自定义全局属性
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $http: typeof axios
    $message: (msg: string) => void
  }
}
```

### declare vs export

```ts
// 环境声明（declare）：告诉 TS 这些变量已经存在（运行时有）
declare const jQuery: any
// → TS 不会编译这行，但允许你使用 jQuery

// 模块声明（declare module）：告诉 TS 这个模块的类型
declare module 'my-lib' {
  export const version: string
  export function init(): void
}
```

---

## tsconfig.json 核心配置

```jsonc
{
  "compilerOptions": {
    // 目标版本
    "target": "ESNext",
    // 模块系统
    "module": "ESNext",
    // 模块解析策略
    "moduleResolution": "bundler",  // Vue 3 推荐
    // 严格模式
    "strict": true,
    // JSX
    "jsx": "preserve",
    // 路径别名
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    // 类型声明文件
    "types": ["vite/client"],
    // 排除
    "skipLibCheck": true,
    // 库（API 声明）
    "lib": ["ESNext", "DOM", "DOM.Iterable"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.d.ts",
    "src/**/*.vue",
    "env.d.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

### strict 拆解

```jsonc
{
  "strict": true,  
  // 等价于以下 7 项全部开启：
  "noImplicitAny": true,           // 不允许隐式 any
  "strictNullChecks": true,        // null/undefined 严格检查
  "strictFunctionTypes": true,     // 函数类型严格检查
  "strictBindCallApply": true,     // bind/call/apply 严格检查
  "strictPropertyInitialization": true, // 类属性必须初始化
  "noImplicitThis": true,          // this 不允许隐式 any
  "alwaysStrict": true             // 始终严格模式
}
```

### moduleResolution 常用值

```ts
// "node"：传统 Node.js 解析方式（查找 node_modules、package.json main）
// "bundler"：现代打包工具行为（支持 package.json exports，不要扩展名）
//   → Vue 3 / Vite 推荐 "bundler"，因为 ESM 不需要扩展名

import utils from '@/utils'       // bundler 模式可省略扩展名
import utils from '@/utils/index.js'  // node 模式需要显式扩展名
```

### references（monorepo 项目引用）

```jsonc
{
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/vue" }
  ]
}
// 子项目的 tsconfig 设置 "composite": true
// tsc --build 一次性编译所有子项目
```

---

## Vue 项目 TypeScript 最佳实践

```ts
// 1. 使用 interface 定义数据类型（可被 extend）
interface UserInfo {
  id: number
  name: string
  email: string
}

// 2. 使用 type 定义联合/工具类型
type ApiResponse<T> = {
  code: number
  data: T
  message: string
}

// 3. 使用 enum 定义常量集合（或 as const）
enum Status { Active = 1, Inactive = 0 }

// 4. 使用泛型提高复用
function request<T>(url: string): Promise<ApiResponse<T>> {
  return fetch(url).then(res => res.json())
}

// 5. any 可以，但要收窄
async function fetchUser(): Promise<UserInfo> {
  const raw = await request<any>('/api/user')
  return raw.data as UserInfo  // 收窄
}
```