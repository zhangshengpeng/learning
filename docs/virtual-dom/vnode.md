# VNode — 虚拟节点

## 为什么需要虚拟 DOM

直接操作真实 DOM 成本高昂。虚拟 DOM 是一层 JavaScript 对象抽象，通过对比新旧 VNode 差异，批量高效地更新真实 DOM。

## VNode 类

```js
// src/core/vdom/vnode.js

export default class VNode {
  constructor(
    tag,        // 标签名（"div"）或组件构造函数
    data,       // attrs、props、on、style、class 等
    children,   // 子节点数组
    text,       // 文本内容
    elm,        // 对应的真实 DOM 节点
    context,    // 组件实例
    componentOptions, // 组件选项
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined       // SVG namespace
    this.context = context
    this.key = data && data.key  // 用于 diff 优化

    // 组件相关
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined

    // 其他
    this.raw = false          // 是否纯文本
    this.isStatic = false     // 是否静态节点（编译优化）
    this.isRootInsert = true  // 是否根插入（v-for/v-if）
    this.isComment = false    // 是否注释节点
    this.isCloned = false     // 是否克隆节点
    this.isOnce = false       // 是否 v-once
  }
}
```

## VNode 的几种类型

```js
// 1. 文本节点
{ text: "hello", children: undefined }

// 2. 元素节点
{ tag: "div", children: [...], text: undefined }

// 3. 注释节点
{ text: "", isComment: true, children: undefined }

// 4. 组件节点
{
  tag: "vue-component-1-my-component",
  componentOptions: { Ctor, propsData, listeners, tag, children },
  children: undefined
}

// 5. 克隆节点（优化静态节点重复使用）
{ isCloned: true, ...克隆自原 VNode }
```

## 创建 VNode 辅助函数

```js
// src/core/vdom/vnode.js

// 创建元素 VNode
export function createElementVNode(tag, data, children) {
  return new VNode(tag, data, children, undefined, undefined)
}

// 创建文本 VNode
export function createTextVNode(val) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// 创建空 VNode
export const createEmptyVNode = () => {
  const node = new VNode()
  node.text = ""
  node.isComment = true
  return node
}
```

## 编译后 render 中的 VNode 调用

```js
// template: <div><p>hello</p></div>
// 编译后：
function render() {
  return _c("div", [
    _c("p", [_v("hello")]),
  ])
}

// _c  = createElementVNode（元素）
// _v  = createTextVNode（文本）
```
