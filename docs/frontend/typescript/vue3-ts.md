# Vue 3 中的 TypeScript

## defineProps 的多种写法

```ts
<script setup lang="ts">
// 写法一：运行时声明 + 泛型分离
const props = defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 0 }
})

// 写法二：纯类型声明（TS 类型 + 运行时校验分离）
interface Props {
  title: string
  count?: number
}
const props = withDefaults(defineProps<Props>(), {
  count: 0
})

// 写法三：直接泛型返回（Vue 3.3+）
const props = defineProps<{
  title: string
  count?: number
}>()
</script>
```

### 为什么需要 withDefaults？

```ts
// defineProps 泛型中的 ? 只影响 TS 类型，不影响运行时行为
// withDefaults 为可选属性提供运行时默认值

interface Props {
  count?: number
}

// 方案 A：TS 层面可选，但运行时 count 是 undefined
const props = defineProps<Props>()
props.count  // number | undefined

// 方案 B：提供默认值 → 解构后一定是 number
const props = withDefaults(defineProps<Props>(), {
  count: 0
})
props.count  // number
```

## defineEmits

```ts
<script setup lang="ts">
// 写法一：TS 泛型标注（Vue 3.3+）
const emit = defineEmits<{
  update: [value: string]
  delete: [id: number, name: string]
}>()

emit('update', 'hello')
emit('delete', 1, 'item')

// 写法二：旧的数组写法（有 TS 提示但不够精确）
const emit = defineEmits(['update', 'delete'])

// 写法三：带校验（运行时 + 类型）
const emit = defineEmits<{
  click: [x: number, y: number]
}>()
</script>
```

## ref / reactive 的类型

```ts
import { ref, reactive, computed } from 'vue'

// ref：自动推断
const count = ref(0)            // Ref<number>
const name = ref('')            // Ref<string>
const list = ref<string[]>([])  // 泛型标注

// reactive
interface User {
  name: string
  age: number
}
const user = reactive<User>({ name: 'Alice', age: 25 })

// computed
const double = computed(() => count.value * 2)  // ComputedRef<number>

// 显式返回类型
const message = computed<string>(() => {
  if (count.value > 10) return 'large'
  return 'small'
})
```

## provide / inject 类型安全

```ts
// @/types/injection-keys.ts
import type { InjectionKey, Ref } from 'vue'

export const countKey: InjectionKey<Ref<number>> = Symbol('count')
export const userKey: InjectionKey<User> = Symbol('user')

// Provider
<script setup lang="ts">
import { provide } from 'vue'
import { countKey } from './injection-keys'

provide(countKey, ref(0))
</script>

// Consumer
<script setup lang="ts">
import { inject } from 'vue'
import { countKey } from './injection-keys'

const count = inject(countKey)  // Ref<number> | undefined
const count2 = inject(countKey, ref(0)) // Ref<number>（有默认值）
</script>
```

## Template Ref

```ts
<script setup lang="ts">
import { ref } from 'vue'

// 自动推断组件实例类型
const el = ref<HTMLDivElement>()
// <div ref="el"> → el.value: HTMLDivElement | undefined

// 子组件类型
import MyModal from './MyModal.vue'
const modal = ref<InstanceType<typeof MyModal>>()
// <MyModal ref="modal"> → modal.value 有完整类型

// 访问 DOM 需判空
const handleClick = () => {
  el.value?.focus()  // ?. 安全访问
  if (el.value) {
    el.value.scrollTop = 0  // 收窄后直接访问
  }
}
</script>
```

## 事件处理器类型

```ts
<template>
  <input
    :value="text"
    @input="handleInput"
    @keydown="handleKeydown"
  />
</template>

<script setup lang="ts">
const text = ref('')

// 正确的事件类型
const handleInput = (e: Event) => {
  text.value = (e.target as HTMLInputElement).value
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    // ...
  }
}
</script>
```

## 组件暴露的类型（defineExpose）

```ts
// Child.vue
<script setup lang="ts">
const open = () => { /* ... */ }
const close = () => { /* ... */ }

defineExpose({ open, close })
</script>

// Parent.vue
<script setup lang="ts">
import { ref } from 'vue'
import Child from './Child.vue'

// 获取子组件暴露的类型
const childRef = ref<InstanceType<typeof Child>>()

const handleOpen = () => {
  childRef.value?.open()  // 完整的类型提示 + 安全访问
}
</script>
```

## Composable 类型标注

```ts
// composables/usePagination.ts
interface PaginationOptions {
  pageSize?: number
  initialPage?: number
}

export function usePagination<T>(
  fetchFn: (page: number, size: number) => Promise<{ list: T[]; total: number }>,
  options: PaginationOptions = {}
) {
  const page = ref(options.initialPage ?? 1)
  const pageSize = ref(options.pageSize ?? 10)
  const list = ref<T[]>([])  // 这里的 T 让返回数据有类型
  const total = ref(0)
  const loading = ref(false)

  const fetchData = async () => {
    loading.value = true
    try {
      const res = await fetchFn(page.value, pageSize.value)
      list.value = res.list
      total.value = res.total
    } finally {
      loading.value = false
    }
  }

  return { page, pageSize, list, total, loading, fetchData }
}

// 使用时：
const { list, fetchData } = usePagination<User>(api.getUsers)
// list 自动推断为 Ref<User[]> ✓
```