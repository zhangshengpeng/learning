# Composition API

Composition API 是 Vue 3 最重要的新增特性之一，核心动机是**逻辑复用**和**更好的代码组织**。

## 为什么要 Composition API？

### Options API 的问题

```js
// Vue 2 Options API — 一个功能的代码散落在各处
export default {
  data() { return { keyword: '', results: [] } },
  watch: { keyword: 'search' },
  methods: { search() { /*...*/ } },
  mounted() { /* 初始化 */ }
}

// 当功能变多后：
export default {
  data() {
    return {
      keyword: '',       // ← 搜索
      results: [],       // ← 搜索
      isLoading: false,  // ← 搜索
      user: null,        // ← 用户
      permissions: [],   // ← 权限
    }
  },
  methods: {
    search() {},        // ← 搜索
    fetchUser() {},     // ← 用户
    checkAuth() {},     // ← 权限
  }
  // 三个功能的代码交织在一起，难以维护
}
```

### Composition API 的解决

```js
// 按功能组织，逻辑内聚
import { useSearch, useUser, useAuth } from './composables'

export default {
  setup() {
    const { keyword, results, search } = useSearch()
    const { user, fetchUser } = useUser()
    const { permissions, checkAuth } = useAuth()
    return { keyword, results, search, user, permissions }
  }
}
```

## setup 函数

```html
<template>
  <div>{{ count }}</div>
  <button @click="increment">+1</button>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const increment = () => count.value++

    onMounted(() => {
      console.log('mounted!')
    })

    return { count, increment }  // 暴露给模板
  }
}
</script>
```

### `<script setup>` 语法糖（推荐）

```html
<script setup>
import { ref, onMounted } from 'vue'

const count = ref(0)
const increment = () => count.value++

onMounted(() => {
  console.log('mounted!')
})
// 无需 return，自动暴露
</script>
```

## reactive vs ref

| | reactive() | ref() |
|:--|:----------|:-----|
| 参数类型 | 仅对象 | 任意类型 |
| 访问方式 | 直接 `.property` | 需要 `.value` |
| 模板中 | 直接使用 | 自动解包 `.value` |
| 解构 | ❌ 丢失响应式 | ✅ 配合 toRefs 不丢失 |
| 整体替换 | 会丢失响应式 | ✅ `count.value = newVal` |

```js
// reactive 解构问题
const state = reactive({ a: 1, b: 2 })
const { a, b } = state         // ❌ a、b 变成普通值

// 解决方案：toRefs
const { a, b } = toRefs(state) // ✅ a、b 是 ref

// 或者直接用 ref
const a = ref(1)               // ✅ 天生可以独立传递
```

## computed

```js
import { computed, ref } from 'vue'

const count = ref(0)

// 只读
const doubled = computed(() => count.value * 2)

// 可写
const doubledWritable = computed({
  get: () => count.value * 2,
  set: (val) => { count.value = val / 2 }
})
```

## watch vs watchEffect

```js
import { watch, watchEffect, ref } from 'vue'

const count = ref(0)
const name = ref('vue')

// watch：明确指定监听源，可获取新旧值
watch(count, (newVal, oldVal) => {
  console.log(`${oldVal} → ${newVal}`)
})
watch([count, name], ([newCount, newName]) => {})

// watchEffect：自动追踪依赖，立即执行
watchEffect(() => {
  console.log(count.value, name.value)  // count 或 name 变了都执行
})

// 深层监听
watch(() => reactiveObj, (newVal) => {}, { deep: true })
```

| | watch | watchEffect |
|:--|:----|:----------|
| 监听源 | 显式指定 | 自动追踪 |
| 旧值 | ✅ newVal/oldVal | ❌ |
| 立即执行 | `immediate: true` | ✅ 默认立即 |
| 停止 | 返回 `stop` 函数 | 返回 `stop` 函数 |

## 生命周期钩子

```js
// Composition API                  // Options API
import { onBeforeMount }    from 'vue'  // beforeMount
import { onMounted }        from 'vue'  // mounted
import { onBeforeUpdate }   from 'vue'  // beforeUpdate
import { onUpdated }        from 'vue'  // updated
import { onBeforeUnmount }  from 'vue'  // beforeDestroy
import { onUnmounted }      from 'vue'  // destroyed
import { onActivated }      from 'vue'  // activated
import { onDeactivated }    from 'vue'  // deactivated
```

没有 `beforeCreate` 和 `created`，因为 `setup()` 本身就等价于这两个钩子的时机。

## 逻辑复用 — Composables

这是 Composition API 最大的优势。把可复用的逻辑抽离为"组合函数"：

```js
// composables/useMouse.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(e) {
    x.value = e.pageX
    y.value = e.pageY
  }

  onMounted(() => document.addEventListener('mousemove', update))
  onUnmounted(() => document.removeEventListener('mousemove', update))

  return { x, y }
}

// 使用
const { x, y } = useMouse()
```

### vs Vue 2 Mixins

| Mixins | Composables |
|:------|:----------|
| 来源不清晰 | `import` 显式引入 |
| 命名冲突 | 解构重命名 |
| 隐式依赖 | 显式参数传入 |
| 不支持 TS 类型推导 | ✅ 完美 TS 支持 |

## 依赖注入 — provide/inject

```js
// 祖先组件
import { provide, ref } from 'vue'
const theme = ref('dark')
provide('theme', theme)

// 后代组件
import { inject } from 'vue'
const theme = inject('theme', 'light')  // 默认值 'light'
```

与 Vue 2 的区别：支持**响应式**、TS 类型、`readonly` 单向约束。