# 层叠上下文

> z-index 不是你设多大就多大，它在层叠上下文里才有意义。

## 什么是层叠上下文？

**层叠上下文 = 一个三维空间，决定了元素在 z 轴上的摆放顺序。**

```
默认：HTML 根元素形成最外层叠上下文

内部：
  z-index 只在同层级叠上下文中比较
  不同层叠上下文之间的比较，看层叠上下文的层级
```

### 创建层叠上下文的条件

```css
/* ① position + z-index ≠ auto（最常见） */
.element { position: relative; z-index: 1; }

/* ② position: fixed / sticky  */
.element { position: fixed; z-index: auto; }  /* auto 也可以！ */

/* ③ flex/grid 子项 + z-index ≠ auto */
.parent { display: flex; }
.child { z-index: 1; }

/* ④ opacity < 1 */
.element { opacity: 0.99; }

/* ⑤ transform ≠ none */
.element { transform: translate(10px); }

/* ⑥ filter、perspective、clip-path 等 */
.element { filter: blur(5px); }

/* ⑦ will-change 指定上述任一属性 */
.element { will-change: transform; }

/* ⑧ contain 属性 */
.element { contain: layout; }
```

> ⚠️ `opacity < 1` 创建层叠上下文的副作用很容易被忽略！

## 层叠顺序（Stacking Order）

```
从小到大排列（从上往下看，数字大的在上面）：

┌──────────────────────────────────┐
│ 正 z-index（z-index > 0）          │  ← 最上面
├──────────────────────────────────┤
│ z-index: 0 / z-index: auto       │
├──────────────────────────────────┤
│ 行内元素（inline）                 │
├──────────────────────────────────┤
│ 浮动元素（float）                  │
├──────────────────────────────────┤
│ 块级元素（block）                  │
├──────────────────────────────────┤
│ 负 z-index（z-index < 0）          │  ← 最下面
├──────────────────────────────────┤
│ background / border（层叠上下文）  │
└──────────────────────────────────┘
```

## 常见陷阱

### 陷阱1：z-index 不生效

```html
<div class="box1" style="position: relative; z-index: 999;">
  我以为在最上面
</div>
<div class="box2" style="position: relative; z-index: 1;">
  但它在上面
</div>
<!-- 为什么？检查父元素 -->
<div style="position: relative; z-index: 1;">
  <div class="box1"></div>  <!-- z-index: 999 → 但父级 z-index: 1 -->
</div>
<div style="position: relative; z-index: 2;">
  <div class="box2"></div>  <!-- 父级 z-index: 2 → 整体在上面 -->
</div>
<!-- 结论：不同层叠上下文的子元素，z-index 无比较意义 -->
```

### 陷阱2：opacity 悄悄创建层叠上下文

```html
<div class="parent" style="opacity: 0.99;">
  <div class="child" style="position: relative; z-index: 9999;">
    我想在最上面
  </div>
</div>
<div class="overlay" style="position: fixed; z-index: 1000;"></div>
<!-- overlay 仍然在 child 上面！ -->
<!-- 因为 parent 的 opacity: 0.99 创建了新层叠上下文 -->
<!-- child 的 z-index: 9999 只在 parent 内部有效 -->
```

### 陷阱3：z-index: 0 vs z-index: auto

```css
/*
  position: relative; z-index: auto;
  → 不创建层叠上下文

  position: relative; z-index: 0;
  → 创建层叠上下文！
  → 里面的子元素 z-index 只在父元素内部有效
*/
```

## 在 Vue 中的应用

### Element UI / Plus 的弹框层级管理

```js
// Element Plus 中每个弹窗、下拉菜单的 z-index 是动态递增的
// 源码中维护了一个 PopupManager：

let zIndex = 2000
export const getNextZIndex = () => zIndex++

// Dialog: z-index = 2000 + 1
// 第二个 Dialog: z-index = 2001
// 下拉菜单：z-index = 2002

// 为什么不用 fixed 的 9999？
// → 不同层叠上下文嵌套时，9999 也不管用
// → 需要动态递增确保后来者在上
```

### Vue Transition 的层级问题

```html
<Transition name="fade">
  <div v-if="show" class="modal" style="position: fixed; z-index: 1000;">
    <!-- 动画期间，opacity 从小到大 -->
    <!-- opacity < 1 → 创建层叠上下文 → z-index 1000 可能被"重置" -->
    <!-- 过渡完成后 opacity = 1 → 层叠上下文消失 → z-index 恢复 -->
  </div>
</Transition>

<!-- 解决方案：给 Transition 包一层 -->
<div style="position: relative; z-index: 1000;">
  <Transition name="fade">
    <div v-if="show" class="modal">
      <!-- 不需要 position + z-index，父级已经控制层级 -->
    </div>
  </Transition>
</div>
```

## 经典面试题

### 题1

```html
<div style="position: relative; z-index: 1;">A</div>
<div style="position: relative;">B</div>
<div style="position: relative; z-index: 0;">C</div>
<!-- 谁在上面？→ A（z-index 1 > 0 = auto = 0） -->
<!-- C 的 z-index: 0 创建层叠上下文但数值为 0，比 A 小 -->
```

### 题2

```html
<div class="parent" style="opacity: 0.5;">
  <div class="child" style="position: absolute; z-index: 99999;">
    我能盖住页面顶部的 fixed navbar 吗？
    <!-- 不能！parent 的 opacity < 1 创建层叠上下文 -->
    <!-- child 的 z-index 只在此上下文中有效 -->
  </div>
</div>
```