# 数组响应式处理

## 为什么数组需要特殊处理

`Object.defineProperty` 可以拦截属性的 get/set，但无法监听数组的索引操作：

```js
let arr = [1, 2, 3]
// defineProperty 可以劫持 arr[0] 的读写
// 但无法劫持 arr.push() 这种原型方法调用
```

Vue 2 的解决方案：**重写数组的 7 个变异方法**。

## 核心实现

```js
// src/core/observer/array.js

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
]

methodsToPatch.forEach(function (method) {
  const original = arrayProto[method]

  def(arrayMethods, method, function mutator(...args) {
    // ① 先执行原方法
    const result = original.apply(this, args)

    // ② 获取 Observer 实例
    const ob = this.__ob__

    // ③ 检查是否有新增元素
    let inserted
    switch (method) {
      case "push":
      case "unshift":
        inserted = args
        break
      case "splice":
        inserted = args.slice(2) // splice(start, deleteCount, ...items)
        break
    }
    // ④ 新增元素也要变成响应式
    if (inserted) ob.observeArray(inserted)

    // ⑤ 手动通知更新
    ob.dep.notify()

    return result
  })
})
```

## 数组如何获取重写的方法

```js
// src/core/observer/index.js

if (Array.isArray(value)) {
  // 将数组的 __proto__ 指向重写后的 arrayMethods
  protoAugment(value, arrayMethods)
  // 或降级方案（不支持 __proto__ 时）逐个复制方法
  // copyAugment(value, arrayMethods, arrayKeys)
  this.observeArray(value) // 递归观测数组每项
}

function protoAugment(target, src) {
  target.__proto__ = src // 修改原型链
}
```

替换后的原型链：

```
arr → arrayMethods → Array.prototype
       ↑ 重写的方法      ↑ 未重写的方法（concat、slice等）
```

## 为什么 concat、slice 不需要处理？

这些方法**不修改原数组**（返回新数组），所以不需要通知更新。

## 仍不支持的操作

```js
// ❌ 这些操作不会触发更新
this.arr[0] = "new"      // 索引赋值
this.arr.length = 0       // 修改长度

// ✅ 替代方案
this.$set(this.arr, 0, "new")
this.arr.splice(0)        // 用 splice 代替直接修改 length
```

## 数组的 dep 放在哪里

数组没有像对象那样每个属性都有 dep。数组的 dep 存在 `Observer` 实例上（`ob.dep`），当调用变异方法时统一通知。

```js
class Observer {
  constructor(value) {
    this.dep = new Dep()  // 数组的依赖存在这里
    // ...
  }
}
```

这也是 `defineReactive` 中为什么对数组不做属性劫持，但会对子对象递归观测。

```js
if (Array.isArray(val)) {
  dep.depend() // 在 get 中收集
  if (childOb) {
    childOb.dep.depend() // 子元素也收集依赖
  }
}
```
