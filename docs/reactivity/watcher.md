# Watcher — 观察者

## 核心实现

`Watcher` 是连接数据与视图的桥梁。每次渲染、每个 `watch`、每个 `computed` 都对应一个 Watcher。

```js
// src/core/observer/watcher.js

let uid = 0

export default class Watcher {
  constructor(vm, expOrFn, cb, options) {
    this.vm = vm
    this.id = ++uid
    this.cb = cb              // 回调函数
    this.deps = []
    this.depIds = new Set()
    this.newDeps = []
    this.newDepIds = new Set()

    // 渲染 Watcher: expOrFn = updateComponent
    // watch Watcher: expOrFn = "a.b.c" 字符串路径
    if (typeof expOrFn === "function") {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn) // 解析 "a.b.c" 路径
    }

    // 立即执行一次，触发依赖收集
    this.value = this.lazy ? undefined : this.get()
  }

  get() {
    pushTarget(this) // ① 设置 Dep.target = 当前 Watcher

    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
      // ② getter 执行过程中读取的所有响应式属性
      //    都会通过 get → dep.depend() 收集当前 Watcher
    } finally {
      popTarget()    // ③ 恢复 Dep.target
    }
    return value
  }

  addDep(dep) {
    if (!this.newDepIds.has(dep.id)) {
      this.newDepIds.add(dep.id)
      this.newDeps.push(dep)
      dep.addSub(this) // 双向绑定
    }
  }

  update() {
    // 数据变化时被 Dep.notify() 调用
    if (this.lazy) {
      this.dirty = true     // computed 惰性求值
    } else if (this.sync) {
      this.run()             // 同步执行（极少用）
    } else {
      queueWatcher(this)     // 加入异步队列（默认）
    }
  }

  run() {
    const oldValue = this.value
    this.value = this.get()  // 重新计算
    this.cb.call(this.vm, this.value, oldValue)
    // 渲染 Watcher 的 cb = 重新执行 updateComponent
  }
}
```

## Watcher 的三种类型

| 类型 | 创建位置 | getter | cb |
|------|---------|--------|-----|
| **渲染 Watcher** | `mountComponent` | `updateComponent` | 重新渲染 |
| **用户 Watcher** | `vm.$watch()` | 属性路径 | 用户回调 |
| **computed Watcher** | `initComputed` | getter 函数 | `lazy: true` |

## 依赖收集完整流程

```
1. 组件渲染 → new 渲染 Watcher
2. Watcher.get() → pushTarget(this)
3. 执行 updateComponent → vm._render()
4. _render() 读取 data.name → 触发 get
5. get → dep.depend() → Dep.target.addDep(dep)
6. Watcher.addDep(dep) → dep.addSub(watcher)
7. 渲染结束 → popTarget()

结果：
  data.name 的 Dep.subs = [渲染Watcher]
  渲染Watcher.deps = [Dep(name), Dep(age), ...]
```

## 重新收集依赖

每次 Watcher 执行 `get()` 时，都会重新走一遍依赖收集流程：

```js
get() {
  pushTarget(this)
  // ...
  finally {
    popTarget()
    this.cleanupDeps() // 清理旧的、不再需要的依赖
  }
}
```

这意味着 `v-if` 切换后，之前条件渲染中用到的数据的 Dep 中就不会再有这个 Watcher 了。

## queueWatcher — 异步去重队列

当你修改一个属性，它可能同时被多个 Watcher 依赖。但 `flushSchedulerQueue`（刷新队列）只会执行**一次**——这是怎么做到的？

### 从 dep.notify() 到 flush 的完整链路

```
修改 user.name = 'Bob'
  ↓
setter → dep.notify()
  ↓
遍历 dep.subs = [渲染Watcher, watch Watcher, computed Watcher]
  ↓
每个 watcher 依次调用 .update()
  ├─► 渲染Watcher.update()  →  queueWatcher(this)
  ├─► watch Watcher.update() →  queueWatcher(this)
  └─► computed Watcher.update() →  this.dirty = true  (lazy，不进队列)
  ↓
只有第一次 queueWatcher 会触发 nextTick(flushSchedulerQueue)
  ↓
nextTick 把 flushSchedulerQueue 放入微任务队列
  ↓
当前同步代码全部执行完毕后，微任务执行一次 flushSchedulerQueue
```

### queueWatcher 的核心代码

```js
// src/core/observer/scheduler.js

let waiting = false      // ← 关键！只调度一次
let flushing = false     // 正在刷新中
const queue = []         // 待执行的 Watcher 队列
const has = {}           // Watcher ID → true，去重 Map

function queueWatcher(watcher) {
  const id = watcher.id

  // ① 去重：同一个 Watcher 不重复入队
  if (has[id] != null) {
    return
  }

  has[id] = true      // 标记已入队

  if (!flushing) {
    queue.push(watcher)
  } else {
    // 正在刷新时，新 Watcher 按 id 顺序插入正确位置
    let i = queue.length - 1
    while (i > index && queue[i].id > watcher.id) {
      i--
    }
    queue.splice(i + 1, 0, watcher)
  }

  // ② 只调度一次：waiting 保证 nextTick 只注册一次
  if (!waiting) {
    waiting = true
    nextTick(flushSchedulerQueue)
  }
}
```

### 为什么只 flush 一次？两个关键变量

| 变量 | 作用 | 生活类比 |
|:----|:-----|:--------|
| `waiting` | 保证 `nextTick` 只被调用一次，不会向微任务队列重复添加 flush 任务 | 电梯按钮：第一个进来的人按了楼层，后面的人就不用再按了 |
| `has[id]` | 同一个 Watcher 不会重复入队 | 安检登记：同一个人过了安检就不用再过一次 |

**图解：**

```
dep.notify() 触发 3 个 watcher.update()

第1个 watcher: queueWatcher(w1)
  has[1] == null → 标记 has[1] = true → queue = [w1]
  waiting == false → waiting = true → nextTick(flush)   ← 注册微任务

第2个 watcher: queueWatcher(w2)
  has[2] == null → 标记 has[2] = true → queue = [w1, w2]
  waiting == true → 跳过 nextTick ✅                     ← 不再注册！

第3个 watcher: queueWatcher(w3)
  has[3] == null → 标记 has[3] = true → queue = [w1, w2, w3]
  waiting == true → 跳过 nextTick ✅                     ← 不再注册！

同步代码结束 → 微任务队列执行 → flushSchedulerQueue() → 一次处理所有
```

### flushSchedulerQueue 的执行顺序

```js
function flushSchedulerQueue() {
  // ① 按 Watcher.id 排序：父组件 < 子组件，用户 Watcher < 渲染 Watcher
  queue.sort((a, b) => a.id - b.id)

  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    has[watcher.id] = null  // 清除标记，方便下次重新入队
    watcher.run()            // 执行回调 / 重新渲染
  }

  // ② 重置所有状态
  resetSchedulerState()     // waiting = false, queue = [], has = {}
}
```

> **一句话总结**：`dep.notify()` 是个"发信员"，挨个通知所有 Watcher；`queueWatcher` 是个"去重闸门"，同一个微任务只注册一次 `flushSchedulerQueue`，所有 Watcher 攒到一起后一次性执行。