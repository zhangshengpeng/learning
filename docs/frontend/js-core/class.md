# Class

> ES6 Class 本质是原型链和 this 绑定的语法糖。Vue Class API 被抛弃就是因为 `this` 问题无法解决。

## Class 本质

```js
class Person {
  constructor(name) {
    this.name = name
  }
  say() {
    console.log(this.name)
  }
}

// 等价于：
function Person(name) {
  this.name = name
}
Person.prototype.say = function() {
  console.log(this.name)
}

// 验证：
typeof Person  // 'function' → class 就是函数
```

### class 与构造函数的区别

```js
// ① class 必须用 new 调用
const p = Person()     // ✗ TypeError
const p = new Person() // ✓

// ② class 内部默认严格模式
// ③ class 的方法不可枚举
Object.keys(Person.prototype)  // [] (构造函数方式：['say'])
// ④ class 不存在变量提升
new Foo()  // ✗ ReferenceError
class Foo {}
```

## 继承

### extends + super

```js
class Animal {
  constructor(name) {
    this.name = name
  }
  speak() {
    return `${this.name} makes a sound`
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name)  // 必须先调用 super() 才能使用 this
    this.breed = breed
  }
  speak() {
    return `${super.speak()}, ${this.breed} barks`
    // super.speak() = Animal.prototype.speak.call(this)
  }
}

const d = new Dog('Buddy', 'Labrador')
d.speak()  // 'Buddy makes a sound, Labrador barks'
```

### 继承的本质：原型链

```js
class Dog extends Animal {}

// ES5 等价写法：
function Dog(...args) { Animal.apply(this, args) }
Dog.prototype = Object.create(Animal.prototype)
Dog.prototype.constructor = Dog

// 静态属性继承：
Dog.__proto__ === Animal  // true → 继承静态方法

// 实例原型链：
d.__proto__ === Dog.prototype
Dog.prototype.__proto__ === Animal.prototype
Animal.prototype.__proto__ === Object.prototype
```

### super 的本质

```js
// 子类 constructor 中 super 做了什么？
super(name)
// 等价于：Animal.prototype.constructor.call(this, name)

// 为什么必须先调用 super？
// 子类的 this 由父类创建，super 调用后才存在
// ES6 之前：子类先创建 this，再把父类属性加到自己身上
// ES6 Class：父类创建 this（因为有 extends），super 后才得到 this

// 非 constructor 方法中的 super：
class Dog extends Animal {
  speak() {
    // super.speak() = Animal.prototype.speak.call(this)
    // 相当于调用父类的同名方法，但 this 还是子类实例
    return super.speak()
  }
}
```

## getter / setter

```js
class User {
  #name  // private field
  
  constructor(name) {
    this.#name = name
  }

  get name() {
    console.log('getter called')
    return this.#name
  }

  set name(value) {
    console.log('setter called', value)
    if (value.length < 2) throw new Error('名字太短')
    this.#name = value
  }
}

const u = new User('Alice')
u.name = 'Bob'  // setter called Bob
console.log(u.name)  // getter called → 'Bob'
```

### 私有属性 `#`

```js
class Bank {
  #balance = 0

  deposit(amount) {
    this.#balance += amount
  }

  #logTransaction(amount) {  // 私有方法
    console.log(`Transaction: ${amount}`)
    return this.#balance
  }
}

const b = new Bank()
b.#balance       // ✗ SyntaxError → 外部不可访问
b.#logTransaction(10) // ✗ SyntaxError
// 只能通过 deposit 等公有方法操作
```

## static

```js
class Api {
  static baseUrl = 'https://api.example.com'

  static async get(path) {
    const res = await fetch(`${this.baseUrl}${path}`)
    return res.json()
  }
}

Api.get('/users')  // 直接类上调用，不需要 new

// static 方法 this 指向类本身
class SubApi extends Api {
  static baseUrl = 'https://sub.example.com'
}
SubApi.get('/users')  // 使用 SubApi.baseUrl
```

## 在 Vue 中的体现

### Vue 2 的 Class API（已废弃）

```js
// Vue 2 + vue-class-component（曾流行过）
@Component
export default class MyComp extends Vue {
  count = 0

  get doubleCount() {
    return this.count * 2
  }

  increment() {
    this.count++
  }
}
// 问题：
// - this 混乱：class 的 this 和 Vue 的 this 冲突
// - TS 类型推断：装饰器类型兼容差
// - class 属性通过 defineProperty 定义，和 Vue 响应式系统冲突
```

### 为什么 Vue 3 放弃 Class API？

```
1. this 问题：
   class 方法中 this 需手动 bind
   Composition API 中没有 this，自然不存在绑定问题

2. TS 推断：
   Class API 的 this 类型推断复杂
   需要 ThisType 等高级 TS 技巧

3. Mixin 的局限性：
   Class 不支持多继承（只能单继承 extends）
   组合 > 继承 → Composition API 的组合式逻辑

4. Tree Shaking：
   Class 方法挂在原型上，不好 tree-shake
   Composition API 的函数可以 tree-shake
```

### Composition API 替代 Class 的典型场景

```js
// Class 风格：
class User {
  #name = ''
  get name() {}
  set name(v) {}
  getNameLength() {}
}

// Composition API 风格：
function useUser() {
  const name = ref('')
  const nameLength = computed(() => name.value.length)
  const setName = (v) => { name.value = v }
  return { name, nameLength, setName }
}
// 没有 this，没有 class，没有 prototype 链
// 纯函数组合 → 更好 tree-shake
```

## 经典面试题

### 题1：class 中的 this

```js
class Foo {
  constructor() { this.name = 'foo' }
  getName() { return this.name }
}
const foo = new Foo()
const { getName } = foo
getName()  // undefined → this = window (严格模式 = undefined)
// class 内部自动严格模式
```

### 题2：继承顺序

```js
class A { constructor() { console.log(1) } }
class B extends A { constructor() { super(); console.log(2) } }
// new B() → 1 2
// 父类 constructor 先执行
```

### 题3：原型关系

```js
class A {}
class B extends A {}
// B.__proto__ === A                ← 静态属性继承
// B.prototype.__proto__ === A.prototype  ← 实例方法继承
// (new B).__proto__.__proto__ === A.prototype
```