import { defineConfig } from "vitepress"

function vue2Sidebar() {
  return [
    {
      text: "响应式系统",
      collapsed: false,
      items: [
        { text: "概述", link: "/reactivity/overview" },
        { text: "Observer 数据劫持", link: "/reactivity/observer" },
        { text: "Dep 依赖收集", link: "/reactivity/dep" },
        { text: "Watcher 观察者", link: "/reactivity/watcher" },
        { text: "数组响应式处理", link: "/reactivity/array" },
        { text: "异步批量更新", link: "/reactivity/async-update" },
      ],
    },
    {
      text: "实例化 & 生命周期",
      collapsed: true,
      items: [
        { text: "new Vue 发生了什么", link: "/instance/init" },
        { text: "生命周期流程", link: "/instance/lifecycle" },
        { text: "渲染过程解析", link: "/instance/render" },
        { text: "组件→DOM 完整渲染流程", link: "/instance/render-pipeline" },
      ],
    },
    {
      text: "虚拟 DOM",
      collapsed: true,
      items: [
        { text: "VNode 虚拟节点", link: "/virtual-dom/vnode" },
        { text: "Diff 算法详解", link: "/virtual-dom/diff" },
        { text: "Patch 渲染过程", link: "/virtual-dom/patch" },
      ],
    },
    {
      text: "模板编译",
      collapsed: true,
      items: [
        { text: "编译概述", link: "/compile/overview" },
        { text: "Parse 模板解析", link: "/compile/parse" },
        { text: "Optimize 静态标记", link: "/compile/optimize" },
        { text: "Codegen 代码生成", link: "/compile/codegen" },
      ],
    },
  ]
}

