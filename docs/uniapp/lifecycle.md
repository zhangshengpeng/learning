# uni-app 生命周期

## 三层生命周期体系

uni-app 有三层生命周期：**应用级** → **页面级** → **组件级**，与 Vue 生命周期叠加运行。

```
┌───────────────────────────────────────────────────────────┐
│                      应用生命周期                             │
│  App.vue: onLaunch → onShow → onHide                       │
│  全局只执行一次，监听应用前后台切换                             │
└──────────────────────┬────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   页面 A      │ │   页面 B      │ │   页面 C      │
│ onLoad       │ │ onLoad       │ │ onLoad       │
│ onShow       │ │ onShow       │ │ onShow       │
│ onReady      │ │ onReady      │ │ onReady      │
│ onHide       │ │ onHide       │ │ onHide       │
│ onUnload     │ │ onUnload     │ │ onUnload     │
└──────────────┘ └──────────────┘ └──────────────┘
       │
       ▼
┌──────────────┐
│  组件生命周期  │
│  Vue 标准:    │
│  created     │
│  mounted     │
│  updated     │
│  destroyed   │
└──────────────┘
```

## 执行顺序（完整链路）

```
首次进入页面:
  App.onLaunch
    → App.onShow
      → 页面.onLoad
        → 组件.beforeCreate
          → 组件.created
            → 页面.onShow       ← 注意：页面 onShow 在 created 之后
              → 组件.beforeMount
                → 组件.mounted
                  → 页面.onReady  ← DOM 就绪后最后触发

离开页面:
  页面.onHide
    → 组件.beforeDestroy
      → 组件.destroyed

页面销毁（返回/关闭）:
  页面.onHide
    → 组件.beforeDestroy
      → 组件.destroyed
        → 页面.onUnload

回到前台:
  App.onShow → 页面.onShow（不会重新 onLoad）
```

## 应用生命周期（App.vue）

| 钩子 | 触发时机 | 常用场景 |
|:--|:--|:--|
| `onLaunch` | 应用初始化完成，全局只触发一次 | 获取用户信息、全局配置 |
| `onShow` | 应用从后台进入前台 | 检查登录状态、版本更新 |
| `onHide` | 应用从前台进入后台 | 暂停音视频、保存状态 |
| `onError` | 应用报错 | 错误上报 |
| `onUniNViewMessage` | nvue 页面发来消息 | nvue 通信 |
| `onUnhandledRejection` | 未处理的 Promise 拒绝 | 全局异常捕获 |
| `onPageNotFound` | 页面不存在 | 404 处理 |
| `onThemeChange` | 系统主题变化 | 深色模式适配 |

```vue
<script>
export default {
  onLaunch(options) {
    console.log('应用启动', options)
    // 场景：检查登录态
    const token = uni.getStorageSync('token')
    if (!token) {
      uni.reLaunch({ url: '/pages/login/login' })
    }
  },
  onShow() {
    console.log('应用显示')
  },
  onHide() {
    console.log('应用隐藏')
  }
}
</script>
```

## 页面生命周期

| 钩子 | 触发时机 | 能获取参数 | 常用场景 |
|:--|:--|:--:|:--|
| `onLoad(options)` | 页面加载，只触发一次 | ✅ 页面参数 | 发起数据请求 |
| `onShow` | 页面显示，每次进入都触发 | ❌ | 刷新数据、重新获取 |
| `onReady` | 页面 DOM 渲染完成 | ❌ | 操作 DOM、初始化地图 |
| `onHide` | 页面隐藏（跳转/切后台） | ❌ | 暂停任务 |
| `onUnload` | 页面卸载（返回上一页） | ❌ | 清理定时器、事件 |
| `onResize` | 屏幕旋转/窗口变化 | ❌ | 响应式布局 |
| `onPullDownRefresh` | 用户下拉刷新 | ❌ | 刷新列表数据 |
| `onReachBottom` | 页面滚动到底部 | ❌ | 加载更多 |
| `onTabItemTap` | 点击 tab 时（已激活页） | ❌ | 双击回到顶部 |
| `onPageScroll` | 页面滚动 | ❌ | 滚动动画、吸顶 |
| `onShareAppMessage` | 用户点击分享 | ❌ | 自定义分享内容 |
| `onShareTimeline` | 用户分享到朋友圈 | ❌ | 自定义朋友圈分享 |
| `onNavigationBarButtonTap` | 导航栏按钮点击 | ❌ | 自定义按钮事件 |

```vue
<script>
export default {
  data() {
    return {
      list: [],
      page: 1
    }
  },
  onLoad(options) {
    // 获取页面参数，可用于发起请求
    console.log('页面参数:', options.id)
    this.fetchData()
  },
  onShow() {
    // 每次显示都请求最新数据
    this.refreshData()
  },
  onReady() {
    // 创建地图实例等需要 DOM 就绪的操作
    this.mapContext = uni.createMapContext('myMap')
  },
  onReachBottom() {
    // 上拉加载更多
    this.page++
    this.fetchData()
  },
  onPullDownRefresh() {
    // 下拉刷新
    this.page = 1
    this.fetchData().finally(() => {
      uni.stopPullDownRefresh()
    })
  },
  onPageScroll(e) {
    // 滚动距离 e.scrollTop
    this.isScrolled = e.scrollTop > 100
  },
  methods: {
    async fetchData() { /* ... */ },
    async refreshData() { /* ... */ }
  }
}
</script>
```

## onShow vs onLoad 的核心区别

| | onLoad | onShow |
|:--|:--|:--|
| 触发次数 | 1 次（页面第一次加载） | N 次（每次显示） |
| 能获取页面参数 | ✅ `options` | ❌ |
| 从详情页返回时 | ❌ 不触发 | ✅ 触发 |
| 切后台再回来时 | ❌ 不触发 | ✅ 触发 |
| 适用场景 | 初始化（拿参数发请求） | 刷新列表/状态 |

> **最佳实践**：列表页用 `onLoad` 首次加载 + `onShow` 刷新；详情页用 `onLoad(options.id)` 获取详情。

## 常见问题

### Q1: onLoad 和 created 哪个先？

`onLoad` 在 `created` **之后**执行。完整顺序：`beforeCreate → created → onLoad → onShow → beforeMount → mounted → onReady`。

### Q2: 为什么页面返回时 onLoad 不触发？

因为 uni-app 的页面栈保留了上一页。返回时页面没有重新创建，只触发了 `onShow`。如果需要重新加载，在 `onShow` 中加判断。

### Q3: tabBar 页面切换触发哪些生命周期？

```
A(tab) → B(tab):  A.onHide → B.onShow
B(tab) → A(tab):  B.onHide → A.onShow
```

tabBar 页面不会被 `onUnload`，始终保留在页面栈中。