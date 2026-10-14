# Vue 3 编译器改进

Vue 3 编译器做了大量优化，核心理念：**在编译阶段尽可能多地提取静态信息，让运行时只做最少的工作**。

## 编译三阶段对比

```
Vue 2：template → parse → optimize → codegen → render 函数
Vue 3：template → parse → transform → codegen → render 函数
```

`optimize` 被整合到 `transform` 阶段中，通过 PatchFlag 和静态提升实现。

## PatchFlag — 靶向更新

Vue 3 为每个带动态绑定的 VNode 增加一个 `patchFlag` 标记，告诉运行时这个节点具体哪些地方是动态的：

```js
// <div :class="cls" :id="id">{{ msg }}</div>

// Vue 2 编译结果（无标记，全量对比）
_c('div', { class: cls, attrs: { id: id } }, [_v(_s(msg))])

// Vue 3 编译结果（带 patchFlag）
_createVNode("div", { class: cls, id: id }, msg, PatchFlags.CLASS | PatchFlags.PROPS | PatchFlags.TEXT)
```

### PatchFlag 类型

```js
// NodeTypes 中的定义
const PatchFlags = {
  TEXT: 1,                      // 动态文本
  CLASS: 2,                     // 动态 class
  STYLE: 4,                     // 动态 style
  PROPS: 8,                     // 动态属性（不包括 class/style）
  FULL_PROPS: 16,               // 全动态属性（key 也是动态的）
  HYDRATE_EVENTS: 32,           // 带事件的节点
  STABLE_FRAGMENT: 64,          // 稳定 Fragment
  KEYED_FRAGMENT: 128,          // 带 key 的 Fragment
  UNKEYED_FRAGMENT: 256,        // 无 key 的 Fragment
  NEED_PATCH: 512,              // 需要 patch
  DYNAMIC_SLOTS: 1024,          // 动态插槽
  HOISTED: -1,                  // 静态提升节点（跳过 diff）
  BAIL: -2,                     // 退出优化标记
}
```

### 运行时利用 PatchFlag

```js
// 更新时根据 patchFlag 只做必要的工作，跳过静态内容
if (patchFlag & PatchFlags.CLASS) {
  // 只更新 class，不动其他
  patchClass(el, nextValue)
}
if (patchFlag & PatchFlags.TEXT) {
  // 只更新文本
  patchText(oldNode, nextNode)
}
// 没有 patchFlag → 静态节点 → 直接跳过 diff
```

## 静态提升（Static Hoisting）

将不会变化的 VNode 提升到 `render` 函数外部，只创建一次后缓存：

```js
// 编译前
<div><span>hello</span></div>

// Vue 3 编译结果
const _hoisted_1 = _createVNode("span", null, "hello", -1 /* HOISTED */)
// -1 = HOISTED，运行时直接跳过

function render() {
  return _createVNode("div", null, [_hoisted_1])  // 复用
}
```

静态提升的好处：
- 每次渲染不会重复创建静态 VNode 对象
- 运行时遇到 `HOISTED` 标记直接跳过 diff
- 配合 `v-once` 效果更好

## Block Tree — 靶向更新结构

Vue 3 引入 Block 概念，将模板中的动态节点收集到一个数组中，diff 时只处理这些动态节点：

```html
<div>                           <!-- block 根节点 -->
  <span>static</span>           <!-- 跳过 -->
  <p>{{ dynamic }}</p>          <!-- 加入 dynamicChildren -->
  <div>
    <span>static inner</span>   <!-- 跳过 -->
    <span>{{ dynamic2 }}</span> <!-- 加入 dynamicChildren -->
  </div>
</div>
```

```js
// Block 节点上有一个 dynamicChildren 数组
block.dynamicChildren = [
  pVNode,       // 包含 {{ dynamic }}
  spanVNode,    // 包含 {{ dynamic2 }}
]

// diff 时只比较 dynamicChildren，跳过所有静态节点
for (const child of block.dynamicChildren) {
  patch(child, ...)
}
```

### 什么情况会创建新 Block？

- `v-if` 的条件分支
- `v-for` 的循环体

每个 Block 独立追踪自己的动态节点，形成树状结构。

## 事件缓存

```html
<button @click="onClick">click</button>
```

```js
// Vue 3 编译结果：事件函数也被缓存
_createVNode("button", { onClick: _cache[0] || (_cache[0] = () => onClick()) })
```

事件缓存避免每次渲染生成新的函数引用，减少子组件不必要的更新。

## 新的 v-model

```html
<!-- Vue 2：.sync 修饰符 -->
<Child :value.sync="val" />

<!-- Vue 3：统一为 v-model -->
<Child v-model="val" />
<Child v-model:title="val" />   <!-- 多个 v-model -->
<Child v-model:title="val" v-model:content="content" />
```

编译为：
```js
_createVNode(Child, {
  modelValue: val,
  'onUpdate:modelValue': $event => val = $event
})
```

## 编译器可扩展性

Vue 3 编译器采用**插件化架构**：

```js
// 自定义编译转换插件
const myPlugin = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {
    // 修改 AST 节点
  }
}

compile(template, {
  nodeTransforms: [myPlugin]      // 节点转换
  directiveTransforms: {}         // 指令转换
})
```

这使得 `v-memo`、`v-once`、Vapor Mode 等特性可以独立实现。

## 编译性能对比

| 优化手段 | Vue 2 | Vue 3 |
|:--------|:----:|:----:|
| 静态标记 | ✅ (ast.static) | ✅ (PatchFlag 更细粒度) |
| 静态提升 | ❌ | ✅ |
| Block Tree | ❌ | ✅ |
| 事件缓存 | ❌ | ✅ |
| 动态绑定标记 | ❌ | ✅ |
| Tree Flattening | ❌ | ✅ |