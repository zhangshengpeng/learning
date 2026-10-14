# 生命周期流程

## 完整生命周期图谱

```
new Vue()
    │
    ├── initLifecycle、initEvents、initRender
    ├── beforeCreate   ← 此时 data/methods 尚不可访问
    │
    ├── initState (data → observe → 响应式)
    ├── created        ← data 可访问，但 DOM 未挂载
    │
    ├── $mount()
    │   ├── compile?       (运行时版跳过这步，直接用 render)
    │   ├── beforeMount    ← 即将挂载
    │   │
    │   ├── new Watcher(vm, updateComponent)
    │   │   └── vm._render() → VNode 树
    │   │   └── vm._update() → 首次 patch → 插入真实 DOM
    │   │
    │   ├── mounted        ← DOM 已插入页面
    │
    ├── [数据变化]
    │   ├── beforeUpdate   ← DOM 尚未更新
    │   ├── Watcher.run() → 重新渲染 → patch
    │   ├── updated        ← DOM 已更新
    │
    ├── vm.$destroy()
        ├── beforeDestroy  ← 实例即将销毁
        ├── 清理 Watcher、事件监听、子组件
        └── destroyed      ← 实例已销毁
```

## mountComponent 源码

```js
// src/core/instance/lifecycle.js

export function mountComponent(vm, el) {
  vm.$el = el

  // ① 如果没有 render 函数，尝试从 template 编译
  if (!vm.$options.render) {
    vm.$options.render = createEmptyVNode
    // 编译过程：template → AST → render 函数
    const { render, staticRenderFns } = compileToFunctions(
      template, options, vm
    )
    vm.$options.render = render
  }

  // ② 触发 beforeMount 钩子
  callHook(vm, "beforeMount")

  // ③ 定义渲染函数
  const updateComponent = () => {
    vm._update(vm._render())
  }

  // ④ 创建渲染 Watcher（首次渲染 + 后续更新）
  new Watcher(vm, updateComponent, noop, {
    before() {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, "beforeUpdate") // 后续每次数据变更前触发
      }
    },
  })

  // ⑤ 标记已挂载
  vm._isMounted = true
  callHook(vm, "mounted")
  return vm
}
```

## render 函数的来源

优先级：**render > template > el 的 outerHTML**

```js
// 场景 1：手动写 render
new Vue({ render: h => h("div", "hello") })

// 场景 2：template 模板编译
new Vue({ template: "<div>{{ msg }}</div>" })

// 场景 3：通过 el 获取 outerHTML
new Vue({ el: "#app" })
```

## 父子组件生命周期顺序

```
父 beforeCreate
父 created
父 beforeMount
    子 beforeCreate
    子 created
    子 beforeMount
    子 mounted
父 mounted

// 更新时
父 beforeUpdate
    子 beforeUpdate
    子 updated
父 updated

// 销毁时
父 beforeDestroy
    子 beforeDestroy
    子 destroyed
父 destroyed
```
