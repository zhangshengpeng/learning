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

---

## 全流程：从数据变化到 DOM 更新

Diff 不是孤立的，它是整个响应式渲染链路中的一环。完整流程如下：

```
数据变化
  │
  ▼
┌─────────────────────────────────────────────┐
│ ① 响应式触发                                  │
│   data.list = [3,1,2] → setter → Dep.notify()│
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│ ② 组件级 Watcher 入队（异步批量）              │
│   queueWatcher(watcher) → nextTick(flush)    │
│   同一 Watcher 多次 update 只入队一次          │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│ ③ 生成新 VNode 树                            │
│   vm._render() → 执行编译后的 render 函数     │
│   返回一棵全新的 VNode 树（JavaScript 对象）    │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│ ④ 进入 patch 入口                            │
│   vm._update(newVNode) → patch(old, new)     │
│   拿到上次缓存的旧 VNode 树 vs 新 VNode 树     │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│ ⑤ sameVnode 判断                             │
│   ✅ 相似 → patchVnode（复用旧 DOM）           │
│   ❌ 不相似 → createElm 创建新 + 删除旧        │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│ ⑥ updateChildren 核心 Diff                   │
│   双端比较 → 四种策略 + key 查找              │
│   找出最小变更集：移动 / 新增 / 删除           │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│ ⑦ 执行 DOM 操作                              │
│   insertBefore / removeChild / setTextContent│
│   批量生效，浏览器只回流一次                    │
└─────────────────────────────────────────────┘
```

### 阶段详解

#### ①-② 响应式 → Watcher 入队

```js
// src/core/observer/index.js — 数据变化触发 setter
Object.defineProperty(obj, key, {
  set(newVal) {
    val = newVal
    dep.notify()  // 通知这个 key 的所有 Watcher
  }
})

// src/core/observer/watcher.js — 组件 Watcher 收到通知
class Watcher {
  update() {
    // 不是立即执行！而是推入异步队列
    queueWatcher(this)
  }
}

// src/core/observer/scheduler.js — 批量调度
function queueWatcher(watcher) {
  const id = watcher.id
  if (has[id] == null) {    // 去重：同一个 Watcher 只入队一次
    has[id] = true
    queue.push(watcher)
    nextTick(flushSchedulerQueue)  // 下一个 tick 统一执行
  }
}
```

> **关键设计**：一个组件内改了 3 个 data，只会触发 1 次渲染（组件级 Watcher 去重 + 异步批量）。

#### ③ 生成新 VNode 树

```js
// 组件 Watcher 的回调（构造函数里定义的）
updateComponent = () => {
  vm._update(vm._render(), hydrating)
}

// vm._render() 执行编译后的渲染函数
// template: <div id="app"><p>{{ msg }}</p><span v-for="n in list">{{ n }}</span></div>
function render() {
  return _c('div', { attrs: { id: 'app' } }, [
    _c('p', [_v(_s(msg))]),
    _l(list, function(n) { return _c('span', [_v(_s(n))]) })
  ])
}
// _c = createElement, _v = createTextVNode, _s = toString, _l = renderList
// 返回一棵全新的 VNode 树（普通 JS 对象，创建成本很低）
```

#### ④ 进入 patch 入口

```js
// src/core/instance/lifecycle.js
Vue.prototype._update = function(vnode) {
  const prevVnode = this._vnode       // 上次缓存下来的旧 VNode
  this._vnode = vnode                  // 缓存新 VNode（给下次用）

  if (!prevVnode) {
    // 首次渲染：没有旧树 → 直接创建 DOM
    this.$el = this.__patch__(this.$el, vnode)
  } else {
    // 更新：两棵树对比
    this.$el = this.__patch__(prevVnode, vnode)
  }
}

// src/core/vdom/patch.js
function patch(oldVnode, vnode) {
  const isRealElement = oldVnode.nodeType !== undefined

  if (isRealElement) {
    // 首次渲染：参数是真实 DOM → 包装为 VNode
    oldVnode = emptyNodeAt(oldVnode)
  }

  if (sameVnode(oldVnode, vnode)) {
    // 同一节点 → 细粒度比较（patchVnode → updateChildren）
    patchVnode(oldVnode, vnode)
  } else {
    // 不同节点 → 整个替换
    const oldElm = oldVnode.elm
    const parentElm = nodeOps.parentNode(oldElm)
    createElm(vnode)                       // 创建全新 DOM
    if (parentElm) {
      nodeOps.insertBefore(parentElm, vnode.elm, nodeOps.nextSibling(oldElm))
      nodeOps.removeChild(parentElm, oldElm)  // 删除旧 DOM
    }
  }
  return vnode.elm
}
```

---

