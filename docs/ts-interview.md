# TypeScript 面试高频考点 🔥

> 涵盖面试中 90% 的 TS 题型，每题先思考再看答案。

---

## 一、基础类型与语法

### Q1：`interface` 和 `type` 的区别？什么时候用哪个？

<details>
<summary>点击查看答案</summary>

| | interface | type |
|:--|:--|:--|
| 声明合并 | ✅ 同名 interface 自动合并 | ❌ 同名 type 报错 |
| 继承方式 | `extends` | `&` 交叉 |
| 基本类型别名 | ❌ 只能描述对象 | ✅ `type Name = string` |
| 联合类型 | ❌ | ✅ `type Status = 'a' \| 'b'` |
| 元组 | ❌ | ✅ `type Pair = [string, number]` |
| 映射类型使用 | ✅ 可直接用 | ✅ 也可用 |

选择策略：
- 描述**对象/类/API 形状** → `interface`（可扩展、可合并）
- 需要**联合/交叉/元组/基本类型别名** → `type`
- 内部库用 `interface` 方便扩展，对外用 `type` 避免意外合并

</details>


### Q2：`any`、`unknown`、`never` 的区别？

<details>
<summary>点击查看答案</summary>

```ts
// any：关闭类型检查，可以赋值给任何变量
let a: any = 1
const s: string = a   // ✅ 不报错

// unknown：安全版的 any，不能直接赋给其他类型
let u: unknown = 1
const s: string = u   // ❌ 报错，需要类型守卫
if (typeof u === 'string') {
  const s: string = u  // ✅
}

// never：永不存在的值的类型
// ① 永远抛错的函数
function error(): never { throw new Error() }
// ② 死循环函数
function loop(): never { while (true) {} }
// ③ 穷尽检查
type Fruit = 'apple' | 'banana'
switch (fruit) {
  case 'apple': break
  case 'banana': break
  default: const _exhaust: never = fruit  // 漏了分支会报错
}
```

| | any | unknown | never |
|:--|:--|:--|:--|
| 能否赋给其他类型 | ✅ | ❌（需断言） | ❌ |
| 使用场景 | 临时逃逸 | 不确定类型的值 | 永不返回 / 穷尽检查 |
| 安全性 | 无 | 高 | 不适用 |

</details>


### Q3：`as` 断言和 `as const` 的区别？

<details>
<summary>点击查看答案</summary>

```ts
// as：类型断言，告诉 TS"相信我"
const el = document.getElementById('app') as HTMLDivElement

// as const：收窄为字面量类型 + 只读
const obj = { name: 'Alice', age: 25 } as const
//        ^? { readonly name: "Alice"; readonly age: 25 }

const arr = [1, 2, 3] as const
//        ^? readonly [1, 2, 3]

// as const 在 Vue 3 中的典型用法：
const statuses = ['pending', 'done', 'failed'] as const
type Status = (typeof statuses)[number]  // 'pending' | 'done' | 'failed'
```

</details>


### Q4：`enum` 的优缺点？什么是 const enum？

<details>
<summary>点击查看答案</summary>

```ts
// 普通 enum：编译后生成对象，有运行时开销
enum Color { Red, Green, Blue }
// → var Color; (function(Color) { ... })(Color || (Color = {}))

// const enum：编译时内联，零运行时开销
const enum Direction { Up, Down, Left, Right }
let d = Direction.Up
// → var d = 0

// enum 的问题：
// ① 编译体积大（除非 const enum）
// ② 不兼容 tree-shaking
// ③ 数字枚举不安全：let c: Color = 999 不报错

// 推荐替代：联合类型 + as const
const COLORS = ['red', 'green', 'blue'] as const
type Color = (typeof COLORS)[number]
```

</details>


### Q5：`void` 和 `undefined` 有什么区别？

<details>
<summary>点击查看答案</summary>

```ts
// void：函数没有返回值
function log(msg: string): void { console.log(msg) }

// undefined：变量类型是 undefined
let u: undefined = undefined

// 严格模式下 void 和 undefined 不完全等价
// "strictNullChecks": true 时
const v: void = undefined  // ✅
const u: void = null       // ❌
```

