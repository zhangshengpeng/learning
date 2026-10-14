# JavaScript 核心

> 面试高频考点，也是读懂 Vue 源码的基础。

## 目录

1. [原型链](./prototype.md) - `prototype` / `__proto__` / `instanceof` / Vue 2 数组劫持
2. [this 绑定](./this.md) - 5 种规则 / 优先级 / `call` `apply` `bind` / Vue `initMethods`
3. [闭包](./closure.md) - 形成条件 / 生命周期 / `defineReactive` 的 `val` 闭包
4. [事件循环](./event-loop.md) - 宏任务 / 微任务 / `$nextTick` / 异步批量更新
5. [Promise](./promise.md) - 状态机 / `then` 链 / `all` / `async`/`await`
6. [WeakMap / Map / Set](./weakmap.md) - 弱引用 / GC / Vue 3 响应式存储
7. [Proxy / Reflect](./proxy.md) - 13 种拦截 / `reactive` 实现 / 与 `defineProperty` 对比
8. [Class](./class.md) - 本质是语法糖 / `extends`/`super` / 为何 Vue 3 放弃 Class API