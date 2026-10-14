# 原型链

> 面试必考，Vue 源码中数组方法劫持的核心机制。

## 基础概念

### `prototype` 属性

每个**函数**都有一个 `prototype` 属性，指向一个对象：

```js
function Foo() {}
console.log(Foo.prototype) // { constructor: Foo }
```

这个 `prototype` 对象上有一个 `constructor` 属性指回函数本身：

```js
Foo.prototype.constructor === Foo  // true
```

### `__proto__` 属性

每个**对象**都有一个 `__proto__` 属性（ES6 标准为 `Object.getPrototypeOf()`），指向创建该对象的构造函数的 `prototype`：

```js
const f = new Foo()
f.__proto__ === Foo.prototype  // true
```

## 完整原型链图

```
f (实例对象)
  │ __proto__
  ▼
Foo.prototype
  │ __proto__
  ▼
Object.prototype
  │ __proto__
  ▼
null    ← 原型链终点
```

### 验证

```js
function Foo() {}
const f = new Foo()

f.__proto__ === Foo.prototype               // true
Foo.prototype.__proto__ === Object.prototype // true
Object.prototype.__proto__ === null           // true

// 函数也是对象
Foo.__proto__ === Function.prototype          // true
Function.prototype.__proto__ === Object.prototype // true

// Object 是 Function 构造的
Object.__proto__ === Function.prototype       // true
```

## `instanceof` 原理

`instanceof` 沿着 `__proto__` 链向上查找，判断构造函数的 `prototype` 是否在链上：

```js
f instanceof Foo
// 等价于
// 沿着 f.__proto__ 向上查找，看是否等于 Foo.prototype

f instanceof Foo     // true  → f.__proto__ = Foo.prototype
f instanceof Object  // true  → Foo.prototype.__proto__ = Object.prototype
f instanceof Array   // false → 原型链上找不到 Array.prototype
```

### 手写 instanceof

```js
function myInstanceof(obj, Constructor) {
  let proto = Object.getPrototypeOf(obj)  // obj.__proto__
  while (proto) {
    if (proto === Constructor.prototype) return true
    proto = Object.getPrototypeOf(proto)
  }
  return false
}
```

## 属性查找规则

当读取 `obj.prop` 时：

```
1. 在 obj 自身属性中查找
2. 找不到 → 沿着 obj.__proto__ 往上找
3. 找不到 → 继续沿着 __proto__ 往上
4. 一直找到 Object.prototype
5. 还找不到 → 返回 undefined
```

```js
function Person(name) {
  this.name = name
}
Person.prototype.say = function() {
  console.log(this.name)
}

const p = new Person('Alice')
p.name     // 'Alice'       → 自身属性
p.say      // [Function]    → 原型上的方法
p.toString // [Function]    → Object.prototype 上的方法
p.xxx      // undefined     → 整条链都找不到
```

### `hasOwnProperty` 区分自身还是原型

```js
p.hasOwnProperty('name')     // true  → 自身属性
p.hasOwnProperty('say')      // false → 原型上的
p.hasOwnProperty('toString') // false → 更远的原型
```

## 在 Vue 2 源码中的体现

### 数组方法劫持

```js
// src/core/observer/array.ts

// ① 创建一个以 Array.prototype 为原型的空对象
const arrayMethods = Object.create(Array.prototype)
// → arrayMethods.__proto__ = Array.prototype

// ② 在 arrayMethods 上重写 7 个变异方法
;['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
  .forEach(method => {
    const original = Array.prototype[method]
    def(arrayMethods, method, function mutator(...args) {
      const result = original.apply(this, args)  // 调用原始方法
      // ... 额外的响应式处理
      return result
    })
  })

// ③ 把数组实例的原型指向 arrayMethods
function protoAugment(target, src) {
  target.__proto__ = src  // 修改原型链！
}
```

### 原型链变化示意

```
劫持前：
arr → Array.prototype → Object.prototype → null
arr.push → 沿着链找到 Array.prototype.push

劫持后：
arr.__proto__ = arrayMethods
arr → arrayMethods → Array.prototype → Object.prototype → null
arr.push → arrayMethods.push（重写的）→ 先做响应式处理 → 再调原始 push

arr.map → arrayMethods 上没有 → 沿链找到 Array.prototype.map → 照常可用
```

### 为什么选 `Object.create`？

```js
// 不用：直接修改 Array.prototype → 影响所有数组 → 全局污染
Array.prototype.push = function() { ... }  // ❌

// 正确：创建新对象，修改 __proto__ 只影响被观测的数组
const arrayMethods = Object.create(Array.prototype)
arr.__proto__ = arrayMethods  // 只改这个 arr
```

## 经典面试题

### 题1

```js
function Foo() {}
Foo.prototype.x = 1
const f = new Foo()
f.x = 2
console.log(f.x)          // 2（自身属性覆盖原型属性）
console.log(Foo.prototype.x) // 1（原型没被改）
delete f.x
console.log(f.x)          // 1（删除自身属性后，原型属性暴露）
```

### 题2：构造函数返回对象

```js
function Foo() { return { x: 1 } }
const f = new Foo()
f instanceof Foo  // false → return 了对象，f 是这个对象，不是 Foo.prototype 的实例
```

### 题3：方法定义位置

```js
// 方式一：构造器里定义 → 每个实例独有一份 → 不共享
function Foo() {
  this.say = function() {}
}
// 方式二：prototype 上定义 → 所有实例共享一份 → 省内存
Foo.prototype.say = function() {}

const a = new Foo()
const b = new Foo()
a.say === b.say  // 方式一：false  方式二：true
```