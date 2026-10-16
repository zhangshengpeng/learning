# uni-app 面试题库

## 基础概念

### Q1: uni-app 是什么？与小程序的开发区别？

<details>
<summary>点击查看答案</summary>

uni-app 基于 Vue.js 的跨端框架，一套代码同时编译到 H5、App、小程序多个平台。

| | uni-app | 原生小程序 |
|:--|:--|:--|
| 开发语言 | Vue (template/script/style) | WXML/WXSS/JS |
| 组件化 | .vue 单文件组件 | Component() 构造器 |
| 状态管理 | Vuex/Pinia | mobx / 原生 |
| 跨平台 | 一套代码多端运行 | 仅当前平台 |
| 编译 | HBuilderX/CLI 编译 | 开发者工具直接运行 |
| npm 支持 | ✅ | ⚠️ 需构建 |

</details>

### Q2: pages.json 的作用是什么？有哪些核心配置？

<details>
<summary>点击查看答案</summary>

`pages.json` 是 uni-app 的全局配置文件，等同于小程序的 `app.json`。

核心节点：

| 节点 | 作用 |
|:--|:--|
| `pages` | 页面路由数组，第一项为首页 |
| `globalStyle` | 全局窗口样式（导航栏/背景色等） |
| `tabBar` | 底部 tab 导航 |
| `subPackages` | 分包配置 |
| `preloadRule` | 预加载规则 |
| `condition` | 开发时启动方式（指定页面+参数） |
| `easycom` | 组件自动引入规则 |

</details>

### Q3: uni-app 的生命周期有哪些？执行顺序是怎样的？

<details>
<summary>点击查看答案</summary>

三层生命周期：

```
应用级: App.onLaunch → App.onShow
页面级: onLoad → onShow → onReady → onHide → onUnload
组件级: beforeCreate → created → beforeMount → mounted → destroyed
```

完整顺序：

```
App.onLaunch
  → App.onShow
    → 页面.onLoad
      → 组件.beforeCreate
        → 组件.created
          → 页面.onShow
            → 组件.beforeMount
              → 组件.mounted
                → 页面.onReady
```

**重点**：页面 `onLoad` 在 `created` 之后，在 `onShow` 之前。每次页面显示（含返回）都会触发 `onShow`，但 `onLoad` 只触发一次。

</details>

### Q4: onLoad 和 onShow 的区别？分别什么场景用？

<details>
<summary>点击查看答案</summary>

| | onLoad | onShow |
|:--|:--|:--|
| 触发次数 | 1 次 | N 次 |
| 获取页面参数 | ✅ options | ❌ |
| 页面返回时触发 | ❌ | ✅ |
| 切后台回来触发 | ❌ | ✅ |
| 适用场景 | 首次加载+拿参数发请求 | 刷新数据/状态 |

**最佳实践**：列表页 `onLoad` 首次加载 + `onShow` 拉最新；详情页 `onLoad(options.id)` 获取详情。

</details>

---

## 跨端适配

### Q5: 什么是条件编译？有哪些常用平台标识？

<details>
<summary>点击查看答案</summary>

条件编译让同一份源码在不同平台编译出不同代码。

```js
// #ifdef H5
// H5 平台代码
// #endif

// #ifdef MP-WEIXIN
// 微信小程序代码
// #endif

// #ifndef APP-PLUS
// 非 App 平台代码
// #endif
```

常用标识：`H5`、`APP-PLUS`、`MP-WEIXIN`、`MP-ALIPAY`、`MP-BAIDU`、`MP-TOUTIAO`、`MP`（所有小程序）。

支持在 template、script、style、pages.json 中使用。

</details>

### Q6: 如何处理不同平台的样式差异？

<details>
<summary>点击查看答案</summary>

1. **rpx 单位**：750rpx = 屏幕宽度，全平台统一
2. **条件编译 CSS**：`/* #ifdef H5 */ ... /* #endif */`
3. **安全区域**：`env(safe-area-inset-bottom)` 适配刘海屏
4. **盒模型**：全平台设置 `box-sizing: border-box`
5. **不支持选择器**：小程序不用 `*`、`body`，用 `page` 替代

