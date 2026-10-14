# CI/CD

## 概念

```yaml
CI（Continuous Integration）持续集成：
  开发者 push 代码 → 自动构建 → 自动测试 → 反馈结果
  目的：尽早发现集成问题

CD（Continuous Delivery/Deployment）持续交付/部署：
  CI 通过后 → 自动部署到测试/生产环境
  目的：快速、可靠地发布
```

## 流水线（Pipeline）

```
push 代码
  ↓
① 安装依赖（npm ci）
  ↓
② 代码检查（ESLint + Prettier）
  ↓
③ 类型检查（tsc --noEmit）
  ↓
④ 单元测试（vitest）
  ↓
⑤ 构建（npm run build）
  ↓
⑥ 部署（上传 CDN / 服务器 / CloudBase）
  ↓
⑦ 通知（企业微信/钉钉/邮件）
```

## GitHub Actions 示例

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install
        run: npm ci  # ci 比 install 更快更安全（lock 文件严格一致）

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npx tsc --noEmit

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build

      - name: Deploy to CloudBase
        uses: TencentCloudBase/cloudbase-action@v2
        with:
          secretId: ${{ secrets.SECRET_ID }}
          secretKey: ${{ secrets.SECRET_KEY }}
          envId: ${{ secrets.ENV_ID }}
```

## 前端 CI/CD 要点

```yaml
① 构建产物缓存：
  node_modules 缓存（基于 lock 文件 hash）
  构建缓存（千万别缓存 dist！）

② 环境变量分离：
  开发/测试/生产 不同的：
    - API Base URL
    - 功能开关（Feature Flags）
    - Sentry DSN

③ 构建号：
  每次构建生成唯一版本号
  process.env.BUILD_ID → 注入到构建产物
  用于排错：线上的代码对应哪个 commit

④ 构建产物上传：
  CDN 上传（OSS/S3）
  HTML 部署（服务器/Nginx）
  两者分开部署：
    静态资源（js/css/img）→ CDN（长期缓存）
    index.html → 服务器（不缓存或短缓存）

⑤ 回滚策略：
  - 保留最近 N 次构建产物
  - 快速回滚到上一版本
  - 蓝绿部署/灰度发布
```

## 在 Vue 项目中的应用

```js
// vite.config.ts
export default defineConfig(({ mode }) => {
  // 注入构建信息
  const buildInfo = {
    version: process.env.npm_package_version,
    buildTime: new Date().toISOString(),
    commitHash: process.env.GITHUB_SHA || 'unknown',
  }

  return {
    define: {
      __BUILD_INFO__: JSON.stringify(buildInfo)
    }
  }
})

// src/main.ts
console.log('App Version:', __BUILD_INFO__.version)
console.log('Build Time:', __BUILD_INFO__.buildTime)
```