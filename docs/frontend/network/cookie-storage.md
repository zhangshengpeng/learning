# Cookie & 前端存储

## Cookie

### 基本属性

```
Set-Cookie: token=abc123; Path=/; Domain=.example.com; Max-Age=3600; HttpOnly; Secure; SameSite=Lax

属性解析：
  Name/Value：key=value
  Domain：生效的域名（默认当前域名，子域名不共享）
  Path：生效的路径（/ 表示整站）
  Max-Age：有效期（秒），过期后自动删除
  Expires：过期时间（GMT），兼容旧浏览器
  HttpOnly：禁止 JS 访问 → 防 XSS 窃取
  Secure：仅 HTTPS 传输 → 防中间人窃取
  SameSite：跨站请求是否携带 → 防 CSRF
```

### SameSite

```yaml
Strict:
  只有同站请求才携带 Cookie
  从外部链接点进来 → Cookie 不发送 → 可能是未登录状态
  最安全，但体验差

Lax（Chrome 默认）:
  跨站请求携带 Cookie 的条件：
    - GET 请求（如 <a> 链接）
    - 顶级导航（top-level navigation）
  POST 表单、iframe、AJAX 跨站请求不携带
  兼顾安全与体验

None:
  所有跨站请求都携带 Cookie
  必须搭配 Secure（HTTPS）
  第三方 Cookie 场景（如嵌入式支付）
```

## Cookie vs Web Storage

| | Cookie | localStorage | sessionStorage |
|:--|:--|:--|:--|
| 容量 | 4KB | 5~10MB | 5~10MB |
| 生命周期 | 可设过期时间 | 永久（除非手动删除） | 关闭标签页即删 |
| 作用域 | Domain/Path | 同源 | 同源 + 同标签 |
| 发送到服务器 | 每次请求自动带 | 不发送 | 不发送 |
| API | document.cookie | localStorage.getItem/setItem | sessionStorage.getItem/setItem |
| 安全 | 可设 HttpOnly | 无保护 | 无保护 |
| 跨标签 | 共享 | 共享 | 不共享 |

### localStorage

```js
// 基本操作
localStorage.setItem('key', JSON.stringify({ name: 'Alice' }))
const data = JSON.parse(localStorage.getItem('key'))
localStorage.removeItem('key')
localStorage.clear()

// 监听变化（其他标签页修改时触发）
window.addEventListener('storage', (e) => {
  console.log(e.key, e.oldValue, e.newValue)
})

// 容量检测
try {
  localStorage.setItem('__test__', 'x'.repeat(10 * 1024 * 1024))  // 10MB
} catch (e) {
  console.log('存储满了')
}
```

### sessionStorage

```js
// 与 localStorage 完全相同的 API
sessionStorage.setItem('token', 'abc')
sessionStorage.getItem('token')

// 特性：
// - 新 tab 打开同域页面 → sessionStorage 是空的！
// - 复制 tab（duplicate） → sessionStorage 会复制！（Chrome）
// - 刷新页面 → 保留
// - 关闭 tab → 清空
```

## IndexedDB

```js
// 异步、indexed、支持大容量存储
const request = indexedDB.open('MyDB', 1)

request.onupgradeneeded = (e) => {
  const db = e.target.result
  const store = db.createObjectStore('users', { keyPath: 'id' })
  store.createIndex('name', 'name', { unique: false })
}

request.onsuccess = (e) => {
  const db = e.target.result
  const tx = db.transaction('users', 'readwrite')
  tx.objectStore('users').add({ id: 1, name: 'Alice', age: 25 })
}
// 适合：离线缓存、音视频文件、大量结构化数据
```

## Token 存储方案选择

```yaml
方案1：localStorage 存 Token
  优点：简单
  缺点：XSS 可窃取 Token
  
方案2：HttpOnly Cookie 存 Token
  优点：XSS 无法窃取
  缺点：CSRF 风险（需配合 SameSite/CSRF Token）

方案3：refreshToken + accessToken
  accessToken 存内存（变量），短有效期（15min）
  refreshToken 存 HttpOnly Cookie，长有效期（7天）
  优点：安全性最高
  缺点：实现复杂

推荐：方案3（企业级应用）
  - 短 accessToken 存在 JS 变量（非 localStorage）
  - refreshToken 设为 HttpOnly + Secure + SameSite=Strict
  - 响应拦截器自动刷新 token
```

## 在 Vue 中的应用

```js
// composables/useStorage.ts
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const stored = localStorage.getItem(key)
  const data = ref<T>(
    stored ? JSON.parse(stored) : defaultValue
  )

  watch(data, (val) => {
    localStorage.setItem(key, JSON.stringify(val))
  }, { deep: true })

  return data
}

// 使用
const userPreferences = useLocalStorage('preferences', {
  theme: 'light',
  lang: 'zh-CN'
})
```