# 事件循环

> Vue 的 `$nextTick` 本质是微任务机制，Watcher 的异步批量更新完全依赖事件循环。

## 为什么需要事件循环？

JS 是**单线程**语言，一次只能做一件事。如果某个任务耗时很长，整个页面就会卡死。

事件循环的解决思路：把任务分为**同步 + 异步**，同步任务直接执行，异步任务放到队列里等同步任务执行完了再处理。

## 任务分类

```
同步任务：直接进执行栈，立刻执行
微任务（Microtask）：Promise.then、MutationObserver、queueMicrotask
宏任务（Macrotask）：setTimeout、setInterval、I/O、UI 渲染、MessageChannel
```

## 事件循环完整流程

```
┌─────────────────────────────────────┐
│ 1. 从宏任务队列取出一个任务执行       │
│ 2. 执行此宏任务中的所有同步代码       │
│ 3. 检查微任务队列，逐个执行直到清空   │
│ 4. 如果有需要，浏览器进行 UI 渲染     │
│ 5. 回到步骤 1                        │
└─────────────────────────────────────┘
```

### 关键规则

```
① 一个宏任务 →  所有微任务 → 可能渲染 → 下一个宏任务
② 微任务执行期间新产生的微任务也会在本轮处理完
③ 宏任务执行期间产生的微任务排在当前宏任务之后
```

## 代码验证

```js
console.log('1')

setTimeout(() => {
  console.log('2')
  Promise.resolve().then(() => console.log('3'))
}, 0)

Promise.resolve().then(() => {
  console.log('4')
  setTimeout(() => console.log('5'), 0)
})

console.log('6')

// 输出：1 6 4 2 3 5

// 分析：
// 同步：1, 6
// 第一个微任务：4（里面注册了 setTimeout → 新的宏任务）
// 第一个宏任务：2（里面注册了 Promise → 微任务）
// 微任务：3
// 第二个宏任务：5
```

### 逐帧分析

```
宏任务队列：[整体script]  → 执行 1,6 → 微任务队列：[then(4)]
微任务队列：[then(4)]     → 执行 4 → 注册 setTimeout(5)
此时宏任务队列：[setTimeout(2), setTimeout(5)]

宏任务：setTimeout(2)    → 执行 2 → 微任务队列：[then(3)]
微任务队列：[then(3)]     → 执行 3
宏任务：setTimeout(5)    → 执行 5
```

## 深入：微任务的"反刍"特性

```js
Promise.resolve().then(function fn() {
  console.log(1)
  Promise.resolve().then(fn)  // 再次把自己加入微任务
})

// → 无限输出 1 1 1 ...
// 页面永远卡死，因为微任务队列永远清不完
```

## 在 Vue 2 源码中的体现

### $nextTick 的降级策略

```js
// src/core/util/next-tick.ts

let timerFunc

// ① 首选 Promise（微任务）
if (typeof Promise !== 'undefined') {
  timerFunc = () => {
    Promise.resolve().then(flushCallbacks)
  }
}
// ② 降级：MutationObserver（微任务）
else if (typeof MutationObserver !== 'undefined') {
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, { characterData: true })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
}
// ③ 降级：setImmediate（宏任务，仅 IE/Node）
else if (typeof setImmediate !== 'undefined') {
  timerFunc = () => setImmediate(flushCallbacks)
}
// ④ 兜底：setTimeout（宏任务）
else {
  timerFunc = () => setTimeout(flushCallbacks, 0)
}
```

### 为什么优先微任务？

```
宏任务方案（setTimeout 0）：
  修改数据 → 当前宏任务结束 → 下一个宏任务可能先执行 → 延迟不确定
  两轮宏任务之间浏览器可能插 UI 渲染 → 用户看到中间态

微任务方案（Promise）：
  修改数据 → 同步代码结束 → 立即执行所有微任务 → 统一更新 DOM
  微任务在当前宏任务内清空 → 浏览器渲染前 DOM 已是最终状态
```

### 异步更新队列

```js
// 3 次修改 → 3 次 dep.notify() → 3 次 queueWatcher
vm.count = 1
vm.count = 2
vm.count = 3

// queueWatcher 内部：
// 第一次：has[id] 标记，waiting = true，注册 nextTick(flushSchedulerQueue)
// 后两次：has[id] 已标记 → 跳过
// 同步代码执行完 → 微任务：flushSchedulerQueue → watcher.run() → DOM 更新为 3
```

## 浏览器渲染时机

```
宏任务 → 所有微任务 → requestAnimationFrame → 重排 → 重绘 → 下一个宏任务
                         ↑
                   可以在微任务里获取最新 DOM
                   但浏览器还没渲染到屏幕上
```

### 验证

```js
box.style.width = '200px'
console.log(box.offsetWidth)  // 200 → 重排已同步发生（但未绘制到屏幕）

Promise.resolve().then(() => {
  console.log(box.offsetWidth)  // 200 → 微任务，DOM 已更新，仍未绘制
})

requestAnimationFrame(() => {
  console.log(box.offsetWidth)  // 200 → 下一帧绘制前
})
```

## 经典面试题

### 题1

```js
console.log(1)
setTimeout(() => console.log(2), 0)
new Promise(resolve => {
  console.log(3)
  resolve()
}).then(() => console.log(4))
console.log(5)
// 输出：1 3 5 4 2
// Promise 构造器里的代码是同步的！只有 .then 是微任务
```

### 题2：async/await

```js
async function async1() {
  console.log('async1 start')
  await async2()
  console.log('async1 end')  // await 后面的 = .then 回调
}
async function async2() {
  console.log('async2')
}
console.log('script start')
async1()
console.log('script end')

// 输出：script start → async1 start → async2 → script end → async1 end
```