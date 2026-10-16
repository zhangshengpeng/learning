# Vue 2 面试高频考点 🔥

> 建议学完所有章节后再进行自测。每题先尝试口述，再看参考答案。

---

## 一、响应式系统

### Q1：Vue 2 是如何实现数据响应式的？请描述完整流程。

<details>
<summary>点击查看答案</summary>

Vue 2 通过 `Object.defineProperty` 劫持对象属性的 getter/setter，核心链路：

```
new Vue({ data }) → observe(data) → new Observer(data)
  → walk(obj) → defineReactive(obj, key, val)
    → Object.defineProperty(obj, key, { get, set })
      get: dep.depend() 收集当前 Watcher
      set: dep.notify() 通知所有 Watcher 更新
```

三个核心角色：
- **Observer**：劫持入口，遍历对象/数组，逐个属性调用 `defineReactive`
- **Dep**：每个属性持有一个 Dep，管理依赖列表，通知更新
- **Watcher**：依赖方（渲染、watch、computed），数据变化时收到通知执行回调

> 💡 **加分项**：数组另有一套机制——重写 7 个变异方法，因为 `Object.defineProperty` 无法监听索引操作和 `length` 变化

</details>

---

### Q2：Observer 如何处理对象和数组？有什么不同？

<details>
<summary>点击查看答案</summary>

**对象**：`walk(obj)` 遍历所有键，逐个 `defineReactive`：

```js
walk(obj) {
  for (let key of Object.keys(obj)) {
    defineReactive(obj, key)
  }
}
```

**数组**：两步走：
1. 修改数组原型链，指向重写后的 `arrayMethods`（劫持 push/pop/shift/unshift/splice/sort/reverse）
2. `observeArray(items)` 递归遍历数组每一项，如果是对象继续观测

```js
if (Array.isArray(value)) {
  protoAugment(value, arrayMethods)  // value.__proto__ = arrayMethods
  this.observeArray(value)            // 递归观测项
}
```

数组无法监听：① 索引直接赋值 `arr[0] = x` ② 修改 `length`。这两个场景需要用 `$set` / `splice`。

> 💡 **加分项**：Vue 3 用 Proxy 解决了这些问题，数组索引和 length 都能监听

</details>

---

### Q3：defineReactive 为什么用闭包存 val，而不是 `obj[key]`？

<details>
<summary>点击查看答案</summary>

劫持安装完成后，`obj[key]` 不再是普通属性访问，而是**触发 getter 函数**。在 getter 里写 `obj[key]` 会导致无限递归：

```js
// ❌ 死循环
get() { return obj[key] }  // obj[key] → 触发 getter → 又执行 get() → ...

// ✅ 闭包变量
get() { return val }        // val 是 defineReactive 的局部变量，走闭包通道
```

闭包形成的条件：getter/setter 定义在 `defineReactive` 内部，引用了外部局部变量 `val`，JS 引擎因此不会回收 `val`。

> 💡 **加分项**：`childOb = observe(val)` 也在利用同一个闭包——当 val 是对象时 childOb 指向 Observer 实例，基本类型时 childOb 为 undefined

</details>

---

### Q4：Dep.target 为什么用栈？什么时候会出现嵌套 Watcher？

<details>
<summary>点击查看答案</summary>

`Dep.target` 是全局单例，如果只是简单赋值/恢复，嵌套 Watcher 会导致依赖串位。

嵌套 Watcher 的典型场景：

```
渲染Watcher 求值中访问了 computedA
  → computedA 的 computed Watcher 临时成为 Dep.target
  → computedA 又访问了 data.x
  → data.x.getter → dep.depend() → 收集 computed Watcher ✅
  → computedA 求值完毕，popTarget
  → Dep.target 恢复为 渲染Watcher
```

用栈（`targetStack`）保证嵌套时 `Dep.target` 始终指向当前正在求值的 Watcher：

```js
pushTarget(target) { targetStack.push(target); Dep.target = target }
popTarget()        { targetStack.pop(); Dep.target = targetStack[last] }
```

> 💡 **加分项**：computed 依赖 computed 是嵌套最深的情况，不用栈的话外层渲染 Watcher 会丢失它的 Dep.target

</details>

---

### Q5：Watcher 分哪几种？分别有什么不同？

<details>
<summary>点击查看答案</summary>

| | 渲染 Watcher | 用户 Watcher | computed Watcher |
|:--|:----------|:----------|:-------------|
| 创建时机 | `$mount()` | `watch` / `$watch()` | `computed` 选项 |
| getter | `updateComponent` | 属性路径字符串 | 用户定义函数 |
| lazy | false（立即执行） | false | **true**（惰性） |
| update 行为 | `queueWatcher` 入队 | `queueWatcher` 入队 | `this.dirty = true` 标记 |
| dirty 机制 | 无 | 无 | 有：缓存值，标记脏才重算 |

computed 的核心：`dirty = true` 时只标记不计算，真正取值时才调用 getter，且只计算一次后缓存。

> 💡 **加分项**：computed Watcher 的 `get()` 中 `pushTarget`/`popTarget` 让 computed 内部的响应式数据也能收集到外层渲染 Watcher

</details>

---

### Q6：多次修改数据为什么只触发一次 DOM 更新？

<details>
<summary>点击查看答案</summary>

两个关键变量协作保证：

| 变量 | 作用 |
|:----|:-----|
| `waiting` | 保证 `nextTick(flushSchedulerQueue)` 只注册一次 |
| `has[id]` | 同一个 Watcher 不会重复入队 |

```js
// 修改 vm.name = 'C' → setter → dep.notify() → watcher.update()
update() {
  queueWatcher(this)  // 不是立即 run()，是入队！
}

queueWatcher(watcher) {
  if (has[id] != null) return   // ① 去重
  has[id] = true
  queue.push(watcher)
  if (!waiting) {                // ② 只注册一次
    waiting = true
    nextTick(flushSchedulerQueue)
  }
}
```

3 次 `name = 'A/B/C'` 都调用 `queueWatcher`，但 `has` 挡掉了后两次重复入队，`waiting` 挡掉了后两次 `nextTick`。微任务执行时取到最新值 `'C'`，只渲染一次。

> 💡 **加分项**：`$nextTick` 内部优先用 Promise（微任务），降级方案依次是 MutationObserver → setImmediate → setTimeout

</details>

---

### Q7：数组的 push 等操作是如何触发视图更新的？

<details>
<summary>点击查看答案</summary>

Vue 2 重写了数组的 7 个变异方法，在保持原功能的基础上额外调用了 `ob.dep.notify()`：

```js
methodsToPatch.forEach(method => {
  const original = Array.prototype[method]
  def(arrayMethods, method, function mutator(...args) {
    const result = original.apply(this, args)  // ① 执行原方法
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push': case 'unshift': inserted = args; break
      case 'splice': inserted = args.slice(2); break
    }
    if (inserted) ob.observeArray(inserted)    // ② 新增元素变响应式
    ob.dep.notify()                             // ③ 手动通知
    return result
  })
})
```

数组实例通过 `__proto__` 指向 `arrayMethods`，调用 push 时走的就是重写版本。注意数组的 `__ob__.dep` 是挂在数组本身上的，数组元素值的 dep 是各自独立的。

> 💡 **加分项**：非变异方法（filter/map/concat/slice）不会触发更新，因为它们返回新数组而不是修改原数组

</details>

---

### Q8：`$set` 原理是什么？为什么要用它？

<details>
<summary>点击查看答案</summary>

Vue 2 不能检测对象属性的添加和数组索引的赋值——因为 `Object.defineProperty` 是在初始化时完成的，后续新增的属性没有 getter/setter。

`$set` 的原理就是手动对新属性走一遍 `observe + defineReactive`，然后手动触发通知：

```js
Vue.prototype.$set = function(target, key, val) {
  if (Array.isArray(target)) {
    target.splice(key, 1, val)   // 数组走 splice（已劫持）
    return val
  }
  if (key in target) {
    target[key] = val            // 已有属性，直接赋值
    return val
  }
  const ob = target.__ob__
  if (!ob) {
    target[key] = val            // 非响应式对象，直接赋值
    return val
  }
  defineReactive(ob.value, key, val)  // 核心：对新增属性做劫持
  ob.dep.notify()                     // 手动通知更新
  return val
}
```

