# 编译概述

## 编译三阶段

Vue 2 将模板编译成 render 函数，经历三个步骤：

```
template: "<div class="app">{{ msg }}</div>"
    │
    ├── ① Parse（解析）
    │   └── HTML → AST（抽象语法树）
    │
    ├── ② Optimize（优化）
    │   └── 标记静态节点（编译时优化 diff）
    │
    ├── ③ Codegen（代码生成）
    │   └── AST → render 函数字符串
    │
    ▼
render: function() {
    return _c("div", { staticClass: "app" }, [_v(_s(msg))])
}
```

## 编译入口

```js
// src/compiler/index.js

export const createCompiler = createCompilerCreator(function baseCompile(
  template,
  options
) {
  // ① Parse：模板 → AST
  const ast = parse(template.trim(), options)

  // ② Optimize：标记静态节点
  if (options.optimize !== false) {
    optimize(ast, options)
  }

  // ③ Codegen：AST → render + staticRenderFns
  const code = generate(ast, options)

  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns,
  }
})
```

## 编译时机

编译有两种时机：

| 方式 | 时机 | 使用场景 |
|------|------|---------|
| **运行时编译** | 浏览器中，`new Vue()` 时 | 完整版 `vue.js`、CDN 引入 |
| **构建时编译** | webpack/vite 中，`vue-loader` 处理 | SFC `.vue` 文件 |

构建时编译可以完全去除 `compiler` 模块（约 30% 体积），只保留运行时。

## AST 节点示例

```html
<div id="app" class="container">
  <p>hello {{ name }}</p>
</div>
```

编译成的 AST 结构：

```js
{
  type: 1,           // 1=元素节点
  tag: "div",
  attrsList: [{ name: "id", value: "app" }, { name: "class", value: "container" }],
  attrsMap: { id: "app", class: "container" },
  children: [{
    type: 1,
    tag: "p",
    children: [{
      type: 2,       // 2=含变量的文本
      expression: `"hello " + _s(name)`,
      text: "hello {{ name }}"
    }]
  }]
}
```
