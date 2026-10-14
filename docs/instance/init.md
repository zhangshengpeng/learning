# new Vue() 发生了什么

## 构造函数

```js
// src/core/instance/index.js
import { initMixin } from "./init"
import { stateMixin } from "./state"
import { eventsMixin } from "./events"
import { lifecycleMixin } from "./lifecycle"
import { renderMixin } from "./render"

function Vue(options) {
  // 必须是 new Vue() 调用
  this._init(options)
}

// 通过 Mixin 注入原型方法
initMixin(Vue)         // _init
stateMixin(Vue)        // $set、$delete、$watch
eventsMixin(Vue)       // $on、$once、$off、$emit
lifecycleMixin(Vue)    // _update、$forceUpdate、$destroy
renderMixin(Vue)       // _render、$nextTick
```

Mixins 模式将不同功能的代码分散到不同模块，避免 `index.js` 过于臃肿。

## _init 方法

```js
// src/core/instance/init.js

Vue.prototype._init = function (options) {
  const vm = this

  // ① 生成唯一 uid
  vm._uid = uid++

  // ② 标记 Vue 实例（避免被观测）
  vm._isVue = true

  // ③ 合并 options（全局混入 + 组件传入）
  vm.$options = mergeOptions(
    resolveConstructorOptions(vm.constructor),
    options || {},
    vm
  )

  // ④ 初始化代理
  vm._renderProxy = vm

  // ⑤ 暴露 this
  vm._self = vm

  // ⑥ 初始化各模块
  initLifecycle(vm)   // $parent、$root、$children、$refs
  initEvents(vm)       // 事件监听
  initRender(vm)       // $slots、$scopedSlots、$createElement
  callHook(vm, "beforeCreate")
  initInjections(vm)   // inject 注入
  initState(vm)        // data、props、methods、computed、watch
  initProvide(vm)      // provide 提供
  callHook(vm, "created")

  // ⑦ 挂载到 DOM
  if (vm.$options.el) {
    vm.$mount(vm.$options.el)
  }
}
```

## initState 顺序

```js
// src/core/instance/state.js

export function initState(vm) {
  const opts = vm.$options

  if (opts.props) initProps(vm, opts.props)
  if (opts.methods) initMethods(vm, opts.methods)

  if (opts.data) {
    initData(vm)      // 核心！将 data 变为响应式
  } else {
    observe((vm._data = {}), true)
  }

  if (opts.computed) initComputed(vm, opts.computed)
  if (opts.watch) initWatch(vm, opts.watch)
}
```

初始化顺序：**props → methods → data → computed → watch**

这就是为什么 methods 中可以访问 data，computed 中可以访问 props 和 data。

## initData 做了什么

```js
function initData(vm) {
  let data = vm.$options.data
  // data 可以是函数（组件）或对象（根 Vue）
  data = vm._data = typeof data === "function" ? getData(data, vm) : data || {}

  // 将 data 上的属性代理到 vm 上
  // this.name → this._data.name
  const keys = Object.keys(data)
  let i = keys.length
  while (i--) {
    const key = keys[i]
    proxy(vm, `_data`, key)
  }

  // 核心：将 data 变成响应式
  observe(data, true)
}

// 代理实现
function proxy(target, sourceKey, key) {
  Object.defineProperty(target, key, {
    get() { return this[sourceKey][key] },
    set(val) { this[sourceKey][key] = val },
  })
}
```

所以 `this.name` 实际上访问的是 `this._data.name`，而 `_data` 是经过 `observe()` 处理过的响应式对象。
