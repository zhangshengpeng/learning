# Vue 相关手写

## reactive 最简版

```js
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      // track(target, key)  ← 依赖收集（略）
      if (typeof res === 'object' && res !== null) {
        return reactive(res)  // 深层代理
      }
      return res
    },
    set(target, key, value, receiver) {
      const old = target[key]
      const result = Reflect.set(target, key, value, receiver)
      if (old !== value) {
        // trigger(target, key)  ← 派发更新（略）
      }
      return result
    }
  })
}
```

**面试口述要点**：

- 用 Proxy 拦截 get/set
- get 时惰性深层代理 + 依赖收集
- set 时通知更新
- 用 Reflect 保证 this 正确和默认行为

## computed 最简版

```js
function computed(getter) {
  let dirty = true
  let value

  const effect = () => { dirty = true }

  return {
    get value() {
      if (dirty) {
        value = getter()      // 计算 → 依赖被收集到 effect
        dirty = false
      }
      return value
    }
  }
  // 实际源码中 effect 会被依赖收集，依赖变化时 set dirty = true
}
```

**要点**：缓存通过 dirty 标志实现，依赖变化时 dirty = true，下次 get 重新计算

## 虚拟 DOM 渲染

```js
function render(vnode) {
  // 文本节点
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode)
  }

  const { tag, props, children } = vnode
  const el = document.createElement(tag)

  // 处理属性
  for (const key in props) {
    if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), props[key])
    } else {
      el.setAttribute(key, props[key])
    }
  }

  // 递归渲染子节点
  children?.forEach(child => el.appendChild(render(child)))
  return el
}

// render({ tag: 'div', props: { class: 'box' }, children: ['hello'] })
// → <div class="box">hello</div>
```

**要点**：

- 文本节点直接 `createTextNode`
- 元素节点递归创建
- 事件属性以 `on` 开头 → `addEventListener`
- 不涉及 diff，只是创建