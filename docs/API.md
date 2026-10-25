# 后端API

客户端对接请参阅[公共接口文档](PUBLIC-API.md)，包含参数约束、响应模型、分页、幂等规则和联调示例。本文保留接口概览及服务内部调用说明。

统一入口http://localhost:8080。成功返回直接JSON对象/数组；错误`{"message":"原因"}`。400参数问题、401未登录、403权限不足、404不存在或不属于当前用户、409状态/余额/库存冲突、429限流、503依赖不可用。

用户/管理员都使用登录接口返回token，放在Authorization: Bearer头。管理员使用ADMIN角色。学生不能调用管理接口。请求不得自报userId取得他人身份，订单归属和地址归属在服务端检查。

## 用户与权限

| 方法 | 路径 | 请求 / 返回要点 |
|---|---|---|
| POST | /api/auth/register | username(4..32字母数字下划线)、password(8..64)、nickname(1..60)；返回token/expiresIn/user |
| POST | /api/auth/login | username/password；返回token/expiresIn/user |
| POST | /api/auth/wx-login | code；需配置微信AppID/Secret |
| POST | /api/auth/logout | 撤销当前token |
| GET / PUT | /api/users/me | 查看资料 / 更新nickname |
| GET | /api/users/identity | userId/role等身份资料，供服务端校验 |
| GET / POST | /api/users/addresses | 查询 / 新增recipient、phone、detail；新增返回id |
| PUT / DELETE | /api/users/addresses/{id} | 修改 / 删除当前用户地址 |
| GET | /api/users/wallet | balance |
| GET | /api/users/wallet/ledger?page=1 | 每页50条流水 |
| GET | /api/admin/users?page=1 | 管理员用户列表，每页50条 |
| PUT | /api/admin/users/{id}/enabled | 管理员设置enabled布尔值，不允许操作自己 |
| POST | /api/admin/wallet/recharge | 管理员模拟充值：requestId/userId/amount；同号重复只充值一次 |

正常注册用户余额0；演示学生账号余额500。充值接口仅用于课程模拟账户，不代表真实资金充值。

## 商品和购物车

| 方法 | 路径 | 请求 / 返回要点 |
|---|---|---|
| GET | /api/categories | 公开分类 |
| GET | /api/products | page默认1、size默认12最大100、categoryId、keyword；返回items/total/page/size |
| GET | /api/products/{id} | 公开详情，下架404 |
| GET | /api/admin/products | 同分页接口，包含下架商品 |
| POST | /api/admin/products | categoryId/name/description/price/stock/onSale |
| PUT | /api/admin/products/{id} | 同上但不能传stock，修改库存走独立接口 |
| POST | /api/admin/categories | name |
| PUT / DELETE | /api/admin/categories/{id} | 修改name / 删除未被引用分类 |
| POST | /api/admin/stock/add | requestId/productId/quantity，幂等补货 |
| GET | /api/cart | 当前用户购物车，元素为product和quantity |
| PUT | /api/cart/{id} | quantity=0删除，1..99设置数量 |
| DELETE | /api/cart | 清空当前用户购物车 |

商品采用下架替代物理删除。购物车数量不预占库存，下单时才预占。商品价格以服务端为准。

## 订单和通知

创建订单示例：

```json
{"requestId":"order_submit_001","addressId":1,"items":[{"productId":1,"quantity":2}]}
```

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/orders | 创建待支付订单，保存快照并扣减库存；同号同参数返回原订单 |
| GET | /api/orders?page=1&status=PENDING | 当前用户订单，每页20条；status可省略 |
| GET | /api/orders/{id} | 当前用户订单详情 |
| POST | /api/orders/{id}/pay | 模拟余额支付，重复请求不重复扣款 |
| POST | /api/orders/{id}/cancel | 仅PENDING可取消；恢复库存；重复调用幂等 |
| GET | /api/admin/orders?page=1&status=PAID | 管理员查看所有订单 |
| POST | /api/admin/orders/redeem | pickupCode(16位大写十六进制)，核销后COMPLETED |
| GET | /api/notices?page=1 | 当前用户通知，每页50条 |
| POST | /api/notices/{id}/read | 标记当前用户通知已读 |

默认待支付15分钟超时，ORDER_TIMEOUT_SECONDS可调整。超时后支付立即拒绝，库存由消息/扫描关单释放。PAID和COMPLETED重复支付只返回当前订单。已支付取消/售后退款不在本项目范围。

## 服务内部接口

不能通过网关访问；网关返回404。服务间使用Authorization: Bearer INTERNAL_TOKEN，并由订单服务转发TX_XID。

- GET product-service:8082/api/internal/products/{id}
- POST product-service:8082/api/internal/stock/deduct、/restore：requestId/productId/quantity
- GET user-service:8081/api/internal/users/{uid}/addresses/{id}
- POST user-service:8081/api/internal/wallet/debit、/refund：requestId/userId/amount

补库存请求号与扣减号分开；扣减/恢复使用同一请求号。支付/退款使用订单ID；网络重试复用请求号。禁止把内部令牌写入小程序。