> 💡 **加分项**：Vue 3 的 Proxy 可以直接拦截属性新增，不再需要 `$set`

</details>

---

### Q9：`deep: true` 是如何工作的？有什么性能问题？

<details>
<summary>点击查看答案</summary>

`deep: true` 在 Watcher 首次 `get()` 时，递归遍历对象的所有子属性，触发它们的 getter，让当前 Watcher 被所有层级的 Dep 收集：

```js
if (this.deep) {
  traverse(value)  // 深度遍历
}

function traverse(val) {
  const seenObjects = new Set()     // 循环引用保护
  function _traverse(val) {
    if (Array.isArray(val)) {
      for (let item of val) _traverse(item)
    } else if (isPlainObject(val)) {
      if (seenObjects.has(val)) return
      seenObjects.add(val)
      for (let key of Object.keys(val)) {
        _traverse(val[key])  // 递归读取 → 触发 getter → 收集依赖
      }
    }
  }
  _traverse(val)
}
```

性能问题：一个大对象可能递归触发上千次 getter。优化方案：用字符串路径精确监听 `'user.profile.city'` 而不是整个 `user`。

> 💡 **加分项**：`traverse` 对基本类型不做处理，所以 `deep: true` 监听一个数字属性没有额外开销

</details>

---

### Q10：整个响应式系统的"心电图"是什么样的？

<details>
<summary>点击查看答案</summary>

```
new Vue({ data: { a: 1 } })
  │
  └─ observe(data) ──► Observer(data) ──► walk → defineReactive(data, 'a', 1)
                                           │
                                           └─► getter: dep.depend()
                                               setter: dep.notify()

$mount()
  │
  └─ new Watcher(vm, updateComponent)
       │
       └─ Watcher.get()
            pushTarget(this)           ← Dep.target = 渲染Watcher
            vm._render()               ← 读 data.a → 触发 getter → dep.depend()
            popTarget()                ← Dep.target = null

vm.a = 2
  │
  └─ setter: dep.notify()
       └─ watcher.update() → queueWatcher(this)
            └─ nextTick(flushSchedulerQueue) → watcher.run() → DOM = 2
```

> 💡 **满分回答**：Observer（劫持）→ Dep（收集）→ Watcher（桥梁）→ Scheduler（调度）→ DOM（落地）

</details>

---

## 二、实例初始化与生命周期

### Q11：`new Vue()` 到 `mounted` 发生了什么？

<details>
<summary>点击查看答案</summary>

```
new Vue(options)
  → this._init(options)
    → initLifecycle(vm)      // $parent/$root/$children/$refs
    → initEvents(vm)         // 事件监听
    → initRender(vm)         // $slots/$createElement
    → callHook(vm, 'beforeCreate')  // ⚠️ data/methods 不可访问
    → initInjections(vm)     // inject 注入
    → initState(vm)          // data → observe() 响应式化
    → initProvide(vm)        // provide
    → callHook(vm, 'created')       // ✅ data/methods 可访问，DOM 未挂载
  → vm.$mount(el)
    → compile template → render 函数（可选，运行时版跳过）
    → callHook(vm, 'beforeMount')
    → new Watcher(vm, updateComponent)
      → vm._render() → VNode 树
      → vm._update() → patch(el, vnode) → 创建真实 DOM
    → callHook(vm, 'mounted')        // ✅ DOM 已插入页面
```

关键节点：
- **beforeCreate → created**：`initState` 让 data 变响应式
- **created → beforeMount**：编译模板生成 render 函数
- **beforeMount → mounted**：首次渲染 + patch，DOM 插入页面

> 💡 **加分项**：`$mount` 会判断是否有 `render` 选项，有就直接用（如 SFC 编译结果），没有才从 template 编译

</details>

---

### Q12：父组件和子组件的生命周期钩子执行顺序是怎样的？

<details>
<summary>点击查看答案</summary>

**挂载阶段**（从外到内渲染）：

```
父 beforeCreate
  → 父 created
  → 父 beforeMount
    → 子 beforeCreate    ← 父渲染时发现子组件，开始初始化子
    → 子 created
    → 子 beforeMount
    → 子 mounted          ← 子先挂载完毕
  → 父 mounted            ← 父最后挂载完毕
```

**更新阶段**：

```
父 beforeUpdate
  → 子 beforeUpdate
  → 子 updated
  → 父 updated
```

**销毁阶段**（从外到内销毁）：

```
父 beforeDestroy
  → 子 beforeDestroy
  → 子 destroyed
  → 父 destroyed
```

> 💡 **加分项**：挂载是"先子后父"（要等子树全部就绪），销毁是"先父后子"（父触发销毁级联到子）

</details>

---

### Q13：`data` 为什么必须是函数而不能是对象？

<details>
<summary>点击查看答案</summary>

组件是可复用的。如果 `data` 是对象，所有组件实例共享同一份数据：

```js
// ❌ 对象：所有组件实例共用
data: { count: 0 }

// ✅ 函数：每个实例独立拷贝
data() { return { count: 0 } }
```

`initData` 中会调用 `data.call(vm)` 来获取数据，函数返回新对象保证了每个组件实例有独立的数据空间。

根实例 `new Vue({ data: {} })` 可以是对象，因为根实例只有一个。

> 💡 **加分项**：Vue 内部实现是 `data = isFunction(data) ? data.call(vm) : data`

</details>

---

### Q14：`computed` 和 `watch` 的区别？分别适用于什么场景？

<details>
<summary>点击查看答案</summary>

| | computed | watch |
|:--|:------|:-----|
| 本质 | 惰性求值的 Watcher (`lazy: true`) | 用户 Watcher |
| 缓存 | ✅ 依赖不变不重算 | ❌ 无缓存 |
| 返回值 | 必须 return | 不需要 return |
| 异步 | ❌ 不支持 | ✅ 支持 |
| 触发 | 依赖的属性变化时 | 监听的属性变化时 |

**使用场景：**

```js
// computed：适合派生值
computed: {
  fullName() { return this.firstName + ' ' + this.lastName }
}

// watch：适合副作用（异步请求、操作 DOM）
watch: {
  searchQuery(val) {
    this.fetchResults(val)  // 异步操作
  }
}
```

> 💡 **加分项**：computed 可以依赖另一个 computed，形成 computed 链，惰性求值保证链式依赖只计算一次

</details>

---

### Q15：`keep-alive` 包裹的组件有什么特殊的生命周期？

<details>
<summary>点击查看答案</summary>

`keep-alive` 组件在切换时不会被销毁，而是被缓存。有两个专属钩子：

```js
export default {
  // 从缓存中激活时调用（替代 created）
  activated() { /* 拉取最新数据 */ },
  // 被缓存时调用（替代 beforeDestroy）
  deactivated() { /* 清理定时器 */ }
}
```

内部实现：`keep-alive` 维护一个 `cache` 对象，用组件名或 key 作为键存储组件实例。切换时不走 `$destroy`，而是调用 `deactivated` 后保留在内存中。

> 💡 **加分项**：`keep-alive` 支持 `include`/`exclude` 白名单黑名单，`max` 限制缓存数量（LRU 淘汰）

</details>

---

## 三、虚拟 DOM 与 Diff

### Q16：什么是虚拟 DOM？为什么需要它？

<details>
<summary>点击查看答案</summary>

虚拟 DOM 是用 JavaScript 对象描述真实 DOM 结构的轻量抽象：

```js
// 真实 DOM
<div id="app" class="container"><span>hello</span></div>

// 虚拟 DOM
{
  tag: 'div',
  data: { attrs: { id: 'app' }, staticClass: 'container' },
  children: [{ tag: 'span', children: [{ text: 'hello' }] }]
}
```

**为什么需要？**
1. **跨平台**：VNode 不依赖浏览器 API，可用于 SSR、Weex
2. **批量更新**：在 JS 层做 diff，只把最小变更应用到真实 DOM
3. **声明式**：描述"界面应该是什么样"，不用关心"如何变化"

