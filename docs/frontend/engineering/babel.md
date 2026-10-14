# Babel

## Babel 是什么？

```
Babel = JavaScript 编译器

作用：
  把新语法/新特性编译为旧环境可执行的代码

例子：
  可选链 ?. → ES2015 不支持 → Babel 转：
    obj?.a?.b  →  obj == null ? void 0 : obj.a == null ? void 0 : obj.a.b

  JSX → 不是 JS → Babel 转：
    <div>hello</div> → React.createElement('div', null, 'hello')
```

## Babel 处理流程

```
源码字符串
  ↓ parse（@babel/parser）
AST（抽象语法树）
  ↓ transform（plugins）  ← 核心：在这里增删改 AST
AST'
  ↓ generate（@babel/generator）
目标代码字符串
```

### 简单示例

```js
// 源码
const fn = () => 1

// AST（简化表示）
{
  type: "VariableDeclaration",
  declarations: [{
    type: "VariableDeclarator",
    id: { type: "Identifier", name: "fn" },
    init: {
      type: "ArrowFunctionExpression",
      body: { type: "NumericLiteral", value: 1 }
    }
  }]
}

// transform：ArrowFunctionExpression → FunctionExpression
{
  type: "FunctionExpression",
  body: { type: "BlockStatement", body: [{ type: "ReturnStatement", argument: ... }] }
}

// 输出
var fn = function() { return 1; }
```

## 核心依赖

```yaml
@babel/core: 核心调度（parse → transform → generate）

@babel/cli: 命令行工具

@babel/preset-env: 语法转换预设
  → 根据 targets 自动选择需要的 plugins 和 polyfills
  → 不需要手动列出所有插件

@babel/preset-typescript: TS 语法转换

@babel/plugin-transform-runtime:
  → 避免 helper 代码重复（复用 @babel/runtime）
  → 避免全局污染（不修改原型）

@babel/runtime: 运行时 helper（如 _classCallCheck、_defineProperty）
```

## 配置

```json
{
  "presets": [
    ["@babel/preset-env", {
      "targets": {
        "browsers": ["> 1%", "last 2 versions", "not dead"]
      },
      "useBuiltIns": "usage",    // 按需 polyfill
      "corejs": "3.36"           // core-js 版本
    }]
  ],
  "plugins": [
    ["@babel/plugin-transform-runtime", {
      "corejs": 3
    }]
  ]
}
```

### useBuiltIns 对比

```yaml
"entry":
  在入口文件手动 import 'core-js'
  根据 targets 自动全量 polyfill
  → 可能很大

"usage"（推荐）:
  不需要手动 import
  Babel 按需检测代码中用到的 API → 按需引入
  → 最精简

false:
  不做任何 polyfill
```

## Polyfill 策略

```yaml
@babel/preset-env + useBuiltIns: "usage":
  → 自动检测代码中使用的 ES 特性
  → 按需引入 core-js polyfill
  → 修改全局原型（Array.prototype.includes 等）
  
  ✅ 简单自动化
  ❌ 全局污染

@babel/plugin-transform-runtime:
  → 不修改全局原型
  → 使用模块导入的方式引入 helper
  → 适合库/组件开发
  
  ✅ 无全局污染
  ❌ 实例方法（如 [].includes）不能 polyfill

策略：
  - 应用开发 → preset-env + useBuiltIns
  - 库/组件开发 → transform-runtime
```

## Babel 在 Vue 项目中的应用

```js
// Vue CLI (Webpack) → 默认集成 Babel
// babel.config.js

// Vite → 默认不用 Babel
// Vite 用 esbuild 转译 TS/JSX → 更快
// @vitejs/plugin-vue 处理 .vue 文件

// Vite 何时需要 Babel？
// - 需要某些 Babel 插件（JSX 特殊转换、decorators 等）
// - 需要兼容不支持 ES2020+ 的浏览器（esbuild 不降级语法）
// - 使用 @vitejs/plugin-legacy（自动 Babel 降级 + polyfill）
```

## 经典面试题

### 题1：Babel 和 Polyfill 的区别？

```yaml
Babel（语法转换）：
  → 把新语法转为旧语法
  → 箭头函数 → 普通函数
  → class → 构造函数

Polyfill（API 垫片）：
  → 补充旧环境没有的新 API
  → Promise、Array.from、Object.assign
  → 通过修改全局对象或原型实现

Babel 只处理语法（Syntax）
Polyfill 处理 API（Runtime）
```

### 题2：preset 和 plugin 的执行顺序？

```
plugins 先于 presets
plugins 从前到后
presets 从后到前

{
  "plugins": ["A", "B"],
  "presets": ["X", "Y"]
}
→ 执行顺序：A → B → Y → X
```