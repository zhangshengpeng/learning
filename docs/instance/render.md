# 渲染过程解析

## 渲染管线

```
_render()                           _update()
  │                                    │
  ├── 执行 render 函数                 ├── 首次渲染 → 创建 DOM
  │   └── h("div", ...)                │   └── createElm()
  │   └── $createElement()             │
  │                                    ├── 更新 → 对比 VNode
  └── 返回 VNode 树                    │   └── patch(oldVNode, newVNode)
                                       │
                                       └── 最终更新真实 DOM
```

## _render 源码

```js
// src/core/instance/render.js

Vue.prototype._render = function () {
  const vm = this
  const { render, _parentVnode } = vm.$options

  // 设置当前实例（用于 resolveSlots）
  vm.$vnode = _parentVnode

  let vnode
  try {
    currentRenderingInstance = vm
    // 执行 render 函数，返回 VNode 树
    vnode = render.call(vm._renderProxy, vm.$createElement)
  } catch (e) {
    handleError(e, vm, "render")
  } finally {
    currentRenderingInstance = null
  }

  // 根 VNode 只有一个（多个根节点用 fragment 包装）
  vnode.parent = _parentVnode
  return vnode
}
```

## _update 源码

```js
// src/core/instance/lifecycle.js

Vue.prototype._update = function (vnode) {
  const vm = this
  const prevEl = vm.$el
  const prevVnode = vm._vnode // 上一次的 VNode

  vm._vnode = vnode // 缓存本次 VNode

  if (!prevVnode) {
    // 首次渲染：直接创建真实 DOM
    vm.$el = vm.__patch__(vm.$el, vnode)
  } else {
    // 更新：对比新旧 VNode，最小化 DOM 操作
    vm.$el = vm.__patch__(prevVnode, vnode)
  }
}
```

## $createElement (h 函数)

```js
// src/core/vdom/create-element.js

export function createElement(context, tag, data, children) {
  let vnode
  if (typeof tag === "string") {
    // 原生标签：div、span...
    vnode = new VNode(tag, data, children, undefined, undefined, context)
  } else if (isDef((tag.componentOptions || tag).Ctor)) {
    // 组件：创建组件 VNode
    vnode = createComponent(tag, data, context, children)
  }
  return vnode
}
```

## 从 template 到 DOM 的完整链路

```
template: <div class="app">{{ msg }}</div>
    │
    │ compile (构建时或运行时)
    ▼
render: function() {
    return _c("div", { class: "app" }, [_v(_s(msg))])
}
    │
    │ _render() 执行
    ▼
VNode: { tag: "div", children: [{ text: "hello" }], ... }
    │
    │ _update(vnode) → __patch__()
    ▼
DOM: <div class="app">hello</div>
```

`_c` 就是 `$createElement` 的简写，是编译后的 render 函数中对 `h` 函数的调用。
