# JiMeng API Raw Network Capture Data

## Session 1: Basic Image Generation Analysis

### Capture Summary
- **Total Requests:** 13
- **Main Generation Endpoint:** https://jimeng.jianying.com/mweb/v1/aigc_draft/generate
- **Capture Time:** 2025-09-13 05:02:40 UTC

### Main Generation Request

**URL:** https://jimeng.jianying.com/mweb/v1/aigc_draft/generate?aid=513695&device_platform=web&region=cn&webId=7539210196167607844&da_version=3.2.9&web_component_open_flag=1&web_version=6.6.0&aigc_features=app_lip_sync&msToken=NJj-mk5mUURyX6of5JeHDFwDkp0kr_feTW5Y5cueo8WGzWsbaK-TnuE5JJ-ByCaxMdJY24KtxiApNUQKqW6ZeVFcJVdD6WXO3VVnkTZNOXYG9iiyHUFtZCsRfjNncduf&a_bogus=OysEvcZ4Msm1n6Jdg7kz9eXxyyE0YW56gZENxnTUb0wQ

**Method:** POST
**Content-Type:** application/json

**Request Body:**
```json
{
  "extend": {
    "root_model": "high_aes_general_v40"
  },
  "submit_id": "241e311c-510d-45fe-949d-2c5b9cb9c17b",
  "metrics_extra": "{\"promptSource\":\"custom\",\"generateCount\":1,\"enterFrom\":\"click\",\"generateId\":\"241e311c-510d-45fe-949d-2c5b9cb9c17b\",\"isRegenerate\":false}",
  "draft_content": "{\"type\":\"draft\",\"id\":\"435aec8e-121f-cbd3-8a36-91af8a53cf07\",\"min_version\":\"3.0.2\",\"min_features\":[],\"is_from_tsn\":true,\"version\":\"3.2.9\",\"main_component_id\":\"a68310f3-169c-b174-385a-e93b60fd1120\",\"component_list\":[{\"type\":\"image_base_component\",\"id\":\"a68310f3-169c-b174-385a-e93b60fd1120\",\"min_version\":\"3.0.2\",\"aigc_mode\":\"workbench\",\"metadata\":{\"type\":\"\",\"id\":\"7f022e27-5f3c-220d-ef87-b862e217b21b\",\"created_platform\":3,\"created_platform_version\":\"\",\"created_time_in_ms\":\"1757739507325\",\"created_did\":\"\"},\"generate_type\":\"blend\",\"abilities\":{\"type\":\"\",\"id\":\"755edab7-75ae-3882-7a07-30752c090211\",\"blend\":{\"type\":\"\",\"id\":\"b293cd9d-90bd-5259-a1ba-39ad0c4ddddb\",\"min_features\":[],\"core_param\":{\"type\":\"\",\"id\":\"30c57d2a-2b0f-8e48-f6ac-eae21f4ad8a3\",\"model\":\"high_aes_general_v40\",\"prompt\":\"##专业摄影半身像，30岁亚洲女性面对镜头自信演讲，双手做出强调手势，柔光工作室布景，超高清画质8K分辨率，深蓝色渐变背景营造专业氛围，聚光灯聚焦主体，衬衫领口细节清晰，\\\"未来可期\\\"文字醒目呈现在右下角，电影感灯光突出面部表情和手势张力\",\"sample_strength\":0.5,\"image_ratio\":1,\"large_image_info\":{\"type\":\"\",\"id\":\"39fe2ff3-bc39-7620-d1f4-bdb3ed550ba1\",\"height\":2048,\"width\":2048,\"resolution_type\":\"2k\"},\"intelligent_ratio\":false},\"ability_list\":[{\"type\":\"\",\"id\":\"af209d17-6385-4ea4-afc7-cd6993150e96\",\"name\":\"byte_edit\",\"image_uri_list\":[\"tos-cn-i-tb4s082cfz/5a3a1c72a351465a871c73336c6c1c4c\"],\"image_list\":[{\"type\":\"image\",\"id\":\"52156f06-bd80-9f8c-0a9c-61c080ecfcbd\",\"source_from\":\"upload\",\"platform_type\":1,\"name\":\"\",\"image_uri\":\"tos-cn-i-tb4s082cfz/5a3a1c72a351465a871c73336c6c1c4c\",\"width\":0,\"height\":0,\"format\":\"\",\"uri\":\"tos-cn-i-tb4s082cfz/5a3a1c72a351465a871c73336c6c1c4c\"}],\"strength\":0.5}],\"prompt_placeholder_info_list\":[{\"type\":\"\",\"id\":\"e382a875-d50c-b6e0-f33d-906297a11861\",\"ability_index\":0}],\"postedit_param\":{\"type\":\"\",\"id\":\"af4311d0-10e4-fcb4-eed5-cb8f1c4cb6b7\",\"generate_type\":0}}}}]}",
  "http_common_info": {
    "aid": 513695
  }
}
```

