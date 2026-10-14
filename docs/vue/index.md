---
layout: home
hero:
  name: "Vue 源码学习"
  text: "深入理解设计思想"
  tagline: 逐行解析 Vue 2.x 核心源码 + Vue 3.x 进阶，揭示响应式系统、虚拟 DOM、模板编译的实现原理
  actions:
    - theme: brand
      text: 学习指南
      link: /guide/getting-started
    - theme: alt
      text: 回到首页
      link: /
    - theme: alt
      text: GitHub 源码
      link: https://github.com/vuejs/vue

features:
  - icon: 🧩
    title: Vue 2 响应式系统
    details: 深入剖析 Object.defineProperty 数据劫持、Dep 依赖收集、Watcher 观察者模式、数组响应式处理、异步批量更新队列
    link: /reactivity/overview

  - icon: 🔄
    title: Vue 2 实例化 & 生命周期
    details: new Vue() 完整链路、生命周期钩子执行顺序、渲染过程解析、组件注册与实例化
    link: /instance/init

  - icon: 🌳
    title: Vue 2 虚拟 DOM
    details: VNode 节点设计、同层 Diff 算法（双端比较）、Patch 渲染机制，最小化 DOM 操作
    link: /virtual-dom/vnode

  - icon: ⚡
    title: Vue 2 模板编译
    details: 模板字符串 → Parse → Optimize → Codegen → render 函数，含 AST 构建与静态节点优化
    link: /compile/overview

  - icon: 🚀
    title: Vue 3 进阶
    details: Proxy 响应式系统、Composition API、编译器改进、运行时优化（Block Tree、静态提升）
    link: /vue3/overview

  - icon: 📝
    title: Vue 面试题库
    details: 43 道 Vue 2/3 高频面试题，响应式 + 虚拟 DOM + 编译 + 综合 + 新特性全覆盖
    link: /interview
---

## 源码版本

| 项目 | 版本 | 说明 |
|:--|:--|:--|
| Vue 2 | 2.7.16 | Vue 2 最后一个大版本，源码仓库位于 `vue2-source/` |
| Vue 3 | 3.4.21 | 新一代响应式架构，源码仓库位于 `vue3-source/` |

## 学习路线图

```mermaid
graph LR
    A[Vue 2 响应式] --> B[依赖收集 Dep]
    B --> C[异步更新队列]
    A --> D[组件初始化]
    D --> E[模板编译]
    E --> F[虚拟 DOM VNode]
    F --> G[Diff + Patch]
    A -.对比.-> H[Vue 3 Proxy 响应式]
    F -.优化.-> I[Vue 3 Block Tree]
```

## 推荐学习顺序

```mermaid
graph TD
    A[1. 学习指南] --> B[2. Vue 2 响应式系统]
    B --> C[3. Vue 2 实例化 & 生命周期]
    C --> D[4. Vue 2 虚拟 DOM]
    D --> E[5. Vue 2 模板编译]
    E --> F[6. Vue 3 进阶 - 对比学习]
    F --> G[7. Vue 面试题库 - 检验]
```