# TypeScript 实战模式

> 不是学了语法就完事，怎么写出类型安全的业务代码才是关键。

## 模式1：泛型约束 API 响应

```ts
// 统一的 API 返回格式
interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

// 分页返回
interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 封装的请求函数
async function request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
  // ...
  return response.json()
}

// 使用时：类型自动推导
const res = await request<UserInfo>({ url: '/api/user' })
res.data.name  // string ✓
```

## 模式2：枚举 vs 字符串联合

```ts
// 字符串联合 - 轻量，推荐
type Status = 'pending' | 'processing' | 'done' | 'failed'

// const 枚举 - 零运行时开销
const enum StatusEnum {
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Done = 'DONE',
  Failed = 'FAILED'
}

// 选择：
// - 如果值就是字符串，用联合就够了
// - 如果值有特殊含义（需要映射），用 enum
// - enum 在 Vue template 中使用需特殊处理（配合 globalProperties）
```

## 模式3：类型收窄替代 any

```ts
// ❌ 不好
function process(input: any) {
  console.log(input.toFixed(2))
}

// ✅ 类型收窄
function process(input: unknown) {
  if (typeof input === 'number') {
    console.log(input.toFixed(2))  // 这里 input 已经收窄为 number
  }
}

// ✅ 类型守卫
interface Cat { meow: () => void }
interface Dog { bark: () => void }

function isCat(animal: Cat | Dog): animal is Cat {
  return 'meow' in animal
}
```

## 模式4：泛型 + extends 约束

```ts
// 要求传入的对象有 id 属性
function findById<T extends { id: number }>(list: T[], id: number): T | undefined {
  return list.find(item => item.id === id)
}

// 任何有 id 属性的对象都可以
const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
const user = findById(users, 1)  // { id: number; name: string } | undefined
```

## 模式5：模板字面量实现事件类型约束

```ts
// 约束事件映射的类型
type EventMap = {
  click: [x: number, y: number]
  change: [value: string]
  submit: [data: FormData]
}

function on<K extends keyof EventMap>(
  event: K,
  handler: (...args: EventMap[K]) => void
): void {}

on('click', (x, y) => {})  // x: number, y: number ✓
on('change', (value) => {})  // value: string ✓
// on('resize', () => {}) // ✗ 'resize' 不在 EventMap 中
```

## 模式6：Builder 模式 + 类型安全

```ts
class QueryBuilder<T extends Record<string, unknown>> {
  private filters: Partial<Record<keyof T, any>> = {}

  where<K extends keyof T>(key: K, value: T[K]): this {
    this.filters[key] = value
    return this
  }

  build(): Partial<Record<keyof T, any>> {
    return this.filters
  }
}

interface User { id: number; name: string; age: number }
const builder = new QueryBuilder<User>()
  .where('name', 'Alice')  // ✓
  .where('age', 25)        // ✓
  // .where('invalid', true) // ✗
```

## 常见 TS 错误及解决

```ts
// 错误1：Object is possibly 'undefined'
const el = document.querySelector('#app')
el.innerHTML = ''  // ✗ el 可能是 null

// 解决：
const el = document.querySelector('#app')!
// 或
const el = document.querySelector('#app')
if (el) { el.innerHTML = '' }
// 或
el?.innerHTML  // 可选链

// 错误2：Property does not exist on type '{}'
const data = {} as Record<string, any>
data.name = 'Alice'  // ✓

// 错误3：Type 'string' is not assignable to type 'number'
// 检查类型定义，需要 as const 或类型断言

// 错误4：Argument of type 'string' is not assignable to parameter of type 'never'
// 通常是数组类型推断为 never[]，需要显式指定泛型
const list: string[] = []

// 错误5：Property 'xxx' does not exist on type 'Window & typeof globalThis'
// 使用 declare global 扩展 Window
```