> 💡 **加分项**：虚拟 DOM 不是银弹——首次渲染比直接操作 DOM 慢（多了一层创建 VNode），更新场景才有优势

</details>

---

### Q17：Vue 2 的 diff 算法原理是什么？

<details>
<summary>点击查看答案</summary>

Vue 2 采用**同层比较 + 双端指针**策略，基于三个假设：

1. 只比较同层级，不跨层级
2. 同类型节点有相同结构（不同类型的直接替换）
3. key 作为唯一标识（有 key 可复用节点）

双端比较的四种命中策略：

```
旧数组: [A, B, C, D]
新数组: [D, A, B, C]

① 旧头 vs 新头：A vs D ❌
② 旧尾 vs 新尾：D vs C ❌
③ 旧头 vs 新尾：A vs C ❌
④ 旧尾 vs 新头：D vs D ✅ → 把 D 移到最前面
```

都不命中时才用 key 做 Map 查找，找不到就创建新节点。

> 💡 **加分项**：为什么需要 key？没有 key 时 `sameVnode` 复用的前提更宽松，可能导致不该复用的节点被复用（如 input 状态错乱）

</details>

---

### Q18：为什么 `v-for` 必须绑定 `key`？没有 `key` 会怎样？

<details>
<summary>点击查看答案</summary>

`key` 是 diff 算法中识别节点是否可复用的核心标识之一：

```js
function sameVnode(a, b) {
  return (
    a.key === b.key &&       // ← key 相同才能进入 patchVnode
    a.tag === b.tag &&
    ...
  )
}
```

**没有 key 的后果**：

```
旧：[input-A, input-B, input-C]    用户分别在三个输入框填了 1、2、3
新：[input-D, input-A, input-B, input-C]   头部插入 D

没有 key：sameVnode 只看 tag 相同 → "就地复用"
  → A 被当成 D，B 被当成 A，C 被当成 B，新建 C
  → 用户填的 1/2/3 会错位！

有 key：
  → D key 不匹配 → 新建 D 插入头部
  → A/B/C key 匹配 → 原样复用 ✅
```

> 💡 **加分项**：不建议用 index 作 key，因为数组增删时 index 会变，key 实际上失去了标识作用

</details>

---

### Q19：`v-if` 和 `v-show` 的区别？从源码角度怎么理解？

<details>
<summary>点击查看答案</summary>

| | v-if | v-show |
|:--|:---|:------|
| 编译产物 | 三元表达式/`_vm._v("")` | `directives: { show: value }` |
| DOM 操作 | 条件为 false 时不创建 VNode→不渲染 | 始终渲染，通过 CSS `display` 切换 |
| 生命周期 | 切换时触发 created/destroyed | 不触发 |
| 初始渲染成本 | 低（false 时跳过） | 高（始终渲染） |
| 切换成本 | 高（销毁+重建） | 低（只改 CSS） |

```js
// v-if 编译为三元表达式
// <div v-if="show">A</div><div v-else>B</div>
// → show ? _c('div', [_v('A')]) : _c('div', [_v('B')])
```

```js
// v-show 编译为指令，patchVnode 时处理
// el.style.display = value ? '' : 'none'
```

> 💡 **加分项**：频繁切换用 `v-show`，条件很少改变用 `v-if`。`v-if` 还支持 `v-else-if` 和 `v-else`

</details>

---

### Q20：patch 过程中如何判断是"首次渲染"还是"更新"？

<details>
<summary>点击查看答案</summary>

```js
Vue.prototype._update = function(vnode) {
  const prevVnode = this._vnode   // 上一次的 VNode
  this._vnode = vnode             // 缓存本次

  if (!prevVnode) {
    // 首次渲染：prevVnode 不存在
    this.$el = this.__patch__(this.$el, vnode)
  } else {
    // 更新：新旧 VNode 都走 patch
    this.$el = this.__patch__(prevVnode, vnode)
  }
}
```

`patch` 函数内部：

```js
function patch(oldVnode, vnode) {
  if (isUndef(oldVnode)) {
    createElm(vnode)              // 组件初次挂载
  } else if (isRealElement) {
    oldVnode = emptyNodeAt(oldVnode)  // 首次渲染：$el 是真实 DOM
  } else if (sameVnode(oldVnode, vnode)) {
    patchVnode(oldVnode, vnode)   // 更新：VNode vs VNode
  } else {
    // 不同节点，直接替换
  }
}
```

首次渲染时 `$el` 是真实 DOM（占位元素），被转为空 VNode 后直接替换。

> 💡 **加分项**：`_update` 的缓存机制也用于 `$forceUpdate`——调用时把当前 `_vnode` 和新的对比

</details>

---

### Q20-1：VNode 的结构是怎样的？有哪些类型？

<details>
<summary>点击查看答案</summary>

VNode 是一个 class 实例，核心属性：

```js
class VNode {
  constructor(tag, data, children, text, elm, context, componentOptions) {
    this.tag = tag           // 标签名（'div'）或组件构造函数
    this.data = data         // attrs、props、on、style、class 等
    this.children = children // 子节点数组
    this.text = text         // 文本内容（文本节点用）
    this.elm = elm           // 对应的真实 DOM 节点
    this.key = data && data.key // diff 优化的关键
    this.context = context   // 所在组件实例

    // 组件相关
    this.componentOptions = componentOptions
    this.componentInstance = undefined

    // 编译优化标记
    this.isStatic = false    // 静态节点
    this.isComment = false   // 注释节点
    this.isOnce = false      // v-once
    this.isCloned = false    // 克隆节点（静态节点复用）
  }
}
```

**VNode 的六种类型**：

| 类型 | tag | text | 其他特征 | 示例 |
|:--|:--|:--|:--|:--|
| 文本节点 | `undefined` | `"hello"` | `children: undefined` | `_v("hello")` |
| 元素节点 | `"div"` | `undefined` | `children: [...]` | `_c("div", [...])` |
| 注释节点 | `undefined` | `""` | `isComment: true` | `v-if=false` 占位 |
| 组件节点 | 组件构造器 | `undefined` | `componentOptions: {...}` | `_c(MyComp)` |
| 克隆节点 | 同原节点 | 同原节点 | `isCloned: true` | 静态节点复用 |
| 空节点 | `undefined` | `""` | `isComment: true` | `_e()` |

> 💡 **加分项**：Vue 3 的 VNode 结构和 Vue 2 一脉相承，但增加了 `shapeFlag` 位运算标记节点类型，判断更快

</details>

---

### Q20-2：VNode 是如何变成真实 DOM 的？`createElm` 的完整流程？

<details>
<summary>点击查看答案</summary>

```js
function createElm(vnode, parentElm, refElm) {
  const data = vnode.data
  const children = vnode.children
  const tag = vnode.tag

  if (isDef(tag)) {
    // ── 元素节点 / 组件节点 ──
    vnode.elm = nodeOps.createElement(tag, vnode)
    createChildren(vnode, children)       // 递归创建子节点
    if (isDef(data)) invokeCreateHooks(vnode) // 设置属性/事件/样式
    insert(parentElm, vnode.elm, refElm)  // 插入父节点

  } else if (isTrue(vnode.isComment)) {
    // ── 注释节点 ──
    vnode.elm = nodeOps.createComment(vnode.text)
    insert(parentElm, vnode.elm, refElm)

  } else {
    // ── 文本节点 ──
    vnode.elm = nodeOps.createTextNode(vnode.text)
    insert(parentElm, vnode.elm, refElm)
  }
}
```

**递归示例**：

```
template: <div class="box"><span>hello</span></div>

createElm(div)
  → document.createElement('div')
  → createElm(span)
      → document.createElement('span')
      → createElm("hello")
          → document.createTextNode("hello")
          → span.appendChild(textNode)
      → span
  → div.appendChild(span)
  → invokeCreateHooks: 设置 class="box"
  → parentElm.appendChild(div)
```

> 💡 **加分项**：`invokeCreateHooks` 不是单独一个函数，而是调用 `cbs.create` 数组中的所有钩子——包括更新 attrs、class、style、绑定事件、绑定指令等

</details>

