# 即梦AI图片生成端点信息

## 概述

通过Chrome网络监控收集到的即梦AI (https://jimeng.jianying.com) 图片生成功能的API端点信息。

## 主要端点

### 1. 图片生成提交端点

**URL:** `POST https://jimeng.jianying.com/mweb/v1/aigc_draft/generate`

**功能:** 提交图片生成任务

**完整URL参数:**
```
https://jimeng.jianying.com/mweb/v1/aigc_draft/generate?aid=513695&device_platform=web&region=cn&webId=7539210196167607844&da_version=3.2.9&web_component_open_flag=1&web_version=6.6.0&aigc_features=app_lip_sync&msToken=LPka-Bcg3diKuooDJZzjRg0z2sRgKe2NxAbrDtBIi7Glkg62rEdmb6NtGkC2gWAgG_Ai_TwSeHgcUNERpXJaJEdDg-2wHYf9lya5E5kkztO_xujEpXBGpvra7No73gbc&a_bogus=d6sQXOZ4Msm1XTUd%2F7kz9HjxyH80YWRJgZENxjsov0q2
```

### 2. 查询生成状态端点

**URL:** `POST https://jimeng.jianying.com/mweb/v1/get_history_by_ids`

**功能:** 查询生成任务状态和结果

**完整URL参数:**
```
https://jimeng.jianying.com/mweb/v1/get_history_by_ids?aid=513695&device_platform=web&region=cn&webId=7539210196167607844&da_version=3.2.9&web_version=6.6.0&aigc_features=app_lip_sync&msToken=LPka-Bcg3diKuooDJZzjRg0z2sRgKe2NxAbrDtBIi7Glkg62rEdmb6NtGkC2gWAgG_Ai_TwSeHgcUNERpXJaJEdDg-2wHYf9lya5E5kkztO_xujEpXBGpvra7No73gbc&a_bogus=Yy0OvcZ4Msm1nFid%2F7kz9CwMyym0YW5ugZENxjs190q8
```

### 3. 用户积分查询端点

**URL:** `POST https://jimeng.jianying.com/commerce/v1/benefits/user_credit_history`

**功能:** 查询用户积分使用历史

## 请求参数

### 1. 图片生成提交请求

```json
{
  "extend": {
    "root_model": "high_aes_general_v40"
  },
  "submit_id": "19637d71-15df-445e-b86d-490f3549cb85",
  "metrics_extra": "{\"promptSource\":\"custom\",\"generateCount\":1,\"enterFrom\":\"click\",\"generateId\":\"19637d71-15df-445e-b86d-490f3549cb85\",\"isRegenerate\":false}",
  "draft_content": "{\"type\":\"draft\",\"id\":\"cd231d8b-874b-566f-bd71-3f3351351bda\",\"min_version\":\"3.0.2\",\"min_features\":[],\"is_from_tsn\":true,\"version\":\"3.2.9\",\"main_component_id\":\"b0bb4279-e082-2838-95dc-9d01616a6515\",\"component_list\":[{\"type\":\"image_base_component\",\"id\":\"b0bb4279-e082-2838-95dc-9d01616a6515\",\"min_version\":\"3.0.2\",\"aigc_mode\":\"workbench\",\"metadata\":{\"type\":\"\",\"id\":\"ecab33dd-2ccb-90c4-3603-c1c0f445d77d\",\"created_platform\":3,\"created_platform_version\":\"\",\"created_time_in_ms\":\"1757737934387\",\"created_did\":\"\"},\"generate_type\":\"generate\",\"abilities\":{\"type\":\"\",\"id\":\"d02bb4d6-3d3c-e1cc-f571-f3d0cf502ce0\",\"generate\":{\"type\":\"\",\"id\":\"ee467d76-b62f-d817-c9f3-b761747b4da4\",\"core_param\":{\"type\":\"\",\"id\":\"b750cbee-a180-9c99-8fed-6e2b2990d20d\",\"model\":\"high_aes_general_v40\",\"prompt\":\"一只可爱的小猫咪在花园里玩耍\",\"negative_prompt\":\"\",\"seed\":1277902096,\"sample_strength\":0.5,\"image_ratio\":1,\"large_image_info\":{\"type\":\"\",\"id\":\"7057c0df-0b93-212d-d2cf-c0a945f2375b\",\"height\":2048,\"width\":2048,\"resolution_type\":\"2k\"},\"intelligent_ratio\":false}}}}]}",
  "http_common_info": {
    "aid": 513695
  }
}
```

### 2. 查询生成状态请求

```json
{
  "submit_ids": ["19637d71-15df-445e-b86d-490f3549cb85"]
}
```

### 3. 用户积分查询请求

```json
{
  "count": 20,
  "cursor": "0"
}
```

## 关键参数说明

### 核心生成参数
- **model**: "high_aes_general_v40" - 图片4.0模型
- **prompt**: 图片生成提示词 (例如: "一只可爱的小猫咪在花园里玩耍")
- **negative_prompt**: 负面提示词 (可为空字符串)
- **seed**: 随机种子 (例如: 1277902096)
- **sample_strength**: 采样强度 (默认0.5)
- **image_ratio**: 图片比例 (1 = 1:1, 1.777... = 16:9)
- **width/height**: 输出图片尺寸 (例如: 2048x2048)
- **resolution_type**: 分辨率类型 ("2k" = 2048px)

### URL参数说明
- **aid**: 513695 - 应用ID
- **device_platform**: web - 设备平台
- **region**: cn - 地区
- **webId**: 浏览器唯一标识
- **da_version**: 3.2.9 - 动态应用版本
- **web_version**: 6.6.0 - Web版本
- **msToken**: 用户认证令牌
- **a_bogus**: 防机器人验证参数

## 响应数据

### 生成提交响应

```json
{
  "ret": "0",
  "errmsg": "success",
  "systime": "1757737934",
  "logid": "202509131232143AAD2636D2017502325C",
  "data": {
    "generate_type": 1,
    "history_record_id": "25594898552322",
    "created_time": 1757737934.403,
    "task": {
      "task_id": "25594898552322",
      "submit_id": "19637d71-15df-445e-b86d-490f3549cb85",
      "aid": 0,
      "status": 20,
      "finish_time": 0,
      "history_id": "25594898552322"
    },
    "mode": "workbench",
    "uid": "4246729963603161",
    "status": 20,
    "history_group_key": "一只可爱的小猫咪在花园里玩耍",
    "submit_id": "19637d71-15df-445e-b86d-490f3549cb85",
    "generate_id": "202509131232143AAD2636D2017502325C",
    "model_info": {
      "model_name": "图片 4.0",
      "model_req_key": "high_aes_general_v40"
    },
    "forecast_generate_cost": 23,
    "forecast_queue_cost": 0,
    "queue_info": {
      "queue_idx": 0,
      "priority": 3,
      "queue_status": 2,
      "queue_length": 0,
      "polling_config": {
        "interval_seconds": 30,
        "timeout_seconds": 86400
      }
    },
    "total_image_count": 0,
    "finished_image_count": 0
  }
}
```

### 状态查询响应

```json
{
  "ret": "0",
  "errmsg": "success",
  "systime": "1757737938",
  "logid": "2025091312321882FE7E28394F51689F63",
  "data": {
    "19637d71-15df-445e-b86d-490f3549cb85": {
      "generate_type": 1,
      "history_record_id": "25594898552322",
      "created_time": 1757737934.403,
      "task": {
        "task_id": "25594898552322",
        "submit_id": "19637d71-15df-445e-b86d-490f3549cb85",
        "status": 45,
        "finish_time": 0,
        "history_id": "25594898552322"
      },
      "status": 45,
      "total_image_count": 4,
      "finished_image_count": 0,
      "image_type": 3,
      "forecast_generate_cost": 22
    }
  }
}
```

## 状态码说明

- **status: 20** - 排队中
- **status: 45** - 处理中/生成中
- **generate_type: 1** - 图片生成
- **image_type: 3** - 生成的图片类型

## 轮询建议

根据响应中的 `polling_config`，建议使用以下轮询参数：
- **间隔时间**: 30秒
- **超时时间**: 86400秒 (24小时)

## 请求头要求

```http
Accept: application/json, text/plain, */*
Content-Type: application/json
Referer: https://jimeng.jianying.com/ai-tool/generate
app-sdk-version: 48.0.0
appid: 513695
appvr: 5.8.0
device-time: [当前时间戳]
lan: zh-Hans
loc: cn
pf: 7
sign: [动态签名]
sign-ver: 1
```

## 注意事项

1. **认证**: 需要 msToken 和 a_bogus 参数进行身份验证
2. **签名**: sign 参数是动态生成的，需要从网页获取或模拟生成
3. **速率限制**: 建议遵守轮询间隔，避免频繁请求
4. **积分消耗**: 每次生成会消耗用户积分 (forecast_generate_cost)
5. **文件大小**: 生成结果可能较大，注意处理网络超时

## 收集时间

- **采集日期**: 2025-09-13
- **采集方法**: Chrome浏览器网络监控
- **采集版本**: 即梦AI Web版本 6.6.0