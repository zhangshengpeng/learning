# Diff 算法详解

## 设计思想

Vue 2 的 Diff 基于三个假设（来自 React 思想）：

1. **同层比较**：不会跨层级比较，要变就整棵替换
2. **同类型节点有相同结构**：不同类型直接销毁重建
3. **key 唯一标识**：通过 key 复用节点，避免重复创建

## 入口：sameVnode 判断

```js
// src/core/vdom/patch.js

function sameVnode(a, b) {
  return (
    a.key === b.key &&           // key 相同
    a.tag === b.tag &&            // 标签相同
    a.isComment === b.isComment && // 同为注释或都不是
    isDef(a.data) === isDef(b.data) && // 都有或都没有 data
    sameInputType(a, b)           // input 类型相同
  )
}
```

只有 `sameVnode` 为 true 时才进入细粒度比较，否则直接替换。

## 核心算法：updateChildren（双端比较）

```js
function updateChildren(parentElm, oldCh, newCh) {
  let oldStartIdx = 0
  let newStartIdx = 0
  let oldEndIdx = oldCh.length - 1
  let newEndIdx = newCh.length - 1
  let oldStartVnode = oldCh[0]
  let oldEndVnode = oldCh[oldEndIdx]
  let newStartVnode = newCh[0]
  let newEndVnode = newCh[newEndIdx]

  while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {

    if (oldStartVnode == null) {
      oldStartVnode = oldCh[++oldStartIdx] // 跳过已处理的
    } else if (oldEndVnode == null) {
      oldEndVnode = oldCh[--oldEndIdx]
    } else if (sameVnode(oldStartVnode, newStartVnode)) {
      // ① 旧头 vs 新头：相同，同时后移
      patchVnode(oldStartVnode, newStartVnode)
      oldStartVnode = oldCh[++oldStartIdx]
      newStartVnode = newCh[++newStartIdx]

    } else if (sameVnode(oldEndVnode, newEndVnode)) {
      // ② 旧尾 vs 新尾：相同，同时前移
      patchVnode(oldEndVnode, newEndVnode)
      oldEndVnode = oldCh[--oldEndIdx]
      newEndVnode = newCh[--newEndIdx]

    } else if (sameVnode(oldStartVnode, newEndVnode)) {
      // ③ 旧头 vs 新尾：节点右移到末尾
      patchVnode(oldStartVnode, newEndVnode)
      nodeOps.insertBefore(parentElm, oldStartVnode.elm, nextSibling(oldEndVnode.elm))
      oldStartVnode = oldCh[++oldStartIdx]
      newEndVnode = newCh[--newEndIdx]

    } else if (sameVnode(oldEndVnode, newStartVnode)) {
      // ④ 旧尾 vs 新头：节点左移到开头
      patchVnode(oldEndVnode, newStartVnode)
      nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
      oldEndVnode = oldCh[--oldEndIdx]
      newStartVnode = newCh[++newStartIdx]

    } else {
      // ⑤ 都不匹配：用 key 查找
      if (oldKeyToIdx === undefined) {
        oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
      }
      idxInOld = oldKeyToIdx[newStartVnode.key]

      if (isUndef(idxInOld)) {
        // 全新节点，创建插入
        createElm(newStartVnode, parentElm, oldStartVnode.elm)
      } else {
        // 通过 key 找到可复用节点
        vnodeToMove = oldCh[idxInOld]
        if (sameVnode(vnodeToMove, newStartVnode)) {
          patchVnode(vnodeToMove, newStartVnode)
          oldCh[idxInOld] = null // 标记已处理
          nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
        } else {
          createElm(newStartVnode, parentElm, oldStartVnode.elm)
        }
      }
      newStartVnode = newCh[++newStartIdx]
    }
  }

  // ⑥ 收尾：移除多余旧节点或创建多余新节点
  if (oldStartIdx > oldEndIdx) {
    // 新节点比旧节点多 → 批量创建
    addVnodes(parentElm, null, newCh, newStartIdx, newEndIdx)
  } else {
    // 旧节点比新节点多 → 批量删除
    removeVnodes(oldCh, oldStartIdx, oldEndIdx)
  }
}
```

## 双端比较图解

```
旧: [A, B, C, D]         新: [D, A, B, C]
     ↑        ↑               ↑        ↑
    头       尾              头        尾

1. 旧头A vs 新头D → 不匹配
2. 旧尾D vs 新尾C → 不匹配
3. 旧头A vs 新尾C → 不匹配
4. 旧尾D vs 新头D → 匹配！→ 节点 D 移到最前面

旧: [A, B, C, null]      新: [A, B, C]
     ↑     ↑                   ↑     ↑

5. A-A 匹配、B-B 匹配、C-C 匹配
6. 旧多出 D(null) → 删除
```

双端比较在**节点顺序简单变化时**（反转、头部尾部移动），只需 O(n) 就能完成对比。