## 五种策略逐例详解

### 策略①：旧头 vs 新头 — 都不动，向后推进

```
适用场景：尾部追加元素
旧: [A, B, C]
新: [A, B, C, D]
     ↑
  同时后移 →
```

```js
// Round 1: oldS=A vs newS=A → sameVnode ✅
patchVnode(A, A)  // 复用旧 DOM，只更新属性（无变化）
oldS++, newS++    // oldS→B, newS→B

// Round 2: oldS=B vs newS=B → ✅
// Round 3: oldS=C vs newS=C → ✅
// oldS > oldE → 退出循环 → addVnodes(D)  // 新增 D
```

**发生了什么**：3 次 `patchVnode`（无属性变化则 0 开销），1 次 `createElm`（新建 D）。A/B/C 的 DOM 节点原地不动。

### 策略②：旧尾 vs 新尾 — 都不动，向前推进

```
适用场景：头部插入元素
旧: [A, B, C]
新: [D, A, B, C]
              ↑
           同时前移 ←
```

```js
// Round 1: oldE=C vs newE=C → sameVnode ✅
patchVnode(C, C)
oldE--, newE--  // oldE→B, newE→B

// Round 2: oldE=B vs newE=B → ✅  →  oldE--, newE--
// Round 3: oldE=A vs newE=A → ✅  →  oldE--, newE--
// newS > newE → 退出循环 → addVnodes(D)  // 新增 D
```

**发生了什么**：3 次 patchVnode，1 次 createElm(D)。原有 DOM 全部原地不动。

### 策略③：旧头 vs 新尾 — 旧头移到末尾

```
适用场景：头部元素被移到尾部
旧: [A, B, C, D]        新: [B, C, D, A]
     ↑        ↑               ↑        ↑
   旧头      旧尾            新头      新尾
```

```js
// Round 1:
// ① oldS=A vs newS=B → ❌
// ② oldE=D vs newE=A → ❌
// ③ oldS=A vs newE=A → ✅ 命中！
patchVnode(A, A)
// DOM 操作：把 A 移到 D 的后面
nodeOps.insertBefore(parent, A.elm, nextSibling(D.elm))
// 结果：DOM 从 [A,B,C,D] → [B,C,D,A]
oldS++, newE--  // oldS→B(1), newE→D(3)
```

```js
// Round 2: B-B ✅  | Round 3: C-C ✅  | Round 4: D-D ✅
// 循环结束，DOM 已经是 [B,C,D,A]
```

**发生了什么**：1 次 DOM 移动（A 移到末尾），3 次 `patchVnode`。原有 DOM 没有被销毁或重建。

### 策略④：旧尾 vs 新头 — 旧尾移到头部

```
适用场景：尾部元素被移到头部
旧: [A, B, C, D]        新: [D, A, B, C]
     ↑        ↑               ↑        ↑
   旧头      旧尾            新头      新尾
```

```js
// Round 1:
// ① oldS=A vs newS=D → ❌
// ② oldE=D vs newE=C → ❌
// ③ oldS=A vs newE=C → ❌
// ④ oldE=D vs newS=D → ✅ 命中！
patchVnode(D, D)
// DOM 操作：把 D 移到 A 的前面
nodeOps.insertBefore(parent, D.elm, A.elm)
// 结果：DOM 从 [A,B,C,D] → [D,A,B,C]
oldE--, newS++  // oldE→C(2), newS→A(1)
```

```js
// Round 2: A-A ✅  | Round 3: B-B ✅  | Round 4: C-C ✅
// 最终 DOM: [D,A,B,C]
```

**发生了什么**：1 次 DOM 移动（D 移到头部），3 次 patchVnode。

### 策略⑤：四种全失败 — key 查找

```
适用场景：新头尾都在旧数组中间，不是两端
旧: [A, B, C, D, E]      新: [B, D, A, C, E]
     ↑           ↑            ↑          ↑
   旧头         旧尾         新头        新尾
注意：B 在旧数组索引 1（中间），E 在索引 4（尾部但不是两端比较命中）
```

**Step 1**：② 旧尾 E vs 新尾 E → ✅ 命中

```js
patchVnode(E, E)
oldE--, newE--  // oldE→D(3), newE→C(3)
```

**Step 2**：四种全部失败，进入 key 查找

