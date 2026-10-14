# 闭包

> Vue 中 defineReactive 的 val、computed 的缓存、$nextTick 的回调，本质都是闭包。

## 什么是闭包？

**闭包 = 函数 + 该函数能访问的外部词法作用域。**

MDN 定义：闭包是**函数和对其周围状态的引用捆绑在一起**的组合。

```js
function outer() {
  let count = 0          // 外部作用域的变量
  return function inner() {
    count++              // inner 引用了 outer 的 count
    console.log(count)
  }
}

const fn = outer()
fn()  // 1  ← outer 已经执行完了，但 count 还活着
fn()  // 2
```

### 为什么 outer 执行完了 count 还在？

```
outer 调用：
  创建执行上下文 → 声明 count = 0 → 返回 inner → outer 执行结束
                                                        ↓
  通常 inner 没人引用的话，outer 的上下文会被 GC 回收
  但 fn = outer() 意味着 inner 被全局变量 fn 引用
  inner 内部引用了 count → JS 引擎判定 count 仍被使用 → 不回收
  → 闭包形成
```

## 闭包形成的两个条件

| 条件 | 含义 | 本例对应 |
|:----|:----|:-------|
| ① 函数嵌套 | 一个函数定义在另一个函数内部 | `inner` 定义在 `outer` 内部 |
| ② 内部函数引用外部变量 | 内部函数使用了外部函数的局部变量 | `inner` 使用了 `count` |

这两个条件缺一不可：

```js
// 缺条件②：不构成闭包
function outer() {
  const x = 1
  return function() {
    console.log('no ref')  // 没引用 x → JS 可以回收 outer 的作用域
  }
}

// 缺条件①：不嵌套，也没有闭包
function fn() {
  const x = 1
}
// x 在 fn 执行完后立即释放
```

## 闭包在 Vue 2 源码中的体现

### defineReactive 中的闭包 val

```js
function defineReactive(obj, key, val) {
  // val 是 defineReactive 的局部变量

  Object.defineProperty(obj, key, {
    get() {
      return val      // ← 闭包：getter 引用了外层的 val
    },
    set(newVal) {
      val = newVal    // ← 闭包：setter 引用了外层的 val
    }
  })
  // 条件①：getter/setter 是嵌套在 defineReactive 中的函数 ✅
  // 条件②：getter/setter 引用了外层变量 val ✅
  // → 闭包形成 → val 不会被 GC
}
```

### 为什么不能用 obj[key] 代替？

```js
// ❌ 错误写法：会死循环
Object.defineProperty(obj, key, {
  get() {
    return obj[key]  // ① 读 obj[key] → ② 触发 getter → ③ 又执行 get()
                     // → ④ 又读 obj[key] → ⑤ 无限循环 💥
  }
})

// ✅ 正确写法：走闭包通道
Object.defineProperty(obj, key, {
  get() {
    return val       // val 是原始值的内存引用，不经过劫持
  }
})
```

### 内存模型

```
劫持前：
  obj.count = 0      ← 普通属性，直接存放值

劫持后：
  obj.count          ← 被替换为 getter/setter
    getter ──→ 闭包通道 → val = 0  ← 原始值藏在这里
    setter ──→ 闭包通道 → val       ← 修改也走这里

  obj.count 不再是一个"存储槽"，而是一个"访问代理"
```

### 另一个例子：computed 缓存

```js
function defineComputed(target, key, userDef) {
  const getter = userDef.get
  let dirty = true
  let value

  // value 和 dirty 都是 defineComputed 的局部变量
  // 下面的 getter 通过闭包引用它们
  Object.defineProperty(target, key, {
    get() {
      if (dirty) {
        value = getter.call(target)  // ← 闭包
        dirty = false
      }
      return value  // ← 闭包
    }
  })
  // 缓存值 value 不被 GC，直到组件销毁
}
```

## 闭包的生命周期

```
1. 定义阶段：闭包还不存在，只是函数定义
2. 调用 outer()：执行上下文创建，局部变量分配内存
3. 返回 inner：内部函数被外部引用，闭包正式形成
4. 使用阶段：通过返回的函数访问闭包变量
5. 释放：内部函数不再被任何变量引用 → GC 回收闭包

例：
  let fn = outer()  // 闭包形成
  fn()              // 使用闭包
  fn = null         // 断开引用 → GC 回收 count 和整个闭包
```

## 常见闭包应用

### ① 数据私有化

```js
function createCounter() {
  let count = 0
  return {
    increment() { count++ },
    decrement() { count-- },
    get value() { return count }
  }
}
// count 完全私有，外部只能通过返回的方法访问
```

### ② 函数工厂

```js
function multiply(x) {
  return function(y) {
    return x * y
  }
}
const double = multiply(2)
double(5)  // 10
```

### ③ 事件处理

```js
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 0)  // 0 1 2
  })(i)
}
// 每次循环创建一个闭包，保存当时的 i
```

## 经典面试题

### 题1：var vs let 的循环

```js
// var：没有块作用域，3 个定时器共享同一个 i
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)  // 3 3 3
}

// let：有块作用域，每次循环一个独立的 i
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)  // 0 1 2
}
// 本质：let 每次迭代创建一个新的绑定，相当于每次循环一个闭包
```

### 题2：内存泄漏

```js
function leak() {
  const bigData = new Array(1000000).fill('x')
  return function() {
    console.log(bigData.length)  // 引用了 bigData → 只要返回的 fn 被持有，bigData 就无法回收
  }
}
const fn = leak()
// bigData 永远停留在内存中，直到 fn = null
```

### 题3

```js
function createFunctions() {
  const result = []
  for (var i = 0; i < 3; i++) {
    result.push(function() { return i })
  }
  return result
}
const funcs = createFunctions()
funcs[0]()  // 3（不是 0！） → 所有函数共享同一个 i，循环结束时 i = 3
```