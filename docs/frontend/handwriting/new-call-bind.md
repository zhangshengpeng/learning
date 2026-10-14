# new & call & bind

## new

```js
function myNew(Constructor, ...args) {
  // 1. 创建新对象，原型链指向构造函数的 prototype
  const obj = Object.create(Constructor.prototype)
  // 2. 用新对象做 this，执行构造函数
  const result = Constructor.apply(obj, args)
  // 3. 如果构造函数返回对象，用返回的对象；否则用新对象
  return result instanceof Object ? result : obj
}
```

**面试要点**：

- `Object.create()` vs `{ __proto__: ... }`
- 构造函数返回对象时，用返回的对象而非新对象
- 构造函数返回基本类型时，忽略，用新对象

## call

```js
Function.prototype.myCall = function(context = window, ...args) {
  const fnKey = Symbol('fn')
  context[fnKey] = this
  const result = context[fnKey](...args)
  delete context[fnKey]
  return result
}
```

**要点**：用 Symbol 避免属性冲突

## apply

```js
Function.prototype.myApply = function(context = window, args = []) {
  const fnKey = Symbol('fn')
  context[fnKey] = this
  const result = context[fnKey](...args)
  delete context[fnKey]
  return result
}
```

## bind

```js
Function.prototype.myBind = function(context, ...outerArgs) {
  const self = this
  const bound = function(...innerArgs) {
    return self.apply(
      // new 绑定优先：通过 new 调用时，this 指向实例
      this instanceof bound ? this : context,
      [...outerArgs, ...innerArgs]
    )
  }
  // 继承原型
  bound.prototype = Object.create(self.prototype)
  return bound
}
```

**面试要点**：

- 返回新函数
- 支持预设参数（柯里化）
- new 绑定优先级 > bind 绑定
- 原型继承