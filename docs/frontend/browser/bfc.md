# BFC (Block Formatting Context)

> BFC 是关于 CSS 布局的经典面试题。理解 BFC 才能正确处理边距折叠、清除浮动等问题。

## 什么是 BFC？

**BFC = 块级格式化上下文，是页面中一块独立的渲染区域。**

可以把它理解为 CSS 世界的"结界"：内部的布局不会影响外部。

```
正常文档流：
  ┌──────────┐      ┌──────────┐
  │  Box 1   │  ←→  │  Box 2   │   两个盒子共享同一个 BFC
  └──────────┘      └──────────┘   会发生 margin 重叠

BFC 隔离：
  ┌──────────────┐
  │  BFC 容器     │
  │  ┌──────────┐ │     ┌──────────┐
  │  │  Box 1   │ │ ←→  │  Box 2   │   margin 不重叠
  │  └──────────┘ │     └──────────┘
  └──────────────┘
```

## 如何创建 BFC？

```css
/* 以下任一条件都可触发 BFC： */

/* ① overflow 不为 visible */
.bfc { overflow: hidden; }
.bfc { overflow: auto; }
.bfc { overflow: scroll; }

/* ② float 不为 none */
.bfc { float: left; }
.bfc { float: right; }

/* ③ position 为 absolute 或 fixed */
.bfc { position: absolute; }

/* ④ display 为以下值 */
.bfc { display: inline-block; }
.bfc { display: flow-root; }  /* 专门创建 BFC，无副作用 */
.bfc { display: table-cell; }
.bfc { display: flex; }
.bfc { display: grid; }

/* ⑤ contain 属性 */
.bfc { contain: layout; }
.bfc { contain: paint; }
/* ⭐ 现代最佳实践：display: flow-root */
```

## BFC 的特性

### ① 内部垂直 margin 不会溢出

```html
<style>
  .parent {
    background: lightblue;
    /* 没有 BFC：子元素 margin-top 30px 会溢出到父元素上 */
  }
  .parent.bfc {
    overflow: hidden;  /* 创建 BFC */
    /* 有 BFC：子元素 margin-top 被包含在父元素内 */
  }
  .child {
    margin-top: 30px;
  }
</style>
<div class="parent">
  <div class="child">content</div>
</div>
```

### ② 解决 margin 重叠

```html
<style>
  .box { margin: 20px; background: lightcoral; }
</style>

<!-- margin 重叠：两个 20px 间隙不是 40px 而是 20px -->
<div class="box">box1</div>
<div class="box">box2</div>

<!-- 放入 BFC 容器解决 -->
<div class="box">box1</div>
<div style="overflow: hidden;">
  <div class="box">box2</div>  <!-- margin 不重叠了 → 40px -->
</div>
```

### ③ 清除浮动（包含浮动子元素）

```html
<style>
  .float { float: left; width: 100px; height: 100px; }
  /* 父元素没有高度！浮动元素脱离文档流 */
</style>

<div class="parent">
  <div class="float"></div>
</div>

<!-- 解决方案一：overflow: hidden 创建 BFC -->
<div class="parent" style="overflow: hidden;">
  <div class="float"></div>
</div>

<!-- 解决方案二：display: flow-root（现代方式，无副作用） -->
<div class="parent" style="display: flow-root;">
  <div class="float"></div>
</div>
```

### ④ BFC 不会与浮动元素重叠

```html
<!-- 经典两栏布局 -->
<style>
  .aside {
    float: left;
    width: 200px;
    background: lightblue;
  }
  .main {
    overflow: hidden;  /* 创建 BFC */
    /* main 的左边会紧贴 aside，而不是重叠在下面 */
  }
</style>
<div class="aside">侧边栏</div>
<div class="main">主区域</div>
```

## BFC 布局规则总结

```
1. 内部 Box 垂直排列
2. Box 间垂直距离由 margin 决定
3. 同一 BFC 内的 Box 的垂直 margin 会重叠
4. BFC 区域不与 float box 重叠
5. BFC 是一个独立容器，内部不影响外部
6. 计算 BFC 高度时，浮动元素也参与计算（清除浮动）
```

## 在 Vue 中的应用

### Transition 组件与 BFC

```html
<!-- Vue Transition 的 leave-active 阶段 -->
<Transition name="fade">
  <div v-if="show" class="content">
    <!-- leave 动画执行时，内容已从 DOM 移除 -->
    <!-- 但 Vue 会保留元素直到动画结束 -->
    <!-- 这期间下面的元素可能跳动 -->
  </div>
</Transition>

<!-- 解决方案：给 Transition 包一层 BFC -->
<div style="overflow: hidden;">
  <Transition name="fade">
    <div v-if="show">content</div>
  </Transition>
</div>
```

### 列表动画的布局浮动

```html
<!-- Vue 的 TransitionGroup 移动动画 -->
<TransitionGroup name="list" tag="div">
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
</TransitionGroup>

<style>
.list-move {
  transition: transform 0.5s;
}
/* TransitionGroup 用 FLIP 动画，
   基于 transform 完成，不触发布局
   比修改 margin 之类要好得多 */
/* 但要注意内部不能有 float 元素 → BFC 可以隔离 */
</style>
```

## 经典面试题

### 题1：margin 重叠

```html
<div style="margin-bottom: 30px;">A</div>
<div style="margin-top: 50px;">B</div>
<!-- 间距 = max(30, 50) = 50px，不是 80px -->

<!-- 解决 -->
<div style="margin-bottom: 30px;">A</div>
<div style="display: flow-root;">
  <div style="margin-top: 50px;">B</div>  <!-- 现在间距 = 80px -->
</div>
```

### 题2：清除浮动的多种方式

```css
/* ① BFC */
.parent { overflow: hidden; }

/* ② clearfix（经典伪元素方案） */
.parent::after {
  content: '';
  display: block;
  clear: both;
}

/* ③ display: flow-root（现代，推荐） */
.parent { display: flow-root; }

/* ④ 父元素也浮动（不推荐） */
.parent { float: left; }
```