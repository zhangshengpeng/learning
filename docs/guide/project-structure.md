# 源码目录结构

## 整体架构

```
vue/
├── src/
│   ├── compiler/        # 模板编译器
│   │   ├── parser/      #   HTML 解析器
│   │   ├── codegen/     #   代码生成器
│   │   ├── directives/  #   内置指令（v-model等）
│   │   └── optimizer.js #   静态节点优化
│   ├── core/            # 核心代码（平台无关）
│   │   ├── observer/    #   响应式系统
│   │   ├── vdom/        #   虚拟 DOM
│   │   ├── instance/    #   Vue 实例
│   │   ├── global-api/  #   全局 API
│   │   └── components/  #   KeepAlive
│   ├── platforms/       # 平台特定代码
│   │   ├── web/         #   Web 平台
│   │   └── weex/        #   Weex 平台
│   ├── server/          # SSR 服务端渲染
│   ├── sfc/             # .vue 文件解析
│   └── shared/          # 跨平台工具函数
└── types/               # Flow 类型声明
```

## 核心入口

```js
// src/core/instance/index.js
function Vue(options) {
  this._init(options) // 一切从这里开始
}

// 通过 Mixin 挂载原型方法
initMixin(Vue)         // Vue.prototype._init
stateMixin(Vue)        // Vue.prototype.$set/$delete/$watch
eventsMixin(Vue)       // Vue.prototype.$on/$emit/$off
lifecycleMixin(Vue)    // Vue.prototype._update/$forceUpdate
renderMixin(Vue)       // Vue.prototype._render/$nextTick
```

## 关键文件索引

| 文件 | 作用 |
|------|------|
| `core/observer/index.js` | `Observer` + `defineReactive` |
| `core/observer/dep.js` | `Dep` 依赖收集类 |
| `core/observer/watcher.js` | `Watcher` 观察者类 |
| `core/observer/scheduler.js` | `nextTick` 异步队列 |
| `core/observer/array.js` | 数组原型方法重写 |
| `core/vdom/vnode.js` | `VNode` 虚拟节点类 |
| `core/vdom/patch.js` | `patch` / `diff` 算法 |
| `core/instance/init.js` | `_init` 入口 |
| `core/instance/lifecycle.js` | 生命周期 + `mountComponent` |
| `compiler/index.js` | 编译入口 |
| `compiler/parser/index.js` | HTML 模板解析成 AST |
| `compiler/codegen/index.js` | AST 生成 render 函数代码 |

## 构建产物

| 产物 | 说明 |
|------|------|
| `vue.js` | 完整版（编译器 + 运行时），开发环境 |
| `vue.min.js` | 完整版压缩 |
| `vue.runtime.js` | 运行时版本（不含编译器） |
| `vue.runtime.esm.js` | ES Module 运行时版本 |
