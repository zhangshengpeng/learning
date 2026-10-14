# WeakMap / Map / Set

> 理解 WeakMap 才能理解 Vue 3 为什么用 WeakMap 做 dep 存储。

## Map vs Object

| 特性 | Object | Map |
|:----|:-------|:----|
| 键的类型 | 只能是 String/Symbol | 任意类型（对象、函数、数字...） |
| 键的顺序 | 不保证 | 严格按插入顺序 |
| 大小获取 | `Object.keys().length` | `map.size` |
| 迭代 | 需要 `Object.keys()` 等 | `forEach` / `for...of` / `keys()` / `values()` |
| 性能（频繁增删） | 一般 | 更优 |
| JSON 序列化 | 直接 `JSON.stringify` | 需先转换 |

### 基本使用

```js
const map = new Map()

// 键可以是任意类型
const objKey = { id: 1 }
map.set(objKey, 'value for object')
map.get(objKey)  // 'value for object'

// 链式 set
map.set('a', 1).set('b', 2)

// 迭代
for (const [key, value] of map) { }
map.forEach((value, key) => { })

// Map 转 Object
const obj = Object.fromEntries(map)
```

### Map 在 Vue 3 中的应用

```js
// Vue 3 支持 Map/Set 等集合类型的响应式
const state = reactive({
  map: new Map([['count', 0]])
})
state.map.set('count', state.map.get('count') + 1)  // 触发更新 ✓

// Vue 2 不支持，需要 $set
this.$set(this.map, 'key', value)
```

## WeakMap

### 核心特点

```js
const wm = new WeakMap()

// ① 键必须是对象
wm.set({}, 1)   // ✓
wm.set('str', 1) // ✗ TypeError

// ② 弱引用：键对象不再被其他引用时自动 GC
// ③ 不可枚举：没有 keys() / values() / entries()
// ④ 不可遍历：无 forEach / for...of
// ⑤ 没有 size 属性
```

### 弱引用 vs 强引用

```js
// Map：强引用 → 键对象无法被 GC
let obj = { data: new Array(1000000).fill('x') }
const map = new Map()
map.set(obj, 1)
obj = null  // map 仍持有对象 → GC 不会回收 → 内存泄漏！

// WeakMap：弱引用 → 键对象可以被 GC
let obj = { data: new Array(1000000).fill('x') }
const wm = new WeakMap()
wm.set(obj, 1)
obj = null  // 没有其他引用 → GC 可以回收 → wm 中的键会消失
```

### GC 行为

```js
// WeakMap 的 GC 是不可预测的（取决于引擎）
let obj = {}
const wm = new WeakMap()
wm.set(obj, 'secret')

obj = null  // 此时 wm 中的键可能被 GC
// 但 wm.get(obj) 不可行，因为 obj 已经是 null

// setInterval 里检查：
setInterval(() => {
  // 无法直接检查 wm 里还有没有这个键
  // 因为没有 keys() 方法→ 这就是"弱"的含义
  console.log('GC 可能随时发生')
}, 1000)
```

## Set / WeakSet

```js
const set = new Set()
set.add(1)
set.add(2)
set.add(2) // 重复 → 忽略
set.size   // 2
set.has(1) // true
set.delete(2)

// 数组去重
const unique = [...new Set([1, 2, 2, 3, 3, 3])]  // [1, 2, 3]

// WeakSet：只能存对象，弱引用
const ws = new WeakSet()
ws.add({ id: 1 })  // 只能存对象
```

## 在 Vue 源码中的体现

### Vue 2 中的 Dep 管理

```js
// Vue 2 的 dep 用数组存储 watcher：
let uid = 0
class Dep {
  constructor() {
    this.id = uid++
    this.subs = []  // Watcher[]
  }
  addSub(sub) { this.subs.push(sub) }
  notify() {
    // 遍历通知
    const subs = this.subs.slice()
    for (let i = 0; i < subs.length; i++) {
      subs[i].update()
    }
  }
}
// 没有用 Set，导致：
// → 同一个 Watcher 可能重复加入 subs
// → 需要自己维护 id 去重
// → cleanDeps 比较复杂
```

### Vue 3 用 WeakMap 的原因

```js
// Vue 3: reactive 效果
const targetMap = new WeakMap()
// targetMap: WeakMap<target, Map<key, Set<effect>>>

function track(target, key) {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  dep.add(activeEffect)
}
```

### 为什么选择 WeakMap？

```js
// 假设用 Map<target, deps>：
const targetMap = new Map()
// 当组件卸载、target 被销毁时：
// targetMap 仍持有 target 引用 → target 无法 GC → 内存泄漏
// 需要手动清理 targetMap.delete(target)

// 用 WeakMap 时：
const targetMap = new WeakMap()
// target 销毁 → WeakMap 中的键自动 GC → 对应的 depsMap 也消失
// 完全不用手动清理！

// 这就是 WeakMap 在 Vue 3 中的核心价值：
// 自动内存管理，避免响应式系统内存泄漏
```

### Vue 3 的完整响应式存储结构

```
WeakMap
  key: { count: 1, name: 'vue' }  ← 被 reactive 的原始对象（弱引用）
  value: Map {
    'count' → Set { effectA, effectB }
    'name'  → Set { effectB }
  }

当原始对象 { count: 1 } 不再被任何地方引用时：
  → WeakMap 的键被 GC
  → 对应的 Map 和 Set 也失去引用
  → 连锁 GC
  → 零内存泄漏
```

## 经典面试题

### 题1：Map 和 Object 的选择

| 场景 | 推荐 | 原因 |
|:----|:----|:-----|
| key 是字符串，JSON 序列化 | Object | 直接 `JSON.stringify` |
| key 是任意类型 | Map | Object 只能字符串 key |
| 频繁增删 | Map | 更优的增删性能 |
| 需要顺序 | Map | 严格插入顺序 |
| 需要存储元数据（关联对象） | WeakMap | 自动 GC 防泄漏 |

### 题2：WeakMap 的应用场景

```js
// 1. 存储 DOM 节点的关联数据
const nodeData = new WeakMap()
// 节点被删除 → 关联数据自动 GC

// 2. 私有属性
const privateData = new WeakMap()
class MyClass {
  constructor() {
    privateData.set(this, { secret: 'value' })
  }
  getSecret() {
    return privateData.get(this).secret
  }
}
// 外部无法访问 privateData，但实例销毁时数据自动回收
```