# 异步批量更新 (Scheduler)

## 为什么需要异步更新

如果每次数据变化都立即更新 DOM，会导致严重的性能问题：

```js
// 同一帧内连续修改三次数据
this.count = 1  // → 更新 DOM
this.count = 2  // → 又更新 DOM
this.count = 3  // → 又更新 DOM
// 用户只看到最终值 3，前两次更新完全浪费
```

Vue 的策略：**同一帧内的多次数据变更，只触发一次 DOM 更新**。

## 核心实现

```js
// src/core/observer/scheduler.js

const queue = []          // 待执行的 Watcher 队列
const activatedChildren = []
let has = {}              // 去重 Map
let waiting = false       // 是否已注册 nextTick
let flushing = false      // 是否正在清空队列

export function queueWatcher(watcher) {
  const id = watcher.id
  // 去重：同一 Watcher 只入队一次
  if (has[id] == null) {
    has[id] = true
    if (!flushing) {
      queue.push(watcher)
    } else {
      // 正在清空队列时，按 id 顺序插入（保证父组件先更新）
      let i = queue.length - 1
      while (i >= 0 && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }

    // 只注册一次 nextTick
    if (!waiting) {
      waiting = true
      nextTick(flushSchedulerQueue)
    }
  }
}

function flushSchedulerQueue() {
  flushing = true
  let watcher, id

  // ① 按 id 排序：
  //    父组件 id < 子组件 id → 父组件先更新
  //    用户 Watcher < 渲染 Watcher → 用户先执行
  queue.sort((a, b) => a.id - b.id)

  for (let i = 0; i < queue.length; i++) {
    watcher = queue[i]
    if (watcher.before) {
      watcher.before() // beforeUpdate 钩子
    }
    id = watcher.id
    has[id] = null
    watcher.run()  // ② 执行更新
  }

  // ③ 重置状态
  resetSchedulerState()
}

function resetSchedulerState() {
  queue.length = 0
  has = {}
  waiting = false
  flushing = false
}
```

## nextTick 实现

```js
// src/core/util/next-tick.js

const callbacks = []
let pending = false

function flushCallbacks() {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// 优先级：Promise > MutationObserver > setImmediate > setTimeout
let timerFunc
if (typeof Promise !== "undefined") {
  timerFunc = () => Promise.resolve().then(flushCallbacks)
} else if (typeof MutationObserver !== "undefined") {
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, { characterData: true })
  timerFunc = () => { textNode.data = String(++counter) }
} else {
  timerFunc = () => setTimeout(flushCallbacks, 0)
}

export function nextTick(cb, ctx) {
  callbacks.push(() => { cb.call(ctx) })
  if (!pending) {
    pending = true
    timerFunc()
  }
}
```

## 完整流程示例

```js
// 用户代码
this.name = "张三"
this.age = 25

// 内部过程：
// 1. name set → dep.notify() → watcher.update() → queueWatcher(watcher_id=1)
//    → queue = [watcher_1], waiting=true, nextTick(flushSchedulerQueue)

// 2. age set → dep.notify() → watcher.update() → queueWatcher(watcher_id=1)
//    → has[1]=true, 跳过（去重）

// 3. 同步代码执行完毕，微任务触发：
//    → flushSchedulerQueue()
//    → watcher_1.run() → 重新渲染一次
//    → DOM 同时反映 name="张三" 和 age=25
```

**只执行了一次渲染，而不是两次。**
