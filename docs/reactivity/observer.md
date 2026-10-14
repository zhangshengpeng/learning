# Observer — 数据劫持

## 核心实现

`Observer` 类负责把普通对象变成响应式对象，是 Vue 响应式系统的起点。

```js
// src/core/observer/index.js

export class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()       // 数组/对象自身的依赖
    def(value, __ob__, this) // 给对象打标记，防止重复观测

    if (Array.isArray(value)) {
      // 数组：重写原型方法
      protoAugment(value, arrayMethods)
      this.observeArray(value)
    } else {
      // 普通对象：遍历属性
      this.walk(value)
    }
  }

  walk(obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i]) // 逐个劫持
    }
  }

  observeArray(items) {
    for (let i = 0; i < items.length; i++) {
      observe(items[i]) // 递归观测数组每项
    }
  }
}
```

## defineReactive — 核心引擎

```js
export function defineReactive(obj, key, val) {
  const dep = new Dep() // ① 每个属性一个专属 Dep

  // ② 递归处理嵌套对象（深度响应式）
  let childOb = observe(val)

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,

    get() {
      // ③ 收集依赖：谁读了我，我就记住谁
      if (Dep.target) {
        dep.depend()         // 当前属性的 Dep 收集
        if (childOb) {
          childOb.dep.depend() // 子对象的 Dep 也收集
        }
      }
      return val
    },

    set(newVal) {
      if (newVal === val) return
      val = newVal
      // ④ 新值也要变成响应式
      childOb = observe(newVal)
      // ⑤ 通知所有订阅者
      dep.notify()
    }
  })
}
```

## observe — 响应式入口函数

`observe` 是将数据变为响应式的统一入口。它不像 `Observer` 类那样暴力地直接 `new`，而是加了层层判断，是一个"智能守门员"。

```js
// src/core/observer/index.js

export function observe(value, shallow, ssrMockReactivity) {
  // ① 已经观测过？直接返回已有的 __ob__
  if (value && hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    return value.__ob__
  }

  // ② 满足以下所有条件才创建 Observer 实例
  if (
    shouldObserve &&                              // 全局开关
    !isServerRendering() &&                       // 非服务端渲染
    (isArray(value) || isPlainObject(value)) &&   // 是数组或纯对象
    Object.isExtensible(value) &&                 // 对象可扩展
    !value.__v_skip &&                             // 非跳过标记
    !isRef(value) &&                               // 非 ref 对象
    !(value instanceof VNode)                     // 非 VNode
  ) {
    return new Observer(value, shallow, ssrMockReactivity)
  }
  // ③ 不满足条件 → 返回 undefined，此对象不会被响应式化
}
```

### 调用链路

```
new Vue({ data: { a: 1, b: { c: 2 } } })
  │
  └─► observe(data)          // 入口：观测 data 根对象
        │
        └─► new Observer(data)
              │
              ├─► walk(data)                // 遍历 { a, b }
              │     └─► defineReactive(data, 'a', 1)
              │     └─► defineReactive(data, 'b', { c: 2 })
              │           │
              │           └─► observe({ c: 2 })  // 递归！深度观测
              │                 │
              │                 └─► 已有 __ob__？ → 直接返回 ✅
              │                     └─► 否则 new Observer(...)
              │
              └─► def(data, '__ob__', observerInstance)
```

### 关键设计解析

**1. `__ob__` 防重复观测**

```js
// 第一次观测 → 创建 Observer 并打上 __ob__ 标记
observe(obj)   // → new Observer(obj)，obj.__ob__ = observer

// 后续调用 → 直接命中 __ob__ 检查，不再重复创建
observe(obj)   // → return obj.__ob__  ✅
observe(obj.a) // → return obj.a.__ob__ ✅
```

**2. `shouldObserve` 全局开关**

```js
// 某些场景下需要暂停观测（如 props 初始化时避免重复触发）
export function toggleObserving(value) {
  shouldObserve = value
}

// 使用场景：初始化 props 时
toggleObserving(false)
const props = initProps(vm) // 不触发依赖收集
toggleObserving(true)
```

**3. `Object.isExtensible` 检查**

被 `Object.freeze()`、`Object.seal()`、`Object.preventExtensions()` 处理过的对象不可扩展，直接跳过：

```js
const frozen = Object.freeze({ a: 1 })
observe(frozen) // → undefined，不观测
```

**4. `isRef` 和 `isVNode` 过滤**

ref 对象自身不可观测（只能通过 `.value` 访问），VNode 是内部数据结构也不应被观测，这两个检查防止误观测内部对象。

---

## 设计要点

### 1. 闭包保存值

要理解这一点的关键是把**劫持前**和**劫持后**区分开来看。

