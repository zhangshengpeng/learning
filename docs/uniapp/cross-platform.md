# 跨端适配

## CSS 适配策略

### 单位选择

| 单位 | 说明 | 适用平台 |
|:--|:--|:--|
| `rpx` | 响应式像素，750rpx = 屏幕宽度 | **所有平台** |
| `px` | 物理像素，在各平台表现不一致 | 不推荐 |
| `vw/vh` | 视口百分比 | H5 |
| `upx` | uni-app x 推荐单位（老版本） | 已废弃 |

```css
/* 推荐 */
.box {
  width: 750rpx;   /* 满屏宽 */
  padding: 30rpx;  /* 固定内边距 */
  font-size: 28rpx;/* 基准字号 */
}

/* 仅 H5 */
/* #ifdef H5 */
.box { width: 100vw; }
/* #endif */
```

### 安全区域适配

```html
<template>
  <view>
    <view class="content">内容</view>
    <!-- 底部安全区域占位 -->
    <view class="safe-area-bottom"></view>
  </view>
</template>

<style>
.content {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
.safe-area-bottom {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
```

### 盒模型差异

```
H5 / App:      小程序:
┌─────────┐   ┌──────────┐
│ content │   │ content  │  ← 小程序全平台
│         │   │          │     默认包含 padding
│ padding │   │ (padding │     在 width 中)
│ border  │   │  border) │
│ margin  │   │ margin   │
└─────────┘   └──────────┘
  标准盒模型      类似 border-box
```

```css
/* 统一为 border-box 避免差异 */
* { box-sizing: border-box; }
```

### 不支持的选择器

| 选择器 | H5 | 小程序 | 说明 |
|:--|:--:|:--:|:--|
| `*` | ✅ | ⚠️ 部分支持 | 避免使用 |
| `body` | ✅ | ❌ | 用 `page` 替代 |
| `[attr]` | ✅ | ✅ | 属性选择器支持 |
| 后代 `A B` | ✅ | ✅ | 支持但影响性能 |
| `::before/after` | ✅ | ✅ | 基本支持 |
| `:hover` | ✅ | ❌ | 小程序无 hover |

## 组件映射差异

### 基础组件映射

| Vue 组件 | uni-app 组件 | 说明 |
|:--|:--|:--|
| `<div>` | `<view>` | 容器 |
| `<span>` / `<p>` | `<text>` | **必须**用 text 包裹文字 |
| `<img>` | `<image>` | 图片，有 mode 属性 |
| `<a>` | `<navigator>` | 链接/跳转 |
| `<input>` | `<input>` | 输入框（类型受限） |
| `<select>` | `<picker>` | 选择器 |
| `<video>` | `<video>` | 视频 |
| `<iframe>` | `<web-view>` | 内嵌网页 |

```html
<!-- ❌ 错误 -->
<div>纯文字</div>
<span>纯文字</span>

<!-- ✅ 正确：文字必须用 <text> 包裹，否则小程序无法选中 -->
<view>
  <text>纯文字</text>
</view>
```

### input 类型差异

```html
<!-- H5 中有效，小程序不支持 type 属性 -->
<input type="number" v-model="num" />

<!-- 正确做法：使用 uni-app 的 input 配置 -->
<input v-model="num" placeholder="数字" />

<!-- 注意：小程序中 input 有很多限制 -->
<!-- 1. 不能修改 placeholder 样式 -->
<!-- 2. 不能动态修改 type -->
<!-- 3. 不能用 v-model.lazy -->
```

## API 差异处理

### 存储 API

```js
// H5: localStorage（同步）
// 小程序: wx.setStorageSync（同步）
// uni-app 统一: uni.setStorageSync

// ✅ uni-app 统一写法
uni.setStorageSync('key', 'value')
const value = uni.getStorageSync('key')

// ❌ 平台专属写法（条件编译时用）
// localStorage 仅 H5 可用
// wx.setStorage 仅微信小程序可用
```

### 请求 API

```js
// uni.request 在所有平台行为一致
uni.request({
  url: 'https://api.example.com/data',
  success: (res) => { console.log(res.data) }
})

// 平台差异：
// H5: 受浏览器跨域限制（需后端 CORS 或代理）
// App: 无跨域限制
// 小程序: 需在后台配置合法域名
```

### 各平台特有 API

```js
// #ifdef APP-PLUS
// 调用原生能力：扫码、蓝牙、推送等
uni.scanCode({ success: res => console.log(res.result) })
plus.screen.lockOrientation('portrait-primary')
// #endif

// #ifdef MP-WEIXIN
// 微信特有：获取用户信息（需用户授权）
wx.getUserProfile({ desc: '用于完善资料' })
// #endif

// #ifdef H5
// 浏览器特有：DOM 操作
document.title = '新标题'
// #endif
```

## 导航栏适配

各平台导航栏表现不同，需要统一适配：

| 功能 | H5 | App | 小程序 |
|:--|:--:|:--:|:--:|
| 自定义导航栏 | `navigationStyle: custom` | ✅ | ✅ |
| 导航栏按钮 | ❌ | ✅ | ✅ |
| 沉浸式状态栏 | CSS | 原生 | 原生 |

```html
<!-- 自定义导航栏示例 -->
<template>
  <view>
    <!-- #ifdef APP-PLUS -->
    <view class="status-bar" :style="{ height: statusHeight + 'px' }"></view>
    <!-- #endif -->
    <view class="custom-nav">
      <text class="title">自定义标题</text>
    </view>
    <view class="content">
      <!-- 页面内容 -->
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return { statusHeight: 0 }
  },
  onLoad() {
    // #ifdef APP-PLUS
    this.statusHeight = plus.navigator.getStatusbarHeight()
    // #endif
  }
}
</script>
```

## 常见坑点总结

| 问题 | 原因 | 解决 |
|:--|:--|:--|
| 文字不能选中/长按 | 小程序强制 text 组件 | 文字放 `<text>` 内 |
| 图片不显示 | 小程序要求宽高 | image 必须设置 width/height |
| v-if 和 v-for 嵌套闪烁 | 小程序渲染差异 | 用 `<block>` 包裹 |
| position: fixed 层叠 | 小程序 原生组件层级最高 | 用 cover-view |
| localStorage 找不到 | H5 和小程序 API 不同 | 统一用 uni.getStorageSync |
| scroll-view 不滚动 | 小程序要求 flex | 设置 scroll-view 的 css 高度 |