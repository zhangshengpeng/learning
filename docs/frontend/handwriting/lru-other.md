# LRU 缓存

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity
    this.cache = new Map()
  }

  get(key) {
    if (!this.cache.has(key)) return -1
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)  // 移到末尾 → 标记为最近使用
    return value
  }

  put(key, value) {
    if (this.cache.has(key)) this.cache.delete(key)
    this.cache.set(key, value)
    if (this.cache.size > this.capacity) {
      // Map 的 keys() 按插入顺序 → 第一个 = 最久未使用
      this.cache.delete(this.cache.keys().next().value)
    }
  }
}
```

**面试要点**：

- Map 天然保持插入顺序
- `get` 时把 key 删除再添加 → 移到末尾
- `put` 超出容量时删除 map.keys() 第一个元素
- Vue 3 keep-alive 的 `max` 就是用 LRU 策略淘汰缓存的组件实例

## 数组扁平化

```js
function flatten(arr, depth = 1) {
  if (depth === 0) return arr
  return arr.reduce((prev, cur) =>
    prev.concat(Array.isArray(cur) ? flatten(cur, depth - 1) : cur),
    []
  )
}

// flatten([1, [2, [3, 4]]], 2) → [1, 2, 3, 4]
// flatten([1, [2, [3, 4]]], 1) → [1, 2, [3, 4]]
```

## 柯里化

```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args)
    }
    return (...moreArgs) => curried(...args, ...moreArgs)
  }
}

// const add = (a, b, c) => a + b + c
// const curriedAdd = curry(add)
// curriedAdd(1)(2)(3)  // 6
// curriedAdd(1, 2)(3)  // 6
```

**要点**：`fn.length` 是形参个数，收集够了就执行