---

### Q20-3：`sameVnode` 的判断条件是什么？为什么这样设计？

<details>
<summary>点击查看答案</summary>

```js
function sameVnode(a, b) {
  return (
    a.key === b.key &&              // key 必须一致
    a.tag === b.tag &&              // 标签类型必须相同
    a.isComment === b.isComment &&  // 同是注释或同不是
    isDef(a.data) === isDef(b.data) && // 都有/都没有 data
    sameInputType(a, b)             // input type 相同（text/radio/...）
  )
}
```

**每个条件的用意**：

| 条件 | 为什么？ | 反例 |
|:--|:--|:--|
| `key ===` | key 是节点唯一标识，key 不同说明不是同一个节点 | `<li key="1">` vs `<li key="2">` 不可复用 |
| `tag ===` | 不同标签结构不同，无法复用 | `<p>` 不能复用成 `<div>` |
| `isComment ===` | 注释和元素完全不同的节点类型 | 注释节点不能当元素节点用 |
| `data` 存在性一致 | 有 data 和没 data 的节点处理路径不同 | 带指令的 span 不能复用为纯文本 span |
| `sameInputType` | `<input type="text">` 和 `<input type="radio">` 行为差异大 | type 变了表单状态会乱 |

**为什么不是"完全相同才复用"？**

Vue 2 采用**宁可复用也不新建**的策略——因为创建 DOM + 销毁旧 DOM 的成本远高于更新属性。只要 `sameVnode` 为 true，就进入 `patchVnode` 做细粒度比较，而不是整个替换。

```js
if (sameVnode(oldVnode, vnode)) {
  patchVnode(oldVnode, vnode)  // 复用旧 DOM，只更新变化
} else {
  // 创建新 DOM，删除旧 DOM
  createElm(vnode)
  nodeOps.removeChild(parentElm, oldVnode.elm)
}
```

> 💡 **加分项**：Vue 3 的 `sameVnode` 增加了 `type`（相当于 Vue 2 的 tag）和 key，判断更加紧凑

</details>

---

### Q20-4：`updateChildren` 双端比较的四种命中策略分别处理什么场景？

<details>
<summary>点击查看答案</summary>

双端指针：`oldStartIdx` / `newStartIdx` 从头部向右，`oldEndIdx` / `newEndIdx` 从尾部向左。

```
旧数组: [A, B, C, D]
          ↑        ↑
        oldS      oldE

新数组: [A, D, B, C]
          ↑        ↑
        newS      newE
```

**① 旧头 vs 新头（sameVnode）—— 都不动，进入 patch**

```
适用：头部不变，如 push 新元素到末尾
旧: [A, B, C]      新: [A, B, C, D]
     ↑ →        →     ↑ →        →
   patch A-A → oldS++/newS++
   patch B-B → oldS++/newS++
   patch C-C → oldS > oldE → addVnodes(D)
```

**② 旧尾 vs 新尾（sameVnode）—— 都不动，进入 patch**

```
适用：尾部不变，如 unshift 新元素到头部
旧: [A, B, C]      新: [D, A, B, C]
     ←        ←      ←        ←
   patch C-C → oldE--/newE--
   patch B-B → oldE--/newE--
   patch A-A → oldS > oldE → addVnodes(D)
```

**③ 旧头 vs 新尾（sameVnode）—— 节点右移**

```
适用：头部元素被移到末尾
旧: [A, B, C, D]    新: [B, C, D, A]
     ↑                          ↑
   A 在旧数组头部、新数组尾部 → insertBefore(parent, A.elm, D.elm.nextSibling)
   效果：把 A 移到 D 后面 → oldS++, newE--
```

**④ 旧尾 vs 新头（sameVnode）—— 节点左移**

```
适用：尾部元素被移到开头
旧: [A, B, C, D]    新: [D, A, B, C]
              ↑        ↑
   D 在旧数组尾部、新数组头部 → insertBefore(parent, D.elm, A.elm)
   效果：把 D 移到 A 前面 → oldE--, newS++
```

**⑤ 四种均不命中 → key 查找**

```js
oldKeyToIdx = { A:0, B:1, C:2, D:3 }
idxInOld = oldKeyToIdx[newStartVnode.key] // 通过 key 找到在旧数组的索引
```

**四种策略覆盖了 90% 的常见 DOM 操作**（增加、删除、移动、反转），都是 O(1) 命中，无需遍历查找。

> 💡 **加分项**：React 的 diff 是单向遍历（只从头部开始），Vue 2 的双端比较在反转场景下明显优于 React

</details>

---

### Q20-5：`patchVnode` 内部做了什么？有哪些优化？

<details>
<summary>点击查看答案</summary>

```js
function patchVnode(oldVnode, vnode) {
  // ① 同一个 VNode 引用，直接跳过
  if (oldVnode === vnode) return

  const elm = (vnode.elm = oldVnode.elm) // 复用旧 DOM
  const oldCh = oldVnode.children
  const ch = vnode.children

  // ② 静态节点优化：直接跳过
  if (vnode.isStatic && oldVnode.isStatic && vnode.key === oldVnode.key) {
    vnode.componentInstance = oldVnode.componentInstance
    return
  }

  // ③ 非文本节点：比较 children
  if (isUndef(vnode.text)) {
    if (isDef(oldCh) && isDef(ch)) {
      // 新旧都有 children → 核心 Diff
      if (oldCh !== ch) updateChildren(elm, oldCh, ch)
    } else if (isDef(ch)) {
      // 只有新 children：清空旧文本 → 新增
      if (isDef(oldVnode.text)) setTextContent(elm, '')
      addVnodes(elm, null, ch, 0, ch.length - 1)
    } else if (isDef(oldCh)) {
      // 只有旧 children：删除
      removeVnodes(oldCh, 0, oldCh.length - 1)
    } else if (isDef(oldVnode.text)) {
      // 旧文本 → 新空：清空文本
      setTextContent(elm, '')
    }
  }
  // ④ 文本节点：直接设置
  else if (oldVnode.text !== vnode.text) {
    setTextContent(elm, vnode.text)
  }
}
```

**三种优化场景总结**：

| 场景 | oldVnode | vnode | 处理 |
|:--|:--|:--|:--|
| 静态节点 | `isStatic: true` | `isStatic: true` | 直接跳过，0 开销 |
| 同引用 | `=== vnode` | `=== oldVnode` | 直接跳过 |
| children 更新 | 有 oldCh | 有 ch | 进入 updateChildren |
| 新增 children | 文本/无 | 有 ch | addVnodes |
| 删除 children | 有 oldCh | 无/文本 | removeVnodes |

> 💡 **加分项**：静态节点跳过是编译优化的成果——`optimize` 阶段标记了 `isStatic`，运行时 patch 零开销

</details>

---

### Q20-6：虚拟 DOM 一定比直接操作真实 DOM 快吗？

<details>
<summary>点击查看答案</summary>

**不一定。分场景讨论：**

```
┌────────────────────────────────────────────────┐
│  首次渲染                                       │
│  虚拟 DOM: create VNode → createElm → DOM      │
│  直接操作: create DOM                           │
│  → 虚拟 DOM 多了一层 VNode 创建，反而更慢        │
├────────────────────────────────────────────────┤
│  小范围更新（改一个文本）                        │
│  虚拟 DOM: render → diff → patchText            │
│  直接操作: el.textContent = 'new'               │
│  → 直接操作更快，虚拟 DOM 有 diff 开销          │
├────────────────────────────────────────────────┤
│  大范围更新（列表重排/大量变更）                 │
│  虚拟 DOM: diff 找出最小变更 → 批量 DOM 操作     │
│  直接操作: 逐个 DOM 操作、频繁回流重绘          │
│  → 虚拟 DOM 显著更快（关键优势场景）             │
└────────────────────────────────────────────────┘
```

**核心逻辑**：虚拟 DOM 不是来拼性能极限的，而是：

1. **让开发者脱离 DOM 操作，写出声明式代码**——这是最大价值
2. **抹平平台差异**——同一套 VNode 可渲染到 DOM、Canvas、Native
3. **在大型应用中，批量 diff 后再操作 DOM 比零散操作有效得多**

