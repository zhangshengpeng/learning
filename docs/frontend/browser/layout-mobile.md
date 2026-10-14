# 常见布局 & 移动端适配

## 常见布局方案

### ① 居中布局

```css
/* Flex 水平垂直居中（最常用） */
.center-flex {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Grid 水平垂直居中（更简洁） */
.center-grid {
  display: grid;
  place-items: center;  /* justify-items + align-items */
}

/* 绝对定位 + transform（老方案） */
.center-absolute {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
/* 注意：transform 会从子元素的 border-box 开始计算 */
```

### ② 圣杯 / 双飞翼布局

```
┌──────────────────────────┐
│         header           │
├──────┬─────────┬─────────┤
│ left │  main   │  right  │
│ 200  │  自适应  │  150   │
├──────┴─────────┴─────────┤
│         footer           │
└──────────────────────────┘
```

**Flex 实现（最简单）**：

```css
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.body {
  display: flex;
  flex: 1;
}
.left  { width: 200px; }
.main  { flex: 1; }
.right { width: 150px; }
```

**Grid 实现**：

```css
.layout {
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 200px 1fr 150px;
  min-height: 100vh;
}
```

### ③ 瀑布流 / Masonry

```css
/* Column 方案（纯 CSS，简单但不完美） */
.masonry {
  column-count: 3;
  column-gap: 16px;
}
.masonry > * {
  break-inside: avoid;  /* 防元素断裂 */
}

/* Grid 方案（需要 JS 辅助计算 row-span） */
/* 或者用 CSS Grid 的 dens 填充 */
.masonry {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-flow: dense;
  gap: 16px;
}
```

### ④ 粘性 Footer

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.content { flex: 1; }  /* 撑满剩余空间，footer 自动推底 */
```

### ⑤ 九宫格 / 自适应卡片网格

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
/* 一行自动放多少列，列宽最小 280px */
```

---

## 移动端适配

### 视口（Viewport）

```html
<meta name="viewport"
  content="width=device-width,
           initial-scale=1.0,
           maximum-scale=1.0,
           user-scalable=no">
```

### 物理像素 vs 逻辑像素 vs CSS 像素

```
物理像素：屏幕实际的发光点（硬件）
  例如 iPhone 14: 1170 × 2532 物理像素

逻辑像素（设备独立像素 DIP）：操作系统报告的分辨率
  例如 iPhone 14: 390 × 844 逻辑像素

CSS 像素：CSS 中的 1px
  在标准 DPR 下，1 CSS 像素 = 1 逻辑像素

设备像素比（DPR）= 物理像素 / 逻辑像素
  iPhone 14: DPR = 3（1 个逻辑像素 = 3×3 个物理像素）
```

### rem 适配

```js
// 经典方案：根据屏幕宽度动态设置根元素 font-size
// 设计稿 375px 宽度
// 设置 1rem = 37.5px（方便换算：20px = 20/37.5 = 0.533rem）
function setRem() {
  const baseSize = 37.5
  const scale = document.documentElement.clientWidth / 375
  document.documentElement.style.fontSize = baseSize * scale + 'px'
}
setRem()
window.addEventListener('resize', setRem)

// CSS 里用 rem
// title { font-size: 0.533rem; }  // 20px / 37.5
```

**注意**：rem 方案已在逐步被 vw/vh 方案取代。

### vw/vh 适配（推荐）

```css
/* 设计稿 375px → 100vw = 375px */
/* 20px = (20/375) × 100 = 5.333vw */

.title { font-size: 5.333vw; }

/* PostCSS 插件（postcss-px-to-viewport）自动转换 */
/* 写 px，构建时转 vw */
```

### 1px 边框问题

```css
/* 高 DPR 屏下 1px 可能显示为 2~3 个物理像素 */
/* 需要真正的 1 物理像素线 */

.border-1px {
  position: relative;
}
.border-1px::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background: #e5e5e5;
  transform: scaleY(0.5);  /* DPR=2 时缩小一半 */
  transform-origin: 0 0;
}

@media (-webkit-min-device-pixel-ratio: 3) {
  .border-1px::after {
    transform: scaleY(0.3333);  /* DPR=3 时缩小到 1/3 */
  }
}
```

### 安全区域（刘海屏）

```css
/* iOS 刘海屏底部横条区域 */
.footer {
  padding-bottom: constant(safe-area-inset-bottom); /* iOS < 11.2 */
  padding-bottom: env(safe-area-inset-bottom);      /* iOS >= 11.2 */
}
```

### 响应式 vs 自适应

```css
/* 响应式（Responsive）：同一份代码，流动布局 */
.container {
  width: 100%;
  max-width: 1200px;
  padding: 0 16px;
}

@media (max-width: 768px) {
  .sidebar { display: none; }
  .grid { grid-template-columns: 1fr; }
}

/* 自适应（Adaptive）：不同设备不同布局，可能跳转不同站点 */
// m.example.com  →  移动端
// www.example.com → PC 端
```

### 常用断点

```css
/* Mobile First：从小屏写起，向上叠加 */
.container { /* 默认移动端样式 */ }

@media (min-width: 576px)  { /* 平板竖屏 */ }
@media (min-width: 768px)  { /* 平板横屏 */ }
@media (min-width: 992px)  { /* 小屏桌面 */ }
@media (min-width: 1200px) { /* 大屏桌面 */ }
```

---

## 在 Vue 中的应用

### 移动端 H5 适配方案

```js
// 安装 postcss-px-to-viewport
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 375,  // 设计稿宽度
      unitPrecision: 5,
      viewportUnit: 'vw',
      selectorBlackList: ['.ignore'],
      minPixelValue: 1,
      mediaQuery: false,
    }
  }
}
```

```html
<template>
  <div class="container">
    <!-- 直接写 px，构建时自动转 vw -->
  </div>
</template>

<style scoped>
.container {
  width: 375px;   /* → 100vw */
  padding: 16px;  /* → 4.267vw */
  font-size: 14px; /* → 3.733vw */
}
</style>
```