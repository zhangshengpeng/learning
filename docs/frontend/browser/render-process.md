# 浏览器渲染流程

> 理解渲染流程才能做性能优化，Vue 的异步更新队列正是利用了这一机制。

## 从输入 URL 到页面呈现

### 网络阶段

```
DNS 解析（URL → IP）
  ↓
TCP 连接（三次握手）
  ↓
TLS 握手（HTTPS 额外）
  ↓
发送 HTTP 请求
  ↓
接收 HTTP 响应（HTML）
```

### 解析阶段

```
HTML 被解析为 DOM Tree
CSS  被解析为 CSSOM Tree
  ↓ 两者结合
Render Tree（渲染树） ← 只包含可见元素
  ↓
Layout / Reflow（布局/回流）← 计算每个节点的精确位置和大小
  ↓
Paint / Repaint（绘制）← 填充像素
  ↓
Composite（合成）← GPU 合成图层，显示到屏幕
```

## 从 HTML 到 DOM Tree

### HTML 解析过程

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="style.css">
  <script src="app.js"></script>
</head>
<body>
  <div id="app">
    <p>Hello</p>
  </div>
</body>
</html>
```

```
解析顺序：
1. 遇到 <html>           → 构建根节点
2. 遇到 <link>           → 异步下载 CSS（不阻塞 DOM 解析）
3. 遇到 <script>         → 暂停 DOM 解析！下载并执行 JS
4. 遇到 <div id="app">   → 恢复解析，添加到 DOM Tree
5. 遇到 <p>Hello</p>     → 文本节点
```

### JS 为什么阻塞 DOM 解析？

```html
<script>
  document.write('<h1>New Content</h1>')  // JS 可能修改 DOM
</script>
<!-- 浏览器必须先执行 JS，才能确定后续 HTML 是否需要调整 -->
```

### 解决方案

```html
<!-- async：异步下载，下载完立即执行（不保证顺序） -->
<script async src="analytics.js"></script>

<!-- defer：异步下载，等 DOM 解析完毕再执行（保证顺序） -->
<script defer src="app.js"></script>

<!-- 放到 body 最底部（最传统） -->
<body>
  <div id="app"></div>
  <script src="app.js"></script>
</body>
```

| | 下载 | 执行时机 | 执行顺序 |
|:--|:--|:--|:--|
| 普通 | 阻塞 | 立即 | 按出现顺序 |
| async | 并行 | 下载完立即 | 不确定 |
| defer | 并行 | DOMContentLoaded 前 | 按出现顺序 |

## CSSOM 的作用

```html
<head>
  <link rel="stylesheet" href="style.css">
</head>
<script>
  // JS 会等待 CSSOM 构建完成才执行这个脚本
  const width = document.querySelector('div').offsetWidth
  // 因为 JS 可能需要读取样式 → 必须等 CSS 解析完
</script>

<!-- CSS 不直接阻塞 DOM 解析 -->
<!-- 但会阻塞 JS 执行（JS 可能读写样式） -->
<!-- 进而间接阻塞 DOM 解析 -->
```

### 为什么 CSS 放头部、JS 放底部？

```
<head>放 CSS：尽早下载、解析成 CSSOM → render tree 尽快开始
body底部放 JS：DOM 解析完成后再执行 JS → 不阻塞首屏渲染
```

## Render Tree 的构建

```
DOM Tree                    CSSOM Tree
  html                       h1 { color: red }
  ├─ head                    .box { width: 100px }
  └─ body                    p { display: none }
     ├─ h1 "Hello"
     ├─ div.box
     └─ p.hidden "invisible"

         ↓ 结合 ↓

Render Tree（渲染树）
  h1 "Hello"    color: red
  div.box       width: 100px
  // p.hidden 被 display: none 移除！
  // 但 visibility: hidden 仍然在渲染树中（占位）
```

### display: none vs visibility: hidden

```css
/* 不在渲染树中 → 不占空间 → 触发重排 */
.element { display: none; }

/* 在渲染树中 → 占空间 → 只触发重绘 */
.element { visibility: hidden; }

/* 既不渲染也不占位 → 不在渲染树中 */
.element { display: none; }

/* 元素本身可见，子元素不可见 → 元素在渲染树 */
.element { visibility: hidden; } /* 透明度影响的是绘制阶段，不是渲染树阶段 */
```

## 布局（Layout / Reflow）

### 什么是布局？

```
布局 = 计算每个可见元素的精确位置和尺寸

