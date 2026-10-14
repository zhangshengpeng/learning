# 从 .vue 组件到页面 DOM 的完整渲染过程

> 本文从源码层面，完整追踪一个 Vue 组件从编译、挂载、渲染到最终 DOM 插入页面的全过程。

## 全景链路速览

```
new Vue({ template: '<div>{{ name }}</div>' }).$mount('#app')

  │
  ├─ ① 编译:  template → render 函数
  │     compileToFunctions(template)
  │     产出: function render() { return _c('div', [_v(_s(name))]) }
  │
  ├─ ② 挂载:  mountComponent
  │     new Watcher(vm, updateComponent)
  │     updateComponent = () => vm._update(vm._render())
  │
  ├─ ③ _render:  执行 render 函数 → VNode 树
  │     render.call(vm, vm.$createElement)
  │     产出: VNode { tag: 'div', children: [VNode{ text: 'Alice' }] }
  │
  └─ ④ _update / patch:  VNode 树 → 真实 DOM → 插入页面
       vm.__patch__(vm.$el, vnode)
         → createElm(vnode)
           → document.createElement('div')
           → createChildren → 递归 createElm
           → parentNode.insertBefore(elm)
```

---

## ① 编译阶段：`template` → `render` 函数

发生在 `$mount` 入口，如果传的是 `template` 字符串而非手写 `render`，Vue 会调用编译器。

```ts
// src/platforms/web/runtime-with-compiler.ts

const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (el?: string | Element) {
  el = el && query(el)           // string → document.querySelector

  const options = this.$options
  if (!options.render) {         // 没有手写 render 才编译
    let template = options.template
    // ... 获取 template 字符串（支持 #id、DOM element、字符串） ...

    const { render, staticRenderFns } = compileToFunctions(
      template,                  // '<div>{{ name }}</div>'
      { ... },
      this                       // vm
    )
    options.render = render
    options.staticRenderFns = staticRenderFns
  }
  return mount.call(this, el, hydrating)  // 调用原始 $mount
}
```

编译器内部三步：

```yaml
template: '<div><p>{{ name }}</p></div>'

① parse（解析）:
   将 HTML 字符串解析为 AST（抽象语法树）
   { tag: 'div', children: [{ tag: 'p', children: [{ expression: '_s(name)' }] }] }

② optimize（优化）:
   遍历 AST，标记静态节点（static / staticRoot）
   静态节点：不依赖任何响应式数据，永远不会变
   目的：diff 时直接跳过，不比较

③ generate（生成）:
   将 AST 转换为 render 函数字符串
   → 'with(this){ return _c("div",[_c("p",[_v(_s(name))])]) }'
   再通过 new Function() 转为真正的函数
```

辅助函数：
- `_c` = `createElement`（创建元素 VNode）
- `_v` = `createTextVNode`（创建文本 VNode）
- `_s` = `toString`（转为字符串，内部调用 `JSON.stringify` 或 `String()`）

---

## ② 挂载阶段：`mountComponent` 创建渲染 Watcher

原始 `$mount` 调用 `mountComponent`：

```ts
// src/core/instance/lifecycle.ts

export function mountComponent(vm, el): Component {
  vm.$el = el
  callHook(vm, 'beforeMount')

  let updateComponent
  updateComponent = () => {
    vm._update(vm._render(), hydrating)   // 核心！
  }

  // 创建渲染 Watcher——整个响应式渲染的引擎
  new Watcher(
    vm,
    updateComponent,    // getter：会执行的函数
    noop,               // callback：渲染 Watcher 不需要回调
    { before() { callHook(vm, 'beforeUpdate') } },
    true                // isRenderWatcher = true
  )
  // Watcher 构造函数的最后一行：
  // this.value = this.lazy ? undefined : this.get()
  // 渲染 Watcher 不是 lazy，构造完立刻执行 get() →

  callHook(vm, 'mounted')
}
```

Watcher 构造函数调用 `this.get()` → 即开启了渲染 + 依赖收集：

