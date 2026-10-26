# Campus Premium Selection Platform

校园优选：校园团购与自提平台。

面向校园团购与自提的全栈项目，包含用户、商品、订单三个业务服务、统一网关、Spring Boot Admin监控和微信小程序客户端。支付为余额模拟支付，不对接真实微信支付。小程序已覆盖商品浏览、登录注册、购物车、订单和管理台。

## 项目入口

| 工程 | 目录 | 端口 | 职责 |
|---|---|---|---|
| product-service | 根目录 | 8082 | 商品、分类、库存、购物车 |
| user-service | backend/user-service | 8081 | 登录、权限、个人信息、地址、余额流水 |
| order-service | backend/order-service | 8083 | 下单、支付、取消、超时、核销、通知 |
| gateway | backend/gateway | 8080 | 统一路由、身份校验、拦截内部接口 |
| admin-server | backend/admin-server | 8090 | Spring Boot Admin，HTTP Basic保护 |

聚合构建入口：backend/pom.xml。Java 17、Spring Boot 3.2.4、Spring Cloud 2023.0.1、Alibaba 2023.0.1.0。权限框架采用Spring Security，密码BCrypt，会话令牌在数据库只保存SHA-256摘要，有效期2小时。商品服务使用MyBatis-Plus；用户/订单使用参数化JdbcTemplate。日志采用SLF4J/Logback。

## 获取项目与环境要求

需要JDK 17、Maven 3.9+。完整部署需要Docker及Compose V2，首次构建需要下载Maven依赖和容器镜像。

```shell
git clone https://github.com/riversky1231/-Campus-Premium-Selection-Platform.git
cd ./-Campus-Premium-Selection-Platform
```

```text
backend/       聚合工程及用户、订单、网关、监控服务
src/           商品服务源码与正式测试
database/      MySQL初始化与说明
deploy/        Nacos与Seata配置
miniprogram/   微信小程序商品页面
tools/         环境生成、启动、停止、业务验收脚本
docs/          API、OpenAPI和验证说明
compose.yml    完整部署入口
```

## 本机演示

在项目目录打开PowerShell：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/Start-Backend.ps1
```

脚本先执行整个后端的Maven构建和测试，再后台启动4个业务进程。首次下载依赖需要网络。日志和PID记录在backend-run；不会结束已占用端口的其他进程。默认H2内存数据库、内存购物车、本地通知与关单扫描，不需要先安装MySQL/Redis/RabbitMQ。

演示账号：student / StudentDemo123!（余额500元），admin / AdminDemo123!。正常注册用户初始余额为0，可由管理员通过模拟充值接口增加。仅demo模式有示例账号；重启会清空内存数据。

等待4个服务日志显示启动完成，执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/Smoke-Test.ps1
```

验收脚本通过网关完成注册、充值、地址、商品、购物车、下单、重复支付、提货核销、取消恢复库存、退出；它会创建并保留专用验收数据。

停止由脚本启动的进程：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/Stop-Backend.ps1
```

原商品独立测试入口仍保留：`mvn test`。整个后端测试：`mvn -f backend/pom.xml test`。监控客户端按需启用`-Pmonitor`，商品Seata客户端按需`-Pseata`。

## Docker / MySQL 8 完整部署

首次部署执行 `tools/New-Environment.ps1` 生成随机凭证 `.env`，或复制 `.env.example` 并设置全部占位项。MARKET_ADMIN_PASSWORD是首次生产启动创建admin的密码。不要把.env提交或发给别人。

Docker Desktop引擎正常后执行：

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs --tail 100 user product order gateway
```

其他机器首次部署，执行`tools/New-Environment.ps1`生成.env；脚本不会覆盖已有文件。

网关 http://localhost:8080，监控 http://localhost:8090（monitor账户，密码见.env）。仅网关和本机监控映射端口；MySQL、Redis、RabbitMQ、Nacos和Seata位于内部网络。Nacos初始化容器会把默认账户密码改为.env中的随机值，随后才启动业务服务。若更换已有Nacos的数据卷配置，应先确认已有密码。

MySQL启动时自动执行database/init.sql，创建三个数据库、业务表、索引、undo_log、商品示例数据和campus账户授权。用户服务首次启动创建管理员。使用新的mysql-full-data命名卷，保留旧商品版mysql-data卷；不要为了重建结构直接删除旧卷。

数据库初始化仅空卷执行。后续修改SQL需要迁移，不能认为重启会自动更新现有表。

Docker构建启用Seata和监控客户端；生产下单、支付、取消由TradingFacade发起AT全局事务，Feign转发TX_XID，三个服务各有undo_log。超时订单通过RabbitMQ延迟/死信队列关单，同时有30秒数据库扫描补偿。支付通知采用数据库outbox、发布确认、持久消息及事件ID幂等消费；失败消息进入campus.failed。

容器内的 app 用户没有可写 home，Nacos 客户端默认把服务发现缓存写到 `$HOME`，会导致 order-service 调用 user-service 时返回 503。`backend/Dockerfile` 已通过 `JAVA_TOOL_OPTIONS=-DJM.SNAPSHOT.PATH=/tmp` 将缓存放到可写目录；自定义镜像或直接运行 jar 时需保留等价配置。