**Authentication Parameters:**
- aid: 513695
- device_platform: web
- region: cn
- webId: 7539210196167607844
- da_version: 3.2.9
- web_component_open_flag: 1
- web_version: 6.6.0
- aigc_features: app_lip_sync
- msToken: NJj-mk5mUURyX6of5JeHDFwDkp0kr_feTW5Y5cueo8WGzWsbaK-TnuE5JJ-ByCaxMdJY24KtxiApNUQKqW6ZeVFcJVdD6WXO3VVnkTZNOXYG9iiyHUFtZCsRfjNncduf
- a_bogus: OysEvcZ4Msm1n6Jdg7kz9eXxyyE0YW56gZENxnTUb0wQ

---

## Session 2: Multi-Reference Upload Analysis

### Capture Summary
- **Total Requests:** 17
- **Upload Flow Captured:** Complete upload sequence
- **Capture Time:** 2025-09-13 05:03:19 UTC

### Key Upload Endpoints

#### 1. Algorithm Proxy
**URL:** https://jimeng.jianying.com/mweb/v1/algo_proxy?babi_param=%7B%22scenario%22:%22image_video_generation%22,%22feature_key%22:%22aigc_to_image%22,%22feature_entrance%22:%22to-generate%22,%22feature_entrance_detail%22:%22to-generate-algo_proxy%22%7D&aid=513695&web_version=6.6.0&da_version=3.2.9&aigc_features=app_lip_sync

**Method:** POST
**Request Time:** 1757739812002.942
**Response Time:** 1757739813874.846

**Request Headers:**
```
appid: 513695
sign: ea8b20c180ea62c6261cc088481d5196
device-time: 1757739812
sign-ver: 1
lan: zh-Hans
pf: 7
loc: cn
app-sdk-version: 48.0.0
appvr: 5.8.0
Content-Type: application/json
```

#### 2. Get Upload Token
**URL:** https://jimeng.jianying.com/mweb/v1/get_upload_token?aid=513695&web_version=6.6.0&da_version=3.2.9&aigc_features=app_lip_sync

**Method:** POST
**Request Time:** 1757739813902.418
**Response Time:** 1757739814060.25

**Request Headers:**
```
appid: 513695
sign: 91ff2b6e14c3dd4d7d2d60b794836d2a
device-time: 1757739813
sign-ver: 1
lan: zh-Hans
pf: 7
loc: cn
app-sdk-version: 48.0.0
appvr: 5.8.0
Content-Type: application/json
```

#### 3. Apply Image Upload
**URL:** https://imagex.bytedanceapi.com/?Action=ApplyImageUpload&Version=2018-08-01&ServiceId=tb4s082cfz&FileSize=4168101&s=c7bykyj7u78

**Method:** GET
**Request Time:** 1757739814102.365
**Response Time:** 1757739814460.289

