# Dep — 依赖收集器

## 核心实现

`Dep` 是一个发布-订阅管理器，每个响应式属性都持有一个 `Dep` 实例。

```js
// src/core/observer/dep.js

let uid = 0

export default class Dep {
  constructor() {
    this.id = uid++           // 唯一 ID，用于去重
    this.subs = []            // 订阅者列表（Watcher）
  }

  // 添加订阅者
  addSub(sub) {
    this.subs.push(sub)
  }

  // 移除订阅者
  removeSub(sub) {
    remove(this.subs, sub)
  }

  // 依赖收集（让当前 Watcher 订阅我）
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this) // Watcher.addDep 中会双向记录
    }
  }

  // 通知所有订阅者
  notify() {
    const subs = this.subs.slice() // 浅拷贝防止排序影响
    if (process.env.NODE_ENV !== "production") {
      subs.sort((a, b) => a.id - b.id) // 开发环境排序
    }
    for (let i = 0; i < subs.length; i++) {
      subs[i].update()
    }
  }
}

// 全局唯一的"当前正在计算的 Watcher"
Dep.target = null
```

## 双向记录机制

Dep 和 Watcher 之间是**多对多**关系，需要双向记录：

```
      Dep                    Watcher
    ┌──────┐              ┌──────────┐
    │ id=1 │◄──────────────│  deps    │  正向：Watcher 知道自己依赖了哪些 Dep
    │ subs │──────────────►│  (数组)  │  反向：Dep 知道哪些 Watcher 依赖自己
    └──────┘   addSub()    └──────────┘
```

**Watcher.addDep() 实现：**

```js
addDep(dep) {
  const id = dep.id
  if (!this.depIds.has(id)) { // newDepIds 去重
    this.depIds.add(id)
    this.newDeps.push(dep)
    dep.addSub(this)          // 反向：Dep 也记录这个 Watcher
  }
}
```

**为什么需要双向记录？**

- **Dep → Watcher**：数据变化时，Dep 通知所有 Watcher 更新
- **Watcher → Dep**：Watcher 销毁时（组件卸载），从所有 Dep 中移除自己，避免内存泄漏

## 清理机制

```js
// Watcher 重新计算时会清理旧的依赖
cleanupDeps() {
  let i = this.deps.length
  while (i--) {
    const dep = this.deps[i]
    if (!this.newDepIds.has(dep.id)) {
      dep.removeSub(this) // 从不再依赖的 Dep 中移除自己
    }
  }
  // 交换新旧 depIds，清空 newDeps
  let tmp = this.depIds
  this.depIds = this.newDepIds
  this.newDepIds = tmp
  this.newDepIds.clear()
}
```

这样当 `v-if` 切换导致某些数据不再被读取时，Watcher 不会收到无用的更新通知。