> 💡 **加分项**：Vue 3 的 Block Tree 进一步缩小了 diff 范围，只对比动态节点，让虚拟 DOM 的性能逼近手写 DOM 操作

</details>

---

### Q20-7：Vue 的虚拟 DOM 是如何实现跨平台的？

<details>
<summary>点击查看答案</summary>

Vue 把平台相关操作抽离成 **`nodeOps`** 和 **`modules`** 两个抽象层：

```js
// src/platforms/web/runtime/node-ops.js  —— 浏览器平台
const nodeOps = {
  createElement: (tagName) => document.createElement(tagName),
  createTextNode: (text) => document.createTextNode(text),
  insertBefore: (parent, child, ref) => parent.insertBefore(child, ref),
  removeChild: (parent, child) => parent.removeChild(child),
  setTextContent: (node, text) => { node.textContent = text },
  // ...
}

// src/platforms/weex/runtime/node-ops.js  —— Weex 平台
const nodeOps = {
  createElement: (tagName) => weexDocument.createElement(tagName),
  // ...Weex 专属 API
}
```

```js
// src/core/vdom/patch.js  —— 核心逻辑不依赖平台
export function createPatchFunction({ nodeOps, modules }) {
  return function patch(oldVnode, vnode) {
    // 所有 DOM 操作都通过 nodeOps 调用，不直接碰 document
    nodeOps.createElement(...)
    nodeOps.insertBefore(...)
  }
}
```

```
┌──────────────────────────────────┐
│     Vue 核心（vdom/patch）       │  ← 纯 JS 逻辑，与平台无关
│     createElm / diff / patchVnode │
└──────────┬───────────────────────┘
           │  依赖注入
    ┌──────┴──────┬──────────┐
    ▼             ▼          ▼
  浏览器        Weex      自定义
  (DOM API)   (Native)   (Canvas/SSR)
```

> 💡 **加分项**：Vue 3 更进一步，把 `nodeOps` 统一到 `RendererOptions` 接口，`createRenderer` 工厂函数创建不同平台的渲染器

</details>

---

### Q20-8：为什么 Vue 不使用 `requestIdleCallback` 做时间切片？

<details>
<summary>点击查看答案</summary>

React Fiber 用 `requestIdleCallback`（或 polyfill）把 diff 拆成可中断的小任务，Vue 2/3 都没有这么做。

**原因**：

| | React 16+（Fiber） | Vue 2 & 3 |
|:--|:--|:--|
| 更新粒度 | 组件级别（大） | 组件 + 属性级别（小） |
| diff 范围 | 整棵 Fiber 树 | Block Tree 只 diff 动态节点 |
| 是否需要时间切片 | 是（diff 耗时长） | 否（diff 已经很快） |

**Vue 的选择**：

```
React: "I don't know what changed, let me diff the whole tree"
       → diff 太慢 → 需要时间切片避免掉帧

Vue:  "I know exactly what changed (响应式 + Block Tree)"
       → diff 只针对变化的部分 → 粒度够细，不需要时间切片
```

**具体优化链**：

```
数据变化 → Dep.notify → 组件级 Watcher → render → VNode
  → 静态节点跳过（编译优化）
  → PatchFlag 靶向更新（Vue 3）
  → Block Tree 只比动态节点（Vue 3）
  → diff 粒度已经极小，不会阻塞主线程
```

> 💡 **加分项**：时间切片不是银弹——它有调度开销、会让渲染变慢。Vue 的策略是"让 diff 本身够快，而不是把慢的 diff 切片"

</details>

---

### Q20-9：`v-once` 和 `v-memo`（Vue 3）在虚拟 DOM 层面做了什么？

<details>
<summary>点击查看答案</summary>

**v-once（Vue 2 & 3）**：

```html
<span v-once>{{ heavyComputation }}</span>
```

编译后：

```js
// 标记 isOnce，缓存 VNode
var _cache = this._staticTrees || (this._staticTrees = [])
var tree = _cache[0]
if (!tree) {
  tree = _cache[0] = _c('span', [_v(_s(heavyComputation))])
}
return tree
```

`patchVnode` 中：

```js
if (vnode.isStatic && oldVnode.isStatic && vnode.key === oldVnode.key) {
  vnode.componentInstance = oldVnode.componentInstance
  return  // ← 直接跳过，不做任何比较
}
```

**v-memo（Vue 3 新增）**：

```html
<div v-for="item in list" :key="item.id" v-memo="[item.value]">
  {{ expensiveRender(item) }}
</div>
```

- 缓存上一次 VNode，只有依赖 `[item.value]` 变化时才重新渲染
- 编译为 `openBlock` + `setBlockTracking(-1)` 跳过该子树的追踪
- 比 `v-once` 更灵活：不是永远不更新，而是按条件更新

> 💡 **加分项**：`v-memo` 配合 `v-for` 使用可实现"只渲染变化的行"，在大列表性能优化中非常实用

</details>

---

## 四、模板编译

### Q21：Vue 的模板编译分哪三步？每步做了什么？

<details>
<summary>点击查看答案</summary>

```
template: "<div>{{ msg }}</div>"
    │
    ├── ① Parse（解析）
    │     template → AST
    │     栈结构维护嵌套关系，逐 token 构建 AST 节点
    │
    ├── ② Optimize（优化）
    │     遍历 AST，标记静态节点和静态根节点
    │     markStatic() → markStaticRoots()
    │
    ├── ③ Codegen（代码生成）
    │     AST → render 函数字符串 → new Function
    │
    ▼
render: function() { return _c('div', [_v(_s(msg))]) }
```

编译时机：
- **运行时**：`new Vue({ template: '...' })`，使用完整版 vue.js
- **构建时**：`vue-loader` + webpack 预编译 `.vue` 文件，使用运行时版

> 💡 **加分项**：构建时编译更优——减少运行时体积且编译结果可被缓存

</details>

---

### Q22：模板编译中的静态标记有什么用？

<details>
<summary>点击查看答案</summary>

`optimize` 阶段标记静态节点后，patch 过程可以跳过它们：

```js
// 静态节点判断
function isStatic(node) {
  if (node.type === 2) return false        // 表达式文本
  if (node.type === 3) return true          // 纯文本
  return !node.if && !node.for && ...       // 元素节点
}
```

```js
// patchVnode 中的静态节点处理
if (vnode.isStatic && oldVnode.isStatic && vnode.key === oldVnode.key) {
  vnode.componentInstance = oldVnode.componentInstance
  return  // ← 直接跳过，不比较子节点！
}
```

**收益**：
1. 跳过整个子树的 diff
2. 静态根节点的 render 函数被提取到 `staticRenderFns`，只执行一次后缓存

> 💡 **加分项**：`v-once` 也是通过静态标记优化的——`v-once` 内部所有内容被视为静态

</details>

---

### Q23：`v-if`、`v-for`、`v-once` 在编译阶段是怎样处理的？

<details>
<summary>点击查看答案</summary>

**`v-for`**：优先级最高，先处理。`processFor` 解析 `"item in list"` 为 `{ alias: 'item', for: 'list' }`，`genFor` 生成 `_l` 渲染列表函数：

```js
// v-for="item in list"
// → _l((list), function(item) { return _c(...) })
```

**`v-if`**：`processIf` 为每个条件分支生成独立 AST 节点，通过 `ifConditions` 数组串联。`genIf` 生成三元表达式：

```js
// v-if="a" / v-else-if="b" / v-else
// → a ? genA() : b ? genB() : genC()
```

**`v-once`**：`processOnce` 标记 `el.once = true`。`genOnce` 把元素转换为静态节点，渲染函数提取到 `staticRenderFns`，后续永远走缓存。

> 💡 **加分项**：`v-for` 优先级高于 `v-if`，同时使用时 `v-if` 在 `v-for` 内部执行——每个循环项都会判断条件，性能较差

</details>

---

### Q24：插值表达式 `{{ msg }}` 是如何编译成可执行代码的？

<details>
<summary>点击查看答案</summary>

`parseText` 用正则将 `{{ }}` 拆分为静态文本和动态表达式两部分：

