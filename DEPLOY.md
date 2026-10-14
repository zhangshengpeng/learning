# VitePress 项目部署至 Cloudflare Pages 操作指南

## 环境信息

| 项目 | 值 |
|:--|:--|
| 项目名称 | **learning-4am** |
| 框架 | VitePress |
| Node.js | ≥18 |
| 包管理器 | npm |

## 线上地址

| 环境 | URL |
|:--|:--|
| 生产环境 | https://main.learning-4am.pages.dev |
| Cloudflare Dashboard | https://dash.cloudflare.com |

> 国内可直接访问，无需翻墙。

## 项目配置文件

`wrangler.toml`：

```toml
name = "learning-4am"
pages_build_output_dir = "docs/.vitepress/dist"
compatibility_date = "2025-01-01"
```

## 首次部署步骤

### 1. 登录 Cloudflare

```powershell
npx wrangler login
```

浏览器会打开 Cloudflare 登录页面，登录授权即可。

### 2. 构建项目

```powershell
npm run build
```

### 3. 部署

```powershell
npx wrangler pages deploy docs/.vitepress/dist --project-name learning-4am
```

## 日常更新部署

每次修改文档后：

```powershell
npm run build
npx wrangler pages deploy docs/.vitepress/dist --project-name learning-4am
```

构建 + 部署约 1 分钟内完成。

## Cloudflare Pages 优势

- ✅ **国内直接访问**，无需翻墙
- ✅ **免费**，无限带宽
- ✅ **全球 CDN 加速**
- ✅ 支持自定义域名绑定

---

## 附：Vercel 备用部署（需翻墙）

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "docs/.vitepress/dist",
  "framework": null,
  "installCommand": "npm install"
}
```

```powershell
npx vercel deploy --prod --project learning --yes
```