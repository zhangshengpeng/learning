# 深拷贝

```js
function deepClone(obj, map = new WeakMap()) {
  // null 或非对象 → 直接返回
  if (typeof obj !== 'object' || obj === null) return obj

  // 循环引用：已经拷贝过 → 返回之前的结果
  if (map.has(obj)) return map.get(obj)

  const clone = Array.isArray(obj) ? [] : {}
  map.set(obj, clone)

  // 拷贝可枚举属性
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key], map)
  }

  // 拷贝 Symbol 属性
  for (const sym of Object.getOwnPropertySymbols(obj)) {
    clone[sym] = deepClone(obj[sym], map)
  }

  return clone
}
```

**面试要点**：

- 基本类型直接返回
- 数组/对象递归拷贝
- WeakMap 处理循环引用（`a.b = a`）
- Symbol key 也要拷贝（`Object.getOwnPropertySymbols`）
- 不需要处理 Date/RegExp/Map/Set 等特殊类型（除非面试官要求）

## 循环引用问题

```js
const obj = { name: 'a' }
obj.self = obj  // 自引用

// 没有 WeakMap → 无限递归 → 栈溢出
// 有 WeakMap → map.has(obj) → true → 直接返回
```