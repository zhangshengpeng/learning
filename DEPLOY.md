# VitePress 项目部署至 Gitee Pages 操作指南

## 环境信息

| 项目 | 值 |
|:--|:--|
| 项目名称 | **learning** |
| 框架 | VitePress |
| Node.js | ≥18 |
| 包管理器 | npm |

## 线上地址

| 环境 | URL |
|:--|:--|
| Gitee Pages | https://你的Gitee用户名.gitee.io/learning/ |
| Gitee 仓库 | https://gitee.com/你的Gitee用户名/learning |

## 项目配置文件

`docs/.vitepress/config.mts` 中已配置 `base: '/learning/'`，确保资源路径与 Gitee Pages 子路径匹配。

## 首次部署步骤

### 1. 在 Gitee 上创建仓库

1. 访问 https://gitee.com ，登录你的账号
2. 点击右上角 `+` → 新建仓库
3. 仓库名称填 **`learning`**
4. 路径会自动生成为 `你的用户名/learning`
5. 仓库设为**公开**（Gitee Pages 免费版要求公开仓库）
6. 不要勾选"使用 Readme 初始化仓库"
7. 点击创建

### 2. 推送代码到 Gitee

```powershell
cd C:\Users\千昭\Desktop\前端\vue-source-learning

git remote add origin https://gitee.com/你的Gitee用户名/learning.git
git add -A
git commit -m "init: learning 项目初始化"
git push -u origin main
```

### 3. 开启 Gitee Pages

1. 进入仓库 → **服务** → **Gitee Pages**
2. 部署分支选择 **`main`**
3. 部署目录填 **`docs/.vitepress/dist`**
4. 点击 **启动/更新**
5. 等待部署完成，会给出访问地址 `https://你的用户名.gitee.io/learning/`

## 日常更新部署

每次修改文档后：

```powershell
git add -A
git commit -m "update: 描述你的改动"
git push origin main
```

推送后，进入 Gitee 仓库 → 服务 → Gitee Pages → 点击 **更新** 按钮，重新部署。

## Gitee Pages 注意事项

- **免费版强制要求仓库公开**，部署目录必须是仓库中的路径
- 每次推送代码后**不会自动部署**，需要手动在 Gitee Pages 页面点击"更新"
- 如果页面不更新，Ctrl+F5 强制刷新浏览器缓存
- `base` 配置为 `/learning/`，需与仓库名一致；如仓库名不同需同步修改

---

## 附：Vercel 备用部署（需翻墙）

### 项目配置

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "docs/.vitepress/dist",
  "framework": null,
  "installCommand": "npm install"
}
```

### 部署命令

```powershell
npx vercel login
npx vercel project add learning
npx vercel deploy --prod --project learning --yes
```

线上地址：https://learning-opal.vercel.app