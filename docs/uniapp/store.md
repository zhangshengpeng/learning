# 状态管理（Vuex / Pinia）

## 为什么需要状态管理

uni-app 的页面栈使得跨页面数据共享变得困难。页面 A 跳转到页面 B 再跳转到 C，A 和 C 之间没有直接引用关系。

```
页面 A ──navigateTo──→ 页面 B ──navigateTo──→ 页面 C
  │                                              │
  └────────── 无法直接传参 ←───────────── 无法直接传参 ┘
                      
                    解决方案: 全局 Store
```

## Vuex 在 uni-app 中的使用

### 目录结构

```
store/
├── index.js          # 主入口，组装 modules
├── modules/
│   ├── user.js       # 用户模块
│   ├── cart.js       # 购物车模块
│   └── app.js        # 应用配置模块
└── getters.js        # 全局 getters
```

### 基础配置

```js
// store/index.js
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    token: uni.getStorageSync('token') || '',
    userInfo: {}
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token
      uni.setStorageSync('token', token)
    },
    SET_USER_INFO(state, info) {
      state.userInfo = info
    },
    LOGOUT(state) {
      state.token = ''
      state.userInfo = {}
      uni.removeStorageSync('token')
    }
  },
  actions: {
    async login({ commit }, { code }) {
      const res = await uni.request({ url: '/api/login', data: { code } })
      commit('SET_TOKEN', res.data.token)
      return res.data
    },
    async getUserInfo({ commit }) {
      const res = await uni.request({ url: '/api/user/info' })
      commit('SET_USER_INFO', res.data)
    }
  },
  getters: {
    isLoggedIn: (state) => !!state.token
  }
})

export default store
```

```js
// main.js
import Vue from 'vue'
import App from './App'
import store from './store'

Vue.prototype.$store = store  // 挂载到原型

const app = new Vue({
  store,
  ...App
})
app.$mount()
```

### 模块化

```js
// store/modules/user.js
export default {
  namespaced: true,
  state: { token: '', userInfo: {} },
  mutations: { /* ... */ },
  actions: { /* ... */ }
}

// store/index.js
import user from './modules/user'
import cart from './modules/cart'

export default new Vuex.Store({
  modules: { user, cart }
})

// 使用
this.$store.commit('user/SET_TOKEN', token)
this.$store.dispatch('user/login', { code })
```

## Pinia 在 uni-app 中的使用（推荐）

Vue 3 / uni-app 3.x 推荐使用 Pinia：

```js
// store/user.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: uni.getStorageSync('token') || '',
    userInfo: {},
    permissions: []
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    role: (state) => state.userInfo.role || 'guest'
  },

  actions: {
    async login(credentials) {
      const res = await uni.request({
        url: '/api/login',
        method: 'POST',
        data: credentials
      })
      this.token = res.data.token
      uni.setStorageSync('token', res.data.token)
    },

    async fetchUserInfo() {
      const res = await uni.request({ url: '/api/user/info' })
      this.userInfo = res.data
      this.permissions = res.data.permissions || []
    },

    logout() {
      this.token = ''
      this.userInfo = {}
      this.permissions = []
      uni.removeStorageSync('token')
    }
  }
})
```

### Pinia 持久化插件

```bash
npm install pinia-plugin-persistedstate
```

```js
// main.js
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
```

```js
// store/user.js
export const useUserStore = defineStore('user', {
  state: () => ({ token: '' }),
  persist: {
    storage: {
      getItem: uni.getStorageSync,
      setItem: uni.setStorageSync
    },
    paths: ['token']  // 仅持久化 token
  }
})
```

## Vuex vs Pinia 对比

| | Vuex | Pinia |
|:--|:--|:--|
| Vue 版本 | Vue 2 | Vue 3（推荐） |
| TypeScript 支持 | 弱 | ⭐⭐⭐⭐⭐ |
| 模块化 | modules + namespaced | 天然模块化 |
| mutations | 必须 | 不需要（直接改 state） |
| 体积 | ~12KB | ~5KB |
| devtools | ✅ | ✅ |
| 持久化 | 手动实现 | pinia-plugin-persistedstate |

## 小程序特殊处理

### 问题：小程序中 store 更新不触发视图

```js
// 原因：小程序下 Vue.set 行为不一致

// ❌ 新增属性可能不响应
state.userInfo.avatar = 'new.jpg'

// ✅ 用 Vue.set 或整个替换
Vue.set(state.userInfo, 'avatar', 'new.jpg')
// 或
state.userInfo = { ...state.userInfo, avatar: 'new.jpg' }
```

### 问题：tabBar 页面间状态同步

```js
// 方案：在 onShow 中重新获取 store 数据
export default {
  onShow() {
    // 每次 tab 切换重新同步
    this.cartCount = this.$store.getters['cart/count']
  }
}
```

## 常用封装：带 loading 的网络请求

```js
// utils/store-request.js — 结合 store 的请求封装
import store from '@/store'

export async function request(options) {
  if (options.showLoading !== false) {
    uni.showLoading({ title: '加载中', mask: true })
  }

  try {
    const res = await uni.request({
      url: options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Authorization': `Bearer ${store.state.token}`,
        ...options.header
      }
    })

    if (res.statusCode === 401) {
      store.commit('LOGOUT')
      uni.reLaunch({ url: '/pages/login/login' })
      throw new Error('登录已过期')
    }

    return res.data
  } catch (err) {
    uni.showToast({ title: err.message || '请求失败', icon: 'none' })
    throw err
  } finally {
    uni.hideLoading()
  }
}
```

## 最佳实践

1. **token 持久化**：存到 store + storage 双写，store 用于响应式，storage 用于持久化
2. **登录态检查放 App.onLaunch**：应用启动时从 storage 恢复 token
3. **401 全局拦截**：在请求封装中统一处理，而非每个页面分散判断
4. **Pinia plugin**：App 重启后可能丢失 store，建议用持久化插件