# 导航与路由

## 路由系统概述

uni-app 有两种路由模式：
- **pages.json 配置式**：简单页面跳转，不需要传参
- **uni.* API 编程式**：灵活控制，支持参数传递

```
┌───────────────────────────────────────────┐
│              uni-app 路由栈                │
│                                           │
│  ┌─────────┐   uni.navigateTo()           │
│  │ 页面 A   │ ──────────────────→ 页面 B   │
│  │         │ ←──── uni.navigateBack()     │
│  └─────────┘                              │
│       ↑                                   │
│       │ uni.switchTab()                   │
│       ↓                                   │
│  ┌─────────┐   uni.redirectTo()           │
│  │ 页面 C   │ ←─ 替换当前页                │
│  └─────────┘                              │
│       ↑                                   │
│       │ uni.reLaunch()                    │
│       │ (清空栈，重新打开)                  │
│  ┌─────────┐                              │
│  │ 新首页   │                              │
│  └─────────┘                              │
└───────────────────────────────────────────┘
```

## API 对比

| API | 页面栈变化 | 适用场景 | 能带参数 |
|:--|:--|:--|:--:|
| `uni.navigateTo` | 保留当前页，新开 | 通用跳转 | ✅ `?a=1&b=2` |
| `uni.redirectTo` | 替换当前页 | 登录后跳首页 | ✅ |
| `uni.reLaunch` | **清空全部**，开新页 | 登录/退出 | ✅ |
| `uni.switchTab` | 跳 tabBar 页 | tab 切换 | ❌ |
| `uni.navigateBack` | 返回上一页 | 返回 | ❌（用 eventChannel） |
| `uni.preloadPage` | 预加载页面（不出现在栈） | 性能优化 | ✅ |

## 基本用法

### navigateTo — 跳转+保留

```js
uni.navigateTo({
  url: '/pages/detail/detail?id=123&type=news',
  success() { console.log('跳转成功') },
  fail(err) { console.error('跳转失败', err) }
})

// 目标页面接收参数
export default {
  onLoad(options) {
    console.log(options.id)     // "123"
    console.log(options.type)   // "news"
  }
}
```

**页面栈限制**：最大 10 层。超过会报错，需改用 `redirectTo` 或 `reLaunch`。

### navigateBack — 返回

```js
// 返回上一页
uni.navigateBack({ delta: 1 })

// 返回并传参
uni.navigateBack()
// 在上一页的 onShow 中处理：
export default {
  onShow() {
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    // prevPage.$vm 在 H5 端不可用
  }
}
```

### 通过 eventChannel 传参（推荐）

```js
// A 页面跳转到 B
uni.navigateTo({
  url: '/pages/b/b',
  events: {
    // B 页面返回时触发
    onBack(data) {
      console.log('B 返回的数据:', data)
    }
  },
  success(res) {
    // 立刻向 B 传数据
    res.eventChannel.emit('dataFromA', { fromA: 'hello' })
  }
})

// B 页面接收和返回
export default {
  onLoad() {
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('dataFromA', (data) => {
      console.log('收到 A 的数据:', data)
    })
  },
  methods: {
    goBack() {
      const eventChannel = this.getOpenerEventChannel()
      eventChannel.emit('onBack', { result: 'ok' })
      uni.navigateBack()
    }
  }
}
```

### getCurrentPages — 页面栈

```js
const pages = getCurrentPages()
// 当前页
const currentPage = pages[pages.length - 1]
console.log(currentPage.route)   // 'pages/detail/detail'
console.log(currentPage.options) // { id: '123' }

// 上一页
const prevPage = pages[pages.length - 2]
```

## 传参方式对比

| 方式 | 适用场景 | 数据量 | 缺点 |
|:--|:--|:--|:--|
| URL 参数 | 简单查询条件 | 少量 | 字符串，会被编码 |
| eventChannel | 页面间双向通信 | 中等 | 仅 navigateTo 支持 |
| Vuex/Pinia | 全局共享状态 | 大量 | 需手动清理 |
| uni.$emit | 跨页面事件 | 少量 | 注意内存泄漏 |
| 本地存储 | 离线数据 | 大量 | 需序列化 |

### uni.$emit 跨页面通信

```js
// 发送
uni.$emit('updateCart', { count: 10 })

// 接收
export default {
  onLoad() {
    uni.$on('updateCart', (data) => {
      this.cartCount = data.count
    })
  },
  onUnload() {
    uni.$off('updateCart')  // 必须清理，否则内存泄漏
  }
}
```

## 路由守卫

uni-app 原生不支持全局路由守卫，需自行实现或使用 `uni-simple-router` 插件。

```js
// 简易实现：封装 navigateTo
function navigateTo(url) {
  const token = uni.getStorageSync('token')

  // 白名单
  const whiteList = ['/pages/login/login', '/pages/index/index']

  if (whiteList.includes(url) || token) {
    uni.navigateTo({ url })
  } else {
    uni.redirectTo({ url: '/pages/login/login' })
  }
}
```

### uni-simple-router（官方推荐）

```js
import Router from 'uni-simple-router'

const router = new Router({
  routes: [
    { path: '/pages/index/index', name: 'index' },
    { path: '/pages/detail/detail', name: 'detail' }
  ]
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  if (to.path === '/pages/login/login') {
    next()
  } else if (!uni.getStorageSync('token')) {
    next({ path: '/pages/login/login' })
  } else {
    next()
  }
})
```

## 常见问题

### Q1: navigateTo 最大能开多少页？

页面栈最大 **10 层**。超过 10 层再 `navigateTo` 会失败。解决方案：

```js
uni.navigateTo({
  url: '/pages/deep/deep',
  fail() {
    // 兜底方案：用 redirectTo 替换当前页
    uni.redirectTo({ url: '/pages/deep/deep' })
  }
})
```

### Q2: switchTab 能不能带参数？

官方不支持。变通方案：

```js
// 跳转前存到全局
uni.setStorageSync('tabParams', { id: '123' })
uni.switchTab({ url: '/pages/tab/tab' })

// 目标页读取
onShow() {
  const params = uni.getStorageSync('tabParams')
  if (params) {
    uni.removeStorageSync('tabParams')
    this.id = params.id
  }
}
```

### Q3: 如何判断当前页面是否是首页？

```js
const pages = getCurrentPages()
if (pages.length === 1) {
  console.log('当前是首页或栈底页')
}
```