</details>

### Q7: 文字为什么必须放在 `<text>` 标签内？

<details>
<summary>点击查看答案</summary>

小程序要求文本节点必须由 `<text>` 组件包裹，否则会出现以下问题：

1. 文字无法被选中、复制
2. 文字不能内联排版
3. 空间缝隙（iOS 和 Android 渲染不同）

```html
<!-- ❌ -->
<view>这是一段文字</view>

<!-- ✅ -->
<view><text>这是一段文字</text></view>
```

</details>

---

## 路由与通信

### Q8: uni.navigateTo、redirectTo、reLaunch、switchTab 的区别？

<details>
<summary>点击查看答案</summary>

| API | 页面栈 | 能带参 | 适用场景 |
|:--|:--|:--|:--|
| `navigateTo` | 保留当前，新开 | ✅ | 通用跳转 |
| `redirectTo` | 替换当前 | ✅ | 登录后跳首页 |
| `reLaunch` | 清空全部，开新 | ✅ | 退出登录 |
| `switchTab` | 跳 tab 页 | ❌ | tab 切换 |
| `navigateBack` | 返回上一页 | ❌ | 返回 |

`navigateTo` 最多 10 层页面栈。

</details>

### Q9: uni-app 中如何在页面间传递数据？

<details>
<summary>点击查看答案</summary>

| 方式 | 数据量 | 实时性 | 限制 |
|:--|:--|:--|:--|
| URL 参数 | 少量 | 实时 | 字符串，会被编码 |
| eventChannel | 中等 | 双向 | 只支持 navigateTo |
| Vuex/Pinia | 大量 | 响应式 | 需持久化 |
| uni.$emit | 少量 | 实时 | 必须 onUnload 清理 |
| 本地存储 | 大量 | 离线 | 需序列化 |

**推荐组合**：URL 参数 + Vuex/Pinia。URL 传 id，Store 存业务状态。

</details>

### Q10: 如何实现路由守卫？

<details>
<summary>点击查看答案</summary>

uni-app 无内置路由守卫。方案：

```js
// 方案 1: 封装跳转函数
function navigateTo(url) {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.redirectTo({ url: '/pages/login/login' })
  } else {
    uni.navigateTo({ url })
  }
}

// 方案 2: uni-simple-router
import Router from 'uni-simple-router'
router.beforeEach((to, from, next) => {
  const token = uni.getStorageSync('token')
  if (to.path !== '/pages/login/login' && !token) {
    next({ path: '/pages/login/login' })
  } else { next() }
})
```

</details>

---

## 状态管理

### Q11: uni-app 中 Vuex 如何持久化 token？

<details>
<summary>点击查看答案</summary>

**双写策略**：store + storage 同时写入。

```js
const store = new Vuex.Store({
  state: {
    token: uni.getStorageSync('token') || ''  // 初始化从 storage 取
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token
      uni.setStorageSync('token', token)      // 同步写入 storage
    }
  }
})
```

App 重启时 `state` 丢失，但 `storage` 持久存在。在 `state` 初始化时从 `storage` 恢复。

</details>

### Q12: 小程序中 Vuex 数据更新但视图不变，为什么？

<details>
<summary>点击查看答案</summary>

小程序对响应式的支持有限。两个常见原因：

1. **新增对象属性不响应**：用 `Vue.set(state.obj, 'key', value)` 或整个替换对象
2. **数组索引赋值**：用 `Vue.set(state.arr, index, value)` 或 `arr.splice(index, 1, newVal)`

```js
// ❌ 可能不响应
state.user.avatar = 'new.jpg'
state.list[0] = newItem

// ✅ 
Vue.set(state.user, 'avatar', 'new.jpg')
state.user = { ...state.user, avatar: 'new.jpg' }
state.list.splice(0, 1, newItem)
```

</details>

---

## 性能优化

### Q13: uni-app 小程序主包过大怎么优化？

<details>
<summary>点击查看答案</summary>

