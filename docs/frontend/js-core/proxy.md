# Proxy & Reflect

> Vue 3 响应式系统的基石。理解 Proxy 才能理解 Vue 3 为什么能监听数组索引和对象新增属性。

## 为什么 Vue 3 放弃了 Object.defineProperty？

```js
// Vue 2 的方式：Object.defineProperty
const obj = {}
Object.defineProperty(obj, 'count', {
  get() { return val },
  set(newVal) { /* 通知更新 */ }
})

// 缺陷：
// ① 无法监听属性新增
obj.newProp = 1      // ✗ 拦截不到
Vue.set(obj, 'newProp', 1)  // 必须用 API 打补丁

// ② 无法监听数组索引变更
arr[0] = 'new value'  // ✗ 拦截不到
// Vue.set(arr, 0, ...) // 手动操作

// ③ 无法监听 delete
delete obj.count      // ✗ 拦截不到

// ④ 初始化时递归遍历对象 → 性能开销大
// 深层对象：obj.a.b.c = 1 → defineProperty 时就要递归到最深层
```

## Proxy 基础

```js
// Vue 3 的方式
const obj = new Proxy(target, {
  get(target, key, receiver) { /* 拦截读取 */ },
  set(target, key, value, receiver) { /* 拦截赋值 */ },
  deleteProperty(target, key) { /* 拦截删除 */ },
  has(target, key) { /* 拦截 in */ },
})
```

### 13 种拦截操作

| 拦截器 | 对应操作 | 场景 |
|:------|:-------|:----|
| `get` | `obj.prop` | 读取属性 |
| `set` | `obj.prop = val` | 设置属性 |
| `deleteProperty` | `delete obj.prop` | 删除属性 |
| `has` | `prop in obj` | `in` 运算符 |
| `ownKeys` | `Object.keys(obj)` | 遍历属性 |
| `getPrototypeOf` | `Object.getPrototypeOf(obj)` | 获取原型 |
| `setPrototypeOf` | `Object.setPrototypeOf(obj, proto)` | 设置原型 |
| `isExtensible` | `Object.isExtensible(obj)` | 可否扩展 |
| `preventExtensions` | `Object.preventExtensions(obj)` | 阻止扩展 |
| `getOwnPropertyDescriptor` | `Object.getOwnPropertyDescriptor(obj, prop)` | 属性描述符 |
| `defineProperty` | `Object.defineProperty(obj, prop, desc)` | 定义属性 |
| `apply` | `fn()` | 函数调用 |
| `construct` | `new Fn()` | new 调用 |

### get 陷阱的核心细节

```js
const obj = reactive({ a: { b: 1 } })

// Vue 3 的 get 陷阱：
get(target, key, receiver) {
  const res = Reflect.get(target, key, receiver)

  // ① 依赖收集
  track(target, key)

  // ② 惰性深度代理：只在读取深层对象时才代理
  if (typeof res === 'object' && res !== null) {
    return reactive(res)  // ← 只有访问时才创建子代理
  }
  return res
}
// 与 Vue 2 的预递归对比：大数据对象性能提升显著
```

### set 陷阱

```js
set(target, key, value, receiver) {
  const oldValue = target[key]
  const hadKey = Object.prototype.hasOwnProperty.call(target, key)
  const result = Reflect.set(target, key, value, receiver)

  if (!hadKey) {
    trigger(target, 'add', key)   // 新增属性 → 触发更新
  } else if (value !== oldValue) {
    trigger(target, 'set', key)   // 修改属性 → 触发更新
  }
  return result
}
```

## Reflect 的作用

### 为什么 Proxy 里都用 Reflect？

```js
const parent = {
  name: 'parent',
  get value() { return this.name }
}

const child = {
  name: 'child',
  __proto__: parent
}

const proxy = new Proxy(child, {
  get(target, key) {
    // ❌ 错误：target[key] → this = child
    return target[key]
  }
})

const proxy2 = new Proxy(child, {
  get(target, key, receiver) {
    // ✅ 正确：Reflect.get → this = proxy2（receiver）
    return Reflect.get(target, key, receiver)
  }
})

proxy.value   // 'child'  ← 碰巧也对
proxy2.value  // 'child'  ← 也是对的

// 但当访问继承的 getter 时：
// parent.value 的 getter 里 this.name
// 用 target[key]：this = child ✓
// 但更复杂的继承场景：Reflect 把 receiver 传下去，保证整个原型链的 this 指向一致
```