实际上 `void` 在函数中更实用，`undefined` 更偏数据层面。

</details>

---

## 二、泛型

### Q6：什么是泛型约束？`extends` 在泛型中怎么用？

<details>
<summary>点击查看答案</summary>

```ts
// 基本约束：T 必须满足某个形状
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length  // ✅ T 一定有 length
}
getLength('hello')    // ✅
getLength([1, 2, 3])  // ✅
getLength(123)         // ❌ number 没有 length

// 约束泛型参数来自另一个泛型参数
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
getProperty({ name: 'Alice' }, 'name')   // ✅
getProperty({ name: 'Alice' }, 'age')    // ❌

// 条件类型中 extends 是"判断是否可赋值"
type IsString<T> = T extends string ? true : false
type A = IsString<'hello'>  // true
type B = IsString<123>      // false
```

</details>


### Q7：`infer` 关键字怎么用？举三个常见场景。

<details>
<summary>点击查看答案</summary>

```ts
// ① 提取函数返回值类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never
type Fn = (a: number) => string
type R = ReturnType<Fn>  // string

// ② 提取数组元素类型
type ArrayItem<T> = T extends (infer U)[] ? U : never
type Item = ArrayItem<string[]>  // string

// ③ 提取 Promise 包裹的类型（递归解包）
type Awaited<T> = T extends Promise<infer U>
  ? U extends Promise<any> ? Awaited<U> : U
  : T
type Result = Awaited<Promise<Promise<number>>>  // number
```

</details>


### Q8：泛型参数的默认值是什么？什么时候用？

<details>
<summary>点击查看答案</summary>

```ts
// 基本用法
interface ApiResponse<T = any> {
  code: number
  data: T
}

// 不传泛型时：T = any
const res: ApiResponse = { code: 0, data: 'ok' }

// 传泛型时覆盖默认值
const res2: ApiResponse<string> = { code: 0, data: 'ok' }

// 常用场景：
// Vue 的 Ref<T = any>
// React 的 useState<T = undefined>(initial?: T)
// Axios 的 get<T = any>(url): Promise<AxiosResponse<T>>
```

</details>


---

## 三、工具类型

### Q9：如何手写 `Partial` / `Required` / `Readonly` / `Pick` / `Omit` / `Record`？

<details>
<summary>点击查看答案</summary>

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] }
// 所有属性变可选

type MyRequired<T> = { [K in keyof T]-?: T[K] }
// -? 移除可选，所有变必填

type MyReadonly<T> = { readonly [K in keyof T]: T[K] }
// 所有属性变只读

type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
// 从 T 中挑出 K 指定的属性

type MyOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>
// 从 T 中排除 K 指定的属性

type MyRecord<K extends keyof any, V> = { [P in K]: V }
// K 作为 key，V 作为 value 类型

type MyExclude<T, U> = T extends U ? never : T
// 从 T 中排除可赋值给 U 的类型

type MyExtract<T, U> = T extends U ? T : never
// 从 T 中提取可赋值给 U 的类型

type MyNonNullable<T> = T extends null | undefined ? never : T
// 排除 null 和 undefined
```

</details>


### Q10：`keyof` 和 `typeof` 在类型体操中各起什么作用？

<details>
<summary>点击查看答案</summary>

```ts
// keyof：获取类型的所有 key 的联合类型
interface User { name: string; age: number }
type UserKeys = keyof User  // 'name' | 'age'

// typeof：获取变量的类型
const user = { name: 'Alice', age: 25 }
type UserType = typeof user  // { name: string; age: number }

// 两者结合：从运行时值推导类型
const STATUS_MAP = {
  pending: '待处理',
  done: '已完成',
  failed: '已失败'
} as const
type Status = keyof typeof STATUS_MAP  // 'pending' | 'done' | 'failed'
```

</details>


### Q11：什么是条件类型的**分布式**特性？

<details>
<summary>点击查看答案</summary>

```ts
// 当 T 是联合类型时，条件类型会分发到联合的每个成员
type ToArray<T> = T extends any ? T[] : never
type Result = ToArray<string | number>
//            = (string extends any ? string[] : never)
//            | (number extends any ? number[] : never)
//            = string[] | number[]

