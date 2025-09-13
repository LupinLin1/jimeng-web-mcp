# JiMeng 捕获请求原始数据 - 第二次监控

## 监控概览
- **监控时间:** 2025-09-13 05:18:37 - 05:19:40 UTC (总时长: 63.0秒)
- **总请求数:** 6个
- **目标页面:** https://jimeng.jianying.com/ai-tool/generate
- **状态:** 成功完成监控
- **总接收请求数:** 30个 (实际记录6个)

## 监控配置
- **最大监控时间:** 180,000ms (3分钟)
- **静音超时:** 60,000ms (1分钟)
- **包含静态内容:** 否
- **最大请求数:** 100个

---

## 捕获的请求详细原始数据

### 请求 #1: 监控数据收集
**Request ID:** 26417
**URL:** `https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=cn_mweb`
**方法:** POST
**类型:** xmlhttprequest
**请求时间:** 1757740720983.816
**响应时间:** 1757740721037.222
**响应耗时:** 53.406ms
**状态码:** 204 (No Content)

**请求头:**
```
Content-Type: application/json
Accept: */*
Sec-Fetch-Site: cross-site
```

**请求体:** [Binary data]

**响应头:**
```
server: volc-dcdn
date: Sat, 13 Sep 2025 05:18:40 GMT
upstream-caught: 1757740720744159
x-tt-logid: 2025091313184031E4A9422A18CD0713AA
access-control-allow-origin: *
access-control-allow-headers: Content-Type,Content-Length,Accept-Encoding,X-CSRF-Token,accept,origin,Cache-Control,X-Requested-With,X-USE-PPE,X-TT-ENV
access-control-allow-methods: POST, OPTIONS, GET
access-control-max-age: 600
cross-origin-resource-policy: cross-origin
server-timing: inner; dur=2, cdn-cache;desc=MISS, origin;dur=43, edge;dur=0
x-tt-trace-host: 018c83ed9be5edc14dcba2c4a57a37f3268486f88f9e1ac6424a8e6c951359248ecc59a5cfa2849ff74a89dd7d1c8030bb02eec8cf892c00c0f8697b35c3b6558d0e74b667c7bef267e5393497cf2fb5eb5bd9e7f796532d2b9f5bdc4f0f26891fe214169616d2a328ab2e61d68df842b92247006d6c762b0c00e0ef6e3b73d09674d602f32100bdcdb48fa3cd1a125258
x-tt-trace-tag: id=5
x-tt-trace-id: 00-4182e3e9030107df31a2fa1c314a0000-4182e3e9030107df-01
via: n112-090-090-149.gddgcu-container.Creative
x-request-ip: 27.47.133.135
x-dsa-trace-id: 17577407201617b96f685203d285988fc959abff9a
x-dsa-origin-status: 204
```

---

### 请求 #2: EverPhoto更新查询
**Request ID:** 26438
**URL:** `https://everphoto.jianying.com/sf/5/v5/GetUpdates?aid=324442&space_id=7390697281504150563&cursor=n_7429209112094703657&material=1&abilities=30`
**方法:** GET
**类型:** xmlhttprequest
**请求时间:** 1757740743988.019
**响应时间:** 1757740744071.496
**响应耗时:** 83.477ms
**状态码:** 200 OK
**MIME类型:** application/json; charset=utf-8

**请求头:**
```
x-everphoto-global-session-token: CsEBnc/LmJHWvyAwY0gmx5yDvmWsv5lKJ8pe6mFTiomP9QlaGf6np1NDAxBSM+j+5ND1JjFGcY4eB8y2xlpwtqqBRESW0q8ZpjLjeE3gEQNhbHjo30Gqay3/gFSaIrI1qJ4DyOFooFjaUf0d2ATCOTZlw6tC5lLOm7zGiSaW/nfPmDWsXzOlJr5Pqv1z55SQbxX2lYgBVj62FBZx52HHWRfP/tPyv32qDKXvdOYdmIFxE2+8wW8Sje3EqtvaIkT+tL4CERpJCjwAAAAAAAAAAAAAT3j8ldBFhtFTbWb76g/4KbfuX+d/ua3Yr0nEnjY7/+EdQ3vfUuZ0kKhKA8hgriQ8jjsQpYb8DRjEgIfIBCIBA+MHVSKjzQRg
x-ep-thirdparty-uid: 4246729963603161
expect-real-status: 1
content-type: application/json
Accept: */*
Sec-Fetch-Site: same-site
```

