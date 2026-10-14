# 泛型

> 泛型是 TS 面试区分初中级和高工的分水岭。

## 基础泛型

```ts
// 泛型函数
function identity<T>(arg: T): T {
  return arg
}
identity<string>('hello')  // T = string
identity('hello')          // 类型推断 → T = string

// 泛型接口
interface Box<T> {
  value: T
}
const numBox: Box<number> = { value: 42 }

// 泛型类
class Stack<T> {
  private items: T[] = []
  push(item: T) { this.items.push(item) }
  pop(): T | undefined { return this.items.pop() }
}
const numStack = new Stack<number>()
numStack.push(1)
```

## 泛型约束

```ts
// extends 约束类型必须满足某个形状
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length
}
getLength('hello')  // ✓ string 有 length
getLength([1,2,3])  // ✓ array 有 length
// getLength(42)    // ✗ number 没有 length

// extends keyof 约束属性名
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
const user = { name: 'Alice', age: 25 }
getProperty(user, 'name')  // ✓
// getProperty(user, 'email')  // ✗ 'email' 不在 keyof user 中
```

## 泛型条件类型

```ts
// 条件类型 = TypeScript 的 if-else
type IsString<T> = T extends string ? true : false

type A = IsString<string>   // true
type B = IsString<number>   // false

// 条件类型 + 泛型约束
type NonNullable<T> = T extends null | undefined ? never : T

// never 的意义：never 在联合类型中会被移除
type StringOrNum = string | number | null
type Clean = NonNullable<StringOrNum>  // string | number
// null 被替换为 never → 从联合中移除
```

## infer - 类型推断

```ts
// infer：在条件类型中声明一个类型变量

// 提取函数返回类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

function fn(): string { return 'hello' }
type FnReturn = ReturnType<typeof fn>  // string

// 提取数组元素类型
type ArrayItem<T> = T extends (infer U)[] ? U : never
type Item = ArrayItem<string[]>  // string

// 提取 Promise 包裹的值
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T
type R1 = Awaited<Promise<string>>       // string
type R2 = Awaited<Promise<Promise<number>>> // number（递归解包）
```

## 模板字面量类型

```ts
type EventName<T extends string> = `on${Capitalize<T>}`
type Click = EventName<'click'>  // 'onClick'
type Change = EventName<'change'>  // 'onChange'

// 结合 infer 做字符串解析
type ParseRoute<T> = T extends `/${infer R}` ? R : never
type Route = ParseRoute<'/home/user'>  // 'home/user'
```

## 泛型工具类型的实现原理

```ts
// Partial（全部可选）
type Partial<T> = { [P in keyof T]?: T[P] }
// 原理：映射类型 + ? 可选修饰符

// Required（全部必选）
type Required<T> = { [P in keyof T]-?: T[P] }
// -? 表示移除可选修饰符

// Readonly（全部只读）
type Readonly<T> = { readonly [P in keyof T]: T[P] }

// Pick（挑选属性）
type Pick<T, K extends keyof T> = { [P in K]: T[P] }

// Omit（排除属性）
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
// Exclude = T extends U ? never : T
```

## 在 Vue 3 中的应用

```ts
// defineProps 的泛型
defineProps<{
  title: string
  count?: number
  items: string[]
}>()

// defineEmits 的泛型
const emit = defineEmits<{
  update: [value: string]
  delete: [id: number]
}>()

// 定义一个泛型 Composable
function usePagination<T>(fetchFn: (page: number) => T[]) {
  const page = ref(1)
  const data = ref<T[]>([])
  // ...
  return { page, data }
}
```