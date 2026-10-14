# HTTP 状态码 & REST

## 常见状态码

### 2xx：成功

```yaml
200 OK: 请求成功（GET 返回资源、POST 返回处理结果）

201 Created: 资源创建成功（POST 新建资源后常用）

204 No Content: 请求成功但无内容返回（DELETE 后常用）
```

### 3xx：重定向

```yaml
301 Moved Permanently: 永久重定向
  → 浏览器缓存重定向信息，下次直接跳新地址
  → SEO 权重转移到新地址
  → 场景：HTTP → HTTPS 迁移

302 Found: 临时重定向
  → 浏览器不缓存，每次都问服务器
  → 场景：临时维护页面

304 Not Modified: 资源未修改
  → 配合协商缓存使用
  → 从本地缓存读取，节省带宽

307 Temporary Redirect: 临时重定向（保持请求方法和 Body）
  与 302 的区别：302 可能把 POST 重定向为 GET，307 强制保持原方法

308 Permanent Redirect: 永久重定向（保持请求方法和 Body）
```

### 4xx：客户端错误

```yaml
400 Bad Request: 请求格式错误（参数校验失败、JSON 解析失败）

401 Unauthorized: 未认证 → 需要登录
  → 前端收到 401 → 跳转登录页
  → 注意区分 403：401"你是谁？"403"我知道你是谁，但你没权限"

403 Forbidden: 已认证但无权限
  → 普通用户访问管理员页面

404 Not Found: 资源不存在
  → 接口路径错误、ID 不存在

405 Method Not Allowed: 请求方法不对（POST 接口用了 GET）

408 Request Timeout: 请求超时（客户端发送太慢）

429 Too Many Requests: 请求频率太高 → 触发限流
  → 前端应做节流/防抖 + 展示友好提示
```

### 5xx：服务端错误

```yaml
500 Internal Server Error: 服务器内部错误
  → 代码抛异常未处理
  → 前端：展示"系统繁忙，请稍后再试"

502 Bad Gateway: 网关错误
  → Nginx 转发到后端，后端挂了或未启动
  → 前端：同上提示 + 通知运维

503 Service Unavailable: 服务暂时不可用
  → 服务器在重启/维护
  → Retry-After 头告知何时恢复

504 Gateway Timeout: 网关超时
  → Nginx 等了很久后端没响应
  → 可能是慢 SQL、死锁
```

## 301 vs 302 vs 307 vs 308

| | 永久/临时 | 保持方法| 浏览器缓存 |
|:--|:--|:--|:--|
| 301 | 永久 | 可能改成 GET | ✅ |
| 302 | 临时 | 可能改成 GET | ❌ |
| 307 | 临时 | 保持原方法 | ❌ |
| 308 | 永久 | 保持原方法 | ✅ |

> 表单 POST 重定向建议用 307（保持 POST），而非 302（可能变 GET）

---

## RESTful API 设计

### URL 设计

```yaml
资源名用复数名词：
  GET    /api/users          # 获取用户列表
  GET    /api/users/123      # 获取指定用户
  POST   /api/users          # 创建用户
  PUT    /api/users/123      # 替换/更新用户
  PATCH  /api/users/123      # 部分更新用户
  DELETE /api/users/123      # 删除用户

子资源：
  GET    /api/users/123/posts  # 获取该用户的文章

过滤、排序、分页用 Query 参数：
  GET /api/users?role=admin&page=1&size=20&sort=-createdAt
```

### 响应格式

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "name": "Alice"
  },
  "message": "success"
}

// 分页
{
  "code": 200,
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "size": 20
  },
  "message": "success"
}

// 错误
{
  "code": 400,
  "data": null,
  "message": "参数校验失败: name 不能为空"
}
```

### RESTful vs GraphQL

```yaml
RESTful:
  → 以资源为中心
  → 每个资源一个 endpoint
  → 可能过度获取（查用户列表返回了所有字段）
  → 可能获取不足（需要多次请求关联数据）

GraphQL:
  → 以查询为中心
  → 单一 endpoint + 声明式查询
  → 客户端决定要哪些字段
  → 适合复杂数据模型和多个前端客户端

选择：
  - 后台管理系统 → RESTful 足够
  - 多端产品（Web + App + 小程序）→ GraphQL 值得考虑
  - 简单 CRUD → RESTful 更简单
```