**响应头:**
```
Server: Tengine
Content-Type: application/json; charset=utf-8
Transfer-Encoding: chunked
Connection: keep-alive
Date: Sat, 13 Sep 2025 05:19:03 GMT
Vary: Accept-Encoding
X-Tt-Logid: 2025091313190359A34083F131901B6AF9
X-Code: 0
Strict-Transport-Security: max-age=31536000; includeSubDomains
server-timing: cdn-cache;desc=MISS,edge;dur=0,origin;dur=43
x-tt-trace-host: 011c31423e3ff411e95758325e5c33f5841c9c0a93aa9f5d3f7552366df403a567523a787267435c3e5f6e5ed1347a3111a3e4ddccb5f9fd2fe4b663b4f9c56e9dabefcdfeed277d42dfd8c36158934be6c9d583fc59dc4e9ea36eca8cc05403769219634534487763163d1107c8fb9340
x-tt-trace-tag: id=03;cdn-cache=miss;type=dyn
x-tt-trace-id: 00-25091313190359A34083F131901B6AF9-22FDFBEB439CA74B-00
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: https://jimeng.jianying.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type,Content-Length,Content-Range,Range,Expect-Real-Status,X-Everphoto-Global-Token,X-Everphoto-Token,X-Everphoto-Code,X-Everphoto-Size,X-Muse-Token,X-Tt-Token,X-Ep-Thirdparty-Uid,X-Tt-Env,X-Use-Boe,X-Use-Ppe,X-EverPhoto-Global-Session-Token,X-Evercloud-Upload-Space,X-Evercloud-Upload-Id,X-Evercloud-Upload-Md5,X-Evercloud-Upload-Crc32,X-Evercloud-Upload-Size,X-Evercloud-Upload-Filename,X-Evercloud-Upload-Mtime,X-Evercloud-Upload-Ctime,X-Evercloud-Part-Num,X-Evercloud-Part-Offset,X-Evercloud-Part-Size,X-Evercloud-Part-Md5,X-Evercloud-Part-Crc32,User-Agent
Access-Control-Max-Age: 600
Access-Control-Expose-Headers: X-Tt-Logid
Content-Encoding: br
Via: dynamic10.cn4353[43,0]
Timing-Allow-Origin: *
EagleId: 707a9cb617577407437478550e
```

**响应体:** [压缩数据 - br编码]

---

### 请求 #3: MCS列表查询
**Request ID:** 26447
**URL:** `https://mcs.zijieapi.com/list`
**方法:** POST
**类型:** xmlhttprequest
**请求时间:** 1757740746986.165
**响应时间:** 1757740747053.786
**响应耗时:** 67.621ms
**状态码:** 200 OK
**MIME类型:** application/json; charset=utf-8

**请求头:**
```
Content-Type: application/json; charset=UTF-8
Accept: */*
Sec-Fetch-Site: cross-site
```

**请求体:** [Binary data]

**响应头:**
```
server: volc-dcdn
content-type: application/json; charset=utf-8
content-length: 21
date: Sat, 13 Sep 2025 05:19:06 GMT
upstream-caught: 1757740746756295
x-tt-logid: 202509131319068A797439320E3968DE23
access-control-allow-origin: https://jimeng.jianying.com
access-control-max-age: 1800
access-control-allow-credentials: true
access-control-allow-methods: GET, OPTIONS, HEAD, PUT, POST
cross-origin-resource-policy: cross-origin
cache-control: no-store, no-cache, must-revalidate
pragma: no-cache
expires: 0
server-timing: inner; dur=4, cdn-cache;desc=MISS, origin;dur=50, edge;dur=0
x-tt-trace-host: 018c83ed9be5edc14dcba2c4a57a37f326fb3136405195e29ff26f091170c60540b2f90f891bddef8aa7a2e411cbd062ddb5e3960630089377f697fc422a444e973263b356037bcde7ab50d979c42acb619d4a02caebf8c42075be5a426ceee95e3b2310cefca67bb62b9dc34444ded01b
x-tt-trace-tag: id=5
x-tt-trace-id: 00-4183498203010840e151fab1495d0000-4183498203010840-01
via: n173-236-013.gdshenzhen-mp06-cu.Creative
x-request-ip: 27.47.133.135
x-dsa-trace-id: 17577407464f096ad6ac21506bbcf4e456f326b3e2
x-dsa-origin-status: 200
```

