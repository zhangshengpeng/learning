# uni-app 跨端开发

## 什么是 uni-app

uni-app 是 DCloud 推出的基于 Vue.js 的跨端框架，**一套代码编译到多个平台**：

```
┌────────────────────────────────────────────────────┐
│                   uni-app 源码                       │
│         .vue / .js / .css / pages.json              │
└──────────────────────┬─────────────────────────────┘
                       │
          ┌────────────┼────────────┬──────────┐
          ▼            ▼            ▼          ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐
    │ H5       │ │ iOS App  │ │ Android  │ │ 小程序│
    │ (Vue)    │ │ (WebView)│ │ (WebView)│ │(Mini) │
    └──────────┘ └──────────┘ └──────────┘ └──────┘
          │            │            │          │
          ▼            ▼            ▼          ▼
    浏览器DOM    WKWebView    Chromium    微信/支付/抖音等
```

## 核心架构

```
┌─────────────────────────────────────────────┐
│              开发者代码                        │
│    .vue 文件（template + script + style）      │
│    pages.json / manifest.json / uni.scss      │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│            uni-app 框架层                     │
│  ┌─────────┐ ┌──────┐ ┌────────┐ ┌────────┐ │
│  │ 条件编译 │ │ SCSS │ │ easycom│ │ uni.*  │ │
│  │ 平台 API │ │ 编译 │ │ 组件   │ │ API    │ │
│  └─────────┘ └──────┘ └────────┘ └────────┘ │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│             平台运行时适配                     │
│  H5: Vue + Web API                          │
│  App: WebView 引擎 + Native.js 桥接          │
│  小程序: 转译为各平台原生语法                   │
│  快应用: 快应用组件映射                        │
└─────────────────────────────────────────────┘
```

## 平台差异总览

| 能力 | H5 | App | 微信小程序 | 支付宝小程序 | 字节小程序 |
|:--|:--:|:--:|:--:|:--:|:--:|
| Vue 2/3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 原生导航栏 | ❌ | ✅ | ✅ | ✅ | ✅ |
| webview | ✅ | ✅ | ❌ | ❌ | ❌ |
| canvas | ✅ | ✅ | ✅ | ✅ | ✅ |
| webSocket | ✅ | ✅ | ✅ | ✅ | ✅ |
| 蓝牙/NFC | ❌ | ✅ | ✅ | ✅ | ❌ |
| 地图 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 原生支付 | ❌ | ✅ | ✅ | ✅ | ✅ |
| `web-view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `map` | ✅ | ✅ | ✅ | ✅ | ✅ |

## 技术选型对比

| | uni-app | Taro | Flutter | React Native |
|:--|:--|:--|:--|:--|
| 语言 | Vue | React/Vue | Dart | JS/TS |
| 渲染方式 | WebView + 原生 | WebView + 原生 | Skia 自绘 | 原生组件 |
| 小程序支持 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ❌ |
| 性能 | 中 | 中 | 高 | 高 |
| 学习成本 | 低（Vue） | 低（React） | 高（Dart） | 中 |
| 社区生态 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 适合场景 | 多端小程序为主 | 多端小程序为主 | 高性能 App | 纯 App |

## 项目结构

```
project/
├── pages/              # 页面目录
│   └── index/
│       └── index.vue
├── components/         # 组件目录
├── static/             # 静态资源（不编译，直接拷贝）
├── store/              # 状态管理（Vuex/Pinia）
├── utils/              # 工具函数
├── api/                # 接口层
├── pages.json          # 页面路由 & 窗口配置 & tabBar
├── manifest.json       # 应用配置（AppID、权限等）
├── uni.scss            # 全局 SCSS 变量
├── App.vue             # 应用入口
└── main.js             # Vue 实例入口
```

## pages.json 核心配置

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "首页"
      }
    }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "uni-app",
    "navigationBarBackgroundColor": "#F8F8F8",
    "backgroundColor": "#F8F8F8"
  },
  "tabBar": {
    "color": "#7A7E83",
    "selectedColor": "#3cc51f",
    "list": [
      { "pagePath": "pages/index/index", "text": "首页" },
      { "pagePath": "pages/mine/mine", "text": "我的" }
    ]
  },
  "condition": {
    "current": 0,
    "list": [
      { "name": "详情页", "path": "pages/detail/detail", "query": "id=1" }
    ]
  }
}
```

> **关键**：`pages.json` 中的第一项就是应用首页。数组顺序决定首页和 tabBar 激活顺序。