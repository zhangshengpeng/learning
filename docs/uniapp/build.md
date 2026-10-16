# 打包与发布

## 打包方式概览

| 方式 | 工具 | 适用 |
|:--|:--|:--|
| HBuilderX 云打包 | HBuilderX | ✅ App（最简单） |
| HBuilderX 离线打包 | HBuilderX + Android Studio/Xcode | App |
| CLI 命令行 | uni-app CLI | H5 / 小程序 |
| uniCloud 部署 | HBuilderX / CLI | H5 / 小程序 |

## H5 打包

### CLI 方式

```json
// manifest.json
{
  "h5": {
    "router": {
      "mode": "hash",       // hash | history
      "base": "/"           // 部署路径
    },
    "title": "我的应用",
    "publicPath": "/"       // 资源路径
  }
}
```

```bash
# 打包 H5
npm run build:h5

# 开发模式
npm run dev:h5
```

**注意事项**：
- `history` 模式需后端配置 SPA 重定向
- `publicPath` 影响资源加载路径，部署到非根目录时必须设置

### HBuilderX 方式

菜单栏：**发行 → 网站-PC Web 或手机 H5** → 选择输出目录。

## 小程序打包

```bash
# 微信小程序
npm run build:mp-weixin

# 支付宝小程序
npm run build:mp-alipay

# 字节小程序
npm run build:mp-toutiao

# 百度小程序
npm run build:mp-baidu
```

打包后在对应小程序的开发者工具中打开 `dist/dev/mp-weixin` 目录，上传即可。

### 小程序分包配置

```json
// pages.json
{
  "pages": [
    { "path": "pages/index/index" },
    { "path": "pages/mine/mine" }
  ],
  "subPackages": [
    {
      "root": "pages-sub/order",
      "pages": [
        { "path": "list" },
        { "path": "detail" }
      ]
    },
    {
      "root": "pages-sub/coupon",
      "pages": [
        { "path": "list" }
      ]
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["pages-sub/order"]
    }
  }
}
```

**分包限制**：
- 主包 + 所有分包总大小 ≤ 20MB（微信小程序）
- 单个分包 ≤ 2MB
- 分包间不能相互引用

### 分包优化

```json
// pages.json — 独立分包（可独立访问，不依赖主包）
{
  "subPackages": [
    {
      "root": "pages-sub/activity",
      "pages": [{ "path": "detail" }],
      "independent": true  // 独立分包
    }
  ]
}

// pages.json — 分包预加载
{
  "preloadRule": {
    "pages/index/index": {
      "network": "wifi",  // all | wifi
      "packages": ["pages-sub/order"]
    }
  }
}
```

## App 打包

### 云打包（推荐新手）

HBuilderX 菜单：**发行 → 原生 App 云打包**。

需要配置：
- Android 证书（自动生成或指定）
- iOS 证书（需要 Apple Developer 账号）
- 应用图标、启动图

### 离线打包

```
1. Android: HBuilderX 生成本地打包资源
            → 导入 Android Studio 工程
            → 配置签名、权限
            → 打包 APK/AAB

2. iOS:    生成本地打包资源
            → 导入 Xcode 工程
            → 配置证书、Capability
            → Archive → 上传 App Store
```

### manifest.json App 配置

```json
{
  "app-plus": {
    "distribute": {
      "android": {
        "permissions": ["<uses-permission android:name=\"android.permission.CAMERA\"/>"],
        "minSdkVersion": 21,
        "targetSdkVersion": 30
      },
      "ios": {
        "dSYMs": false,
        "privacyDescription": {
          "NSCameraUsageDescription": "用于拍照上传头像"
        }
      },
      "sdkConfigs": {
        "statics": { "baidu": {} },
        "push": { "unipush": {} }
      }
    }
  }
}
```

## 环境变量

```js
// .env
VUE_APP_API_URL=https://api.example.com

// .env.development
VUE_APP_API_URL=https://dev-api.example.com

// .env.production
VUE_APP_API_URL=https://api.example.com
```

```js
// 代码中使用
const BASE_URL = process.env.VUE_APP_API_URL

// 小程序中 process.env 不可用时的替代方案
const BASE_URL = __DEV__ ? 'https://dev.example.com' : 'https://api.example.com'
```

## 版本管理

```json
// manifest.json
{
  "versionName": "1.0.0",
  "versionCode": 100
}
```

## 常见问题

### Q1: 打包后白屏？

检查 `publicPath` 和 `base` 配置是否正确。部署到子目录时：

```json
// manifest.json
{ "h5": { "publicPath": "/my-app/" } }

// vue.config.js
module.exports = { publicPath: '/my-app/' }
```

### Q2: 小程序主包过大？

- 启用分包加载
- 图片用 CDN 外链，不放在 local
- CSS 公共样式抽取到 App.vue
- 分析包体积：微信开发者工具 → 详情 → 代码依赖分析

### Q3: App 打包提示证书错误？

Android 证书需要 `.keystore` 文件，HBuilderX 支持一键生成。iOS 需要 Apple Developer 账号在 Xcode 中创建 Provisioning Profile。