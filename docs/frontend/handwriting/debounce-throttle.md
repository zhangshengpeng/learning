# 防抖 & 节流

## 防抖 debounce

```js
function debounce(fn, delay) {
  let timer = null
  return function(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 场景：
// 搜索框输入搜索 → 用户停止输入 300ms 后才发请求
// 窗口 resize → 等用户停止拖拽后才重新计算
```

**面试要点**：

- 每次调用重置计时器
- `this` 要正确绑定
- 最后一个调用一定会执行
- 可以升级为带 `immediate`（首次立即执行）的版本

## 节流 throttle

```js
function throttle(fn, interval) {
  let lastTime = 0
  return function(...args) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

// 场景：
// 滚动事件 → 每 200ms 检查一次
// 按钮点击 → 防重复提交
```

## 防抖 vs 节流

| | 防抖 | 节流 |
|:--|:--|:--|
| 行为 | 等停止后，执行最后一次 | 固定周期执行一次 |
| 场景 | 搜索框、resize | 滚动、mousemove |
| 关键 | 最后一次一定执行 | 规律执行 |