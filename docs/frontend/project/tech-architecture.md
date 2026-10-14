# 技术选型 & 架构

## 技术选型

| 问题 | 准备要点 |
|:----|:--------|
| 为什么用 Vite 替换 Webpack？ | 开发启动快 10x、HMR 秒级、ESM 原生支持 |
| 为什么用 Pinia 而不是 Vuex？ | TS 类型完备、无 mutations、模块化自然、体积小 |
| 为什么用 Element Plus？ | 团队熟悉、社区活跃、issue 响应快 |
| 为什么用 pnpm？ | 幽灵依赖安全、磁盘省、monorepo 原生支持 |
| CSS 为什么选 Tailwind/UnoCSS？ | 减少样式冲突、构建时按需生成、视觉统一 |

> 面试中避免拉踩：说"Vue 响应式对我们业务更直观"比"React 太难了"好得多。

## 项目目录结构

```
src/
├── api/           # 接口层
├── assets/        # 静态资源
├── components/    # 公共组件
├── composables/   # 组合函数
├── directives/    # 自定义指令
├── layout/        # 布局组件
├── router/        # 路由配置
├── stores/        # Pinia
├── styles/        # 全局样式
├── utils/         # 工具函数
├── views/         # 页面
└── App.vue
```

面试中能画出项目目录结构并说清每一层职责，能体现项目参与度。

## 权限管理

```js
// 路由权限
router.beforeEach((to) => {
  const roles = useUserStore().roles
  if (to.meta.roles && !roles.some(r => to.meta.roles.includes(r))) {
    return '/403'
  }
})

// 按钮权限
// v-permission="['admin', 'editor']"
// 指令内部读取 store 判断

// 数据权限 → 后端控制
```