# Vue 3 概述

## Vue 3 的核心升级

Vue 3 于 2020 年 9 月发布，是一次底层重写。两个关键词：**更快**、**更小**。

| 维度 | 升级内容 |
|:----|:--------|
| 响应式 | `Object.defineProperty` → `Proxy` |
| API | Options API + **Composition API** |
| 编译器 | 静态提升、PatchFlag 靶向更新 |
| 运行时 | Block Tree、虚拟 DOM 重写 |
| 架构 | Flow → TypeScript、Monorepo |
| 体积 | Tree-shaking 友好，按需引入 |
| 组件 | Fragment、Teleport、Suspense |
| 生态 | Vite、VueUse、Pinia（取代 Vuex） |

## 源码目录对比

```
Vue 2 (vue2-source/src/)       Vue 3 (vue3-source/packages/)
├── core/                       ├── reactivity/        ← 独立响应式包
│   ├── observer/               ├── runtime-core/      ← 平台无关运行时
│   ├── instance/               ├── runtime-dom/       ← DOM 运行时
│   └── vdom/                   ├── compiler-core/     ← 核心编译器
├── compiler/                   ├── compiler-dom/      ← DOM 编译器
├── platforms/web/              ├── compiler-sfc/      ← SFC 编译器
└── shared/                     └── shared/            ← 工具函数
```

Vue 3 采用 **Monorepo** 架构，每个包可独立发布、独立使用。

## 快速对比

```js
// ========== Vue 2 ==========
new Vue({
  data() {
    return { count: 0 }
  },
  methods: {
    increment() { this.count++ }
  }
})

// ========== Vue 3 ==========
import { createApp, ref } from 'vue'

createApp({
  setup() {
    const count = ref(0)
    const increment = () => count.value++
    return { count, increment }
  }
}).mount('#app')
```

## 学习路线建议

```
Vue 3 学习路径：
1. 响应式系统（Proxy 原理）     ← 最大变化
2. Composition API（setup、ref、reactive）
3. 编译器改进（PatchFlag、静态提升）
4. 运行时优化（Block Tree）
5. 新组件（Teleport、Suspense）
```