**响应体:** [21字节的JSON数据]

---

### 请求 #4: 第二次监控数据收集
**Request ID:** 26463
**URL:** `https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=cn_mweb`
**方法:** POST
**类型:** xmlhttprequest
**请求时间:** 1757740751984.775
**响应时间:** 1757740752040.89
**响应耗时:** 56.115ms
**状态码:** 204 (No Content)

**请求头:**
```
Content-Type: application/json
Accept: */*
Sec-Fetch-Site: cross-site
```

**请求体:** [Binary data]

**响应头:**
```
server: volc-dcdn
date: Sat, 13 Sep 2025 05:19:11 GMT
upstream-caught: 1757740751746714
x-tt-logid: 2025091313191184DD9DB6B894062FB1C4
access-control-allow-origin: *
access-control-allow-headers: Content-Type,Content-Length,Accept-Encoding,X-CSRF-Token,accept,origin,Cache-Control,X-Requested-With,X-USE-PPE,X-TT-ENV
access-control-allow-methods: POST, OPTIONS, GET
access-control-max-age: 600
cross-origin-resource-policy: cross-origin
server-timing: inner; dur=4, cdn-cache;desc=MISS, origin;dur=43, edge;dur=0
x-tt-trace-host: 018c83ed9be5edc14dcba2c4a57a37f3268486f88f9e1ac6424a8e6c951359248ecc59a5cfa2849ff74a89dd7d1c8030bbc6a9da1f5df6a2b34d9f3747e490dacaa405e2270d27e2f6cd6ed6f5b27bc1e036b2a22ae2cc7043fd9c9b0bfdf56af8491105acb77d6dc6bf4e0e745add0b8d0aee7aef29f788c1d123b34d43438b368a571d1094b7086d3da3142cee218ce0
x-tt-trace-tag: id=5
x-tt-trace-id: 00-41835d0403010d36367ab56d166f0000-41835d0403010d36-01
via: n112-090-090-149.gddgcu-container.Creative
x-request-ip: 27.47.133.135
x-dsa-trace-id: 17577407517ed52d1d06adc026db29a8c865ee69ec
x-dsa-origin-status: 204
```

---

### 请求 #5: 未读消息数量查询
**Request ID:** 26495
**URL:** `https://jimeng.jianying.com/mweb/v1/get_unread_count?aid=513695&web_version=6.6.0&da_version=3.2.9&aigc_features=app_lip_sync`
**方法:** POST
**类型:** xmlhttprequest
**请求时间:** 1757740771989.006
**响应时间:** 1757740772157.534
**响应耗时:** 168.528ms
**状态码:** 200 OK
**MIME类型:** application/json; charset=utf-8

**请求头:**
```
appid: 513695
sign: 7a01a0b6f2d2a60d2942e08ee4a6d852
device-time: 1757740771
lan: zh-Hans
pf: 7
sign-ver: 1
loc: cn
app-sdk-version: 48.0.0
appvr: 5.8.0
Accept: application/json, text/plain, */*
Content-Type: application/json
Sec-Fetch-Site: same-origin
```

**请求体:** [Binary data]

**响应头:**
```
server: volc-dcdn
content-type: application/json; charset=utf-8
content-length: 119
date: Sat, 13 Sep 2025 05:19:31 GMT
x-tt-logid: 202509131319312E2CEFC594FE990A9F02
tt_stable: 1
server-timing: inner; dur=100, cdn-cache;desc=MISS, origin;dur=149, edge;dur=0, tt_agw; dur=65
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-tt-trace-host: 011c31423e3ff411e95758325e5c33f5847ced458629b0416c3db32e68aef62cc9b5232b34ee20c7279f61eea3a87d795d79eaa324685d5ed911e017ce92e9378c70f67f05f3f61401fd653e094f8ad7e83f3dd1c4323efd139a67328de4ad425ed9e0f8c3519a79b5fe6a7576e776a671
x-tt-trace-tag: id=5
x-tt-trace-id: 00-4183ab2d03010a15ad42c72d6cc90000-4183ab2d03010a15-01
via: n112-090-043-147.gdjycu01-container.Creative
x-request-ip: 27.47.133.135
x-dsa-trace-id: 17577407719b94f89931e5923914588d3b784aded0
x-dsa-origin-status: 200
```

**响应体:** [119字节的JSON数据]

---

