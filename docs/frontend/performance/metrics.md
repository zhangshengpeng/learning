# 性能指标

> 面试时要能准确说出指标名称、含义、优化策略。

## Core Web Vitals

### ① LCP（Largest Contentful Paint）最大内容绘制

```
定义：视口内最大可见元素（图片/文本块）渲染完成的时间
目标：< 2.5s（Good）

最大元素通常是什么？
  - 首屏大图（Hero Image）
  - 首屏大标题文本块
  - 首屏背景图片

优化：
  - 预加载首屏大图：<link rel="preload" as="image" href="hero.webp">
  - 图片压缩 + WebP
  - 关键 CSS 内联（避免等待 CSS 文件加载）
```

### ② FID（First Input Delay）首次输入延迟

```
定义：用户首次交互到浏览器能响应中间的时间
目标：< 100ms（Good）

浏览器忙着执行长任务（Long Task > 50ms）→ FID 高

优化：
  - 拆分长任务（代码分割）
  - 延迟非关键 JS
  - Web Worker 处理重计算
```

### ③ CLS（Cumulative Layout Shift）累计布局偏移

```
定义：页面生命周期中，所有意外布局偏移分数的总和
目标：< 0.1（Good）

什么造成布局偏移？
  - 无尺寸的图片 → 图片加载后把下面内容挤下去
  - 无尺寸的广告/iframe → 同样的问题
  - 动态注入的内容 → 插入到已渲染内容的上面
  - FOIT/FOUT（字体加载导致文本闪烁）

优化：
  - 图片/视频固定宽高（aspect-ratio）
  - 广告/嵌入内容预留空间
  - 新增内容从底部插入（而非顶部）
  - font-display: swap + 预加载字体
```

## 其他指标

```yaml
FCP（First Contentful Paint）：首次内容绘制
  → 第一个 DOM 内容（文字/图片）渲染的时间
  → 目标：< 1.8s

TTI（Time to Interactive）：可交互时间
  → 页面完全可交互的时间（所有长任务完成）
  → 目标：< 3.8s

TBT（Total Blocking Time）：总阻塞时间
  → FCP 到 TTI 之间所有 Long Task 的阻塞时间之和
  → 目标：< 200ms

Speed Index：速度指数
  → 页面内容可见填充的平均时间
  → 目标：< 3.4s
```

## RUM vs Synthetic

```yaml
Synthetic（合成监控）：
  模拟环境、固定网络/设备 → Lighthouse 评分
  优点：稳定可对比、可 CI 集成
  缺点：不代表真实用户

RUM（Real User Monitoring）：
  真实用户数据 → web-vitals 库采集
  优点：真实场景
  缺点：数据波动大、需要大量样本

两者结合：
  CI 中跑 Lighthouse 保底线
  线上用 web-vitals 看真实分布（P75 值）
```

## 使用 web-vitals

```js
import { onLCP, onFID, onCLS } from 'web-vitals'

onCLS(metric => {
  console.log('CLS:', metric.value)
  // 上报到监控平台
})

onLCP(metric => {
  console.log('LCP:', metric.value)
})

onFID(metric => {
  console.log('FID:', metric.value)
})
```

## Lighthouse CI

```yaml
# CI 中集成 Lighthouse
# .github/workflows/lighthouse.yml
- name: Run Lighthouse
  uses: treosh/lighthouse-ci-action@v10
  with:
    runs: 3    # 跑 3 次取中位数
    configPath: .lighthouserc.json
```