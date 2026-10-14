# 包管理（npm/yarn/pnpm）

## npm vs yarn vs pnpm

| | npm | yarn | pnpm |
|:--|:--|:--|:--|
| 安装速度 | 慢 | 较快 | 快 |
| 磁盘占用 | 大（每项目独立） | 大 | 小（硬链接共享） |
| node_modules 结构 | 平铺（扁平化） | 平铺 | 嵌套（非扁平） |
| 幽灵依赖 | 存在 | 存在 | 不存在 |
| Monorepo 支持 | workspaces | workspaces | 原生 + 严格 |
| lock 文件 | package-lock.json | yarn.lock | pnpm-lock.yaml |

## 幽灵依赖（Phantom Dependencies）

```yaml
npm / yarn 的 node_modules 结构：
  node_modules/
    exprress/       # 你安装的
    debug/          # express 的依赖 → 被提升到顶层！
    ms/             # debug 的依赖 → 也被提升！

问题：
  你的代码可以直接 require('debug') → 即使你没安装它！
  如果 express 不再依赖 debug → 你的代码就崩了
  → 这就是"幽灵依赖"
  
  为什么会出现？
  npm 扁平化提升依赖 → 减少嵌套 → 但暴露了内部依赖

为什么 pnpm 不存在幽灵依赖？
  pnpm 的 node_modules 结构：
    node_modules/
      .pnpm/           # 所有依赖的真实存储
        express@4.18.2/node_modules/express/
        debug@2.6.9/node_modules/debug/
      express → 符号链接 → .pnpm/express@4.18.2/node_modules/express/
      # 只暴露你直接安装的依赖
      # debug 不会被提升到顶层 → 你的代码无法直接 import('debug')
```

## pnpm 的硬链接机制

```
pnpm 如何节省磁盘？

全局仓库（store）：
  ~/.pnpm-store/v3/
    files/
      a1/
        <hash> → 文件内容（只存一份）
      b2/
        <hash> → 文件内容

项目 node_modules：
  .pnpm/xxx → 硬链接 → 全局 store
  多个项目共享同一份文件（硬链接）
  磁盘只存储一份

对比：
  npm：项目A 的 lodash 和项目B 的 lodash → 两份
  pnpm：项目A 和项目B 的 lodash → 硬链接到同一份 → 一份
```

## lock 文件

```yaml
作用：
  锁定依赖版本（包括子依赖）
  确保不同环境安装的依赖一致

什么时候更新：
  npm install 新包 → 自动更新
  npm update → 升级符合 version range 的最新版
  npm ci → 严格根据 lock 安装，不更新 lock

CI/CD 为什么用 npm ci？
  → 更快（跳过依赖解析）
  → 更确定（lock 严格一致）
  → 如果 lock 和 package.json 不匹配 → 直接报错
```

## 版本号语义

```
1.2.3
│ │ │
│ │ └─ Patch：Bug 修复，向下兼容
│ └─── Minor：新功能，向下兼容
└───── Major：破坏性变更，不兼容

^1.2.3 → 1.x.x（不改变 Major）
~1.2.3 → 1.2.x（不改变 Minor）
*      → 任意版本
1.2.3  → 精确版本
```

## Monorepo

```yaml
什么是 Monorepo？
  多个相关项目在同一个 Git 仓库中管理

优点：
  代码共享方便（packages/shared）
  统一工具链（ESLint、TS、构建）
  原子提交（跨包修改一次提交）
  统一测试和 CI/CD

缺点：
  仓库体积大
  权限控制困难
  构建变复杂

典型结构：
  packages/
    shared/         # 公共工具
    ui-components/  # 组件库
    app-web/        # 主应用
    app-admin/      # 管理后台
  package.json      # 根 workspace 配置
  pnpm-workspace.yaml

配置：
  # pnpm-workspace.yaml
  packages:
    - 'packages/*'
```

## 在 Vue 项目中的应用

```bash
# 推荐：pnpm
pnpm create vite my-app --template vue-ts

# 安装
pnpm install
# pnpm add vue-router
# pnpm add -D @types/node
# pnpm remove axios

# 运行
pnpm dev
```