### 为什么用 receiver？

```js
// 假设 child 的 getter 依赖原型链上的方法：
const obj = {
  _name: 'vue',
  get name() {
    return this._name  // this 应该始终指向代理
  }
}

const p = new Proxy(obj, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver)
    // receiver 确保 this 指向 p 而非 obj
  }
})
```

## 在 Vue 3 响应式系统中的体现

### 完整的 reactive 实现骨架

```js
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      if (key === '__v_isReactive') return true
      const res = Reflect.get(target, key, receiver)

      // 依赖收集（如果当前有 activeEffect）
      track(target, key)

      // 惰性代理：深层对象等到被读取时才包装
      if (typeof res === 'object' && res !== null) {
        return reactive(res)
      }
      return res
    },

    set(target, key, value, receiver) {
      const oldValue = target[key]
      const result = Reflect.set(target, key, value, receiver)

      // 值变化时才触发
      if (oldValue !== value) {
        trigger(target, key)
      }
      return result
    },

    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const result = Reflect.deleteProperty(target, key)

      if (hadKey) {
        trigger(target, 'delete', key)
      }
      return result
    },

    has(target, key) {
      const result = Reflect.has(target, key)
      track(target, key)  // 'in' 运算符也要收集依赖
      return result
    },

    ownKeys(target) {
      track(target, 'iterate')  // Object.keys() 也要收集
      return Reflect.ownKeys(target)
    }
  })
}
```

### 为什么数组也能被监听了？

```js
const arr = reactive([1, 2, 3])

arr[0] = 10   // Proxy 的 set 陷阱 → 触发更新 ✓
arr.length    // Proxy 的 get 陷阱 → 收集依赖 ✓
arr.push(4)   // set 陷阱捕获索引和 length 变更 → 正确触发 ✓

// Vue 2 用了 Object.defineProperty 劫持不到这些操作
// Vue 3 用 Proxy 一网打尽
```

### shallowReactive 与深度的实现

```js
function shallowReactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      track(target, key)
      // 关键区别：不递归 reactive(res)
      // 只代理第一层，深层对象是原始值
      return res
    },
    // ...set 同上
  })
}

const state = shallowReactive({
  info: { name: 'vue' }
})
state.info.name = 'react'  // ✗ 不会触发更新，因为 info.name 不在代理范围内
state.info = { name: 'react' }  // ✓ 第一层属性，触发更新
```

## Proxy vs defineProperty 对比

| | Object.defineProperty | Proxy |
|:--|:--|:--|
| 劫持范围 | 已有属性的 get/set | 13 种操作全拦截 |
| 新增属性 | ✗ 需 `Vue.set` | ✓ |
| 删除属性 | ✗ 需 `Vue.delete` | ✓ |
| 数组索引 | ✗ | ✓ |
| 数组方法 | 7 个变异方法需要重写 | 天然支持 |
| 对象嵌套 | 一开始就递归 | 惰性代理（访问时才递归） |
| 性能 | 初始化慢，运行时快 | 初始化快，运行时稍慢 |
| 兼容性 | IE9+ | 无法 polyfill，IE 全不支持 |
| Map/Set | 不支持 | 支持 |

## 经典面试题

### 题1：Proxy 的 this 问题

```js
const target = {
  getName() { return this.name },
  name: 'target'
}
const p = new Proxy(target, {})
p.getName()  // 'target' → this 指向 p（不是 target）
// 因为 Reflect 传递了 receiver
```

### 题2：不可配置属性的陷阱

```js
const obj = {}
Object.defineProperty(obj, 'x', {
  value: 1,
  writable: false,
  configurable: false  // 不可配置
})

new Proxy(obj, {
  get() { return 'hacked' }
})
// ✗ TypeError → 不可配置属性不能有冲突的 getter
// Vue 3 源码里也因此判断：configurable 为 false 时不对该 key 代理
```