```js
// 构建 oldKeyToIdx 映射表（惰性求值，只建一次）
if (oldKeyToIdx === undefined) {
  oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
  // 结果: { A:0, B:1, C:2, D:3 }
}

// 用 newS(B) 的 key 查找
idxInOld = oldKeyToIdx['B']  // → 1，找到了！
vnodeToMove = oldCh[1]       // B 节点

if (sameVnode(vnodeToMove, newStartVnode)) {
  patchVnode(vnodeToMove, newStartVnode)  // 更新属性
  oldCh[1] = undefined  // 标记已处理（之后遍历到此处跳过）
  // 把 B 从中间"捞出"，移到当前头部位置（A 前面）
  nodeOps.insertBefore(parent, vnodeToMove.elm, oldStartVnode.elm)
}
newS++  // newS→D(1)
```

**当前 DOM 状态**：`[B, A, C, D, E]`（B 已移到正确位置）

**Step 3**：④ 旧尾 D vs 新头 D → ✅ 命中

```js
nodeOps.insertBefore(parent, D.elm, oldStartVnode.elm)  // D 移到 A 前面
// DOM: [B, D, A, C, E]
oldE--, newS++  // oldE→C(2), newS→A(2)
```

**Step 4~5**：A-A ✅，C-C ✅

```
最终 DOM: [B, D, A, C, E] ✅
```

**发生了什么**：2 次 DOM 移动 + patchVnode，0 次创建/销毁。完美！

---

## key 在 Diff 中的核心作用

### 有 key vs 无 key 的致命差异

```
有 key:
  oldKeyToIdx = { A:0, B:1, C:2, D:3, E:4 }
  idxInOld = oldKeyToIdx['B']  // → 1，O(1) 精准命中
  → 找到正确节点 → 移动 → 复用

无 key (所有节点 key 都是 undefined):
  oldKeyToIdx = { undefined: 4 }  // 只有最后一个的映射！
  idxInOld = oldKeyToIdx[undefined]  // → 4，错误地指向了 E！
  → 找到错误节点 → 错误复用 → 状态错乱
```

### index 做 key 的经典错误

```html
<!-- ❌ 错误写法 -->
<li v-for="(item, index) in list" :key="index">{{ item.name }}</li>

<!-- ✅ 正确写法 -->
<li v-for="item in list" :key="item.id">{{ item.name }}</li>
```

**为什么 index 做 key 会出问题？**

```
初始 list: [{id:'a',name:'A'}, {id:'b',name:'B'}, {id:'c',name:'C'}]
逆序为:    [{id:'c',name:'C'}, {id:'b',name:'B'}, {id:'a',name:'A'}]

使用 index 做 key:
  旧 VNode: [{key:0, name:'A'}, {key:1, name:'B'}, {key:2, name:'C'}]
  新 VNode: [{key:0, name:'C'}, {key:1, name:'B'}, {key:2, name:'A'}]
  
  Round 1: oldS(key:0) vs newS(key:0) → sameVnode ✅（key 相同！）
           → patchVnode → 把 name 从 A 更新为 C
           但 DOM 还是原来的 <li>，只是改了文字，没有移动！
  
  结果：3 次 patchVnode（文本更新），0 次 DOM 移动
  代价：如果 <li> 内有输入框，输入内容不会跟着移动，会错位！

使用唯一 id 做 key:
  旧 VNode: [{key:'a',name:'A'}, {key:'b',name:'B'}, {key:'c',name:'C'}]
  新 VNode: [{key:'c',name:'C'}, {key:'b',name:'B'}, {key:'a',name:'A'}]
  
  Round 1: oldS(key:'a') vs newS(key:'c') → ❌
           → ④ 旧尾(key:'c') vs 新头(key:'c') → ✅
           → 直接把 <li>C</li> 移到头部，零文本更新！
  
  结果：2 次 DOM 移动，0 次文本更新
  输入框内容随 DOM 节点一起移动，不会错位！
```

**对比总结**：

| | index 做 key | 唯一 id 做 key |
|:--|:--|:--|
| DOM 操作 | 3 次更新文本 | 2 次移动 DOM |
| 输入框状态 | ❌ 错乱 | ✅ 正确保留 |
| 过渡动画 | ❌ 不触发 | ✅ 正常触发 |
| 性能 | 低（更新 > 移动） | 高（移动 < 更新） |

---

## 完整推演动画

数据从 `[1, 2, 3]` 变为 `[3, 1, 2]`（头部插入，有唯一 key）：