**AWS Authentication Headers:**
```
X-Amz-Security-Token: STS2eyJMVEFjY2Vzc0tleUlEIjoiQUtMVFpUQm1ZbVl4TlRsa1ptVmpOREJqWVRrM09UUTNZbU5pTmprMk1EUXdaV00iLCJBY2Nlc3NLZXlJRCI6IkFLVFBaakpsTm1RNVkySTBaamN3TkdVNE1tRTFOVGN6TkRVNU9UWTFNV0l4WldJIiwiU2lnbmVkU2VjcmV0QWNjZXNzS2V5IjoidEVBeUFKUFlsdWR5cktWZXBESUJGQjhTS2ZTdWd4NUpVZGw4dnJDcXlIOXg1UCtteHQ1ZXNIcFI1VG4wODM1SWZCbk5xTDBBRktDOGNmQWVteTNSbmhRVEFSS2RGVm4rNmVndDJ5QnJYbU09IiwiRXhwaXJlZFRpbWUiOjE3NTc3NDM0MTMsIlBvbGljeVN0cmluZyI6IntcIlN0YXRlbWVudFwiOlt7XCJFZmZlY3RcIjpcIkFsbG93XCIsXCJBY3Rpb25cIjpbXCJ2b2Q6QXBwbHlVcGxvYWRcIixcInZvZDpBcHBseVVwbG9hZElubmVyXCIsXCJ2b2Q6Q29tbWl0VXBsb2FkXCIsXCJ2b2Q6Q29tbWl0VXBsb2FkSW5uZXJcIixcInZvZDpHZXRVcGxvYWRDYW5kaWRhdGVzXCIsXCJJbWFnZVg6QXBwbHlJbWFnZVVwbG9hZFwiLFwiSW1hZ2VYOkNvbW1pdEltYWdlVXBsb2FkXCIsXCJJbWFnZVg6QXBwbHlVcGxvYWRJbWFnZUZpbGVcIixcIkltYWdlWDpDb21taXRVcGxvYWRJbWFnZUZpbGVcIl0sXCJSZXNvdXJjZVwiOltcIipcIl0sXCJDb25kaXRpb25cIjpcIntcXFwiUFNNXFxcIjpcXFwidmlkZW9jdXQubXdlYi5hcGlcXFwifVwifV19IiwiU2lnbmF0dXJlIjoiNDU0MDM4NzA1NDA5NGY2ZDJmNmE3M2M2NTI2MzgyZTJkM2EzMjM0YWNiNzY3YTdhYTkwN2JmNDI1MTE0ODZhZSJ9
X-Amz-Date: 20250913T050334Z
Authorization: AWS4-HMAC-SHA256 Credential=AKTPZjJlNmQ5Y2I0ZjcwNGU4MmE1NTczNDU5OTY1MWIxZWI/20250913/cn-north-1/imagex/aws4_request, SignedHeaders=x-amz-date;x-amz-security-token, Signature=df072d13e4256892477a3372a0461c7d144d6bcabc0802527513b1c71a0527e3
```

#### 4. File Upload
**URL:** https://tos-d-x-lf.douyin.com/upload/v1/tos-cn-i-tb4s082cfz/cff86d25711f47e5ba898c3f7bbe85e5

**Method:** POST
**Request Time:** 1757739814471.138

**Upload Headers:**
```
Authorization: SpaceKey/tb4s082cfz/1/:version:v2:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTc3NjE0MTQsInNpZ25hdHVyZUluZm8iOnsiYWNjZXNzS2V5IjoiZmFrZV9hY2Nlc3Nfa2V5IiwiYnVja2V0IjoidG9zLWNuLWktdGI0czA4MmNmeiIsImV4cGlyZSI6MTc1Nzc2MTQxNCwiZmlsZUluZm9zIjpbeyJva2V5IjoiY2ZmODZkMjU3MTFmNDdlNWJhODk4YzNmN2JiZTg1ZTUiLCJmaWxlVHlwZSI6IjEifV0sImV4dHJhIjp7ImFjY291bnRfcHJvZHVjdCI6ImltYWdleCIsImJsb2NrX21vZGUiOiIiLCJjb250ZW50X3R5cGVfYmxvY2siOiJ7XCJtaW1lX3BjdFwiOjAsXCJtb2RlXCI6MCxcIm1pbWVfbGlzdFwiOm51bGwsXCJjb25mbGljdF9ibG9ja1wiOmZhbHNlfSIsImVuY3J5cHRfYWxnbyI6IiIsImVuY3J5cHRfa2V5IjoiIiwic3BhY2UiOiJ0YjRzMDgyY2Z6In19fQ.0030Ca9-wxtO2APVw5Ng13DhD8DKDayyxTM9pDHnN6o
Content-CRC32: d444f144
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="undefined"
X-Storage-U: 4246729963603161
```

---

## UI Element Identifiers

