# CSS 工程化

> Vue 的 Scoped CSS、CSS Modules、`:deep()` 都是 CSS 工程化的解决方案。

## Scoped CSS 原理

### Vue 2 Scoped

```html
<template>
  <div class="box">Hello</div>
</template>
<style scoped>
.box { color: red; }
</style>
```

编译后：

```html
<div class="box" data-v-7ba5bd90>Hello</div>

<style>
.box[data-v-7ba5bd90] { color: red; }
</style>
```

**Vue 给元素加唯一属性，CSS 选择器加上属性选择器** → 样式隔离。

### Vue 3 Scoped 的改进

```html
<style scoped>
.box { color: red; }
</style>
```

编译后：

```html
<div class="box" data-v-xxxxxx>Hello</div>

<style>
.box[data-v-xxxxxx] { color: red; }
/* Vue 3 还额外加了这个（配合 context） */
.box[data-v-xxxxxx] { color: red; }
</style>
```

### 深度选择器

```html
<style scoped>
/* 需要修改子组件的样式 → :deep() */

/* Vue 2：>>> 或 /deep/ */
.parent >>> .child { color: red; }

/* Vue 3：:deep() */
.parent :deep(.child) { color: red; }

/* 编译后：.parent[data-v-xxx] .child { color: red; } */
/* 属性选择器只加在 .parent 上，.child 不加 */
</style>
```

### 插槽选择器

```html
<!-- 父组件 -->
<Child>
  <p class="slot-content">Slotted</p>
</Child>

<!-- Child 组件 -->
<style scoped>
:slotted(.slot-content) { color: blue; }
/* 选择被插入到 <slot> 中的内容 */
</style>
```

### 全局选择器

```html
<style scoped>
:global(.global-class) { color: red; }
/* 覆盖第三方组件样式 */
:global(.el-button) { border-radius: 4px; }
</style>
```

## CSS Modules

### 基本用法

```html
<template>
  <div :class="$style.box">Hello</div>
</template>

<style module>
.box { color: red; }
.title { font-size: 20px; }
</style>
```

编译后：

```html
<div class="_box_1abc2_3">Hello</div>

<style>
._box_1abc2_3 { color: red; }
</style>
```

**通过 JS 对象引用类名**，天然类型安全。

### Vue 3 中的 CSS Modules

```html
<template>
  <!-- 方式1：$style -->
  <div :class="$style.box">Hello</div>
  
  <!-- 方式2：自定义名称 -->
  <div :class="styles.box">Hello</div>
</template>

<style module="styles">
.box { color: red; }
</style>

<script setup>
// 可以用 JS 逻辑操作
const isActive = ref(false)
</script>

<template>
  <div :class="[$style.box, isActive && $style.active]">
    Hello
  </div>
</template>

<style module>
.box { color: red; }
.active { color: blue; }
</style>
```

## CSS in JS / Atomic CSS

### CSS in JS（不推荐与 Vue 混用）

```js
// Emotion/Styled-Components 方式
const Button = styled.button`
  color: red;
  padding: 8px 16px;
`
// Vue 中一般不用，因为 Vue 有 Scoped CSS 和 CSS Modules
```

### Atomic CSS（Tailwind / UnoCSS）

```html
<template>
  <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    Click me
  </button>
</template>

<!-- 每个 class 只做一件事（原子化） -->
<!-- px-4 = padding-left: 1rem; padding-right: 1rem -->
<!-- bg-blue-500 = background-color: #3b82f6 -->
```

**优点 vs 缺点**：

| 优点 | 缺点 |
|:----|:----|
| 不写 CSS 文件 | HTML 臃肿 |
| 无命名冲突 | 学习成本 |
| 按需生成（UnoCSS 扫描） | 团队接受度 |
| 统一的视觉系统 | 复杂组件仍有传统 CSS 需求 |

### UnoCSS（Vue 项目推荐）

```js
// uno.config.ts
import { defineConfig } from 'unocss'

export default defineConfig({
  shortcuts: {
    'btn': 'px-4 py-2 rounded',
    'btn-primary': 'btn bg-blue-500 text-white',
  },
  rules: [
    // 自定义原子规则
    ['m-safe', { margin: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }]
  ]
})
```

## CSS 变量

```css
:root {
  --primary-color: #1677ff;
  --border-radius: 6px;
}

.button {
  color: var(--primary-color);
  border-radius: var(--border-radius);
}

/* 支持默认值 */
.other {
  color: var(--other-color, #999);
}
```

### 在 Vue 中动态修改 CSS 变量

```html
<template>
  <div :style="{ '--primary-color': themeColor }">
    <p>动态主题</p>
  </div>
</template>

<script setup>
const themeColor = ref('#1677ff')
</script>
```

### JS 读写 CSS 变量

```js
// 读
getComputedStyle(document.documentElement).getPropertyValue('--primary-color')

// 写
document.documentElement.style.setProperty('--primary-color', '#ff0000')
```

## PostCSS & Autoprefixer

```css
/* 写 */
.box {
  display: flex;
  user-select: none;
}

/* 自动加前缀 */
.box {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
```

## 在 Vue 项目中的最佳实践

```html
<!-- 组件样式：使用 Scoped -->
<style scoped>
.my-component { ... }
</style>

<!-- 全局样式（变量、reset、utility）：使用普通 style -->
<style>
:root { --primary: #1677ff; }
</style>

<!-- 需要 JS 控制：使用 CSS Modules -->
<template>
  <div :class="$style.box">Hello</div>
</template>
<style module>
.box { color: var(--primary); }
</style>
```