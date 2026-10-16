# API 系统 & 原生能力

## uni.* 全局 API 体系

uni-app 提供了一套统一的 API，在各平台自动映射到底层能力：

```
uni.request()        → H5: XMLHttpRequest / fetch
                      → App: plus.net.XMLHttpRequest
                      → 小程序: wx.request / my.request

uni.getLocation()    → H5: navigator.geolocation
                      → App: plus.geolocation
                      → 小程序: wx.getLocation

uni.chooseImage()    → H5: <input type="file">
                      → App: plus.gallery
                      → 小程序: wx.chooseImage
```

## 常用 API 分类

### 网络请求

```js
uni.request({
  url: 'https://api.example.com/user',
  method: 'GET',
  data: { id: 1 },
  header: { 'Content-Type': 'application/json' },
  timeout: 10000,
  success: (res) => { console.log(res.data) },
  fail: (err) => { console.error(err) }
})

// 上传文件
uni.uploadFile({
  url: 'https://api.example.com/upload',
  filePath: tempFilePath,
  name: 'file',
  formData: { userId: 1 },
  success: (res) => { }
})

// 下载文件
uni.downloadFile({
  url: 'https://example.com/file.pdf',
  success: (res) => {
    uni.openDocument({ filePath: res.tempFilePath })
  }
})
```

### requests 拦截器封装

uni-app 原生不支持拦截器，需自行封装：

```js
// utils/request.js
const BASE_URL = 'https://api.example.com'

function request(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Authorization': uni.getStorageSync('token') || '',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 401) {
          uni.reLaunch({ url: '/pages/login/login' })
          return
        }
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          uni.showToast({ title: res.data.message || '请求失败', icon: 'none' })
          reject(res)
        }
      },
      fail: reject
    })
  })
}

// 使用
import request from '@/utils/request'
const data = await request({ url: '/user', method: 'GET' })
```

### 媒体

```js
// 选择图片
uni.chooseImage({
  count: 9,
  sizeType: ['compressed'],
  sourceType: ['album', 'camera'],
  success: (res) => { this.previewImages = res.tempFilePaths }
})

// 预览图片
uni.previewImage({
  current: 0,
  urls: ['https://example.com/1.jpg', 'https://example.com/2.jpg']
})

// 拍照/录像
uni.chooseVideo({
  sourceType: ['camera', 'album'],
  maxDuration: 60,
  success: (res) => { console.log(res.tempFilePath) }
})
```

### 位置

```js
uni.getLocation({
  type: 'gcj02',  // 国测局坐标系（小程序要求）
  success: (res) => {
    console.log(res.latitude, res.longitude)
  }
})

// 地图相关
const mapCtx = uni.createMapContext('myMap')
mapCtx.moveToLocation()                    // 移动到当前位置
mapCtx.includePoints({ points: markers })  // 缩放显示所有点
```

### 设备

```js
// 扫码
uni.scanCode({
  success: (res) => { console.log(res.result) }
})

// 拨打电话
uni.makePhoneCall({ phoneNumber: '13800138000' })

// 获取系统信息
const info = uni.getSystemInfoSync()
console.log(info.platform)  // 'ios' | 'android' | 'devtools'
console.log(info.windowWidth, info.windowHeight)
console.log(info.statusBarHeight)  // 状态栏高度
console.log(info.safeArea)         // 安全区域
```

## 页面与导航

```js
uni.setNavigationBarTitle({ title: '自定义标题' })
uni.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#007AFF' })
uni.showNavigationBarLoading()   // 显示导航栏加载动画
uni.hideNavigationBarLoading()

// 下拉刷新
uni.startPullDownRefresh()
uni.stopPullDownRefresh()
```

## 交互反馈

```js
uni.showToast({ title: '成功', icon: 'success' })
uni.hideToast()

uni.showLoading({ title: '加载中', mask: true })  // mask 防止穿透
uni.hideLoading()

uni.showModal({
  title: '提示',
  content: '确定删除吗？',
  success: (res) => {
    if (res.confirm) { this.doDelete() }
  }
})

// 底部操作菜单
uni.showActionSheet({
  itemList: ['拍照', '从相册选择'],
  success: (res) => {
    console.log(res.tapIndex)
  }
})
```

## App 端原生能力

App 端通过 `plus.*` 或 `uni.requireNativePlugin` 访问原生 API：

```js
// #ifdef APP-PLUS

// 状态栏
plus.navigator.setStatusBarStyle('dark')
plus.navigator.getStatusbarHeight()

// 横竖屏
plus.screen.lockOrientation('portrait-primary')
plus.screen.unlockOrientation()

// 手机振动
plus.device.vibrate(500)

// 获取设备 ID
plus.device.getInfo({ success: (info) => console.log(info) })

// 第三方原生插件
const plugin = uni.requireNativePlugin('PluginName')
plugin.show({ title: 'hello' })

// #endif
```

## 权限适配

```json
// manifest.json
{
  "app-plus": {
    "distribute": {
      "android": {
        "permissions": [
          "<uses-permission android:name=\"android.permission.CAMERA\"/>",
          "<uses-permission android:name=\"android.permission.ACCESS_FINE_LOCATION\"/>"
        ]
      }
    }
  }
}
```

小程序权限在各平台后台配置即可，不需要代码声明。

## 常见 API 跨端差异

| API | H5 | App | 小程序 |
|:--|:--|:--|:--|
| `uni.request` cookie | 自动携带 | 需手动 | 不携带 |
| `uni.getLocation` | 浏览器弹窗 | ❌ 需配置权限 | ❌ 需用户授权 |
| `uni.saveFile` | ❌ | ✅ | ✅ |
| `uni.getRecorderManager` | ❌ | ✅ | ✅ |
| `uni.getBLEDeviceServices` | ❌ | ✅ | ✅ |
| `uni.share` | ❌ | ✅ | ✅ |
| `uni.requestPayment` | ❌ | ✅ | ✅ |
| `uni.setClipboardData` | ✅ | ✅ | ✅ |
| `uni.getSystemInfoSync` | ✅ | ✅ | ✅ |
| `uni.$emit / $on` | ✅ | ✅ | ⚠️ 注意清理 |
| `plus.push` 推送 | ❌ | ✅ | ✅ |

## 最佳实践

1. **请求统一封装**：写一个 `request.js` 统一处理 token、错误、loading
2. **API 降级处理**：用条件编译为不支持的平台提供降级方案
3. **权限判断**：调用前用 `uni.getSetting` 检查权限状态
4. **Promise 化**：uni API 同时支持 callback 和 Promise，推荐用 async/await