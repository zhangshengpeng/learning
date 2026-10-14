# this 绑定规则

> 必考题。理解 this 才能理解 Vue methods 里为什么能用 `this.xxx` 访问 data。

## 五种绑定规则

### ① 默认绑定

```js
function fn() {
  console.log(this)
}

fn()  // 非严格模式：window  |  严格模式：undefined
```

独立函数调用，this 指向全局对象（严格模式下为 undefined）。

### ② 隐式绑定

```js
const obj = {
  name: 'vue',
  getName() {
    return this.name
  }
}

obj.getName()  // 'vue' → this = obj
```

**注意隐式丢失**：

```js
const fn = obj.getName
fn()  // undefined → this 变成了 window/undefined
// fn 只是函数引用，调用时没有任何对象前缀
```

回调函数中也容易丢失：

```js
setTimeout(obj.getName, 0)  // undefined → setTimeout 内部直接调用了 fn()
```

### ③ 显式绑定：call / apply / bind

```js
function say(greeting) {
  console.log(greeting + ', ' + this.name)
}
const user = { name: 'Alice' }

say.call(user, 'Hi')     // Hi, Alice
say.apply(user, ['Hi'])  // Hi, Alice（参数用数组）
```

**bind 的强绑定**：

```js
const bound = say.bind(user)  // 返回一个 this 永久绑定的函数
bound('Hello')  // Hello, Alice

// bind 后再 call 无效！
bound.call({ name: 'Bob' })  // 仍然是 Alice
```

**手写 call 实现**：

```js
Function.prototype.myCall = function(context = window, ...args) {
  // 把函数临时挂到 context 上
  const fnKey = Symbol('fn')
  context[fnKey] = this
  // 调用时 this 隐式绑定到 context
  const result = context[fnKey](...args)
  delete context[fnKey]
  return result
}
```

### ④ new 绑定

```js
function Person(name) {
  this.name = name  // this = 新创建的空对象
}
const p = new Person('Alice')
p.name  // 'Alice'
```

new 操作符做了什么：

```js
function myNew(Constructor, ...args) {
  // 1. 创建一个新对象，原型链指向构造函数 prototype
  const obj = Object.create(Constructor.prototype)
  // 2. 以新对象为 this 执行构造函数
  const result = Constructor.apply(obj, args)
  // 3. 如果构造函数返回对象，返回它；否则返回新对象
  return result instanceof Object ? result : obj
}
```

### ⑤ 箭头函数

```js
const obj = {
  name: 'vue',
  // 箭头函数无自己的 this
  getName: () => {
    return this.name  // this = 外层作用域的 this
  }
}
obj.getName()  // undefined（外层是 window）
```

**箭头函数和普通函数的区别**：

```js
// 普通函数：this 动态绑定，取决于怎么调用
element.onclick = function() { console.log(this) }  // this = element

// 箭头函数：this 在定义时确定，取决于外层作用域
element.onclick = () => { console.log(this) }  // this = 外层 this
```

## 优先级

```
new > 显式(bind/call/apply) > 隐式(obj.fn()) > 默认
```

### 验证 new vs bind

```js
function Foo(name) { this.name = name }
const BoundFoo = Foo.bind({ name: 'bound' })
const f = new BoundFoo('new')
f.name  // 'new' → new 绑定优先于 bind
```

## 在 Vue 2 源码中的体现

### initMethods

```js
// src/core/instance/state.ts
function initMethods(vm, methods) {
  for (const key in methods) {
    vm[key] = methods[key] == null
      ? noop
      : bind(methods[key], vm)  // ← 把 this 绑定到 vm
  }
}
```

```js
// 定义时：
methods: {
  handleClick() { this.count++ }  // this 还是不确定的
}

// initMethods 处理后：
vm.handleClick  // handleClick.bind(vm)
// 无论怎么调用，this 总是 vm
```

### render 中的 with

```js
// Vue 2 render 函数编译后类似：
with (this) {
  return _c('div', [_v(_s(count))])
}
// `with` 让 count 在 vm 上查找
// 实际上内部还有一层 Proxy 代理保证 this 正确
```

## 经典面试题

### 题1

```js
var name = 'window'
const obj = {
  name: 'obj',
  fn: function() {
    console.log(this.name)
  }
}
obj.fn()           // 'obj'（隐式绑定）
const fn = obj.fn
fn()               // 'window'（默认绑定，隐式丢失）
```

### 题2

```js
const obj = {
  name: 'obj',
  fn() {
    setTimeout(function() {
      console.log(this.name)
    }, 0)
  }
}
obj.fn()  // 'window'（setTimeout 里普通函数 this = window）

// 修复方案1：箭头函数
setTimeout(() => { console.log(this.name) }, 0)  // 'obj'

// 修复方案2：bind
setTimeout(function() { console.log(this.name) }.bind(this), 0)
```

### 题3

```js
function Foo() {
  this.name = 'foo'
  return { name: 'bar' }
}
const f = new Foo()
f.name  // 'bar'（返回了对象，new 返回这个对象而非 this）
```