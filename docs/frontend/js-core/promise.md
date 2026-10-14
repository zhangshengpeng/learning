# Promise

> Vue 的 `$nextTick`、`fetch` 封装、异步组件加载都依赖 Promise。

## Promise 状态机

```
Promise 有三种状态，且状态不可逆：

pending → fulfilled（成功）
pending → rejected（失败）
    无法：fulfilled → pending / rejected → pending

状态一旦确定，就无法再改变。
```

```js
const p = new Promise((resolve, reject) => {
  resolve('ok')
  reject('err')  // 无效！状态已经是 fulfilled
  throw 'err2'   // 无效！fulfilled 后不可再 reject
})
// p 永远是 fulfilled('ok')
```

## then 的链式调用

```js
Promise.resolve(1)
  .then(v => v + 1)     // 返回 2
  .then(v => v + 1)     // 返回 3
  .then(v => console.log(v))  // 3

// 关键：每个 .then 都返回一个 NEW Promise
```

### then 的返回值规则

```js
.then(onFulfilled) 的返回值 x，会经过 resolvePromise(p, x) 处理：

1. 返回普通值 → 包装为 Promise.resolve(值)
2. 返回 Promise → 等待这个 Promise 状态确定
3. 抛出错误 → 包装为 Promise.reject(错误)
4. 没返回 → Promise.resolve(undefined)
```

```js
Promise.resolve(1)
  .then(() => 2)                    // → Promise.resolve(2)
  .then(() => Promise.resolve(3))   // → 等内部 Promise → 3
  .then(() => { throw new Error() })// → Promise.reject(Error)
  .then(() => {})                   // 跳过，因为上一个 rejected
  .catch(() => 'recovered')         // → Promise.resolve('recovered')
```

### then 的第二个参数 vs catch

```js
// 写法一：then 的第二个参数
Promise.reject('err').then(
  v => console.log('ok', v),
  e => console.log('err', e)  // 只捕获上一个 Promise 的错误
)

// 写法二：catch
Promise.reject('err')
  .then(v => console.log('ok', v))
  .catch(e => console.log('err', e))  // 捕获整条链上的错误

// 区别：
Promise.resolve()
  .then(() => { throw new Error('1') }, e => console.log('a', e))
  // then 的第二个参数只捕获前一个 Promise 的错误
  // 不捕获自己的 then 回调内的错误！

Promise.resolve()
  .then(() => { throw new Error('1') })
  .catch(e => console.log('b', e))
  // catch 捕获整条链上任何地方的错误
  // ↓ 推荐
```

## Promise 静态方法

### Promise.all

```js
// 全部成功 → 结果数组
// 一个失败 → 立即 reject，其他忽略

Promise.all([
  fetch('/api/1'),
  fetch('/api/2'),
  fetch('/api/3')
])
.then(responses => Promise.all(responses.map(r => r.json())))
.then(data => { /* 都拿到了 */ })
.catch(err => { /* 任何一个失败都到这 */ })
```

**手写实现**：

```js
Promise.myAll = function(promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) return resolve([])
    const results = []
    let resolvedCount = 0
    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        val => {
          results[i] = val  // 用索引保持顺序
          if (++resolvedCount === promises.length) resolve(results)
        },
        reject  // 任何一个失败直接 reject
      )
    })
  })
}
```

### Promise.race

```js
// 谁先完成就返回谁（无论成功失败）

Promise.race([
  fetch('/api/slow'),
  new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
])
// 3 秒内没返回就 reject
```

### Promise.allSettled / any

```js
// allSettled：等全部完成，不管成功失败
Promise.allSettled([p1, p2]).then(results => {
  results.forEach(r => {
    if (r.status === 'fulfilled') console.log(r.value)
    else console.log(r.reason)
  })
})

// any：第一个成功的，全部失败才 reject
Promise.any([p1, p2]).then(value => { /* 有一个成功 */ })
```

## 与 async/await 的关系

```js
// async 函数始终返回 Promise
async function fn() {
  return 1
}
fn()  // Promise { <resolved> 1 }

// await = .then() 解包
const p = Promise.resolve(3)
const val = await p  // val = 3

// await 后面的代码是微任务
async function test() {
  console.log(1)
  await 2
  console.log(3)  // 微任务
}
test()
console.log(4)  // 同步
// 输出：1 4 3
```

### async/await 错误处理

```js
// 推荐：try-catch 包裹 await
async function fn() {
  try {
    const data = await fetch('/api')
  } catch (e) {
    console.log('请求失败', e)
  }
}

// 也可以 .catch 兜底
async function fn() {
  const data = await fetch('/api').catch(e => ({ error: e }))
}
```

## 在 Vue 2 源码中的体现

### $nextTick 的实现

```js
// nextTick 返回 Promise，所以可以 await
await Vue.nextTick()
// 等价于
Vue.nextTick().then(() => {})

// 实现：
export function nextTick(cb, ctx) {
  let _resolve
  callbacks.push(() => {
    if (cb) cb.call(ctx)
    if (_resolve) _resolve(ctx)  // 触发 await 继续
  })
  if (!pending) {
    pending = true
    timerFunc()  // Promise.resolve().then(flushCallbacks)
  }
  // 返回 Promise 以支持 await
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => { _resolve = resolve })
    // 把 resolve 存起来，flushCallbacks 里调用
  }
}
```

```js
// 使用时：
this.count = 1
await this.$nextTick()
// DOM 已更新
console.log(this.$el.textContent)  // '1'
```

### 异步组件加载

```js
// Vue 2
const AsyncComp = () => import('./AsyncComp.vue')
// import() 返回 Promise → Vue 在 resolve 后进行组件注册

// Vue 3
const AsyncComp = defineAsyncComponent(() => import('./AsyncComp.vue'))

// 带 loading 和 error
const AsyncComp = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue'),
  loadingComponent: Loading,
  errorComponent: Error,
  delay: 200,     // 200ms 后才显示 loading
  timeout: 3000   // 3s 超时
})
// 本质都是 Promise + 状态管理
```

## 经典面试题

### 题1：Promise 构造函数是同步的

```js
console.log(1)
new Promise(resolve => {
  console.log(2)  // 同步执行！
  resolve()
})
console.log(3)
// 输出：1 2 3
// .then 才是微任务，构造函数体是同步的
```

### 题2：微任务嵌套

```js
Promise.resolve().then(() => {
  console.log(1)
  Promise.resolve().then(() => console.log(2))
}).then(() => {
  console.log(3)
})
// 输出：1 2 3
// then(1) → 打印1 → 注册 then(2) → then(1)返回 undefined → then(3)入队
// → then(2) → 打印2 → then(3) → 打印3
```

### 题3：Promise 穿透

```js
Promise.resolve(1)
  .then((val) => { console.log(val) })
  .then()
  .then()
  .then((val) => { console.log(val) })
// 输出：1 undefined
// 空 .then() 把上一个值传递下去，但如果上一个 then 没有 return，值变成 undefined
```