```
渲染开始前的 DOM:  <li>1</li> <li>2</li> <li>3</li>

旧 children:    [ ① ,  ② ,  ③ ]
                 ↑           ↑
               oldS=0      oldE=2

新 children:    [ ③ ,  ① ,  ② ]
                 ↑           ↑
               newS=0      newE=2

═══════════════════════════════════════
Round 1
═══════════════════════════════════════
  ① oldS(①) vs newS(③) → key 不同 → ❌
  ② oldE(③) vs newE(②) → key 不同 → ❌
  ③ oldS(①) vs newE(②) → key 不同 → ❌
  ④ oldE(③) vs newS(③) → key 相同 → ✅ 命中！

  patchVnode(③, ③)              更新属性（无变化）
  insertBefore(root, ③.elm, ①.elm)  ③ 移到 ① 前面
  oldE-- → oldE=1(②)    newS++ → newS=1(①)

  DOM 现状: [③, ①, ②]

═══════════════════════════════════════
Round 2
═══════════════════════════════════════
  ① oldS(①) vs newS(①) → key 相同 → ✅

  patchVnode(①, ①)              更新属性（无变化）
  oldS++ → oldS=1(②)    newS++ → newS=2(②)

  DOM 现状: [③, ①, ②]（① 位置正确，不变）

═══════════════════════════════════════
Round 3
═══════════════════════════════════════
  ① oldS(②) vs newS(②) → key 相同 → ✅

  patchVnode(②, ②)
  oldS++ → oldS=2    newS++ → newS=3

  oldS(2) > oldE(1) → 旧数组耗尽 → 退出循环

═══════════════════════════════════════
收尾
═══════════════════════════════════════
  oldStartIdx(2) > oldEndIdx(1): 旧数组先耗尽
  newCh 还有剩余吗？newS(3) > newE(2): 没有了
  → 无需新增任何节点

  newStartIdx(3) > newEndIdx(2): 新数组耗尽
  oldCh 还有剩余吗？没有
  → 无需删除任何节点

─────────────────────────────────────────
最终 DOM: [③, ①, ②]  ✅
操作统计: 1 次 DOM 移动 + 3 次 patchVnode
         0 次创建 | 0 次删除 | 0 次文本变更
─────────────────────────────────────────
```

---

## 为什么是双端而不是单向？

React 15 及之前的 Diff 是**单向遍历**（只从头部开始），Vue 2 选择**双端比较**的原因：

| 场景 | React 单向 | Vue 双端 | 优劣 |
|:--|:--|:--|:--|
| 尾部追加 | O(n) | O(n) | 平手 |
| 头部插入 | O(n) 全部移动 | O(1) 一次命中策略④ | Vue 胜 |
| 列表反转 | O(n²) | O(n) | **Vue 显著胜** |
| 随机打乱 | O(n) | O(n) + key 查找 | 平手 |

```
列表反转 [A,B,C,D] → [D,C,B,A]:

React 单向:
  逐个从旧头找 → 每次都找不到 → 全部卸载重建
  4 次 createElm + 4 次 removeChild = 8 次 DOM 操作

Vue 双端:
  策略④命中 D → ④命中 C → ④命中 B → ④命中 A
  4 次 insertBefore = 4 次 DOM 操作，零创建零删除
```

---

## 总结

```
┌──────────────────────────────────────────────────────────┐
│                    Diff 全链路                            │
│                                                          │
│  data 变化                                                │
│    → Dep.notify                                          │
│    → Watcher 异步入队（去重）                               │
│    → nextTick 统一执行                                    │
│    → vm._render() 生成新 VNode 树                         │
│    → vm._update(newVNode)                                │
│    → patch(oldVNode, newVNode)                           │
│    → sameVnode 判断（key + tag + 类型）                    │
│         ├─ false → 销毁旧 DOM + 创建新 DOM（全量替换）       │
│         └─ true  → patchVnode                            │
│              ├─ 静态节点 → 直接跳过                         │
│              ├─ 文本节点 → setTextContent 替换文本          │
│              └─ 有 children → updateChildren             │
│                   ├─ ① oldS vs newS → head-head          │
│                   ├─ ② oldE vs newE → tail-tail          │
│                   ├─ ③ oldS vs newE → head→tail          │
│                   ├─ ④ oldE vs newS → tail→head          │
│                   └─ ⑤ key Map 查找 → middle→position     │
│    → insertBefore / removeChild / createElm              │
│    → 批量 DOM 操作生效                                     │
│                                                          │
│  核心思想：找出最小变更集，只操作必要的 DOM                    │
│  关键前提：key 是身份标识，没有它 diff 就退化               │
└──────────────────────────────────────────────────────────┘
```

| 操作类型 | 触发场景 | 成本 |
|:--|:--|:--|
| patchVnode | 属性/文本变化 | 低（只更新属性） |
| insertBefore | 节点顺序变化 | 中（DOM 移动） |
| createElm | 新增节点 | 高（创建 DOM + 属性 + 子节点） |
| removeChild | 删除节点 | 高（删除 DOM + 销毁组件） |

> **一句话**：双端比较 + key 索引 = O(n) 找出最小 DOM 操作序列。不是最快，但让开发者写出声明式代码的同时，框架自动做最优的 DOM 更新。