**劫持前**，`defineReactive(obj, key, val)` 被调用时，第三个参数 `val` 就是这个属性当前的值。此时 `obj[key]` 和 `val` 是同一个值，还没有任何问题。

**劫持后**，`Object.defineProperty` 在 `obj` 上安装了 getter/setter。从这一刻起，`obj[key]` 的含义彻底变了——它不再是一个普通属性取值，而是**触发 getter 函数**。

这就是闭包产生的地方：getter 和 setter 函数被定义在 `defineReactive` 函数体内，它们可以访问外层函数的局部变量 `val`，而 `val` 和 `obj[key]` 从此分道扬镳。

**什么是闭包？**

> 闭包 = 函数 + 函数定义时所在的外部词法作用域

当一个函数"记住"并能够访问它定义时所处的外部作用域中的变量，即使这个外部函数已经执行完毕，这种现象就叫**闭包**。

**闭包形成的两个条件：**

| 条件 | 说明 | 本例中的对应 |
|:----|:-----|:-----------|
| ① **函数嵌套** | 内部函数定义在外部函数体内 | getter/setter 定义在 `defineReactive` 内部 |
| ② **内部函数引用外部变量** | 内部函数使用了外部函数的局部变量 | getter 和 setter 都引用了 `val` |

只要满足这两个条件，JS 引擎就不会在外部函数执行完后回收它的局部变量——因为内部函数还"抓着"它们不放。

**闭包的生命周期：**

```
defineReactive(obj, 'name', 'Alice')  被调用
  │
  ├─► 执行栈上创建 defineReactive 的执行上下文
  │      ├─► obj: { name: 'Alice' }
  │      ├─► key: 'name'
  │      └─► val: 'Alice'          ← 普通局部变量，正常情况函数返回后就该被 GC 回收
  │
  ├─► Object.defineProperty 安装 getter/setter
  │      └─► getter/setter 内部引用了 val  ← 条件②满足！
  │
  └─► defineReactive 执行完毕，返回
         │
         ├─► ❌ 普通变量：val 本该被垃圾回收
         │
         └─► ✅ 闭包保护：因为 getter/setter 还活着（挂在 obj 上），
               它们引用的 val 不能回收，被永久保存在闭包作用域中
```

```js
function defineReactive(obj, key, val) {
  // ⬆ val 是 defineReactive 的局部变量
  // 此时 val 的初始值 = obj[key]，但 val 是独立的内存空间

  Object.defineProperty(obj, key, {
    get() {
      // ✅ val：访问的是外层函数作用域里的局部变量
      //    和 obj[key] 没有任何关系，不会触发 getter
      return val
    },
    set(newVal) {
      // ✅ 同样，修改的是局部变量 val，不会触发 setter
      val = newVal
    }
  })
}
```

**为什么 `obj[key]` 会死循环？**

劫持安装完成后，`obj[key]` 不再是简单的属性读取，而是**调用你刚刚定义的 getter 函数**。在 getter 里再写 `obj[key]`，就是在 getter 里调用自己：

```js
get() {
  return obj[key]     // ❌ obj[key] → 触发 getter → 又执行 get() → 又 return obj[key] → ...
}                     //    无限递归，直到栈溢出 Maximum call stack size exceeded
```

**内存模型对比：**

```
劫持前:
  obj.key ──► 内存值 "hello"
  val     ──► 内存值 "hello"     // 两个通道，指向同一值

劫持后:
  obj.key ──► getter/setter ──► 不再直接读写内存值
  val     ──► 内存值 "hello"     // 闭包捕获，成了唯一的真实存储

读取流程:
  obj.key  →  触发 getter  →  return val  →  拿到 "hello"
  (走劫持通道)               (走闭包通道)
```

### 2. 深度观测是立即的

`observe(val)` 递归调用，初始化时就遍历整个深层对象。这是 Vue 2 的一个性能开销点——即使某些深层属性永远不会被用到。

### 3. `__ob__` 标记

```js
function def(obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable, // 不可枚举，防止无限循环
    writable: true,
    configurable: true
  })
}
```

`__ob__` 标记不可枚举，所以在 `for...in` 和 `Object.keys` 中不出现。Vue 通过它：
- 判断对象是否已经被观测
- 获取对象对应的 Observer 实例
- 区分 Vue 实例和普通对象

### 4. 局限性

```js
// ❌ 这些操作 Vue 2 无法检测
this.obj.newProp = "hello"    // 新增属性
delete this.obj.name           // 删除属性
this.arr[3] = "new"            // 数组索引赋值
this.arr.length = 0            // 修改数组长度

// ✅ 解决方案
this.$set(this.obj, "newProp", "hello")
this.$delete(this.obj, "name")
this.$set(this.arr, 3, "new")
this.arr.splice(0) // 用 splice 清空数组
```