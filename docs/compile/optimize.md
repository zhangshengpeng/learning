# Optimize — 静态标记

## 优化目标

标记 AST 中的**静态节点**和**静态根节点**，让 patch 过程可以直接跳过它们，省去不必要的 diff。

## 核心原理

```js
// src/compiler/optimizer.js

export function optimize(root, options) {
  if (!root) return

  // ① 遍历 AST，标记所有静态节点
  markStatic(root)

  // ② 标记静态根节点（有子节点的静态节点）
  markStaticRoots(root, false)
}
```

## markStatic — 标记静态节点

```js
function markStatic(node) {
  node.static = isStatic(node)

  if (node.type === 1) {
    // 元素节点：排除 v-once、v-if 分片节点等特殊情况
    if (
      !isPlatformReservedTag(node.tag) || // 非平台标签（组件）
      node.tag === "slot" ||
      node.hasBindings                 // 有 v-bind
    ) {
      // 不符合也不能简单设为 false，因为子节点可能全是静态
    }

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]
      markStatic(child)

      // 任意子节点非静态 → 父节点也非静态
      if (!child.static) {
        node.static = false
      }
    }
  }
}

function isStatic(node) {
  if (node.type === 2) return false  // 含 {{ }} 的动态文本 → 非静态
  if (node.type === 3) return true   // 纯文本 → 静态

  return !!(
    node.pre ||   // v-pre → 一定是静态
    (
      !node.hasBindings &&          // 无动态绑定
      !node.if && !node.for &&      // 无 v-if v-for
      !isBuiltInTag(node.tag) &&    // 非 slot/component 标签
      isPlatformReservedTag(node.tag) && // 是平台原生标签
      !isDirectChildOfTemplateFor(node)  // 不是 v-for 模板的直接子节点
    )
  )
}
```

## markStaticRoots — 标记静态根节点

```js
function markStaticRoots(node, isInFor) {
  if (node.type === 1) {
    if (node.static) {
      node.staticInFor = isInFor
    }

    if (
      node.static &&
      node.children.length &&
      !(node.children.length === 1 && node.children[0].type === 3)
    ) {
      // 静态节点 + 有子节点 + 子节点不是唯一纯文本
      node.staticRoot = true
      return // 静态根节点不必继续遍历
    } else {
      node.staticRoot = false
    }
  }

  // 否则继续递归子节点
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      markStaticRoots(node.children[i], isInFor || !!node.for)
    }
  }
}
```

## 优化效果

```html
<!-- 编译前 -->
<div>
  <span class="static">静态文本</span>  <!-- ← 不会变化 -->
  <span>{{ dynamic }}</span>             <!-- ← 会变化 -->
</div>

<!-- patch 时的优化 -->
patchVnode(oldVnode, vnode) {
  if (
    vnode.isStatic && oldVnode.isStatic &&
    vnode.key === oldVnode.key
  ) {
    vnode.componentInstance = oldVnode.componentInstance
    return // 直接复用，跳过 children 比较！
  }
  // ...正常 diff
}
```

静态节点在 diff 时被**完全跳过**，因为其 children 和属性永远不会变化。