1. **分包加载**：`subPackages` 配置，主包只放首页 + tabBar
2. **图片外链**：用 CDN，不放 local
3. **公共样式抽取**：放到 App.vue，页面只用不重复引入
4. **代码分析**：微信开发者工具 → 代码依赖分析
5. **按需注入**：`lazyCodeLoading: "requiredComponents"`
6. **分包的独立化**：不常用模块用 `independent: true`

</details>

### Q14: 长列表如何优化性能？

<details>
<summary>点击查看答案</summary>

1. **稳定 key**：用唯一 ID，不用 index
2. **分段加载**：先渲染首屏，滚动时追加
3. **虚拟列表**：只渲染可见区域的 DOM
4. **简化 DOM 结构**：减少嵌套层级
5. **图片懒加载**：`lazy-load` 属性

</details>

---

## App 原生

### Q15: uni-app 如何调用原生能力？

<details>
<summary>点击查看答案</summary>

1. **uni.* API**：扫码、定位、支付等常用原生能力
2. **plus.***（仅 App）：`plus.device`、`plus.screen`、`plus.push` 等
3. **uni.requireNativePlugin**：调用第三方原生插件
4. **nvue**：使用原生渲染引擎，性能更高
5. **Native.js**：直接在 JS 中调用 Android/iOS 原生 API

```js
// 原生扫码
uni.scanCode({ success: res => console.log(res) })

// plus 引擎
// #ifdef APP-PLUS
plus.device.vibrate(500)  // 振动
// #endif

// 第三方原生插件
const plugin = uni.requireNativePlugin('Plugin-Name')
```

</details>

### Q16: WebView 和 nvue 的区别？

<details>
<summary>点击查看答案</summary>

| | WebView (vue 页面) | nvue |
|:--|:--|:--|
| 渲染引擎 | Webkit 浏览器内核 | 原生渲染（weex） |
| 性能 | 一般 | 高 |
| CSS 支持 | 完整（Flex/Grid/动画等） | 仅 Flexbox 子集 |
| DOM API | ✅ | ❌ |
| 适合场景 | 大部分页面 | 长列表、地图、视频 |
| 开发成本 | 低 | 高（样式需重写） |

</details>

### Q17: App 端打包有哪些方式？云打包 vs 离线打包？

<details>
<summary>点击查看答案</summary>

| | 云打包 | 离线打包 |
|:--|:--|:--|
| 操作 | HBuilderX 一键 | Android Studio/Xcode |
| 证书 | 自动生成 | 需自行配置 |
| 自定义能力 | 受限 | 完全控制 |
| 适用 | 个人开发者 | 企业级定制 |

</details>

---

## 开发实践

### Q18: easycom 是什么？有什么好处？

<details>
<summary>点击查看答案</summary>

easycom 是 uni-app 的组件自动引入机制。组件放在 `components/组件名/组件名.vue` 路径下即可在任何页面直接使用，无需 `import` + `components` 注册。

**好处**：
- 减少模板代码（每处少写 2 行 import/components）
- 统一组件管理规范
- 支持自定义规则（如 uView 的 `u-*` 前缀）

</details>

### Q19: 如何调试 uni-app？

<details>
<summary>点击查看答案</summary>

| 平台 | 调试方式 |
|:--|:--|
| H5 | Chrome DevTools |
| 微信小程序 | 微信开发者工具 |
| App | HBuilderX 真机调试 / Chrome Inspect 调试 WebView |
| 所有平台 | `console.log` + `vconsole`（H5） |

</details>

### Q20: uni-app 有哪些常见坑？

<details>
<summary>点击查看答案</summary>

| 坑 | 原因 | 解决 |
|:--|:--|:--|
| 文字不显示 | 没用 text 包裹 | 文字必须放 `<text>` |
| 图片不显示 | 未指定宽高 | 设置 width/height |
| position: fixed 被覆盖 | 原生组件层级最高 | 用 cover-view |
| scroll-view 不滚动 | 未设高度 | 设固定高度或 flex:1 |
| switchTab 不能带参 | 官方限制 | 用 storage 中转过 |
| navigateTo 失败 | 页面栈超 10 层 | 换 redirectTo |
| 样式不生效 | 小程序选择器限制 | 避免 * / body 选择器 |
| :style 绑定失败 | 小程序支持有限 | 用 class 切换代替 |

</details>