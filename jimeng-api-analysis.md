# JiMeng Image Generation API Analysis

## Overview
Complete analysis of the image generation functionality on JiMeng platform (https://jimeng.jianying.com/ai-tool/generate) captured through network monitoring.

## Main Endpoint
**URL:** `https://jimeng.jianying.com/mweb/v1/aigc_draft/generate`

**HTTP Method:** POST
**Content-Type:** application/json

## Authentication Parameters
Required query parameters for API access:
- `aid`: 513695 (Application ID)
- `device_platform`: web
- `region`: cn
- `webId`: Dynamic web session ID
- `da_version`: 3.2.9
- `web_component_open_flag`: 1
- `web_version`: 6.6.0
- `aigc_features`: app_lip_sync
- `msToken`: Dynamic authentication token
- `a_bogus`: Anti-bot signature

## Request Structure

### Complete Request Body
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

## Key Components Analysis

### Model Information
- **Current Model:** `high_aes_general_v40` (图片4.0)
- **Generation Type:** `blend` (图文混合生成)
- **Platform:** Web workbench mode

### Generation Parameters
- **Prompt:** 用户输入的详细描述文本
- **Sample Strength:** 0.5 (生成强度)
- **Image Ratio:** 1 (1:1比例)
- **Resolution:** 2048x2048 pixels (2K quality)

### Image Processing
- **Ability Type:** `byte_edit` (字节编辑能力)
- **Image URI:** `tos-cn-i-tb4s082cfz/5a3a1c72a351465a871c73336c6c1c4c`
- **Blend Strength:** 0.5

## UI Elements

### Generate Button
**CSS Selector:** `lv-btn lv-btn-primary lv-btn-size-default lv-btn-shape-circle lv-btn-icon-only button-wtoV7J submit-button-VW0U_J`

### Form Components
- Textarea for prompt input
- Model selection (图片4.0)
- Aspect ratio selection buttons
- Image upload functionality
- Submit button in toolbar

## Network Monitoring Results
**Total Requests Captured:** 13 (excluding static content)
**Main API Call:** 1 image generation request
**Authentication:** Dynamic token-based system
**Request Format:** Complex nested JSON structure

## Technical Notes
- Uses UUID-based tracking for submissions and drafts
- Implements component-based architecture for different generation abilities
- Supports multiple image formats and processing capabilities
- Includes comprehensive metadata for analytics and debugging
- Anti-bot protection through signature system

## Multi-Reference Image Upload Analysis

### Upload Process Endpoints

#### 1. Algorithm Proxy Endpoint
**URL:** `https://jimeng.jianying.com/mweb/v1/algo_proxy`
**Method:** POST
**Purpose:** Initializes the image generation process with algorithm parameters

**Key Query Parameters:**
- `babi_param`: Encoded JSON containing scenario and feature information
- `aid`: 513695
- `web_version`: 6.6.0
- `da_version`: 3.2.9
- `aigc_features`: app_lip_sync

**Authentication Headers:**
- `appid`: 513695
- `sign`: Dynamic signature
- `device-time`: Timestamp
- `sign-ver`: 1
- `lan`: zh-Hans
- `pf`: 7
- `loc`: cn
- `app-sdk-version`: 48.0.0
- `appvr`: 5.8.0

#### 2. Upload Token Endpoint
**URL:** `https://jimeng.jianying.com/mweb/v1/get_upload_token`
**Method:** POST
**Purpose:** Retrieves upload tokens for image file uploads

#### 3. ImageX Upload Application
**URL:** `https://imagex.bytedanceapi.com/?Action=ApplyImageUpload`
**Method:** GET
**Purpose:** Applies for image upload permission and gets upload configuration

**Key Parameters:**
- `ServiceId`: tb4s082cfz
- `FileSize`: 4168101 (file size in bytes)
- `Version`: 2018-08-01

**AWS-style Authentication:**
- Uses AWS4-HMAC-SHA256 signature
- X-Amz-Security-Token for session authentication
- X-Amz-Date for request timestamp

#### 4. Actual File Upload
**URL:** `https://tos-d-x-lf.douyin.com/upload/v1/tos-cn-i-tb4s082cfz/[generated-id]`
**Method:** POST
**Purpose:** Uploads the actual image file data

**Key Headers:**
- `Authorization`: JWT token with upload permissions
- `Content-CRC32`: File integrity check
- `Content-Type`: application/octet-stream
- `X-Storage-U`: User ID (4246729963603161)

### Upload File Structure

The upload process follows this sequence:
1. **Algorithm Proxy** → Initializes generation parameters
2. **Get Upload Token** → Retrieves authentication tokens
3. **Apply Image Upload** → Gets upload configuration and permissions
4. **File Upload** → Actual image data transfer to storage
5. **Generation Request** → Final image generation with uploaded references

### Multi-Reference Support

The system supports multiple reference images through:
- **Multiple upload slots** in the UI (reference-upload-eclumn elements)
- **Batch upload capability** (multiple file input support)
- **Reference image blending** in the generation process
- **Individual strength control** for each reference image

### Reference Integration in Generation

Reference images are integrated into the generation request through:
```json
"image_uri_list": ["tos-cn-i-tb4s082cfz/image-id"],
"image_list": [{
  "image_uri": "tos-cn-i-tb4s082cfz/image-id",
  "source_from": "upload",
  "platform_type": 1
}],
"strength": 0.5
```

## Captured Date
Analysis performed on: 2025-09-13
Platform: JiMeng Web Interface
Tools: Chrome MCP Network Debugger