### 请求 #6: 第三次监控数据收集
**Request ID:** 26513
**URL:** `https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=cn_mweb`
**方法:** POST
**类型:** xmlhttprequest
**请求时间:** 1757740778984.364
**响应时间:** 1757740779039.916
**响应耗时:** 55.552ms
**状态码:** 204 (No Content)

**请求头:**
```
Content-Type: application/json
Accept: */*
Sec-Fetch-Site: cross-site
```

**请求体:** [Binary data]

**响应头:**
```
server: volc-dcdn
date: Sat, 13 Sep 2025 05:19:38 GMT
upstream-caught: 1757740778747167
x-tt-logid: 20250913131938543E91088BA3B78063FC
access-control-allow-origin: *
access-control-allow-headers: Content-Type,Content-Length,Accept-Encoding,X-CSRF-Token,accept,origin,Cache-Control,X-Requested-With,X-USE-PPE,X-TT-ENV
access-control-allow-methods: POST, OPTIONS, GET
access-control-max-age: 600
cross-origin-resource-policy: cross-origin
server-timing: inner; dur=3, cdn-cache;desc=MISS, origin;dur=44, edge;dur=0
x-tt-trace-host: 018c83ed9be5edc14dcba2c4a57a37f3268486f88f9e1ac6424a8e6c951359248ecc59a5cfa2849ff74a89dd7d1c8030bbc6a9da1f5df6a2b34d9f3747e490daca734ed2d4619f67c8266c9f72f26253ebfcfdc4265b7418e494238dd4b2d4a99c91d6efa51b4160d6a3262d0a24237aa6
x-tt-trace-tag: id=5
x-tt-trace-id: 00-4183c67b030101291f39a26607150000-4183c67b03010129-01
via: n112-090-090-149.gddgcu-container.Creative
x-request-ip: 27.47.133.135
x-dsa-trace-id: 1757740778f268d4644e3cbf81c294173c3e45ff00
x-dsa-origin-status: 204
```

---

## 监控统计汇总

### 请求类型分布
- **监控收集 (POST):** 3个请求 (50%)
- **系统查询 (GET):** 1个请求 (16.7%)
- **服务查询 (POST):** 1个请求 (16.7%)
- **状态查询 (POST):** 1个请求 (16.7%)

### 响应状态码分布
- **204 No Content:** 3个请求 (50%) - 监控数据收集
- **200 OK:** 3个请求 (50%) - 业务数据查询

### 响应时间统计
- **最快响应:** 53.406ms (请求 #1)
- **最慢响应:** 168.528ms (请求 #5 - 未读消息查询)
- **平均响应时间:** ~80.5ms

### 服务域名分布
- **mon.zijieapi.com:** 3个请求 (监控服务)
- **everphoto.jianying.com:** 1个请求 (EverPhoto服务)
- **mcs.zijieapi.com:** 1个请求 (MCS服务)
- **jimeng.jianying.com:** 1个请求 (JiMeng主服务)

### 关键认证参数
- **JiMeng应用ID:** 513695 (固定)
- **签名:** 7a01a0b6f2d2a60d2942e08ee4a6d852 (动态生成)
- **设备时间:** 1757740771 (Unix时间戳)
- **第三方用户ID:** 4246729963603161 (EverPhoto服务)

## 技术观察

### 1. 监控模式
系统持续向监控服务发送数据收集请求，每次返回204状态码，表明数据被成功接收但无需返回内容。

### 2. 认证体系
- **JiMeng主服务:** 使用appid+sign+device-time的认证模式
- **EverPhoto服务:** 使用全局会话令牌和第三方用户ID
- **监控服务:** 无需特殊认证，直接发送

### 3. 数据传输
- **压缩传输:** EverPhoto响应使用br编码压缩
- **二进制数据:** 多个请求体显示为二进制数据
- **JSON格式:** 主要响应数据格式为JSON

### 4. 网络性能
所有请求都保持较快的响应速度，说明网络连接稳定，服务器性能良好。

### 5. 会话管理
系统维护着活跃的会话状态，通过定期查询更新未读消息计数等状态信息。

## 总结

本次63秒的监控捕获了6个典型的系统维护请求，主要包括：
1. 监控数据收集 (3次)
2. EverPhoto服务状态更新
3. MCS服务查询
4. JiMeng未读消息查询

所有请求均成功完成，表明系统运行正常。与之前的监控相比，这次捕获的请求数量较少，主要是一些后台维护操作，未发现大量用户交互或生成相关的API调用。