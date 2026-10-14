# Codegen — 代码生成

## 生成目标

将 AST 转换为可执行的 render 函数字符串。

```js
// 输入 AST
{ tag: "div", attrs: [{ name: "id", value: "app" }], children: [...] }

// 输出 render 函数
`_c("div", { attrs: { id: "app" } }, [...])`
```

## 核心实现

```js
// src/compiler/codegen/index.js

export function generate(ast, options) {
  const state = new CodegenState(options)
  const code = ast ? genElement(ast, state) : '_c("div")'

  return {
    render: new Function(`with(this){ return ${code} }`),
    staticRenderFns: state.staticRenderFns,
  }
}
```

## genElement — 根据节点类型分发

```js
function genElement(el, state) {
  if (el.parent) {
    el.pre = el.pre || el.parent.pre
  }

  if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state)       // 静态根 → 提取到 staticRenderFns
  } else if (el.once && !el.onceProcessed) {
    return genOnce(el, state)         // v-once
  } else if (el.for && !el.forProcessed) {
    return genFor(el, state)          // v-for
  } else if (el.if && !el.ifProcessed) {
    return genIf(el, state)           // v-if/v-else-if/v-else
  } else if (el.tag === "template" && !el.slotTarget) {
    return genChildren(el, state)      // template → 展开子节点
  } else if (el.tag === "slot") {
    return genSlot(el, state)         // slot
  } else {
    // 普通元素或组件
    let code
    if (el.component) {
      code = genComponent(el.component, el, state)
    } else {
      // genData 生成属性部分：{ attrs, on, style, ... }
      const data = el.plain ? undefined : genData(el, state)

      // genChildren 生成子节点数组
      const children = genChildren(el, state)

      code = `_c("${el.tag}"${data ? `, ${data}` : ""}${
        children ? `, ${children}` : ""
      })`
    }
    return code
  }
}
```

## 编译示例

```html
<div id="app" @click="handle">
  <span :class="cls">{{ msg }}</span>
</div>
```

编译后的 render：

```js
function render() {
  with (this) {
    return _c("div", { attrs: { id: "app" }, on: { click: handle } }, [
      _c("span", { class: cls }, [_v(_s(msg))]),
    ])
  }
}
```

## 辅助函数清单

编译后的 render 依赖的辅助函数（来自 `instance/render-helpers/`）：

| 简写 | 函数 | 用途 |
|------|------|------|
| `_c` | `createElement` | 创建元素 VNode |
| `_v` | `createTextVNode` | 创建文本 VNode |
| `_s` | `toString` | 转字符串（{{ }} 中） |
| `_e` | `createEmptyVNode` | 空注释节点（v-if=false） |
| `_l` | `renderList` | v-for 渲染列表 |
| `_t` | `renderSlot` | 渲染 slot |
| `_m` | `renderStatic` | 渲染静态内容 |
| `_o` | `markOnce` | v-once 标记 |
| `_q` | `looseEqual` | 松散相等判断 |
| `_i` | `looseIndexOf` | 松散 indexOf |
| `_u` | `resolveScopedSlots` | 解析 scopedSlots |
| `_b` | `bindObjectProps` | v-bind="object" |
| `_n` | `toNumber` | 转数字 |
| `_k` | `checkKeyCodes` | 按键修饰符检查 |

## v-if 的特殊处理

```html
<div v-if="show">A</div>
<div v-else>B</div>
```

编译为：

```js
// 三元表达式
(show) ? _c("div", [_v("A")]) : _c("div", [_v("B")])
```

## v-for 的特殊处理

```html
<div v-for="item in list" :key="item.id">{{ item.name }}</div>
```

编译为：

```js
_l(list, function (item) {
  return _c("div", { key: item.id }, [_v(_s(item.name))])
})
```