### Generate Button
**CSS Classes:** `lv-btn lv-btn-primary lv-btn-size-default lv-btn-shape-circle lv-btn-icon-only button-wtoV7J submit-button-VW0U_J`

### Reference Upload Button
**CSS Classes:** `reference-upload-eclumn reference-KpBKPw single-pwQkAt`

### Prompt Textarea
**CSS Classes:** `lv-textarea textarea-tSH5hX prompt-textarea-XfqAoB`

---

## Network Monitoring Configuration

### Session 1 Settings
- Max Capture Time: 180000ms
- Inactivity Timeout: 60000ms
- Include Static: false
- Max Requests: 100
- Total Duration: 43919ms

### Session 2 Settings  
- Max Capture Time: 180000ms
- Inactivity Timeout: 60000ms
- Include Static: false
- Max Requests: 100
- Total Duration: 12711ms

---

## Raw Request Data

### Session 1 Requests (13 total)
1. mon.zijieapi.com/monitor_browser/collect/batch/ (POST)
2. mcs.zijieapi.com/list (POST) - Multiple instances
3. jimeng.jianying.com/mweb/v1/aigc_draft/generate (POST) - Main generation
4. everphoto.jianying.com/sf/5/v5/GetUpdates (GET)
5. mon.zijieapi.com/monitor_browser/collect/batch/security/ (POST)

### Session 2 Requests (17 total)
1. lf-capcut-web.capcut.cn/obj/capcut-web-buz-cn/stream-md5/streaming_md5.wasm (GET)
2. jimeng.jianying.com/mweb/v1/algo_proxy (POST) - Algorithm initialization
3. jimeng.jianying.com/mweb/v1/get_upload_token (POST) - Token retrieval
4. everphoto.jianying.com/sf/5/v5/GetUpdates (GET)
5. mon.zijieapi.com/monitor_browser/collect/batch/security/ (POST)
6. mcs.zijieapi.com/list (POST) - Multiple instances
7. imagex.bytedanceapi.com/ (GET) - Upload application
8. imagex.bytedanceapi.com/ (OPTIONS) - CORS preflight
9. tos-d-x-lf.douyin.com/upload/v1/ (POST) - File upload
10. tos-d-x-lf.douyin.com/upload/v1/ (OPTIONS) - CORS preflight
11. jimeng.jianying.com/mweb/v1/get_unread_count (POST)
12. mon.zijieapi.com/monitor_browser/collect/batch/security/ (POST)
13. mon.zijieapi.com/monitor_browser/collect/batch/ (POST)

---

## Authentication Patterns

### JiMeng API Authentication
- **Dynamic Signature:** Each request has a unique signature
- **Timestamp:** device-time parameter for request validation
- **App ID:** 513695 (consistent across requests)
- **Version Parameters:** web_version, da_version, app-sdk-version

### AWS S3 Compatible Authentication (ImageX)
- **AWS4-HMAC-SHA256:** Signature algorithm
- **Credential Format:** AKTPZjJlNmQ5Y2I0ZjcwNGU4MmE1NTczNDU5OTY1MWIxZWI/date/region/service/aws4_request
- **Security Token:** X-Amz-Security-Token for session authentication
- **Date Format:** X-Amz-Date in YYYYMMDDTHHMMSSZ format

### Upload JWT Authentication
- **JWT Token:** SpaceKey/tb4s082cfz/1/:version:v2 format
- **Expiration:** Embedded in JWT payload (exp: 1757761414)
- **User ID:** X-Storage-U header (4246729963603161)
- **File Integrity:** Content-CRC32 checksum

---

## Technical Observations

1. **Multi-layer Authentication:** JiMeng uses both proprietary signatures and AWS-compatible auth
2. **Sequential Upload Process:** Clear 4-step upload workflow
3. **Real-time Monitoring:** Continuous monitoring requests to tracking services
4. **CORS Support:** Proper OPTIONS preflight requests for cross-origin uploads
5. **File Validation:** CRC32 checksums for upload integrity
6. **Session Management:** User ID and session tokens consistently used across services

---

## Capture Metadata

**Analysis Date:** 2025-09-13
**Tools Used:** Chrome MCP Network Debugger
**Capture Method:** Automated web interaction and network monitoring
**Total Sessions:** 2
**Total Requests Analyzed:** 30