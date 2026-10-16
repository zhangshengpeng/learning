# 组件系统 & easycom

## 组件分类

uni-app 中有四类组件：

```
┌────────────────────────────────────────────┐
│            uni-app 组件体系                  │
│                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 基础组件  │  │ 扩展组件  │  │ 自定义组件│ │
│  │ view     │  │ uni-ui   │  │ .vue     │ │
│  │ text     │  │ uni-*    │  │ 业务组件  │ │
│  │ image    │  │          │  │          │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │         小程序原生组件                  │  │
│  │   wxcomponents/ (微信原生组件)         │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

## easycom 自动引入

**easycom 是 uni-app 的组件自动引入机制**，满足条件即可免写 import 和 components 注册。

### 规则

```json
// pages.json
{
  "easycom": {
    "autoscan": true,  // 是否自动扫描 components 目录
    "custom": {
      "^u-(.*)": "@/components/u-$1/u-$1.vue",   // uView
      "^uni-(.*)": "@dcloudio/uni-ui/lib/uni-$1/uni-$1.vue"  // uni-ui
    }
  }
}
```

### 默认规则

```
传统写法（每处都写）:
import MyComp from '@/components/MyComp.vue'
export default {
  components: { MyComp }
}

easycom 写法（零配置）:
<!-- 直接使用，自动查找 components/MyComp/MyComp.vue -->
<MyComp />

<!-- 或 -->
<my-comp />
```

**扫描路径**：
- `components/` 目录
- `uni_modules/` 目录（符合 components/组件名/组件名.vue 结构）

### 目录结构要求

```
components/
├── my-button/
│   └── my-button.vue      ← 文件名 = 目录名
├── user-card/
│   └── user-card.vue      ← easycom 生效
├── utils.js               ← 不是 .vue，忽略
└── header.vue             ← 不在同名目录中，不生效（除非 custom 规则）
```

## uni-ui 组件库

DCloud 官方组件库，符合 easycom 规范，按需引入：

```bash
npm install @dcloudio/uni-ui
```

```html
<!-- 无需 import，直接用 -->
<template>
  <uni-list>
    <uni-list-item title="列表项" note="备注信息" />
    <uni-list-item title="列表项2" :show-badge="true" badge-text="12" />
  </uni-list>

  <uni-forms :model="form" ref="formRef">
    <uni-forms-item label="姓名" name="name">
      <uni-easyinput v-model="form.name" placeholder="请输入" />
    </uni-forms-item>
  </uni-forms>

  <!-- 弹出层 -->
  <uni-popup ref="popup" type="bottom">
    <view class="popup-content">底部弹出内容</view>
  </uni-popup>
</template>
```

### 常用组件

| 组件 | 用途 | 引入方式 |
|:--|:--|:--|
| `uni-list/uni-list-item` | 列表 | easycom 自动 |
| `uni-card` | 卡片 | easycom |
| `uni-forms` | 表单校验 | 需 ref 操作 |
| `uni-easyinput` | 增强输入框 | easycom |
| `uni-popup` | 弹出层 | 需 ref 控制 |
| `uni-load-more` | 加载更多 | easycom |
| `uni-icons` | 图标 | easycom |
| `uni-badge` | 角标 | easycom |
| `uni-nav-bar` | 自定义导航栏 | easycom |

## 插槽 slot 的跨端限制

| 功能 | H5 | App | 小程序 |
|:--|:--:|:--:|:--:|
| 默认插槽 | ✅ | ✅ | ✅ |
| 具名插槽 | ✅ | ✅ | ✅ |
| 作用域插槽 | ✅ | ✅ | ⚠️ 部分支持 |
| 动态插槽名 | ✅ | ✅ | ❌ |

```html
<!-- ✅ 具名插槽（全平台） -->
<uni-card>
  <template #title>自定义标题</template>
  <template #default>默认内容</template>
</uni-card>

<!-- ❌ 动态插槽名（小程序不支持） -->
<template #[slotName]>内容</template>
```

## 组件通信

### 标准方式（全平台）

```html
<!-- 父传子：props -->
<child-comp :data="parentData" @change="onChange" />
```

```js
// 子组件
export default {
  props: {
    data: { type: Object, default: () => ({}) }
  },
  methods: {
    trigger() {
      this.$emit('change', { value: 'new' })
    }
  }
}
```

### $refs（跨端差异）

```js
// 获取组件实例
this.$refs.childRef.methodName()

// 注意：小程序中 $refs 可能不稳定
// 推荐使用事件通信代替直接调用子组件方法
```

### provide / inject

```js
// 祖先组件
export default {
  provide() {
    return { theme: this.theme }
  }
}

// 任意后代
export default {
  inject: ['theme'],
  mounted() {
    console.log(this.theme) // 响应式！
  }
}
```

> provide/inject 在 uni-app 全平台支持，但小程序中对象引用可能丢失响应式，推荐用基本类型。

## 小程序原生组件

```json
// pages.json
{
  "mp-weixin": {
    "usingComponents": {
      "van-button": "/wxcomponents/vant/button/index"
    }
  }
}
```

```html
<!-- 使用微信小程序原生组件 -->
<van-button type="primary">原生按钮</van-button>
```

限制：原生组件的层级最高，无法被普通元素覆盖。需要用 `<cover-view>` 覆盖。

## 最佳实践

1. **组件目录结构**：统一用 `components/组件名/组件名.vue`，自动享受 easycom
2. **props 校验必写**：type/default 都写上，避免小程序下 props 为 undefined 时报错
3. **避免 $refs 调用方法**：用 `$emit` 事件通信代替，各平台兼容更好
4. **自定义组件用 class 选择器**：不要用标签选择器，小程序会有样式隔离问题
5. **`:style` 动态样式慎用**：小程序对 :style 支持有限，复杂动态样式用 class 切换