## 接口和数据库

- [公共接口文档](docs/PUBLIC-API.md)：面向客户端的鉴权、参数、响应模型、分页与联调示例。
- [API文档](docs/API.md)：路由、请求、权限和状态。
- [OpenAPI文件](docs/openapi.yml)：可导入支持OpenAPI的接口工具。
- [数据库说明](database/README.md)：三库表结构和初始化。
- [验证记录](docs/BACKEND-VERIFICATION.md)：已通过与未通过的检查。
- [Seata验收](docs/SEATA.md)：全局回滚测试流程。

所有用户API使用`Authorization: Bearer <登录返回的token>`。小程序将网关地址配置在`miniprogram/utils/config.js`，用户与管理员会话分别保存；管理台使用ADMIN账号登录，不再需要手工粘贴token。内部令牌只供服务间调用，不得写入小程序。

微信登录入口POST /api/auth/wx-login，传wx.login得到的code。设置WX_APPID/WX_SECRET后容器启动会转为服务配置；未配置返回503，不伪造微信登录。HTTPS域名和微信合法域名配置需要按实际部署环境设置。

## 小程序端

小程序入口在`miniprogram`，使用微信开发者工具导入。网关地址在`miniprogram/utils/config.js`的`BASE_URL`：本机调试用`http://127.0.0.1:8080`，真机用电脑局域网地址，正式环境用已配置的HTTPS域名；本机调试请在开发者工具「详情-本地设置」勾选“不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书”。

| 页面 | 能力 |
|---|---|
| 首页 | 搜索防抖、分类筛选、下拉刷新、上拉分页、库存/售罄、快捷加购 |
| 详情 | 库存与数量步进、加购、异常重试 |
| 登录/注册 | 表单校验、密码可见、演示账号、登录后回跳 |
| 购物车 | 数量调整/删除、地址增删改、余额提示、幂等下单 |
| 订单 | 状态筛选、支付倒计时、支付/取消、提货码复制 |
| 管理台 | ADMIN登录、商品上下架/补库存、分类管理、提货核销、用户充值/停用 |
| 商品编辑 | 新建/编辑、分类选择、价格库存校验 |

管理接口需要ADMIN角色，演示环境可使用admin演示账号（以实际数据库为准）。请求层统一处理401、超时和错误提示。

## 当前验收状态

商品服务原7项Maven测试通过。用户4项和订单4项测试通过本地缓存依赖运行；核心业务另外12组真实H2/事务/权限检查通过。Compose及所有YAML/XML/PowerShell静态检查通过。

完整聚合构建因新增Seata/OpenFeign/RabbitMQ/Gateway/Admin依赖下载受限，尚未通过；这不等于全套后端已成功运行。Docker/MySQL/Redis/Nacos/RabbitMQ/Seata网络链路与微信授权仍需实际环境验收。demo跨服务使用尽力补偿，不提供进程崩溃后的分布式原子性；生产模式应以Seata故障注入结果验收。

小程序端通过JS语法、JSON解析、WXML标签/插值、WXSS括号静态检查，并用模拟wx层跑通首页、详情、购物车地址、登录和管理台核心流程；尚未在微信开发者工具或真机做视觉与网络验收。

## 配置与常见问题

| 配置 | 用途 |
|---|---|
| MYSQL_PASSWORD / MYSQL_ROOT_PASSWORD | 应用 / 数据库初始化密码 |
| INTERNAL_TOKEN | 内部服务凭证，禁止下发客户端 |
| REDIS_PASSWORD / RABBITMQ_PASSWORD | 缓存 / 消息认证 |
| NACOS_PASSWORD / NACOS_AUTH_TOKEN / NACOS_IDENTITY_VALUE | 注册中心认证 |
| SEATA_PASSWORD / SEATA_SECRET | Seata控制台和签名 |
| MONITOR_PASSWORD | 监控密码 |
| MARKET_ADMIN_PASSWORD | 首次创建admin的密码，至少12位 |
| WX_APPID / WX_SECRET | 微信授权登录配置 |

Linux可复制.env.example为.env并填写强随机值；NACOS_AUTH_TOKEN需为至少32字节随机数据的Base64编码。不要提交真实.env。

Maven下载失败时检查本机网络、代理和settings.xml镜像配置。启动脚本检查8080–8083端口并保留其他应用进程；日志在backend-run。数据库SQL仅在新数据卷初始化时执行，已有数据库需备份后迁移。

微信开发者工具导入miniprogram，在`miniprogram/utils/config.js`设置网关`BASE_URL`；真机使用电脑局域网地址或HTTPS域名，不能使用localhost。小程序已覆盖商品、用户、购物车、订单和管理台；微信登录仍需配置WX_APPID/WX_SECRET。

仓库保留源码、正式测试、SQL、部署配置和文档；构建产物、日志、凭证、IDE私有配置及临时工作记录不提交。