```js
// "Hello {{ name }}, age: {{ age }}"
// → "_v('Hello '+_s(name)+', age: '+_s(age))"

function parseText(text) {
  const tagRE = /\{\{((?:.|\r?\n)+?)\}\}/g
  if (!tagRE.test(text)) return       // 纯文本不处理

  const tokens = []
  let lastIndex = 0, match
  while ((match = tagRE.exec(text))) {
    if (match.index > lastIndex) {
      tokens.push(JSON.stringify(text.slice(lastIndex, match.index)))  // 静态部分
    }
    tokens.push(`_s(${match[1].trim()})`)  // 动态部分
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    tokens.push(JSON.stringify(text.slice(lastIndex)))  // 尾部静态部分
  }
  return tokens.join('+')
}
```

- `_s` = toString，转换值为字符串
- `_v` = createTextVNode，创建文本 VNode

> 💡 **加分项**：纯静态文本（不含 `{{ }}`）直接走 AST type === 3，生成 `_v("纯文本")`

</details>

---

### Q25：`v-model` 的编译原理是什么？

<details>
<summary>点击查看答案</summary>

`v-model` 本质是语法糖，相当于 `v-bind + v-on` 的组合。编译阶段按不同表单元素生成不同代码：

```js
// input text: <input v-model="msg">
// → {
//   attrs: { value: msg },
//   on: { input: function($event) {
//     if ($event.target.composing) return
//     msg = $event.target.value
//   }}
// }

// checkbox: <input type="checkbox" v-model="checked">
// → {
//   attrs: { checked: Array.isArray(checked) ? checked.includes(value) : checked },
//   on: { change: function($event) { /* 数组 push/splice 或直接赋值 */ } }
// }

// select: <select v-model="selected">
// → { attrs: { value: selected }, on: { change: function($event) { selected = value } } }
```

各元素差异：
| 元素 | 绑定属性 | 绑定事件 |
|:----|:-------|:-------|
| text/textarea | `value` | `input` |
| checkbox | `checked` | `change` |
| radio | `checked` | `change` |
| select | `value` | `change` |

> 💡 **加分项**：`v-model` 支持 `.lazy`（替换为 `change` 事件）、`.number`（parseFloat）、`.trim` 三个修饰符

</details>

---

## 五、综合题

### Q26：Vue 2 和 Vue 3 的响应式实现有什么区别？

<details>
<summary>点击查看答案</summary>

| | Vue 2 | Vue 3 |
|:--|:----|:-----|
| 劫持方式 | `Object.defineProperty` | `Proxy` |
| 监听属性新增 | ❌ 需要 `$set` | ✅ 自动监听 |
| 监听数组索引 | ❌ 无法监听 | ✅ 自动监听 |
| 监听数组 length | ❌ 无法监听 | ✅ 自动监听 |
| 性能 | 初始化递归遍历所有属性 | 惰性——只有访问到的才递归代理 |
| 兼容性 | IE9+ | 不支持 IE |
| 对象代理 | 整个对象一次性劫持 | 可逐层惰性代理 |

```js
// Vue 2：初始化时一次性全部劫持
Object.keys(obj).forEach(key => defineReactive(obj, key, obj[key]))

// Vue 3：Proxy 惰性代理
new Proxy(obj, {
  get(target, key) {
    const res = Reflect.get(target, key)
    track(target, key)                    // 依赖收集
    return isObject(res) ? reactive(res)  // 惰性：访问到才深层代理
  },
  set(target, key, value) {
    Reflect.set(target, key, value)
    trigger(target, key)                  // 触发更新
  }
})
```

> 💡 **加分项**：Vue 3 响应式系统解耦为独立包 `@vue/reactivity`，不再依赖 Vue 实例

</details>

---

### Q27：`nextTick` 的实现原理？

<details>
<summary>点击查看答案</summary>

`$nextTick` 的原理是**将回调推迟到 DOM 更新之后执行**（微任务），从而能获取更新后的 DOM。

```js
const callbacks = []
let pending = false

function nextTick(cb, ctx) {
  callbacks.push(() => { cb.call(ctx) })
  if (!pending) {
    pending = true
    timerFunc()  // 注册微任务/宏任务
  }
}
```

降级策略（优先级从高到低）：

```
Promise.resolve()       // 微任务 1：首选
  → MutationObserver    // 微任务 2：Promise 降级
    → setImmediate      // 宏任务 1：Node/IE
      → setTimeout(0)   // 宏任务 2：兜底
```

Vue 内部有两个用法：
1. **flushSchedulerQueue**：`waiting` 保证只注册一次
2. **用户 `$nextTick`**：和 flush 共用同一个 `callbacks` 数组

```js
// 这使得以下代码可以获取更新后的 DOM
this.msg = 'hello'
this.$nextTick(() => {
  console.log(this.$el.textContent) // 'hello'
})
```

> 💡 **加分项**：Vue 2.6+ 改为完全用微任务（Promise），不再用宏任务降级方案

</details>

---

### Q28：请描述 Vue 2 从数据修改到视图更新的完整链路

<details>
<summary>点击查看答案</summary>

```
vm.name = 'Bob'
  │
  ├─► setter(name) [闭包 val 更新为 'Bob']
  │     ├─► dep.notify()
  │     │     └─► subs.forEach(watcher => watcher.update())
  │     │           ├─► 渲染 Watcher.update()
  │     │           ├─► watch Watcher.update()
  │     │           └─► computed Watcher.update() → dirty = true
  │     │
  │     └─► childOb = observe('Bob') → undefined (基本类型)
  │
  ├─► queueWatcher(渲染Watcher)
  │     ├─► has[id] = true（去重）
  │     └─► waiting = true → nextTick(flushSchedulerQueue)
  │
  │   [同步代码继续执行...]
  │
  └─► [微任务队列]
        └─► flushSchedulerQueue()
              ├─► queue.sort(by id)（父→子）
              ├─► handler.before()（触发 beforeUpdate 钩子）
              ├─► watcher.run()
              │     └─► this.get()
              │           ├─► pushTarget(this)
              │           ├─► vm._render() → 新 VNode 树（name='Bob'）
              │           ├─► vm._update(newVNode)
              │           │     └─► patch(oldVNode, newVNode)
              │           │           ├─► patchVnode → updateChildren (diff)
              │           │           └─► 更新真实 DOM
              │           └─► popTarget()
              ├─► callUpdatedHooks()（触发 updated 钩子）
              └─► resetSchedulerState()
```

> 💡 **满分回答**：一条数据修改的旅程 = setter 更新 val → dep 通知 watcher → 异步队列攒批 → 微任务统一执行 → 重新渲染 patch 到 DOM。每一步都有精妙的设计考量。

</details>

---

<br>

> **自测建议**：先遮住答案口述 → 再对照看 → 最后用自己的话重新表述一遍。能用自己的话说清楚，才算真正理解了。

---

## 六、Vue 3 新特性（15 题）

### Q29：Vue 2 和 Vue 3 的响应式原理有什么本质区别？

<details>
<summary>点击查看答案</summary>

| | Vue 2 | Vue 3 |
|:--|:----|:-----|
| 劫持方式 | `Object.defineProperty` | `Proxy` |
| 属性新增 | ❌ `$set` | ✅ 自动 |
| 属性删除 | ❌ `$delete` | ✅ `deleteProperty` 陷阱 |
| 数组索引 | ❌ | ✅ |
| 数组 length | ❌ | ✅ |
| 性能 | 初始化递归全部属性 | **惰性代理**：访问时才深层转换 |
| 存储 | `__ob__` 挂载标记 | `WeakMap` 外挂存储 |

```js
// Vue 3 惰性代理的核心优势
const data = reactive({
  deep: { nested: { veryDeep: { count: 0 } } }
})
// reactive 只代理了 data 本身！
// data.deep 在被访问时才被 reactive 包装
// → 深层嵌套不变的对象几乎没有性能开销
```

> 💡 **加分项**：响应式与 Vue 实例解耦，`@vue/reactivity` 可独立使用

</details>

---

### Q30：Proxy 比 `Object.defineProperty` 好在哪里？

<details>
<summary>点击查看答案</summary>

