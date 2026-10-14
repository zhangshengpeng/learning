# 工具类型

> 手写工具类型是 TS 面试的高频考点，考察对映射、条件、infer 的综合理解。

## 内置工具类型（理解原理 + 能手写）

### Partial `<T>`

```ts
// ✅ 手写：全部变为可选
type MyPartial<T> = {
  [P in keyof T]?: T[P]
}

// 使用
interface User { name: string; age: number }
type PartialUser = MyPartial<User>
// { name?: string; age?: number }
```

### Required `<T>`

```ts
// ✅ 手写：全部变为必选（-? 移除可选）
type MyRequired<T> = {
  [P in keyof T]-?: T[P]
}
```

### Readonly `<T>`

```ts
// ✅ 手写：全部只读
type MyReadonly<T> = {
  readonly [P in keyof T]: T[P]
}
```

### Pick `<T, K>`

```ts
// ✅ 手写：从 T 中提取 K 属性
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P]
}

type Picked = MyPick<User, 'name'>  // { name: string }
```

### Omit `<T, K>`

```ts
// ✅ 手写：从 T 中排除 K 属性
type MyOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
// 或：
type MyOmit2<T, K extends keyof T> = {
  [P in Exclude<keyof T, K>]: T[P]
}
```

### Record `<K, V>`

```ts
// ✅ 手写：构造键为 K、值为 V 的对象类型
type MyRecord<K extends string | number | symbol, V> = {
  [P in K]: V
}

type Roles = MyRecord<'admin' | 'user', { permissions: string[] }>
// { admin: { permissions: string[] }; user: { permissions: string[] } }
```

### Exclude `<T, U>`

```ts
// ✅ 手写：从 T 中排除可分配给 U 的类型
type MyExclude<T, U> = T extends U ? never : T

type WithoutNull = MyExclude<string | number | null, null>
// string | number（null → never → 从联合中消失）
```

### Extract `<T, U>`

```ts
// ✅ 手写：从 T 中提取可分配给 U 的类型
type MyExtract<T, U> = T extends U ? T : never

type OnlyStrings = MyExtract<string | number | boolean, string>
// string
```

### NonNullable `<T>`

```ts
// ✅ 手写：排除 null 和 undefined
type MyNonNullable<T> = T extends null | undefined ? never : T
```

### Parameters `<T>`

```ts
// ✅ 手写：获取函数参数类型（元组）
type MyParameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never

function fn(a: string, b: number): void {}
type Params = MyParameters<typeof fn>  // [string, number]
```

### ReturnType `<T>`

```ts
// ✅ 手写：获取函数返回类型
type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never

type Ret = MyReturnType<typeof fn>  // void
```

### Awaited `<T>`

```ts
// ✅ 手写：递归解包 Promise
type MyAwaited<T> =
  T extends Promise<infer U>
    ? MyAwaited<U>   // 递归
    : T

type Res = MyAwaited<Promise<Promise<string>>>  // string
```

### DeepReadonly `<T>`

```ts
// ✅ 手写：递归只读
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P]
}
```

---

## 面试高频自定义工具类型

### DeepPartial

```ts
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
```

### 取出值类型为 K 的键

```ts
type PickByType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
}

type User = { name: string; age: number; active: boolean }
type StringKeys = PickByType<User, string>
// { name: string }
```

### 函数重载的参数类型

```ts
type OverloadParams<T> =
  T extends {
    (...args: infer A1): any
    (...args: infer A2): any
  } ? A1 | A2 : never
```

### 对象路径类型（链式取值）

```ts
type DeepKey<T> = T extends object ? {
  [K in keyof T]: K extends string 
    ? T[K] extends object ? `${K}.${DeepKey<T[K]>}` : K
    : never
}[keyof T] : never
// 可以生成 'a.b.c' 这样的路径字符串
```

---

## 映射类型修饰符

```ts
// +? 添加可选（可省略 +）
type Partial<T> = { [P in keyof T]+?: T[P] }

// -? 移除可选
type Required<T> = { [P in keyof T]-?: T[P] }

// +readonly 添加只读
type Readonly<T> = { +readonly [P in keyof T]: T[P] }

// -readonly 移除只读
type Mutable<T> = { -readonly [P in keyof T]: T[P] }

// as 重映射键名
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
}
// { name: string } → { getName: () => string }
```