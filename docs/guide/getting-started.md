# 如何阅读 Vue 源码

## 前置知识

在开始阅读 Vue 源码之前，建议先掌握以下知识：

| 技能 | 重要程度 | 说明 |
|------|---------|------|
| JavaScript 高级特性 | ⭐⭐⭐⭐⭐ | 原型链、闭包、this 绑定 |
| ES6+ | ⭐⭐⭐⭐⭐ | class、Proxy、Reflect、Set/Map |
| Flow / TypeScript | ⭐⭐⭐ | Vue 2 源码使用 Flow 做类型检查 |
| 设计模式 | ⭐⭐⭐⭐ | 观察者、发布-订阅、策略模式 |
| DOM API | ⭐⭐⭐ | 操作真实 DOM 的基础 |

## 阅读方法

### 1. 带着问题读源码

不要漫无目的地从头看到尾，效率很低。建议按以下问题驱动：

- Vue 是怎么知道数据变化了？
- 数据变化后 DOM 为什么会自动更新？
- 为什么修改数组要用 `$set`？
- 模板是怎么变成页面的？
- v-if 和 v-for 谁的优先级更高？

### 2. 从入口开始

```
src/core/instance/index.js → Vue 构造函数
  → initMixin()           # _init 方法
  → stateMixin()          # $set/$delete/$watch
  → eventsMixin()         # $on/$emit/$off
  → lifecycleMixin()      # _update/$forceUpdate
  → renderMixin()         # _render/$nextTick
```

### 3. 善用断点调试

在 `node_modules/vue/dist/vue.js` 中打断点比读静态源码直观得多。

```js
// 在关键位置加 debugger
Object.defineProperty(obj, key, {
  get() { debugger; return val },
  set(newVal) { debugger; val = newVal; dep.notify() }
})
```

### 4. 画流程图

响应式系统、编译流程、diff 算法等核心模块适合画图理解。

## 核心模块阅读顺序

1. **响应式系统** `src/core/observer/`
   - `index.js` → Observer、defineReactive
   - `dep.js` → Dep 依赖收集器
   - `watcher.js` → Watcher 观察者
   - `scheduler.js` → 异步更新队列
   - `array.js` → 数组方法重写

2. **虚拟 DOM** `src/core/vdom/`
   - `vnode.js` → VNode 类
   - `patch.js` → diff + 真实 DOM 更新

3. **模板编译** `src/compiler/`
   - `parser/` → 模板解析为 AST
   - `optimizer.js` → 标记静态节点
   - `codegen/` → AST 生成 render 函数

4. **组件化** `src/core/`
   - `instance/init.js` → 初始化入口
   - `instance/lifecycle.js` → 生命周期
   - `vdom/create-component.js` → 组件 VNode
