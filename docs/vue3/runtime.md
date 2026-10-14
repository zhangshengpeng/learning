# Vue 3 运行时优化 & 新组件

## 运行时优化

### 虚拟 DOM 重写

Vue 3 的虚拟 DOM 几乎完全重写，核心变化：

| 方面 | Vue 2 | Vue 3 |
|:----|:-----|:-----|
| diff 策略 | 双端比较 | 双端比较 + Block Tree |
| VNode 创建 | 全量创建 | 静态提升 + 缓存 |
| 组件更新 | `watcher.update()` 入队列 | 带 PatchFlag 靶向更新 |
| 插槽 | 父组件渲染 | 编译为函数，子组件调用 |

### diff 算法优化

```
Vue 2 双端比较：逐个节点对比，4 种策略
Vue 3 双端比较 + 最长递增子序列：减少移动操作
```

**最长递增子序列**用于 `v-for` 场景：

```js
旧：[A, B, C, D, E]
新：[A, C, D, B, E]

// 最长递增子序列：[A, C, D, E]（索引 0,1,2,4）
// 只需要把 B 移到正确位置，而不是重新排列所有节点
```

### Tree Shaking

```js
// Vue 2：全局引入
import Vue from 'vue'
// → 包含所有功能，即使你不用

// Vue 3：按需引入，构建时自动移除未使用代码
import { ref, computed, onMounted } from 'vue'
// → 只打包你实际使用的 API
```

## 新组件

### Fragment（片段）

```html
<!-- Vue 2：必须包裹在单根元素中 -->
<template>
  <div>          <!-- 多余的包裹层 -->
    <p>hello</p>
    <p>world</p>
  </div>
</template>

<!-- Vue 3：支持多根节点（Fragment） -->
<template>
  <p>hello</p>
  <p>world</p>
</template>
```

内部实现：多根节点会被包裹在 `Fragment` VNode 中，`Fragment` 只渲染子节点不产生 DOM。

### Teleport（传送门）

```html
<!-- 将内容渲染到 body 下（适合模态框、通知） -->
<Teleport to="body">
  <div class="modal">
    <p>这是模态框内容</p>
  </div>
</Teleport>
```

### Suspense（异步组件）

```html
<Suspense>
  <template #default>
    <AsyncComponent />
  </template>
  <template #fallback>
    <Loading />
  </template>
</Suspense>
```

`<Suspense>` 等待异步组件加载完成，期间展示 fallback 内容。支持多个异步组件。

```js
// 异步组件定义
const AsyncComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
)
```

## TypeScript 支持

Vue 3 本身用 TypeScript 重写，并提供完善的类型推导：

```html
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref<number>(0)              // 自动推导类型
const doubled = computed(() => count.value * 2)

interface Props {
  title: string
  count?: number
}
const props = defineProps<Props>()         // Props 类型推导

const emit = defineEmits<{
  (e: 'update', value: number): void
}>()
</script>
```

## 自定义渲染器

Vue 3 的 `runtime-core` 是平台无关的，通过创建自定义渲染器可以适配不同平台：

```js
import { createRenderer } from '@vue/runtime-core'

const { createApp } = createRenderer({
  createElement(type) { /* 创建元素 */ },
  setElementText(el, text) { /* 设置文本 */ },
  insert(el, parent) { /* 插入 */ },
  // ... 其他平台方法
})

// 可用于 Canvas、NativeScript、小程序等
```

## 响应式工具函数

```js
import { toRef, toRefs, isRef, unref, readonly, shallowRef } from 'vue'

// toRef：从 reactive 对象中提取一个属性为 ref
const state = reactive({ count: 1 })
const countRef = toRef(state, 'count')

// toRefs：将所有属性转换为 ref
const { count } = toRefs(state)    // 解构后不丢失响应式

// isRef / unref
isRef(count)        // true
unref(count)        // 1（等同于 count.value，但非 ref 时透传）

// readonly：创建只读代理
const copy = readonly(state)

// shallowRef / shallowReactive：仅浅层响应式
const obj = shallowRef({ nested: { deep: 1 } })
obj.value.nested.deep = 2  // 不会触发更新
```

## Vapor Mode（实验性）

Vue 团队正在开发 Vapor Mode：编译时直接将模板编译为 DOM 操作，**完全跳过虚拟 DOM**，进一步缩小体积、提升性能。

```js
// 传统：template → render → VNode → DOM
// Vapor：template → DOM 操作直接指令
```

这将是 Vue 3 未来最大的性能突破。