// 避免分发：用元组包裹
type ToArray2<T> = [T] extends [any] ? T[] : never
type Result2 = ToArray2<string | number>
//            = (string | number)[]
```

</details>


### Q12：什么是模板字面量类型？有什么用？

<details>
<summary>点击查看答案</summary>

```ts
// 拼接字符串类型
type EventName<T extends string> = `on${Capitalize<T>}`
type Click = EventName<'click'>  // 'onClick'

// 实际应用：类型安全的 CSS 变量
type CSSVar<K extends string> = `var(--${K})`
type Color = CSSVar<'primary'>  // 'var(--primary)'

// 实际应用：对象路径
type Path<T> = T extends object
  ? { [K in keyof T]: K | `${K & string}.${Path<T[K]> & string}` }[keyof T]
  : never
```

</details>


---

## 四、高级类型

### Q13：什么是协变和逆变？TS 中如何体现？

<details>
<summary>点击查看答案</summary>

```ts
// 协变：子类型可以赋值给父类型
class Animal { name = '' }
class Dog extends Animal { bark() {} }
const animals: Animal[] = [new Dog()]  // ✅ Dog → Animal 协变

// 逆变：函数参数类型反向——父类型可以赋给子类型参数
type Handler<T> = (arg: T) => void
let animalHandler: Handler<Animal> = (a: Animal) => {}
let dogHandler: Handler<Dog> = animalHandler  // ✅ Handler<Animal> → Handler<Dog>

// 函数返回值协变，参数逆变
// 严格模式下：--strictFunctionTypes
```

面试口诀：**参数逆变、返回值协变**。

</details>


### Q14：`is` 关键字（类型谓词）的作用？

<details>
<summary>点击查看答案</summary>

```ts
// 普通类型守卫：只能返回 boolean
function isString(val: unknown): boolean {
  return typeof val === 'string'
}

// 类型谓词：告诉 TS "如果返回 true，val 就是 string"
function isString(val: unknown): val is string {
  return typeof val === 'string'
}

if (isString(x)) {
  x.toUpperCase()  // ✅ TS 知道 x 是 string
}

// Vue 3 中的体现：isRef / isReactive
export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isReactive(value: unknown): value is object
```

</details>


### Q15：索引签名和映射类型的区别？

<details>
<summary>点击查看答案</summary>

```ts
// 索引签名：所有 key 值类型固定
interface Dict1 {
  [key: string]: number    // 任何 string key 的值都是 number
}

// 映射类型：遍历已有的 key 集合
type Dict2<T> = {
  [K in keyof T]: T[K]     // 遍历 T 的 key，值的类型取决于 T[K]
}

// 关键区别：
// 索引签名：不关心具体有哪些 key，统一 value 类型
// 映射类型：基于已有类型的 key 做变换
```

</details>


---

## 五、实战

### Q16：Vue 3 中 `defineProps` 如何写类型？

<details>
<summary>点击查看答案</summary>

```ts
// 运行时声明（推荐，同时生成类型和运行时验证）
const props = defineProps({
  name: { type: String, required: true },
  age: { type: Number, default: 0 }
})

// 纯类型声明（只有编译时类型，无运行时代码）
const props = defineProps<{
  name: string
  age?: number
}>()

// 带默认值
const props = withDefaults(defineProps<{
  name: string
  age?: number
}>(), {
  age: 0
})
```

</details>


### Q17：`provide` / `inject` 如何用 TS 做类型安全？

<details>
<summary>点击查看答案</summary>

```ts
// 定义 injection key
import type { InjectionKey } from 'vue'

interface UserInfo { name: string; role: string }
const userKey: InjectionKey<UserInfo> = Symbol('user')

// provide
provide(userKey, { name: 'Alice', role: 'admin' })

// inject 有类型
const user = inject(userKey)  // UserInfo | undefined
const user2 = inject(userKey, { name: '', role: '' })  // UserInfo
```

</details>


### Q18：如何为第三方库补充类型声明？

<details>
<summary>点击查看答案</summary>

```ts
// ① 全局声明文件 src/types/global.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// ② 为没有类型的库补充
declare module 'some-lib' {
  export function doSomething(param: string): void
}