1. **拦截能力更强**：Proxy 支持 13 种拦截操作

```js
// defineProperty 只能拦截 get/set
Object.defineProperty(obj, 'key', { get, set })

// Proxy 支持更多拦截
new Proxy(obj, {
  get, set, deleteProperty,      // 读写删
  has,                           // in 操作符
  ownKeys,                       // Object.keys()
  getOwnPropertyDescriptor,      // Object.getOwnPropertyDescriptor()
  defineProperty,                // Object.defineProperty()
  preventExtensions,             // Object.preventExtensions()
  getPrototypeOf, setPrototypeOf,// 原型链
  isExtensible,                  // Object.isExtensible()
  apply, construct               // 函数调用/new
})
```

2. **性能更好**：惰性代理，不像 Vue 2 初始化时递归所有属性
3. **健壮性**：不会在原对象上挂 `__ob__` 等标记
4. **支持数组**：直接监听索引和 `length`

> 💡 **加分项**：Proxy 兼容性（不支持 IE11）恰恰是 Vue 3 抛弃 IE 的主要原因

</details>

---

### Q31：`ref` 和 `reactive` 的区别？什么时候用哪个？

<details>
<summary>点击查看答案</summary>

| | ref | reactive |
|:--|:---|:--------|
| 参数类型 | 任何类型 | 仅对象 |
| 访问 | `.value` | 直接 `.property` |
| 模板中 | 自动解包 `.value` | 直接使用 |
| 解构 | `toRefs` 后保持响应式 | 直接解构丢失响应式 |
| 整体替换 | `ref.value = newVal` ✅ | `assign` 会丢失 ❌ |

```ts
// reactive 的陷阱
const state = reactive({ count: 0 })
state.count = 1       // ✅ 响应式
let { count } = state  // ❌ 解构后 count 是普通 number

// ref 的好处
const count = ref(0)
count.value = 1        // ✅ 响应式
const c = count        // ✅ 可以自由传递，c 也是响应式引用
function useCount() { return count }  // ✅ 自由返回
```

> 💡 **实际建议**：Vue 官方推荐在业务代码中**优先使用 ref**，因为 ref 按值传递更灵活。reactive 适合表单对象等场景。

</details>

---

### Q32：Composition API 解决了 Options API 的什么问题？

<details>
<summary>点击查看答案</summary>

**核心问题**：当组件功能复杂时，同一个功能的代码分散在 data、methods、computed、watch 等选项中，难以维护。

**Composition API 的解决**：

```js
// ❌ Options API：搜索功能散落在 4 个选项
{
  data() { return { keyword: '', results: [] } },
  watch: { keyword: 'search' },
  methods: { search() {} },
  mounted() { this.search() }
}

// ✅ Composition API：搜索功能封装在一起
function useSearch() {
  const keyword = ref('')
  const results = ref([])
  const search = async () => { results.value = await fetch(keyword.value) }
  watch(keyword, search)
  onMounted(search)
  return { keyword, results, search }
}
```

与 Mixins 对比的优势：

| | Mixins | Composables |
|:--|:-----|:----------|
| 来源清晰 | ❌ 不知道来自哪个 mixin | ✅ `import` 显式引入 |
| 命名冲突 | ❌ 可能覆盖 | ✅ 解构重命名 |
| 类型支持 | ❌ TS 难以推导 | ✅ 完美支持 |
| 隐式依赖 | ❌ `this.$store` | ✅ 显式传参 |

> 💡 **加分项**：Composition API 使逻辑复用组件化（VueUse 生态），同一段逻辑可以跨组件、跨项目复用

</details>

---

### Q33：`watchEffect` 和 `watch` 有什么区别？

<details>
<summary>点击查看答案</summary>

| | watchEffect | watch |
|:--|:----------|:-----|
| 依赖追踪 | 自动追踪回调中的响应式访问 | 显式指定 |
| 立即执行 | ✅ 默认立即 | `immediate: true` |
| 新旧值 | ❌ 不提供 | ✅ newVal/oldVal |
| 使用场景 | 副作用（自动同步 DOM） | 特定值变化后的操作 |

```js
const count = ref(0)
const name = ref('vue')

// watchEffect：自动追踪，立即执行
watchEffect(() => {
  console.log(count.value, name.value)
  // count 或 name 变化都重新执行
})

// watch：精确控制
watch(
  count,
  (newVal, oldVal) => { /* 只在 count 变化时执行 */ }
)
```

> 💡 **加分项**：watch 可以监听 `props` 传递到子组件的变化，watchEffect 更适合副作用同步

</details>

---

### Q34：Vue 3 的 diff 算法相比 Vue 2 有哪些优化？

<details>
<summary>点击查看答案</summary>

**核心优化三板斧**：PatchFlag + 静态提升 + Block Tree

**1. PatchFlag — 靶向更新**

```js
// 编译时标记哪些部分会变化
<div :class="cls" :id="id">{{ msg }}</div>
// → patchFlag = CLASS | PROPS | TEXT

// 运行时只做对应操作
if (patchFlag & PatchFlags.CLASS) patchClass(el, nextClass)
if (patchFlag & PatchFlags.TEXT)  patchText(el, nextText)
// 静态部分直接跳过
```

**2. 静态提升 — 缓存不变量**

```js
const _hoisted_1 = createVNode('span', null, '静态文本', -1 /* HOISTED */)
// 每次渲染复用同一个 VNode，patch 时直接跳过
```

**3. Block Tree — 只 diff 动态节点**

```
动态节点收集到 dynamicChildren 数组
diff 只对比这个数组，而不是所有子节点
→ 大量静态节点完全跳过 diff
```

| 优化手段 | Vue 2 | Vue 3 |
|:--------|:----:|:----:|
| 细粒度标记 | ❌ | ✅ PatchFlag |
| 静态提升 | ❌ | ✅ |
| Block Tree | ❌ | ✅ |
| 事件缓存 | ❌ | ✅ |
| 最长递增子序列 | ❌ | ✅ |

> 💡 **加分项**：Block Tree 结合了虚拟 DOM 的声明式和手动优化的性能，是 Vue 3 编译器最精妙的设计

</details>

---

### Q35：`<script setup>` 语法糖的优势是什么？

<details>
<summary>点击查看答案</summary>

```html
<!-- ❌ 传统写法 -->
<script>
import { ref } from 'vue'
export default {
  props: { title: String },
  emits: ['update'],
  setup(props, { emit }) {
    const count = ref(0)
    return { count }
  }
}
</script>

<!-- ✅ <script setup> -->
<script setup>
import { ref } from 'vue'
const props = defineProps({ title: String })
const emit = defineEmits(['update'])
const count = ref(0)
// 自动暴露给模板！
</script>
```

**优势**：
1. **更少样板代码**：不需要 `setup()` 包装、`return`
2. **自动类型推导**：配合 TS 使用 `defineProps<T>()` 完美推导
3. **编译器优化**：编译器知道哪些变量是模板使用的，可以做死代码消除
4. **更好的运行时性能**：编译时变量提升，减少闭包创建

> 💡 **加分项**：`<script setup>` 是 Vue 3 单文件组件的推荐写法，已被 RFC 正式接纳为语法标准

</details>

---

### Q36：Vue 3 为什么要用 TypeScript 重写？

<details>
<summary>点击查看答案</summary>

1. **类型安全**：在编译阶段发现潜在 bug
2. **IDE 支持**：智能提示、自动补全、重构工具
3. **解耦模块**：Monorepo 架构下，包之间的 API 契约用类型约束
4. **可维护性**：Flow 社区生态不如 TS，维护者越来越少

```ts
// Vue 3 源码中到处都是类型约束
export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
export function ref<T>(value: T): Ref<UnwrapRef<T>>
export function computed<T>(getter: () => T): ComputedRef<T>

// 用户使用时类型自动推导
const count = ref(0)        // Ref<number>
const doubled = computed(() => count.value * 2)  // ComputedRef<number>
```

> 💡 **加分项**：Vue 3 的类型系统非常复杂（如 `UnwrapNestedRefs`），但对外暴露的 API 类型推导做到了开箱即用，用户几乎不需要手动标注

