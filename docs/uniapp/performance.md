# 性能优化

## 优化体系总览

```
┌───────────────────────────────────────────────────┐
│                 uni-app 性能优化                    │
│                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 加载优化  │ │ 渲染优化  │ │ 内存优化  │           │
│  ├──────────┤ ├──────────┤ ├──────────┤           │
│  │ 分包加载  │ │ 列表优化  │ │ 图片回收  │           │
│  │ 预加载    │ │ 减少 set │ │ 页面销毁  │           │
│  │ 按需注入  │ │ WXS 计算 │ │ 事件清理  │           │
│  │ 代码压缩  │ │ 占位元素  │ │ 定时器    │           │
│  └──────────┘ └──────────┘ └──────────┘           │
└───────────────────────────────────────────────────┘
```

## 启动速度优化

### 分包加载

```json
// pages.json
{
  "subPackages": [
    { "root": "pages-sub/goods", "pages": ["list", "detail"] },
    { "root": "pages-sub/order", "pages": ["list", "detail", "pay"] }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["pages-sub/goods"]  // 首页预加载商品分包
    }
  }
}
```

### 按需注入（小程序）

```json
// pages.json
{
  // 全局配置
  "lazyCodeLoading": "requiredComponents",

  // 页面级按需注入
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "componentPlaceholder": {
          "heavy-comp": "loading-placeholder"  // 占位组件
        }
      }
    }
  ]
}
```

### 初始渲染缓存

```json
// pages.json — 微信小程序静态初始渲染缓存
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "initialRenderingCache": "static"
      }
    }
  ]
}
```

## 列表性能优化

### 长列表用虚拟列表

```html
<!-- uni-app 不内置虚拟列表，需三方库或自行实现 -->
<!-- 推荐 uni-list + uni-load-more 组合 -->

<scroll-view scroll-y @scrolltolower="loadMore">
  <view v-for="item in visibleList" :key="item.id">
    {{ item.name }}
  </view>
  <uni-load-more :status="loadStatus" />
</scroll-view>
```

```js
export default {
  data() {
    return {
      allList: [],       // 全部数据
      visibleList: [],   // 视图内可见数据
      pageSize: 20,
      page: 1
    }
  },
  methods: {
    loadMore() {
      const start = this.page * this.pageSize
      const more = this.allList.slice(start, start + this.pageSize)
      this.visibleList.push(...more)
      this.page++
    }
  }
}
```

### v-for 优化

```html
<!-- ❌ 差 -->
<view v-for="item in list">
  <view>{{ item.name }}</view>
</view>

<!-- ✅ 好：稳定的 key（非 index） -->
<view v-for="item in list" :key="item.id">
  <view>{{ item.name }}</view>
</view>

<!-- ✅ 更好：避免深层嵌套 -->
<view v-for="item in list" :key="item.id" class="item">
  <text>{{ item.name }}</text>
</view>
```

### 小程序 WXS 响应事件

```html
<!-- 将频繁触发的交互放在 WXS 中，避免 JS 线程通信开销 -->
<wxs module="utils" src="./utils.wxs"></wxs>

<view
  @touchstart="{{utils.touchstart}}"
  @touchmove="{{utils.touchmove}}"
  @touchend="{{utils.touchend}}"
>
  拖拽区域
</view>
```

## 图片优化

```html
<!-- 懒加载 -->
<image lazy-load :src="item.img" mode="aspectFill" />

<!-- 指定宽高，避免重排 -->
<image style="width: 200rpx; height: 200rpx" :src="img" />

<!-- 渐进式加载：先展示缩略图 -->
<image :src="item.thumb || item.origin" mode="aspectFill" />

<!-- WebP 格式（条件编译 + 服务器支持） -->
<!-- #ifdef H5 || APP-PLUS -->
<image :src="item.img + '?format=webp'" />
<!-- #endif -->
```

## 减少 setData 调用

```js
// ❌ 多次 setData（Vue 响应式底层也是 setData）
this.name = 'new'
this.age = 18
this.city = 'beijing'

// ✅ Vue 已经做了异步批量，但注意大型对象
// 只传变化的数据，不要整个 data 对象传
this.$set(this.item, 'status', 'done')  // 比整个 item 赋值好

// ✅ 小程序原生开发时注意：
this.setData({ 'list[0].status': 'done' })  // 路径式更新
```

## 内存优化

### 页面销毁时清理

```js
export default {
  onUnload() {
    // 清理定时器
    if (this.timer) clearInterval(this.timer)

    // 清理事件监听
    uni.$off('customEvent')

    // 清理全局引用
    if (this.videoContext) this.videoContext.destroy()
  },
  onHide() {
    // 暂停不需要的后台任务
    if (this.audio) this.audio.pause()
  }
}
```

### 图片内存释放

```js
// 大量图片场景（如相册），及时释放
export default {
  data() { return { imageList: [] } },
  onUnload() {
    // 清空图片列表
    this.imageList = []
    // 小程序可尝试调用
    // #ifdef MP
    wx.triggerGC()
    // #endif
  }
}
```

## 网络优化

```js
// 请求缓存
const cache = new Map()

async function fetchWithCache(url, ttl = 60000) {
  if (cache.has(url)) {
    const { data, timestamp } = cache.get(url)
    if (Date.now() - timestamp < ttl) return data
  }
  const res = await uni.request({ url })
  cache.set(url, { data: res.data, timestamp: Date.now() })
  return res.data
}

// 请求合并
let pendingRequests = {}
function fetchUser(userId) {
  if (pendingRequests[userId]) return pendingRequests[userId]
  const promise = uni.request({ url: `/user/${userId}` })
  pendingRequests[userId] = promise
  promise.finally(() => delete pendingRequests[userId])
  return promise
}
```

## 性能监控

```js
// App 端性能监控
// #ifdef APP-PLUS
const performanceData = plus.engine.getPerformance()
console.log(performanceData)
// #endif

// 通用启动时间
const startTime = Date.now()
App.onLaunch(() => {
  console.log('启动耗时:', Date.now() - startTime, 'ms')
})
```

## 优化清单

| 优化项 | 效果 | 难度 |
|:--|:--|:--:|
| 分包加载 | 启动速度 ↑ 50% | ⭐⭐ |
| 图片懒加载 + WebP | 带宽 ↓ 40% | ⭐ |
| 稳定 key | 列表渲染 ↑ 30% | ⭐ |
| 预加载分包 | 体验流畅 | ⭐⭐ |
| 页面 onUnload 清理 | 内存稳定 | ⭐ |
| v-if 替代 v-show（少切换场景） | 减少初始 DOM | ⭐ |
| CSS Sprites / iconfont | 请求数 ↓ | ⭐⭐ |
| 本地缓存请求结果 | 重复访问秒开 | ⭐⭐ |