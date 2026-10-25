# 校园优选公共接口文档

本文面向小程序、前端及接口联调人员，依据当前控制器、校验规则、业务服务和网关源码编写。公共接口指通过网关提供给客户端的业务 API，包含匿名、登录用户和管理员接口；不包含服务间内部接口。本文是源码契约整理，不代表已完成运行联调。

## 1. 通用约定

- 本地网关：`http://localhost:8080`。真机使用可访问的电脑局域网地址，正式环境使用实际部署域名。
- 请求体使用 JSON：`Content-Type: application/json`。
- 标记“登录”的接口使用 `Authorization: Bearer <token>`；标记“管理员”的接口要求 token 对应 `ADMIN` 角色。
- 注册、账号登录、微信登录返回随机会话 token（不是 JWT），有效期 `7200` 秒。退出后当前 token 失效；没有刷新 token 接口。
- 业务成功响应直接返回对象或数组，没有统一的 `code/data` 包装；当前控制器成功默认返回 HTTP `200`，创建和删除也如此。
- 金额以元为单位，JSON 数值，最多两位小数。价格和订单金额由服务端计算。
- 示例 ID、时间、余额和 token 仅为展示，不保证可直接用于当前数据库。
- 客户端不得通过 `X-User-Id`、`X-User-Role` 或 `TX_XID` 自报身份或事务上下文；网关会移除这些头。

### 1.1 分页

所有分页 `page` 默认 `1`，取值 `1..1000000`。仅商品列表支持 `size`。

| 列表 | 每页条数 | 返回结构 |
|---|---|---|
| 商品/管理员商品 | `size` 默认 12，范围 1..100 | `{items,total,page,size}` |
| 用户订单/管理员订单 | 固定 20 | 订单数组，无 total |
| 管理员用户、钱包流水、通知 | 固定 50 | 数组，无 total |
| 分类、地址、购物车 | 不分页 | 数组 |

### 1.2 错误响应

业务异常通常返回：

```json
{"message":"余额不足"}
```

| HTTP 状态 | 含义与常见原因 |
|---|---|
| 400 | 参数校验失败、重复商品行、非法分类或状态 |
| 401 | 缺少 token、token 失效、账号登录失败 |
| 403 | 非管理员访问管理接口，或业务层拒绝访问 |
| 404 | 资源不存在、不属于当前用户、商品下架 |
| 409 | 库存/余额不足、订单状态冲突、请求号参数不匹配 |
| 429 | 请求触发限流 |
| 503 | 身份服务或微信登录等依赖不可用 |

网关拒绝请求时使用通用消息 `请求未授权或身份服务不可用`，需结合 HTTP 状态判断。网关将身份校验服务的 4xx 转为 401，因此停用用户访问受保护接口时可能收到 401。框架或代理产生的其他错误不保证使用相同 JSON 结构，客户端需兼容。

## 2. 响应模型

字段名称按当前实现保留：商品和订单主对象为驼峰，订单明细、流水和通知含下划线字段。

### 2.1 用户 User 与登录凭证 Credentials

```json
{
  "token":"<登录返回的会话令牌>",
  "expiresIn":7200,
  "user":{
    "id":1,"userId":"1","username":"student01","nickname":"同学",
    "role":"STUDENT","balance":0.00,"enabled":true
  }
}
```

`User` 即其中的 `user` 对象；`id` 是数值，`userId` 是字符串；角色为 `STUDENT` 或 `ADMIN`。注册用户初始余额为 0。

### 2.2 分类 Category 与商品 Product

```json
{"id":1,"name":"水果"}
```

```json
{
  "id":1,"categoryId":1,"name":"苹果","description":"新鲜苹果",
  "price":5.50,"stock":100,"onSale":true
}
```

商品分页对象：

```json
{
  "items":[{"id":1,"categoryId":1,"name":"苹果","description":"新鲜苹果","price":5.50,"stock":100,"onSale":true}],
  "total":1,"page":1,"size":12
}
```

### 2.3 订单 Order

```json
{
  "id":"9edc470d-085e-4387-b93e-e5a04a41e348",
  "userId":1,"status":"PENDING","amount":11.00,
  "recipient":"张同学","phone":"13800000000","address":"一号宿舍自提点",
  "pickupCode":null,
  "createdAt":"2026-10-22T08:00:00",
  "expiresAt":"2026-10-22T08:15:00",
  "items":[{"product_id":1,"product_name":"苹果","price":5.50,"quantity":2}]
}
```

