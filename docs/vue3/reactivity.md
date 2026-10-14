# Vue 3 响应式系统 — Proxy

Vue 3 用 **Proxy** 替代 `Object.defineProperty`，彻底解决了 Vue 2 响应式的所有痛点。响应式模块已独立为 `@vue/reactivity` 包，可脱离 Vue 单独使用。

## 核心 API

```js
import { reactive, ref, computed, watch, effect } from 'vue'

const state = reactive({ count: 0 })   // 对象响应式
const count = ref(0)                    // 基本类型响应式
const doubled = computed(() => count.value * 2)  // 计算属性
watch(count, (newVal, oldVal) => {})    // 侦听器
```

## Proxy vs Object.defineProperty

| | Vue 2 (`defineProperty`) | Vue 3 (`Proxy`) |
|:--|:----|:-----|
| 劫持对象 | 遍历每个属性，逐个劫持 | 代理整个对象 |
| 新增属性 | ❌ 检测不到，需要 `$set` | ✅ `Proxy` 天然支持 |
| 删除属性 | ❌ 检测不到，需要 `$delete` | ✅ `deleteProperty` 陷阱 |
| 数组索引 | ❌ 监听不到 `arr[0] = x` | ✅ supports |
| 数组 length | ❌ 监听不到 `arr.length = 0` | ✅ supports |
| 性能 | 初始化递归遍历所有属性 | **惰性代理**：访问时递归 |
| 兼容性 | IE9+ | ES6+（不支持 IE） |

## 源码结构

```
packages/reactivity/src/
├── reactive.ts          // reactive()、shallowReactive()、readonly()
├── ref.ts               // ref()、shallowRef()、toRef()、toRefs()
├── baseHandlers.ts      // 普通对象 Proxy handler
├── collectionHandlers.ts// Map/Set/WeakMap/WeakSet handler
├── computed.ts           // computed()
├── effect.ts             // effect()、track()、trigger()
├── dep.ts                // Dep（Set 存储）
└── effectScope.ts        // effectScope()
```

## reactive 原理

```js
// 核心：Proxy 代理
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      track(target, key)                      // ← 依赖收集
      if (isObject(res)) return reactive(res) // ← 惰性深层代理
      return res
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      const result = Reflect.set(target, key, value, receiver)
      if (oldValue !== value) {
        trigger(target, key)                  // ← 派发更新
      }
      return result
    },
    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const result = Reflect.deleteProperty(target, key)
      if (hadKey) {
        trigger(target, key, 'delete')        // ← 删除也触发
      }
      return result
    }
  })
}
```

### 惰性代理（关键区别）

```js
// Vue 2：初始化时一次性递归所有属性
Object.keys(data).forEach(key => defineReactive(data, key, data[key]))
// → 深层嵌套对象会造成初始化开销

// Vue 3：只有被访问到的属性才深层代理
get(target, key) {
  const res = Reflect.get(target, key)
  track(target, key)
  return isObject(res) ? reactive(res) : res  // ← 访问时才转换
}
```

## ref 原理

`ref` 用于基本类型的响应式（也可用于对象）。本质是一个带 `.value` 的 getter/setter 对象：

```js
function ref(value) {
  return {
    get value() {
      track(this, 'value')
      return value   // ← 闭包
    },
    set value(newVal) {
      if (newVal !== value) {
        value = newVal
        trigger(this, 'value')
      }
    }
  }
}

// ref 内部如果是对象，会用 reactive 包装
function ref(value) {
  return createRef(value, false)    // toReactive 转为 reactive
}
```

### ref vs reactive 选择

| ref | reactive |
|:---|:--------|
| 基本类型 + 对象 | 仅对象（不包括基本类型） |
| `.value` 访问/修改 | 直接访问/修改 |
| 解构不丢失响应式（toRefs） | 解构丢失响应式 |
| 可被 watch 直接监听 | 需要用 getter `() => state.a` |

## track — 依赖收集

```js
// 全局：target → key → dep 的映射
const targetMap = new WeakMap()

function track(target, key) {
  if (!activeEffect) return           // 没有 activeEffect 则忽略

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set())) // ← 每个 key 一个 Set
  }

  dep.add(activeEffect)                // ← 收集当前 effect
}
```

```
targetMap (WeakMap)
  └─ { count: 0, name: 'vue' } (reactive 对象)
       ├─ 'count' → Set [ effect1, effect2 ]   ← dep
       └─ 'name'  → Set [ effect1 ]             ← dep
```

## trigger — 派发更新

```js
function trigger(target, key, type) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)
  if (dep) {
    const effects = [...dep]
    for (const effect of effects) {
      if (effect !== activeEffect) {
        if (effect.scheduler) {
          effect.scheduler()   // ← computed、watch 用调度器
        } else {
          effect.run()         // ← 普通 effect 直接执行
        }
      }
    }
  }
}
```

## effect — 副作用

```js
// Vue 3 中 Dep.target 变为 activeEffect（effect 实例）
function effect(fn) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()     // 首次执行，触发依赖收集
  return _effect
}

class ReactiveEffect {
  run() {
    activeEffect = this
    return this.fn()         // ← 执行 fn，触发 track
  }
}
```

## 设计要点

### 1. 为什么用 WeakMap 存 targetMap？

- **弱引用**：当 reactive 对象不再被引用时，GC 可以自动回收对应的依赖映射
- **避免内存泄漏**：如果用 Map，即使对象被销毁，依赖关系依然存在

### 2. 为什么 trigger 中对 effects 做了一层拷贝？

```js
const effects = [...dep]     // ← 拷贝一份
for (const effect of effects) { ... }
```

防止在 effect 执行过程中，dep 被添加/删除导致无限循环。

### 3. 数组处理变得简单

```js
// Vue 3 中数组直接代理，无需重写方法
const arr = reactive([1, 2, 3])
arr[0] = 10       // ✅ 触发 set 陷阱 → 更新
arr.length = 0    // ✅ 触发 set 陷阱 → 更新

// 但 arr.includes(arr) 需要特殊处理（Proxy 是代理对象，不是原始对象）
```

### 4. Map/Set 的响应式

```js
const map = reactive(new Map())
map.set('key', 'value')  // ✅ collectionHandlers 处理

// collectionHandlers 重写了 get 陷阱
// 对 Map.get/has/forEach、Set.add/delete/has 等单独做 track/trigger
```

## 与 Vue 2 响应式的架构对比

```
Vue 2：
  data → observe() → Observer 类 → walk / observeArray
    → defineReactive(obj, key, val) → 闭包 val
      → Dep (Array subs) 耦合于 Vue 实例

Vue 3：
  data → reactive() / ref() → Proxy
    → track / trigger 纯函数（与 Vue 解耦）
      → WeakMap<target, Map<key, Set<effect>>>
```

Vue 3 响应式是**独立包**，不依赖 Vue 实例，可以在 Node.js 或任何 JS 环境单独使用。