// ③ 扩展已有类型
declare module 'vue' {
  interface ComponentCustomProperties {
    $formatDate: (date: Date) => string
  }
}

// ④ tsconfig 中声明文件路径
// "typeRoots": ["./node_modules/@types", "./src/types"]
```

</details>


### Q19：泛型组件？什么时候用到？

<details>
<summary>点击查看答案</summary>

```vue
<!-- GenericSelect.vue -->
<script setup lang="ts" generic="T extends string | number">
defineProps<{
  options: { label: string; value: T }[]
  modelValue: T
}>()
defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<!-- 使用时类型自动推导 -->
<GenericSelect
  :options="[{ label: 'A', value: 1 }]"
  :model-value="1"
/>
<!-- T 自动推导为 number -->
```

</details>


### Q20：TS 的 paths 别名配置？

<details>
<summary>点击查看答案</summary>

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}

// vite.config.ts 同步配置
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url))
  }
}
```

</details>


### Q21：常见 TS 错误及解决方案？

<details>
<summary>点击查看答案</summary>

```ts
// ① object is possibly 'undefined'
// 解决：可选链 ?. 或非空断言 !
const name = obj?.name
const name2 = obj!.name

// ② Type 'string | null' is not assignable to type 'string'
// 解决：类型守卫或断言
const val = maybeNull ?? 'default'

// ③ Property does not exist on type '{}'
// 解决：as 断言或声明类型
const data = response as { name: string }

// ④ A computed property name must be of type 'string'...
// 解决：使用 Record
const map: Record<string, number> = {}
map[key] = 1  // ✅

// ⑤ This expression is not callable
// 解决：用 infer + extends 收窄
type Fn = (...args: any[]) => any
if (typeof val === 'function') {
  (val as Fn)()
}
```

</details>

---

## 六、配置与工程化

### Q22：`tsconfig.json` 中最关键的配置有哪些？

<details>
<summary>点击查看答案</summary>

```json
{
  "compilerOptions": {
    "strict": true,                  // 开启所有严格检查
    "target": "ESNext",              // 编译目标
    "module": "ESNext",              // 模块系统
    "moduleResolution": "bundler",   // 模块解析策略（Vite 推荐）
    "jsx": "preserve",               // JSX 处理
    "baseUrl": ".",                  // 路径别名基础
    "paths": { "@/*": ["src/*"] },   // 路径映射
    "types": ["vite/client"],        // 全局类型声明
    "skipLibCheck": true,            // 跳过 .d.ts 检查（加速）
    "isolatedModules": true,         // 每个文件独立编译（Vite 要求）
    "esModuleInterop": true,         // ESM/CJS 互操作
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["node_modules"]
}
```

</details>


### Q23：`declare`、`declare global`、`declare module` 的用法？

<details>
<summary>点击查看答案</summary>

```ts
// declare：声明存在但不在当前文件定义的变量
declare const VERSION: string

// declare global：扩展全局作用域
declare global {
  interface Window {
    __CUSTOM__: string
  }
}

// declare module：扩展已有模块
declare module '*.scss' {
  const content: Record<string, string>
  export default content
}

// declare module with glob pattern
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
```

</details>

---

## 快问快答

| 问题 | 答案 |
|:--|:--|
| TS 类型在运行时存在吗？ | ❌ 编译时擦除 |
| `?.` 和 `!.` 区别？ | `?.` 可选链（安全），`!.` 非空断言（危险） |
| 泛型参数命名惯例？ | T（任意）/ K（key）/ V（value）/ E（Element） |
| `Readonly<[1,2]>` 结果？ | `readonly [1, 2]` |
| `void` 和 `never` 区别？ | void 无返回值，never 永不返回 |
| `abstract` class 用途？ | 不能被实例化，只做基类模板 |
| mapped type 中 `-?` 作用？ | 移除可选修饰符 |
| `satisfies` 关键字作用？ | 类型检查但不改变推导类型（TS 4.9+） |