`id` 为字符串订单号；`userId` 为数值；地址与商品明细为下单快照。`pickupCode` 未支付时为 null，支付后为 16 位大写十六进制字符串。订单时间由代码按 UTC 生成，序列化字段不带时区后缀，展示时应按 UTC 解释后转换；其他数据库时间字段的序列化形式应在实际环境联调确认。当前响应不包含支付时间、完成时间或 requestId。

| 状态 | 含义 | 后续操作 |
|---|---|---|
| PENDING | 待支付 | 未超时可支付；可取消；超时自动关单 |
| PAID | 已支付、待提货 | 管理员核销 |
| COMPLETED | 已核销完成 | 无后续状态变更 |
| CANCELLED | 已取消或超时关闭 | 无后续状态变更 |

## 3. 登录与个人资料

| 方法 | 路径 | 权限 | 请求体 | 成功响应 |
|---|---|---|---|---|
| POST | `/api/auth/register` | 匿名 | Register | Credentials |
| POST | `/api/auth/login` | 匿名 | Login | Credentials |
| POST | `/api/auth/wx-login` | 匿名 | `{"code":"wx.login取得的code"}` | Credentials |
| POST | `/api/auth/logout` | 登录 | 无 | `{"success":true}` |
| GET | `/api/users/me` | 登录 | 无 | User |
| PUT | `/api/users/me` | 登录 | `{"nickname":"新昵称"}` | 更新后的 User |
| GET | `/api/users/identity` | 登录 | 无 | User，与 me 相同，主要用于身份校验 |

Register：

```json
{"username":"student01","password":"ExamplePass123!","nickname":"同学"}
```

- `username`：必填，4..32 位英文字母、数字或下划线。
- `password`：必填，8..64 字符。
- `nickname`：非空白，最多 60 字符。修改昵称使用同样约束。
- 用户名已存在返回 409；注册成功直接返回登录凭证。

Login：

```json
{"username":"student01","password":"ExamplePass123!"}
```

两个字段均非空白、最多 64 字符。微信 `code` 非空白、最多 256 字符；微信登录需服务端配置 AppID/Secret，未配置返回 503，无效凭证返回 401。管理员也使用同一个账号登录接口。

## 4. 地址与钱包

以下接口均需要登录，只操作当前用户数据。

| 方法 | 路径 | 请求 | 成功响应 |
|---|---|---|---|
| GET | `/api/users/addresses` | 无 | Address 数组，按 id 倒序 |
| POST | `/api/users/addresses` | AddressInput | `{"id":1}` |
| PUT | `/api/users/addresses/{id}` | AddressInput | `{"id":1}` |
| DELETE | `/api/users/addresses/{id}` | 无 | `{"deleted":1}` |
| GET | `/api/users/wallet` | 无 | `{"balance":100.00}` |
| GET | `/api/users/wallet/ledger` | 查询参数 page | Ledger 数组 |

AddressInput：

```json
{"recipient":"张同学","phone":"13800000000","detail":"一号宿舍自提点"}
```

- `recipient`：非空白，最多 40 字符。
- `phone`：6..20 字符，只允许数字、`+`、空格和 `-`，且不能全为空白。
- `detail`：非空白，最多 250 字符。
- Address 响应包含 `id`、`recipient`、`phone`、`detail`。
- 修改或删除不存在/不属于当前用户的地址返回 404。

Ledger 字段：`request_id`（请求号）、`kind`（CREDIT 充值、DEBIT 扣款、REFUND 退款/取消记录）、`amount`（金额）、`applied`（是否实际执行资金变动）、`created_at`（记录时间）。按时间和请求号倒序；`applied=false` 的退款记录不表示余额增加。

## 5. 商品与购物车

