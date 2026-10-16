# 条件编译

## 为什么需要条件编译

一套代码运行在多个平台，但各平台 API 和组件不同。条件编译让同一份代码在不同平台编译出不同结果。

```
源码:
  // #ifdef H5
  console.log('浏览器环境')
  // #endif

编译结果（H5）:
  console.log('浏览器环境')

编译结果（小程序）:
  (空)
```

## 语法速查

### 基本指令

| 指令 | 含义 | 写法 |
|:--|:--|:--|
| `#ifdef` | 如果定义了某平台 | `// #ifdef MP-WEIXIN` |
| `#ifndef` | 如果未定义某平台 | `// #ifndef H5` |
| `#endif` | 结束条件块 | `// #endif` |

### 平台标识

| 标识 | 平台 |
|:--|:--|
| `APP-PLUS` | App（5+App） |
| `APP-PLUS-NVUE` | App nvue 页面 |
| `H5` | H5 网页 |
| `MP-WEIXIN` | 微信小程序 |
| `MP-ALIPAY` | 支付宝小程序 |
| `MP-BAIDU` | 百度小程序 |
| `MP-TOUTIAO` | 字节跳动小程序 |
| `MP-QQ` | QQ 小程序 |
| `MP-KUAISHOU` | 快手小程序 |
| `MP-LARK` | 飞书小程序 |
| `MP-JD` | 京东小程序 |
| `MP-XHS` | 小红书小程序 |
| `MP` | 所有小程序（不含快应用） |
| `QUICKAPP-WEBVIEW` | 快应用 |

## 在 .vue 中使用

### template 中

```html
<template>
  <view>
    <!-- 各平台都显示的普通节点 -->
    <view>通用内容</view>

    <!-- 仅 H5 显示 -->
    <!-- #ifdef H5 -->
    <view>这行只在浏览器显示</view>
    <!-- #endif -->

    <!-- 微信小程序 & App 显示 -->
    <!-- #ifdef MP-WEIXIN || APP-PLUS -->
    <view>微信和 App 显示</view>
    <!-- #endif -->

    <!-- 非 H5 平台显示 -->
    <!-- #ifndef H5 -->
    <view>除了 H5 都显示</view>
    <!-- #endif -->
  </view>
</template>
```

### script 中

```js
export default {
  data() {
    return {
      // #ifdef H5
      platform: 'h5',
      // #endif

      // #ifdef MP-WEIXIN
      platform: 'weixin',
      // #endif
    }
  },
  onLoad() {
    // #ifdef H5
    console.log('H5 专属逻辑')
    // #endif

    // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
    console.log('小程序通用逻辑')
    // #endif
  }
}
```

### style 中

```css
/* 各平台通用 */
.page { padding: 20rpx; }

/* H5 专属样式 */
/* #ifdef H5 */
.page { padding: 20px; }
/* #endif */

/* 非 H5 平台 */
/* #ifndef H5 */
.page { background: #f5f5f5; }
/* #endif */
```

## 在 .json 中使用

`pages.json` 中同样支持条件编译：

```json
{
  // #ifdef H5
  "h5": {
    "router": {
      "mode": "history"
    }
  },
  // #endif

  // #ifdef MP-WEIXIN
  "mp-weixin": {
    "appid": "wx1234567890",
    "setting": {
      "urlCheck": false
    }
  },
  // #endif

  // #ifdef APP-PLUS
  "app-plus": {
    "nvue": {}
  },
  // #endif
}
```

## 常用实战场景

### 场景 1：导航栏样式适配

```html
<template>
  <view>
    <!-- #ifdef APP-PLUS -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    <!-- #endif -->
    <view class="content">
      <text>内容区域</text>
    </view>
  </view>
</template>
```

### 场景 2：分享功能平台判断

```js
export default {
  onShareAppMessage() {
    // #ifdef MP-WEIXIN
    return {
      title: '微信分享标题',
      path: '/pages/index/index',
      imageUrl: 'https://example.com/share-wx.jpg'
    }
    // #endif

    // #ifdef MP-ALIPAY
    return {
      title: '支付宝分享标题',
      desc: '分享描述',
      path: '/pages/index/index'
    }
    // #endif
  }
}
```

### 场景 3：第三方 SDK 按平台引入

```js
// #ifdef H5
import VConsole from 'vconsole'
const vConsole = new VConsole()
// #endif

// #ifdef MP-WEIXIN
import wx from 'weixin-js-sdk'
// #endif

// #ifdef APP-PLUS
const uniPush = uni.requireNativePlugin('UniPush')
// #endif
```

### 场景 4：组件库按需引入

```js
// 微信小程序原生组件
// #ifdef MP-WEIXIN
import mpButton from '@/wxcomponents/button/index.vue'
// #endif
```

## 注意事项

| 问题 | 说明 |
|:--|:--|
| JS 注释不要混用 | `// #ifdef` 和 `/* */` 混用可能失效，统一用 `//` |
| 嵌套不支持 | 条件编译**不支持嵌套**，只能平级使用 |
| `static` 目录 | static 目录下的资源不支持条件编译，需手动区分 |
| 条件编译的端点 | 确保 `#ifdef` 和 `#endif` 成对出现 |

## 运行时平台判断

条件编译是**编译时**行为。如果需要**运行时**判断，用 `uni.getSystemInfoSync()`：

```js
const systemInfo = uni.getSystemInfoSync()
const platform = systemInfo.platform  // 'android' | 'ios' | 'devtools'

// 运行时判断（不能替代条件编译）
// uni.getSystemInfoSync 只在运行时有效，不能在引入模块时使用

// #ifdef APP-PLUS
// App 端判断 iOS/Android
if (systemInfo.platform === 'ios') {
  console.log('iOS 设备')
} else if (systemInfo.platform === 'android') {
  console.log('Android 设备')
}
// #endif
```

> **核心区别**：条件编译 = 编译时就决定哪段代码生效；`uni.getSystemInfoSync()` = 运行时才知道当前设备。