</details>

---

### Q37：Teleport 的原理和使用场景？

<details>
<summary>点击查看答案</summary>

Teleport 将子组件渲染到 DOM 树的其他位置，常用于模态框、通知、下拉菜单等需要"逃离"父组件 CSS 层叠上下文的场景：

```html
<!-- 模态框脱离 #app 渲染到 body -->
<Teleport to="body">
  <Modal v-if="showModal" @close="showModal = false" />
</Teleport>
```

内部实现：

```js
// Teleport 组件在 patch 阶段
if (shapeFlag & ShapeFlags.TELEPORT) {
  const target = document.querySelector(vnode.props.to)
  // 把 children 挂载到 target 下，而不是当前父节点
  target.appendChild(el)
}
```

| Teleport | `v-if` / `v-show` |
|:-------|:-----------------|
| 改变渲染的**位置** | 控制是否**显示** |
| 突破 CSS overflow/z-index | 仍在当前层级 |
| 内容在逻辑上属于当前组件 | " |

> 💡 **加分项**：Teleport 渲染完成后，组件的逻辑上下文仍在原组件中（事件冒泡仍遵循 Vue 组件树）

</details>

---

### Q38：Vue 3 如何实现 Tree Shaking？

<details>
<summary>点击查看答案</summary>

**原理**：ES Module 的静态结构 + 构建工具死代码消除。

Vue 3 的所有 API 都是**具名导出**：

```js
// Vue 2
import Vue from 'vue'
// → 打包整个 Vue

// Vue 3
import { ref, computed, onMounted } from 'vue'
// → 构建工具分析出只用了 ref/computed/onMounted
// → 其他 API 被 tree-shake 掉
```

**具体措施**：
1. ES Module + 具名导出（无副作用标记 `"sideEffects": false`）
2. 核心模块拆分（`@vue/reactivity`、`@vue/runtime-core` 可独立使用）
3. 编译时常量优化（`__DEV__`、`__FEATURE_OPTIONS_API__` 等）

```
完整 vue 包：约 30KB gzip
只用 ref + reactive：约 10KB gzip  ← Tree Shaking 的效果
```

> 💡 **加分项**：Vue 3 甚至支持按需编译模板指令，如果不用 `v-model`，可以配置 `compileOptions` 在构建时移除

</details>

---

### Q39：`shallowRef` 和 `shallowReactive` 是什么？什么场景用？

<details>
<summary>点击查看答案</summary>

```js
// ref：深层响应式
const state = ref({ nested: { deep: 1 } })
state.value.nested.deep = 2  // ✅ 触发更新（深度代理）

// shallowRef：浅层响应式
const state = shallowRef({ nested: { deep: 1 } })
state.value.nested.deep = 2  // ❌ 不触发更新
state.value = { nested: { deep: 3 } }  // ✅ 整体替换才触发
```

**使用场景**：

| 场景 | 推荐 |
|:----|:----|
| 大量数据且只有浅层变化 | `shallowReactive` |
| 不可变数据模式（Immutable） | `shallowRef` |
| 第三方大对象（如 Chart.js 实例） | `shallowRef` |
| 普通表单数据 | `ref` / `reactive` |

```js
// 典型场景：大数据表格渲染
const rows = shallowRef(fetchLargeDataset())
// 更新时整表替换（不可变模式），不深度代理
rows.value = fetchUpdatedDataset()
```

> 💡 **加分项**：`shallowRef` 性能远优于 `ref`（深层时），因为内部不去做 Proxy 递归。大对象且不需要深度监听的场景首选

</details>

---

### Q40：`effectScope` 是什么？解决了什么问题？

<details>
<summary>点击查看答案</summary>

`effectScope` 允许将多个响应式 effect 组合在一起统一管理，一键停止所有 effect：

```js
import { effectScope, ref, watch, computed } from 'vue'

const scope = effectScope()

scope.run(() => {
  const doubled = computed(() => count.value * 2)
  watch(doubled, () => console.log('changed'))
  watchEffect(() => { /* ... */ })
})

scope.stop()  // 一键停止 scope 内所有副作用！
```

**解决的问题**：

```js
// ❌ 没有 effectScope：需要手动收集和清理
const disposables = []
const count = ref(0)
disposables.push(watchEffect(() => {}))
disposables.push(watch(count, () => {}))

// 清理时
disposables.forEach(fn => fn())  // 容易遗漏

// ✅ 有 effectScope
const scope = effectScope()
scope.run(() => {
  watchEffect(() => {})
  watch(count, () => {})
})
scope.stop()  // 绝不遗漏
```

主要应用于：
- VueUse 等工具库内部（如 `useEventListener`）
- Composables 的组合管理

> 💡 **加分项**：可嵌套（scope 内创建子 scope，父 scope.stop() 自动停止所有子 scope）

</details>

---

### Q41：Vue 3 的 `v-model` 相比 Vue 2 有什么变化？

<details>
<summary>点击查看答案</summary>

| | Vue 2 | Vue 3 |
|:--|:----|:-----|
| 默认 prop | `value` | `modelValue` |
| 默认 event | `input` | `update:modelValue` |
| 多个绑定 | ❌ 需要 `.sync` | ✅ 多个 `v-model` |
| 自定义修饰符 | ❌ 不支持 | ✅ `modelModifiers` |

```html
<!-- Vue 2 -->
<Child :value="val" @input="val = $event" />
<Child :title.sync="val" />     <!-- .sync 语法 -->

<!-- Vue 3 -->
<Child v-model="val" />
<Child v-model:title="val" v-model:content="content" />  <!-- 多个 -->

<!-- Vue 3 自定义修饰符 -->
<Child v-model.trim="val" />
<!-- 子组件中通过 props.modelModifiers.trim 判断 -->
```

> 💡 **加分项**：Vue 3 用 `v-model` 统一了 `.sync` 的功能，更简洁直观

</details>

---

### Q42：`defineAsyncComponent` 和 Suspense 如何配合使用？

<details>
<summary>点击查看答案</summary>

```html
<template>
  <Suspense>
    <template #default>
      <AsyncDashboard />
    </template>
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
const AsyncDashboard = defineAsyncComponent(() =>
  import('./Dashboard.vue')
)
</script>
```

`Suspense` 会在 `AsyncDashboard` 的异步 `setup()` 完成之前展示 `<LoadingSpinner />`。如果多个异步组件放在同一个 `<Suspense>` 中，等**所有**都完成后才展示：

```html
<Suspense>
  <template #default>
    <AsyncHeader />
    <AsyncBody />
    <AsyncFooter />
  </template>
  <!-- 三个组件都加载完才显示，期间一直展示 fallback -->
  <template #fallback>
    <FullPageLoading />
  </template>
</Suspense>
```

> 💡 **加分项**：Suspense 配合 `onErrorCaptured` 可以处理异步加载失败的情况

</details>

---

### Q43：Vue 3 相比 Vue 2 的打包体积减少了多少？如何实现的？

<details>
<summary>点击查看答案</summary>

| | Vue 2 | Vue 3 |
|:--|:----|:-----|
| 运行时（gzip） | ~23KB | ~12KB |
| 核心（含 compiler） | ~32KB | ~30KB |

**实现方式**：

1. **Tree Shaking**：ESM 具名导出，构建工具移除未用代码
2. **架构解耦**：`compiler` 和 `runtime` 分离，SSR 不需要 compiler
3. **更小的实现**：Proxy 替换 defineProperty 减少大量边界处理
4. **按需功能开关**：
   - `__FEATURE_OPTIONS_API__` — 不用 Options API 可移除
   - `__FEATURE_SUSPENSE__` — 不用 Suspense 可移除
   - `__COMPAT__` — 不需要兼容 Vue 2 可移除

```js
// vite.config.js 中可配置功能开关
define: {
  __VUE_OPTIONS_API__: false,  // 不用 Options API 减少 ~3KB
  __VUE_PROD_DEVTOOLS__: false // 生产环境关闭 devtools
}
```

> 💡 **加分项**：Vapor Mode（实验中）将跳过虚拟 DOM，进一步缩小到仅 ~8KB

</details>