| 方法 | 路径 | 权限 | 请求 | 成功响应 |
|---|---|---|---|---|
| GET | `/api/categories` | 匿名 | 无 | Category 数组 |
| GET | `/api/products` | 匿名 | 商品查询参数 | 商品分页对象，仅上架商品 |
| GET | `/api/products/{id}` | 匿名 | 商品 id | Product，下架或不存在为 404 |
| GET | `/api/cart` | 登录 | 无 | `[{"product":Product,"quantity":2}]` |
| PUT | `/api/cart/{id}` | 登录 | `{"quantity":2}` | `{"productId":1,"quantity":2}` |
| DELETE | `/api/cart` | 登录 | 无 | `{"success":true}` |

商品查询参数：`page`、`size`，可选 `categoryId`，可选 `keyword`（默认空字符串，最多 100 字符，匹配商品名称）。结果按商品 id 倒序。

购物车路径 `{id}` 是商品 ID。`quantity` 范围 0..99，是设置最终数量，不是增加数量；0 删除该商品。正数数量超过当前库存返回 409。购物车不预占库存；下单仍需重新校验。创建订单接口接收显式 items，不会自动读取或清空购物车。

## 6. 订单与通知

以下接口均需要登录，只能访问自己的订单和通知。

| 方法 | 路径 | 请求 | 成功响应 |
|---|---|---|---|
| POST | `/api/orders` | CreateOrder | Order |
| GET | `/api/orders` | page、可选 status | Order 数组 |
| GET | `/api/orders/{id}` | 字符串订单号 | Order |
| POST | `/api/orders/{id}/pay` | 无请求体 | Order |
| POST | `/api/orders/{id}/cancel` | 无请求体 | Order |
| GET | `/api/notices` | page | Notice 数组 |
| POST | `/api/notices/{id}/read` | 无请求体；id 为 event_id | `{"success":true}` |

CreateOrder：

```json
{"requestId":"order_submit_001","addressId":1,"items":[{"productId":1,"quantity":2}]}
```

| 字段 | 类型 | 约束 |
|---|---|---|
| requestId | string | 必填，1..80 位字母、数字、下划线或短横线 |
| addressId | integer | 正整数，必须属于当前用户 |
| items | array | 必填，1..20 项，同一商品不能重复出现 |
| items[].productId | integer | 正整数 |
| items[].quantity | integer | 1..99 |

- 单笔总金额不得超过 100000.00 元。下单保存商品/地址快照并扣减库存。
- 同一用户复用 requestId 且地址、商品及数量一致时返回原订单；商品行顺序不影响一致性判断；参数不同返回 409。
- 默认 15 分钟未支付超时。超时后支付立即拒绝，库存由消息消费或定时扫描关单后释放，不保证到期瞬间释放。
- 支付使用模拟钱包余额。PAID/COMPLETED 重复支付返回当前订单，不重复扣款。
- 仅 PENDING 可以取消；CANCELLED 重复取消返回当前订单。已支付取消、售后退款不提供公共接口。
- status 可选 PENDING、PAID、COMPLETED、CANCELLED；省略或空白不筛选。列表按创建时间、订单 id 倒序。

Notice 字段：`event_id`、`order_id`、`message`、`read_flag`、`created_at`。通知按时间和事件 ID 倒序；支付通知异步生成，支付响应成功后可能暂时查不到。标记非本人/不存在的通知返回 404。

## 7. 管理员接口

本节全部要求 ADMIN token。普通用户访问返回 403。

### 7.1 用户与模拟充值

| 方法 | 路径 | 请求 | 成功响应 |
|---|---|---|---|
| GET | `/api/admin/users` | page | User 数组，按 id 升序 |
| PUT | `/api/admin/users/{id}/enabled` | `{"enabled":false}`，布尔值必填 | 更新后的 User |
| POST | `/api/admin/wallet/recharge` | Recharge | `{"balance":100.00,"applied":true}` |

不能通过 enabled 接口操作自己的账号，返回 409。

```json
{"requestId":"recharge_001","userId":1,"amount":100.00}
```

Recharge 中 requestId 规则与下单相同；userId 为正整数；amount 必填，0.01..100000.00，最多两位小数。同一充值请求号及相同用户/金额不会重复入账；变更参数返回 409。响应 balance 为处理时的当前余额，不保证与首次响应相同。该接口仅模拟资金充值。

### 7.2 商品、分类与补货

