# 渲染性能 & 图片优化

## 渲染性能

### 虚拟列表

```html
<!-- 10000 条数据 → 全量渲染卡死 -->
<!-- 虚拟列表 → 只渲染可视区域的 10~20 条 -->

<VirtualList :items="list" :item-height="50">
  <template #default="{ item }">
    <div>{{ item.name }}</div>
  </template>
</VirtualList>
```

**原理**：

```
总高度 = 数据量 × 单项高度 = 10000 × 50 = 500000px

容器高度 = 500px（可见 10 条）
滚动偏移 = scrollTop

可见区域起始 index = scrollTop / 50 = 第 n 个开始
可见区域结束 index = (scrollTop + 500) / 50 = 第 m 个结束

只渲染 items[n] ~ items[m]
顶部空白 height = n × 50px
底部空白 height = (10000 - m) × 50px
```

### Vue 专项优化

```html
<!-- v-once：基于数据不变时 -->
<span v-once>{{ expensiveFormat(data) }}</span>

<!-- v-memo：依赖不变就不重渲染 (Vue 3.2+) -->
<div v-for="item in list" :key="item.id" v-memo="[item.selected]">
  <!-- 只有 item.selected 变化时才重新渲染 -->
</div>

<!-- shallowRef：大对象轻量响应式 -->
const bigList = shallowRef(fetchBigList())
// 只有 .value 整体替换才触发更新
```

### 防抖节流

```js
// 搜索输入 → 防抖
const search = debounce(handleSearch, 300)

// 滚动监听 → 节流
const onScroll = throttle(handleScroll, 200)
```

### CSS 动画性能

```css
/* ❌ 触发重排 */
.animate { transition: left 0.3s; }

/* ✅ 只触发合成（GPU 加速） */
.animate { transition: transform 0.3s, opacity 0.3s; }
```

---

## 图片优化

### 格式选择

| 格式 | 压缩 | 透明 | 动画 | 适用 |
|:----|:----|:----|:----|:----|
| JPEG | 有损 | ❌ | ❌ | 照片 |
| PNG | 无损 | ✅ | ❌ | Logo、图标 |
| WebP | 有损/无损 | ✅ | ✅ | 现代浏览器首选 |
| AVIF | 有损/无损 | ✅ | ✅ | 压缩率最高 |
| SVG | 矢量 | ✅ | ✅ | 图标、简单图形 |

### 响应式图片

```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="" loading="lazy">
</picture>

<!-- 按屏幕宽度加载不同尺寸 -->
<img
  src="hero-800.jpg"
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1200.jpg 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 900px) 800px, 1200px"
  alt=""
>
```

### 懒加载

```html
<!-- Native Lazy Loading -->
<img src="image.jpg" loading="lazy" alt="">

<!-- IntersectionObserver 方式（更灵活控制） -->
<script setup>
import { ref, onMounted } from 'vue'

const imgRef = ref(null)

onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target
        img.src = img.dataset.src
        observer.unobserve(img)
      }
    })
  })
  observer.observe(imgRef.value)
})
</script>
<template>
  <img ref="imgRef" data-src="image.jpg" alt="">
</template>
```

### 渐进式加载

```html
<!-- 先显示低质量占位图，再加载高清 -->
<img
  src="placeholder-20px.jpg"
  data-src="full-800px.jpg"
  class="progressive"
>

<style>
.progressive {
  filter: blur(20px);
  transition: filter 0.3s;
}
.progressive.loaded {
  filter: blur(0);
}
</style>
```

### CDN 图片处理

```js
// 七牛/OSS 通过 URL 参数裁剪压缩
const imageUrl = `https://cdn.example.com/photo.jpg?imageView2/1/w/400/h/300/format/webp`
// 自动按宽度裁剪 + WebP 格式
```

### 雪碧图/Icon Font/SVG Sprite

```css
/* 雪碧图 */
.icon { background: url('sprite.png') no-repeat; }
.icon-home { background-position: 0 0; }

/* SVG Sprite（推荐） */
<!-- 定义 -->
<svg><symbol id="icon-home"><path d="..."/></symbol></svg>
<!-- 使用 -->
<svg><use href="#icon-home"/></svg>
```