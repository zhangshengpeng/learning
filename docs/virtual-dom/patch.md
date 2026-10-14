# Patch 渲染过程

## patch 函数入口

```js
// src/core/vdom/patch.js

function patch(oldVnode, vnode) {
  // ① 如果旧节点不存在（组件初次挂载）
  if (isUndef(oldVnode)) {
    createElm(vnode)  // 直接创建 DOM
  } else {
    const isRealElement = isDef(oldVnode.nodeType)

    if (!isRealElement && sameVnode(oldVnode, vnode)) {
      // ② VNode vs VNode：进入 patchVnode
      patchVnode(oldVnode, vnode)
    } else {
      // ③ 真实 DOM / 不是同一节点：替换
      if (isRealElement) {
        oldVnode = emptyNodeAt(oldVnode) // DOM → VNode
      }
      const oldElm = oldVnode.elm
      const parentElm = nodeOps.parentNode(oldElm)

      createElm(vnode) // 创建新 DOM
      nodeOps.insertBefore(parentElm, vnode.elm, nextSibling(oldElm))
      nodeOps.removeChild(parentElm, oldElm) // 删除旧 DOM
    }
  }
  return vnode.elm
}
```

## patchVnode — 细粒度比较

```js
function patchVnode(oldVnode, vnode) {
  // ① 如果是同一个 VNode，跳过
  if (oldVnode === vnode) return

  // ② 拿到真实 DOM
  const elm = (vnode.elm = oldVnode.elm)

  // ③ 异步组件占位
  if (isTrue(vnode.isAsyncPlaceholder)) return

  // ④ 静态节点（且无 key 变化），直接复用
  if (
    isTrue(vnode.isStatic) &&
    isTrue(oldVnode.isStatic) &&
    vnode.key === oldVnode.key
  ) {
    vnode.componentInstance = oldVnode.componentInstance
    return
  }

  // ⑤ 比较子节点
  const oldCh = oldVnode.children
  const ch = vnode.children

  // 当前节点不是文本节点
  if (isUndef(vnode.text)) {
    if (isDef(oldCh) && isDef(ch)) {
      // 都有 children → diff 子节点
      if (oldCh !== ch) updateChildren(elm, oldCh, ch)
    } else if (isDef(ch)) {
      // 只有新 children → 清空旧文本，创建新 children
      if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, "")
      addVnodes(elm, null, ch, 0, ch.length - 1)
    } else if (isDef(oldCh)) {
      // 只有旧 children → 清空所有旧子节点
      removeVnodes(oldCh, 0, oldCh.length - 1)
    } else if (isDef(oldVnode.text)) {
      // 旧的是文本，新的是空 → 清空文本
      nodeOps.setTextContent(elm, "")
    }
  }
  // 当前是文本节点，且文本变化
  else if (oldVnode.text !== vnode.text) {
    nodeOps.setTextContent(elm, vnode.text)
  }
}
```

## createElm — VNode 变真实 DOM

```js
function createElm(vnode, parentElm, refElm) {
  const children = vnode.children
  const tag = vnode.tag

  if (isDef(tag)) {
    // ① 元素节点：创建 DOM 元素
    vnode.elm = nodeOps.createElement(tag, vnode)

    // ② 递归创建子节点
    createChildren(vnode, children)

    // ③ 设置属性、事件、样式
    if (isDef(data)) {
      invokeCreateHooks(vnode) // 调用 create hooks
    }

    // ④ 插入父节点
    insert(parentElm, vnode.elm, refElm)

  } else if (isTrue(vnode.isComment)) {
    // 注释节点
    vnode.elm = nodeOps.createComment(vnode.text)
    insert(parentElm, vnode.elm, refElm)

  } else {
    // 文本节点
    vnode.elm = nodeOps.createTextNode(vnode.text)
    insert(parentElm, vnode.elm, refElm)
  }
}
```

## removeVnodes — 批量删除

```js
function removeVnodes(vnodes, startIdx, endIdx) {
  for (; startIdx <= endIdx; ++startIdx) {
    const ch = vnodes[startIdx]
    if (isDef(ch)) {
      // 触发 destroy 钩子（清理 Watcher 等）
      if (isDef(ch.tag)) {
        removeAndInvokeDestroyHook(ch)
        invokeDestroyHook(ch)
      } else {
        nodeOps.removeChild(parentElm, ch.elm)
      }
    }
  }
}
```