| 方法 | 路径 | 请求 | 成功响应 |
|---|---|---|---|
| GET | `/api/admin/products` | 与公开商品列表相同 | 商品分页对象，包含下架商品 |
| POST | `/api/admin/products` | NewProduct | Product |
| PUT | `/api/admin/products/{id}` | ProductInput | Product |
| POST | `/api/admin/categories` | `{"name":"水果"}` | Category |
| PUT | `/api/admin/categories/{id}` | `{"name":"新分类名"}` | Category |
| DELETE | `/api/admin/categories/{id}` | 无 | `{"deleted":1}` |
| POST | `/api/admin/stock/add` | StockInput | `{"requestId":"stock_001","stock":120,"state":"ADDED"}` |

NewProduct：

```json
{"categoryId":1,"name":"苹果","description":"新鲜苹果","price":5.50,"stock":100,"onSale":true}
```

| 字段 | 约束 |
|---|---|
| categoryId | 必填、正整数，分类必须存在 |
| name | 非空白，最多 100 字符 |
| description | 必填，可为空字符串，最多 1000 字符 |
| price | 必填，0.01..99999999.99，最多两位小数 |
| stock | 创建时非负整数；省略时当前实现取 0 |
| onSale | 必填布尔值 |

ProductInput 为上述字段除 stock 外的全部字段；PUT 为完整更新这些字段，不是局部更新。库存只能通过补货接口调整；下架通过 `onSale=false`，不提供商品物理删除接口。分类 name 非空白且最多 40 字符；被商品引用的分类不能删除。

StockInput：

```json
{"requestId":"stock_001","productId":1,"quantity":20}
```

requestId 规则与下单相同，productId 为正整数，quantity 为 1..1000000。同号、同商品和数量重复请求不重复补货；参数或操作类型冲突返回 409。stock 返回当前库存。

### 7.3 订单与提货核销

| 方法 | 路径 | 请求 | 成功响应 |
|---|---|---|---|
| GET | `/api/admin/orders` | page、可选 status，规则同用户订单 | 所有用户的 Order 数组 |
| POST | `/api/admin/orders/redeem` | `{"pickupCode":"0123456789ABCDEF"}` | Order |

pickupCode 必填，严格为 16 位大写十六进制字符（0..9、A..F）。有效已支付订单核销后变为 COMPLETED；重复核销已完成订单返回当前订单；提货码不存在返回 404，订单状态不可核销返回 409。

## 8. 联调顺序与示例

1. 注册或登录，保存 Credentials.token。
2. 查询分类与商品；创建地址，保存地址 id。
3. 管理员登录后按实际用户 id 模拟充值。
4. 创建订单，保存订单 id；网络失败重试时保留原 requestId 和请求参数。
5. 调用支付，查看 pickupCode 和通知。
6. 管理员使用 pickupCode 核销，用户再次查询订单确认 COMPLETED。
7. 另建待支付订单验证取消与库存恢复。

PowerShell 示例（后端启动后执行；会创建账号）：

```powershell
$baseUrl = 'http://localhost:8080'
$registerBody = @{
    username = 'student01'
    password = 'ExamplePass123!'
    nickname = '同学'
} | ConvertTo-Json
$credentials = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/auth/register" -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($registerBody))
$headers = @{ Authorization = "Bearer $($credentials.token)" }
Invoke-RestMethod -Uri "$baseUrl/api/users/me" -Headers $headers
Invoke-RestMethod -Uri "$baseUrl/api/products?page=1&size=12"
```

账号已存在时改用 `/api/auth/login`，请求体只需 username/password。完整业务验收脚本见 [Smoke-Test.ps1](../tools/Smoke-Test.ps1)。

## 9. 边界与相关资料

- `/api/internal/**` 不是客户端接口，禁止通过客户端使用内部令牌；接口不会通过网关公开，正常匹配到网关过滤器时被拒绝为 404。
- 管理接口属于业务 API；Spring Boot Admin 监控站点是独立服务，不使用本业务登录 token。
- 本文未增加新接口或修改实现；生产中间件、微信登录与完整业务链路仍需实际环境验收。
- [后端 API 概览及内部调用说明](API.md)
- [OpenAPI 文件](openapi.yml)
- [已有验收记录](BACKEND-VERIFICATION.md)

维护时应以 Controller、请求 DTO、Service 返回对象、网关权限规则为准同步更新本文。现有 OpenAPI 文件单独维护，本文不代表其所有字段已经同步。
