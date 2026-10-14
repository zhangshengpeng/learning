# Promise 手写 & 发布订阅

## Promise.all

```js
Promise.myAll = function(promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) return resolve([])

    const results = []
    let resolvedCount = 0

    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        val => {
          results[i] = val
          if (++resolvedCount === promises.length) resolve(results)
        },
        reject  // 任何一个 reject → 立即 reject
      )
    })
  })
}
```

**面试要点**：用索引存结果（不能 push 因为可能乱序）

## Promise.race

```js
Promise.myRace = function(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => {
      Promise.resolve(p).then(resolve, reject)
    })
  })
}
```

## 并发控制（asyncPool）

```js
async function asyncPool(limit, tasks, fn) {
  const ret = []
  const executing = new Set()

  for (const task of tasks) {
    const p = Promise.resolve().then(() => fn(task))
    ret.push(p)
    executing.add(p)

    const clean = () => executing.delete(p)
    p.then(clean, clean)

    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }

  return Promise.all(ret)
}
```

**场景**：批量上传文件，限制同时上传 3 个

---

## 发布订阅 EventEmitter

```js
class EventEmitter {
  constructor() {
    this.events = {}
  }

  on(event, fn) {
    (this.events[event] ||= []).push(fn)
  }

  off(event, fn) {
    this.events[event] = this.events[event]?.filter(f => f !== fn)
  }

  once(event, fn) {
    const wrapper = (...args) => {
      fn(...args)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  }

  emit(event, ...args) {
    this.events[event]?.forEach(fn => fn(...args))
  }
}
```

**面试要点**：

- `once` 用 `wrapper` 包装，执行后自动 `off`
- Vue 2 的 `$on/$off/$emit/$once` 就是这个模式