```ts
// src/core/observer/watcher.ts

get() {
  pushTarget(this)           // Dep.target = 当前渲染 Watcher
  let value
  try {
    value = this.getter.call(vm, vm)  // 执行 updateComponent
  } finally {
    popTarget()              // 恢复之前的 Dep.target
    this.cleanupDeps()       // 清理不再需要的旧依赖
  }
  return value
}
```

`pushTarget(this)` 将当前渲染 Watcher 设置为全局 `Dep.target`，后续所有响应式数据的 getter 都会把自己的 Dep 加入到这个 Watcher 的依赖列表中。

---

## ③ `_render`：render 函数 → VNode 树

```ts
// src/core/instance/render.ts

Vue.prototype._render = function (): VNode {
  const vm = this
  const { render } = vm.$options

  let vnode
  try {
    setCurrentInstance(vm)
    // 关键：模板中的 name → this.name → proxy getter → this._data.name
    vnode = render.call(vm._renderProxy, vm.$createElement)
  } catch (e) {
    handleError(e, vm, `render`)
  }
  return vnode
}
```

编译后的 render 函数执行时：

```js
// 编译产物相当于：
function render() {
  with (this) {
    return _c('div', { staticClass: 'app' }, [
      _c('span', [_v(_s(name))])        // _s(name) → String(this.name)
    ])
  }
}
```

`_c('div', ...)` 即调用 `vm.$createElement`，内部创建 VNode：

```
VNode {
  tag: 'div',
  data: { staticClass: 'app' },
  children: [
    VNode { tag: 'span', children: [VNode { text: 'Alice' }] }
  ],
  elm: undefined,     // 尚未关联真实 DOM
  context: vm         // 所属组件实例
}
```

**同时发生的依赖收集**：

```
render 读取 this.name
  → 触发 defineReactive 定义的 getter
  → Dep.target 存在（渲染 Watcher）
  → dep.depend() → watcher.addDep(dep) → dep.subs.push(watcher)
  → name 的 Dep 收集了渲染 Watcher
```

---

## ④ `_update` → `__patch__`：VNode 变 DOM 并插入页面

```ts
// src/core/instance/lifecycle.ts

Vue.prototype._update = function (vnode: VNode) {
  const vm = this
  const prevVnode = vm._vnode
  vm._vnode = vnode

  if (!prevVnode) {
    // 首次渲染：oldVnode = vm.$el（真实 DOM 元素如 <div id="app">）
    vm.$el = vm.__patch__(vm.$el, vnode)
  } else {
    // 更新：oldVnode = 上一次的 VNode
    vm.$el = vm.__patch__(prevVnode, vnode)
  }
}
```

`vm.__patch__` 最终映射到 `createPatchFunction` 返回的 `patch` 函数：

```ts
// src/core/vdom/patch.ts

return function patch(oldVnode, vnode, hydrating) {
  const isRealElement = isDef(oldVnode.nodeType)

  if (isRealElement) {
    // 首次渲染：oldVnode 是真实 DOM
    oldVnode = emptyNodeAt(oldVnode)   // 包装为 VNode
  }

  const parentElm = nodeOps.parentNode(oldVnode.elm)
  createElm(vnode, insertedVnodeQueue, parentElm, ...)

  // 移除旧的占位 DOM（<div id="app"> → 替换为渲染产物）
  removeVnodes([oldVnode], 0, 0)
}
```

---

## ⑤ `createElm`：递归创建真实 DOM 的完整过程

这是整个渲染的核心——将 VNode 树一步一步变成真实 DOM 树：

