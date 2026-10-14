# interface vs type

> 高频面试题。90% 场景可以互换，但有几个关键区别。

## 相同点

```ts
// 都可以描述对象
interface User1 { name: string; age: number }
type User2 = { name: string; age: number }

// 都可以被实现
class Person implements User1 {}
class Person2 implements User2 {}

// 都可以扩展
interface Admin1 extends User1 { role: string }
type Admin2 = User2 & { role: string }
```

## 关键区别

### ① interface 可以声明合并（Declaration Merging）

```ts
interface User {
  name: string
}
// 同名的 interface 会自动合并
interface User {
  age: number
}
// User = { name: string; age: number } ✓

// type 不行
type User2 = { name: string }
// type User2 = { age: number }  // ✗ 重复定义
```

### ② type 可以定义联合/交叉/元组

```ts
// type 可以定义联合
type Status = 'loading' | 'success' | 'error'

// type 可以定义元组
type Point = [number, number]

// type 可以定义映射类型
type Nullable<T> = { [K in keyof T]: T[K] | null }

// interface 都做不到
```

### ③ extends vs &

```ts
// interface extends：浅合并，重复属性会报错
interface A { x: string }
interface B { x: number }
// interface C extends A, B {}  // ✗ x 类型冲突

// type &：交叉，同名属性合并（可能产生 never）
type C = A & B  // { x: never } → 不会报错，但 x 不可用
```

### ④ 定义函数

```ts
// type 定义函数签名
type Fn = (x: number) => string

// interface 定义函数签名
interface FnInterface {
  (x: number): string
}
// 两者等价，type 更简洁

// interface 定义函数 + 静态属性（callable object）
interface FnWithProp {
  (x: number): string
  description: string
}
const fn: FnWithProp = (x) => String(x)
fn.description = 'converter'
```

## 何时用哪种？

| 场景 | 推荐 | 原因 |
|:----|:----|:-----|
| 定义对象结构 | interface | idomatic |
| 定义函数签名 | type | 简洁 |
| 联合/交叉/元组 | type | interface 不支持 |
| 需要声明合并（扩展全局类型） | interface | type 不支持 |
| 元子类型/工具类型 | type | 配合泛型更自然 |
| 给第三方库补类型 | interface | 声明合并 |
| Vue 3 props | interface/type 都行 | 配合 `defineProps<>()` |

## 给第三方库扩充类型

```ts
// 给 Vue Router 的 meta 加类型
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    roles?: string[]
  }
}

// 给 window 加自定义属性
declare global {
  interface Window {
    __APP_VERSION__: string
  }
}
// 这种情况只能 interface（利用声明合并）

// type 做不了，因为 type 不能合并
```