每个元素在屏幕上的：
  x, y 坐标
  width, height
  margin, padding, border
  position（relative 的偏移、absolute 的定位等）

所有这些数据构成 "布局树"（Layout Tree）
```

### 什么操作会触发重排？

```js
// 以下操作都会让浏览器重新计算布局：

// ① 增删/修改 DOM
el.appendChild(child)
el.removeChild(child)
el.style.width = '200px'

// ② 修改几何属性
el.style.height = '300px'
el.style.margin = '10px'
el.style.padding = '5px'
el.style.border = '1px solid black'

// ③ 获取布局信息（强制同步布局）
el.offsetTop       // 强制浏览器立刻计算布局
el.offsetLeft
el.offsetWidth
el.offsetHeight
el.scrollTop / scrollLeft / scrollWidth / scrollHeight
el.clientTop / clientLeft / clientWidth / clientHeight
// window.getComputedStyle() 也会触发
```

### 强制同步布局

```js
// ❌ 经典反模式：批量读取-修改
const divs = document.querySelectorAll('div')
for (const div of divs) {
  const w = div.offsetWidth    // ① 读 → 强制布局！
  div.style.width = w + 1 + 'px'  // ② 写 → 标记脏
}
// 每次循环：读→强制布局→写→标记脏→读→强制布局→...
// 极端情况下循环 100 次 = 100 次布局！

// ✅ 优化：先批量读，再批量写
const widths = []
for (const div of divs) {
  widths.push(div.offsetWidth)  // 只读，浏览器合并为一次布局
}
for (let i = 0; i < divs.length; i++) {
  divs[i].style.width = widths[i] + 1 + 'px'  // 只写，统一提交
}
```

## 绘制（Paint）

```
布局确定了元素位置 → 现在要"画"出来

绘制阶段做的事：
  填充颜色、边框、阴影
  绘制文本（字体、字号、颜色）
  绘制图片
  绘制背景

但不同元素可能属于不同"图层"（Layer）
  → 合成线程可以并行绘制不同图层
```

## 合成（Composite）

### 图层

```css
/* 这些属性可以创建新的合成层： */
.box {
  transform: translateZ(0);  /* 3D 变换 */
  will-change: transform;    /* 主动告知浏览器 */
  backface-visibility: hidden; /* 3D 相关 */
}
```

### 为什么 transform 性能好？

```
修改 left/top/width/height：
  布局 → 绘制 → 合成（3 个阶段）

修改 transform/opacity：
  合成 即可（只 1 个阶段）
  因为 transform 不改变元素在文档流中的位置（仅视觉偏移）

这就是为什么 CSS 动画推荐用 transform + opacity：
  不触发重排重绘 → GPU 直接合成 → 60fps 丝滑
```

## 在 Vue 中的体现

### $nextTick 与渲染时机

```js
// 修改数据 → Vue 不立即更新 DOM
this.count = 1
this.count = 2
this.count = 3
// 3 次修改 → Watcher 合并为一次 → 下一个 tick 统一更新

this.$nextTick(() => {
  // DOM 已更新，但浏览器可能还没渲染到屏幕
  console.log(this.$el.textContent)  // '3'
})

// 等价于：
await this.$nextTick()
// 微任务队列清空 → Vue DOM 更新完毕
```

### nextTick 的时机

```
宏任务（script）：
  count = 3 → watcher.run() 被推到微任务队列
  ↓
微任务：
  flushSchedulerQueue() → 更新 DOM
  浏览器：DOM 树更新完成，但还没到 Paint 阶段
  ↓
（下一个宏任务前）
  浏览器：Layout → Paint → Composite
  用户看到更新后的页面
```

## 经典面试题

### 题1：重排 vs 重绘 vs 合成

```js
el.style.left = '10px'      // → 重排 + 重绘 + 合成
el.style.color = 'red'      // → 重绘 + 合成（不重排）
el.style.transform = 'rotate(45deg)'  // → 仅合成
```

### 题2：display: none 和 visibility: hidden

```css
/* ① display: none → 元素从渲染树移除 → 重排 */
.hidden1 { display: none; }

/* ② visibility: hidden → 元素仍在渲染树，只不可见 → 仅重绘 */
.hidden2 { visibility: hidden; }

/* ③ opacity: 0 → 元素仍在渲染树且占据合成层 → 仅合成 */
.hidden3 { opacity: 0; }
```