```ts
// src/core/vdom/patch.ts

function createElm(vnode, insertedVnodeQueue, parentElm, refElm) {
  // ① 组件 VNode → 走 createComponent → 递归初始化子组件
  if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
    return
  }

  const tag = vnode.tag
  const children = vnode.children
  const data = vnode.data

  if (isDef(tag)) {
    // ② 元素节点：调用原生 DOM API 创建真实 DOM
    vnode.elm = nodeOps.createElement(tag, vnode)
    //            ↓
    //            document.createElement('div')

    // ③ 递归创建所有子节点
    createChildren(vnode, children, insertedVnodeQueue)
    //      ↓
    //      for (child of children) {
    //        createElm(child, ..., vnode.elm)  // 父 DOM 作为 parentElm
    //      }

    // ④ 调用 create hooks：处理 class、style、attr、props、event 等
    invokeCreateHooks(vnode, insertedVnodeQueue)
    //      ↓
    //      elm.className = 'app'
    //      elm.addEventListener('click', handleClick)
    //      elm.setAttribute('id', 'box')
    //      ...

    // ⑤ 将创建好的 DOM 元素插入父节点
    insert(parentElm, vnode.elm, refElm)
    //      ↓
    //      parentNode.insertBefore(elm, refElm)

  } else if (isTrue(vnode.isComment)) {
    // 注释节点
    vnode.elm = nodeOps.createComment(vnode.text)
    insert(parentElm, vnode.elm, refElm)
    //      ↓
    //      document.createComment('xxx')

  } else {
    // 文本节点
    vnode.elm = nodeOps.createTextNode(vnode.text)
    insert(parentElm, vnode.elm, refElm)
    //      ↓
    //      document.createTextNode('Alice')
  }
}
```

### `nodeOps` 是什么

`nodeOps` 是对原生 DOM API 的一层封装，实现了平台无关的 DOM 操作：

```ts
// src/platforms/web/runtime/node-ops.ts

export function createElement(tagName: string): Element {
  return document.createElement(tagName)
}

export function createTextNode(text: string): Text {
  return document.createTextNode(text)
}

export function createComment(text: string): Comment {
  return document.createComment(text)
}

export function insertBefore(parent, newNode, refNode) {
  parent.insertBefore(newNode, refNode)
}

export function removeChild(node, child) {
  node.removeChild(child)
}
```

---

## 完整递归展开示例

假设组件：

```html
<div id="app">
  <span>{{ name }}</span>
  <button @click="handleClick">点我</button>
</div>
```

VNode 树：

```
VNode { tag: 'div', children: [
  VNode { tag: 'span', children: [ VNode{ text: 'Alice' } ] },
  VNode { tag: 'button', children: [ VNode{ text: '点我' } ], data: { on: { click: fn } } }
]}
```

`createElm` 递归展开过程：

```
createElm(divVNode, ..., body, #app)
  │
  ├─ document.createElement('div')
  │
  ├─ createChildren(divVNode, [spanVNode, buttonVNode]):
  │    │
  │    ├─ createElm(spanVNode, ..., divElm)
  │    │    ├─ document.createElement('span')
  │    │    ├─ createChildren:
  │    │    │    └─ createElm(textVNode('Alice'), ..., spanElm)
  │    │    │         └─ document.createTextNode('Alice')
  │    │    │         └─ insert: spanElm.appendChild(textNode)
  │    │    │               → <span>Alice</span>
  │    │    └─ insert: divElm.appendChild(spanElm)
  │    │
  │    └─ createElm(buttonVNode, ..., divElm)
  │         ├─ document.createElement('button')
  │         ├─ createChildren:
  │         │    └─ textVNode('点我') → 同上
  │         ├─ invokeCreateHooks:
  │         │    └─ button.addEventListener('click', handleClick)
  │         └─ insert: divElm.appendChild(buttonElm)
  │               → <button>点我</button>
  │
  ├─ invokeCreateHooks(divVNode):
  │    └─ div.className = 'app'
  │
  └─ insert(body, divElm, #app)
        → <body>
            <div class="app">
              <span>Alice</span>
              <button>点我</button>
            </div>
          </body>
```

---

## 子组件的渲染

当 `createElm` 遇到子组件的 VNode 时，走 `createComponent` 分支：

```ts
// src/core/vdom/patch.ts

function createComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
  let i = vnode.data
  if (isDef((i = i.hook)) && isDef((i = i.init))) {
    i(vnode)   // 调用组件的 init 钩子
  }

  if (isDef(vnode.componentInstance)) {
    // 子组件已挂载完成，vnode.elm 指向子组件的根 DOM
    initComponent(vnode, insertedVnodeQueue)
    insert(parentElm, vnode.elm, refElm)  // 插入父 DOM
    return true
  }
}
```