export default defineConfig({
  title: "Vue 源码解析",
  description: "深入理解 Vue 2 & Vue 3 源码设计思想",
  base: "/learning/",

  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "🏠 首页", link: "/" },
      { text: "🧩 Vue 源码", link: "/vue/" },
      { text: "📝 Vue 题库", link: "/interview" },
      { text: "🔷 TS 题库", link: "/ts-interview" },
    ],

    sidebar: {
      "/vue/": [
        ...vue2Sidebar(),
        {
          text: "Vue 3 进阶",
          collapsed: true,
          items: [
            { text: "概述", link: "/vue3/overview" },
            { text: "Proxy 响应式系统", link: "/vue3/reactivity" },
            { text: "Composition API", link: "/vue3/composition-api" },
            { text: "编译器改进", link: "/vue3/compiler" },
            { text: "运行时优化 & 新组件", link: "/vue3/runtime" },
          ],
        },
      ],
      "/guide/": [
        {
          text: "学习指南",
          items: [
            { text: "如何阅读源码", link: "/guide/getting-started" },
            { text: "源码目录结构", link: "/guide/project-structure" },
          ],
        },
      ],
      "/reactivity/": vue2Sidebar(),
      "/instance/": vue2Sidebar(),
      "/virtual-dom/": vue2Sidebar(),
      "/compile/": vue2Sidebar(),
      "/vue3/": [
        {
          text: "Vue 3 进阶",
          items: [
            { text: "概述", link: "/vue3/overview" },
            { text: "Proxy 响应式系统", link: "/vue3/reactivity" },
            { text: "Composition API", link: "/vue3/composition-api" },
            { text: "编译器改进", link: "/vue3/compiler" },
            { text: "运行时优化 & 新组件", link: "/vue3/runtime" },
          ],
        },
      ],

      "/frontend/js-core/": [
        {
          text: "JavaScript 核心",
          collapsed: false,
          items: [
            { text: "概述", link: "/frontend/js-core/" },
            { text: "原型链", link: "/frontend/js-core/prototype" },
            { text: "this 绑定", link: "/frontend/js-core/this" },
            { text: "闭包", link: "/frontend/js-core/closure" },
            { text: "事件循环", link: "/frontend/js-core/event-loop" },
            { text: "Promise", link: "/frontend/js-core/promise" },
            { text: "WeakMap / Map", link: "/frontend/js-core/weakmap" },
            { text: "Proxy & Reflect", link: "/frontend/js-core/proxy" },
            { text: "Class", link: "/frontend/js-core/class" },
          ],
        },
      ],
      "/frontend/browser/": [
        {
          text: "浏览器渲染 & CSS",
          collapsed: false,
          items: [
            { text: "概述", link: "/frontend/browser/" },
            { text: "渲染流程", link: "/frontend/browser/render-process" },
            { text: "BFC", link: "/frontend/browser/bfc" },
            { text: "层叠上下文", link: "/frontend/browser/stacking-context" },
            { text: "Flex & Grid", link: "/frontend/browser/flex-grid" },
            { text: "CSS 工程化", link: "/frontend/browser/css-engineering" },
            { text: "布局 & 移动端适配", link: "/frontend/browser/layout-mobile" },
          ],
        },
      ],
      "/frontend/typescript/": [
        {
          text: "TypeScript",
          collapsed: false,
          items: [
            { text: "概述", link: "/frontend/typescript/" },
            { text: "基础类型", link: "/frontend/typescript/basics" },
            { text: "interface vs type", link: "/frontend/typescript/interface-vs-type" },
            { text: "泛型", link: "/frontend/typescript/generics" },
            { text: "工具类型", link: "/frontend/typescript/utility-types" },
            { text: "Vue 3 TS 实践", link: "/frontend/typescript/vue3-ts" },
            { text: "声明文件 & tsconfig", link: "/frontend/typescript/declaration" },
            { text: "实战模式", link: "/frontend/typescript/patterns" },
          ],
        },
      ],
      "/frontend/network/": [
        {
          text: "网络 & 安全",
          collapsed: false,
          items: [
            { text: "概述", link: "/frontend/network/" },
            { text: "HTTP 各版本", link: "/frontend/network/http" },
            { text: "HTTPS & TLS", link: "/frontend/network/https-tls" },
            { text: "跨域 CORS", link: "/frontend/network/cors" },
            { text: "Cookie & 存储", link: "/frontend/network/cookie-storage" },
            { text: "HTTP 缓存", link: "/frontend/network/cache" },
            { text: "XSS & CSRF", link: "/frontend/network/xss-csrf" },
            { text: "状态码 & REST", link: "/frontend/network/status-codes" },
          ],
        },
      ],
      "/frontend/engineering/": [
        {
          text: "工程化",
          collapsed: false,
          items: [
            { text: "概述", link: "/frontend/engineering/" },
            { text: "Webpack vs Vite", link: "/frontend/engineering/webpack-vite" },
            { text: "打包优化", link: "/frontend/engineering/bundle-optimization" },
            { text: "Babel", link: "/frontend/engineering/babel" },
            { text: "ESM vs CommonJS", link: "/frontend/engineering/esm-cjs" },
            { text: "Source Map", link: "/frontend/engineering/sourcemap" },
            { text: "CI/CD", link: "/frontend/engineering/cicd" },
            { text: "包管理", link: "/frontend/engineering/package-manager" },
            { text: "ESLint & Prettier", link: "/frontend/engineering/eslint-prettier" },
          ],
        },
      ],
      "/frontend/performance/": [
        {
          text: "性能优化",
          collapsed: false,
          items: [
            { text: "概述", link: "/frontend/performance/" },
            { text: "性能指标", link: "/frontend/performance/metrics" },
            { text: "首屏加载优化", link: "/frontend/performance/first-screen" },
            { text: "渲染性能 & 图片", link: "/frontend/performance/render-perf" },
            { text: "实战案例", link: "/frontend/performance/case-study" },
          ],
        },
      ],
      "/frontend/handwriting/": [
        {
          text: "手写代码",
          collapsed: false,
          items: [
            { text: "概述", link: "/frontend/handwriting/" },
            { text: "防抖 & 节流", link: "/frontend/handwriting/debounce-throttle" },
            { text: "深拷贝", link: "/frontend/handwriting/deep-clone" },
            { text: "new & call & bind", link: "/frontend/handwriting/new-call-bind" },
            { text: "Promise & 发布订阅", link: "/frontend/handwriting/promise-emitter" },
            { text: "LRU & 其他", link: "/frontend/handwriting/lru-other" },
            { text: "Vue 相关手写", link: "/frontend/handwriting/vue-handwrite" },
          ],
        },
      ],
      "/frontend/project/": [
        {
          text: "项目 & 软技能",
          collapsed: false,
          items: [
            { text: "概述", link: "/frontend/project/" },
            { text: "技术选型 & 架构", link: "/frontend/project/tech-architecture" },
            { text: "线上排查 & 团队贡献", link: "/frontend/project/career" },
          ],
        },
      ],

      "/frontend/": [
        {
          text: "前端基础",
          collapsed: false,
          items: [
            { text: "JavaScript 核心", link: "/frontend/js-core/" },
            { text: "浏览器渲染 & CSS", link: "/frontend/browser/" },
            { text: "TypeScript", link: "/frontend/typescript/" },
            { text: "网络 & 安全", link: "/frontend/network/" },
            { text: "工程化", link: "/frontend/engineering/" },
            { text: "性能优化", link: "/frontend/performance/" },
            { text: "手写代码", link: "/frontend/handwriting/" },
            { text: "项目 & 软技能", link: "/frontend/project/" },
          ],
        },
      ],

      "/interview": [],
      "/ts-interview": [],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/core" },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "基于 Vue 2.7 & Vue 3.4 源码",
      copyright: "用于学习研究",
    },
  },
})