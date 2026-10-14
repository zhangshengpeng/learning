# TypeScript 基础类型

## 原始类型

```ts
// 布尔值
let isDone: boolean = false

// 数字（不分 int/float）
let num: number = 42

// 字符串
let str: string = 'hello'
let template: string = `hello ${num}`

// null / undefined
let n: null = null
let u: undefined = undefined

// void（函数无返回值）
function log(): void {
  console.log('nothing returned')
}

// never（永不返回 - 抛异常/死循环）
function error(message: string): never {
  throw new Error(message)
}
function infiniteLoop(): never {
  while (true) {}
}
```

## 数组

```ts
let list1: number[] = [1, 2, 3]
let list2: Array<number> = [1, 2, 3]  // 泛型写法

// 元组：固定长度和类型的数组
let tuple: [string, number] = ['hello', 42]
tuple[0] = 'world'  // ✓
tuple[0] = 1        // ✗ 类型错误

// 只读数组
let arr: readonly number[] = [1, 2, 3]
arr.push(4)  // ✗ 只读
```

## 枚举

```ts
// 数字枚举（默认从 0 递增）
enum Direction {
  Up,     // 0
  Down,   // 1
  Left,   // 2
  Right   // 3
}

// 自定义起始值
enum Status {
  Active = 1,
  Inactive,  // 2
  Pending    // 3
}

// 字符串枚举（无自增）
enum Color {
  Red = '#ff0000',
  Green = '#00ff00',
  Blue = '#0000ff'
}

// const enum：编译时内联，零运行时开销
const enum Size {
  Small = 'sm',
  Medium = 'md',
  Large = 'lg'
}
// 使用处直接替换为字符串值，不生成对象
```

## Object

```ts
// object 类型：非原始类型的任意值
let obj: object = { name: 'vue' }
// obj.name  // ✗ object 上不存在 name

// 具体对象类型
let user: { name: string; age: number } = {
  name: 'Alice',
  age: 25
}

// 可选属性
let config: { url: string; timeout?: number } = { url: '/api' }
```

## 联合类型 & 交叉类型

```ts
// 联合：值可以是多种类型之一
type Status = 'loading' | 'success' | 'error'
let s: Status = 'loading'  // ✓

// 联合类型收窄
function printId(id: number | string) {
  if (typeof id === 'string') {
    console.log(id.toUpperCase())  // 收窄到 string
  } else {
    console.log(id.toFixed(2))     // 收窄到 number
  }
}

// 交叉：合并多种类型
type Name = { name: string }
type Age = { age: number }
type Person = Name & Age  // { name: string; age: number }

// 同名属性的处理：
type A = { x: string }
type B = { x: number }
type C = A & B  // { x: never } → 不可能同时满足 string & number
```

## 类型断言

```ts
// as 语法（推荐）
const el = document.querySelector('#app') as HTMLDivElement

// 尖括号语法（JSX 中冲突，不推荐）
const el2 = <HTMLDivElement>document.querySelector('#app')

// 非空断言（我知道它不是 null！）
const el3 = document.querySelector('#app')!
// 注意：! 只在编译时跳过检查，运行时如果有 null 还是会报错

// const 断言（冻结字面量）
const config = {
  url: '/api',
  method: 'GET'
} as const
// config 的类型是 { readonly url: "/api"; readonly method: "GET" }
// config.url = '/other'  // ✗ 只读
```

## 类型守卫

```ts
function isString(val: unknown): val is string {
  return typeof val === 'string'
}

function process(val: unknown) {
  if (isString(val)) {
    console.log(val.toUpperCase())  // val 收窄到 string
  }
}

// in 操作符收窄
interface Cat { meow(): void }
interface Dog { bark(): void }
function handle(animal: Cat | Dog) {
  if ('meow' in animal) {
    animal.meow()  // 收窄到 Cat
  }
}
```