组件 `init` 钩子内部：

```
hook.init(vnode)
  → new Component(options)
    → child.$mount()
      → mountComponent(child)
        → 创建子组件的渲染 Watcher
        → child._render() → 子组件 VNode 树
        → child._update() → patch → createElm → 子组件 DOM 树
        → 子组件 DOM 挂到 vnode.elm 上
```

整个页面是一棵 **深度优先的递归树**：

```
父组件 render → VNode 树
  → createElm(父 VNode)
    → 遇到子组件 VNode → createComponent → 子组件 $mount → 子组件整套渲染流程
    → 子组件 DOM 完成 → 插入父 DOM
  → 继续父组件下一个兄弟 VNode
```

---

## 完整时序图

```
new Vue({ template, data }).$mount('#app')
  │
  ├─ 编译阶段（构建时或运行时）
  │     compileToFunctions(template)
  │     产出: render 函数 + staticRenderFns
  │
  ├─ mount.call(this, '#app')
  │    │
  │    └─ mountComponent(vm, el)
  │         │
  │         ├─ callHook('beforeMount')
  │         │
  │         ├─ new Watcher(vm, updateComponent, noop, {}, true)
  │         │    │
  │         │    └─ this.get()                       ← 立即执行
  │         │         │
  │         │         ├─ pushTarget(渲染Watcher)      ← Dep.target = 渲染 Watcher
  │         │         │
  │         │         ├─ vm._render()                ← ③ 生成 VNode
  │         │         │    └─ render.call(vm)
  │         │         │         ├─ this.name → getter → dep.depend()
  │         │         │         │                   ← 依赖收集！
  │         │         │         └─ return VNode 树
  │         │         │
  │         │         ├─ vm._update(vnode)            ← ④ VNode → DOM
  │         │         │    └─ vm.__patch__(vm.$el, vnode)
  │         │         │         └─ createElm(vnode, ..., body, #app)
  │         │         │              ├─ createElement('div')
  │         │         │              ├─ createChildren (递归子节点)
  │         │         │              ├─ invokeCreateHooks (class/style/event)
  │         │         │              └─ insertBefore (插入 DOM)
  │         │         │
  │         │         └─ popTarget()                 ← Dep.target = null
  │         │
  │         └─ callHook('mounted')                   ← ⑤ 挂载完成
  │
  └─ 页面渲染完成，依赖关系建立完毕
```

---

## 更新时的渲染流程

当数据变化时（如 `this.name = 'Bob'`）：

```
this.name = 'Bob'
  → defineReactive 的 setter
  → dep.notify()
  → 遍历 dep.subs 中的所有 Watcher
  → 渲染 Watcher → queueWatcher(this) → 推入调度队列
  → nextTick 时批量执行 → watcher.run() → this.get()
  → pushTarget(渲染Watcher)
  → updateComponent()
    → vm._render()  ← 重新执行 render 生成新 VNode
    → vm._update(newVnode)
      → __patch__(prevVnode, newVnode)  ← 这次走 diff 复用
        → patchVnode(old, new)  ← 比对新旧 VNode，最小化 DOM 操作
  → popTarget()
  → callHook('updated')
```

首次渲染走 `createElm` 全量创建，更新走 `patchVnode` 做 diff 复用。

---

## 核心要点总结

| 阶段 | 关键函数 | 输入 | 输出 |
|:--|:--|:--|:--|
| 编译 | `compileToFunctions` | template 字符串 | render 函数 |
| 挂载 | `mountComponent` | vm + el | 渲染 Watcher |
| 渲染 | `vm._render()` | render 函数 | VNode 树 |
| patch | `vm.__patch__()` | oldVNode + newVNode | 真实 DOM |
| 元素创建 | `createElm` | VNode + parentElm | DOM 元素 |
| 更新 | `patchVnode` | oldVNode + newVNode | 最小化 DOM 操作 |

**一句话**：render 函数产出 VNode 树，patch 函数把 VNode 树递归变成真实 DOM 树并插入页面。首次渲染走 `createElm` 全量创建，后续更新走 `patchVnode` 做 diff 复用。