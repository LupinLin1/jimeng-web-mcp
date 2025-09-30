# API Contract: 异步视频生成查询

**Feature**: 002-async-video-query
**Version**: 1.0.0
**Date**: 2025-10-01

## Overview

此文档定义异步视频生成查询功能的TypeScript API契约。所有接口保持向后兼容，扩展现有 `VideoGenerator` 和 `JimengClient` 类。

---

## Method: generateVideoAsync

### Description
异步提交视频生成任务，立即返回任务ID而不等待生成完成。支持所有现有视频生成模式（传统、多帧、主体参考）。

### Signature

```typescript
class VideoGenerator extends BaseClient {
  public async generateVideoAsync(
    params: VideoGenerationParams
  ): Promise<string>;
}
```

### Parameters

**params**: `VideoGenerationParams`

```typescript
interface VideoGenerationParams {
  // 必需参数
  prompt: string;                          // 视频描述文本

  // 可选参数 - 基础配置
  model?: string;                          // 模型名称，默认 DEFAULT_VIDEO_MODEL
  resolution?: '720p' | '1080p';           // 分辨率，默认 '720p'
  fps?: number;                            // 帧率，范围12-30，默认24
  duration_ms?: number;                    // 时长（毫秒），范围3000-15000
  video_aspect_ratio?: string;             // 视频比例，如'16:9'

  // 可选参数 - 参考图片（传统模式）
  filePath?: string[];                     // 首尾帧图片路径

  // 可选参数 - 多帧模式
  multiFrames?: MultiFrameConfig[];        // 智能多帧配置

  // 内部参数（用户无需关心）
  refresh_token?: string;                  // API令牌
  req_key?: string;                        // 兼容性参数
}
```

### Return Value

**Type**: `Promise<string>`

**Description**: 任务唯一标识符（history_id）

**Format**: 纯数字字符串（如 `"4721606420748"`）或 'h' 开头的字母数字串（如 `"h1a2b3c4d5"`）

### Examples

```typescript
// 传统模式：纯文本生成
const historyId = await videoGen.generateVideoAsync({
  prompt: "海上升明月，天涯共此时",
  resolution: "720p",
  duration_ms: 5000
});
// Returns: "4721606420748"

// 传统模式：首尾帧引导
const historyId = await videoGen.generateVideoAsync({
  prompt: "猫在花园中奔跑",
  filePath: ["/path/to/first.jpg", "/path/to/last.jpg"],
  resolution: "1080p"
});

// 多帧模式
const historyId = await videoGen.generateVideoAsync({
  prompt: "动态场景转换",
  multiFrames: [
    { idx: 0, duration_ms: 2000, prompt: "开场", image_path: "/frame1.jpg" },
    { idx: 1, duration_ms: 3000, prompt: "高潮", image_path: "/frame2.jpg" }
  ]
});
```

### Error Handling

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| 缺少prompt参数 | `"prompt参数为必需"` | N/A (client) |
| 无效分辨率 | `"分辨率必须为'720p'或'1080p'"` | N/A (client) |
| 图片上传失败 | `"上传图片失败: {reason}"` | N/A (client) |
| API请求失败 | `"提交失败: {API errmsg}"` | From API |
| 未返回history_id | `"未返回history_id"` | N/A (client) |

### Behavioral Contract

1. **参数验证**: 立即验证所有必需和可选参数
2. **图片上传**: 如果提供 `filePath`，串行上传所有图片
3. **请求提交**: 调用 `/mweb/v1/aigc_draft/generate` 提交任务
4. **立即返回**: 提取并返回 `history_record_id`，**不等待生成完成**
5. **幂等性**: 相同参数多次调用生成不同任务ID（非幂等）

---

## Method: generateMainReferenceVideoAsync

### Description
异步提交主体参考视频生成任务，立即返回任务ID。

### Signature

```typescript
class VideoGenerator extends BaseClient {
  public async generateMainReferenceVideoAsync(
    params: MainReferenceVideoParams
  ): Promise<string>;
}
```

### Parameters

**params**: `MainReferenceVideoParams`

```typescript
interface MainReferenceVideoParams {
  referenceImages: string[];               // 2-4张参考图片路径
  prompt: string;                          // 必须包含[图0]等引用语法
  model?: string;                          // 默认 'jimeng-video-3.0'
  resolution?: '720p' | '1080p';           // 默认 '720p'
  videoAspectRatio?: string;               // 默认 '16:9'
  fps?: number;                            // 默认 24
  duration?: number;                       // 默认 5000ms
}
```

### Return Value

**Type**: `Promise<string>`
**Description**: 任务唯一标识符（history_id）

### Examples

```typescript
const historyId = await videoGen.generateMainReferenceVideoAsync({
  referenceImages: ["/cat.jpg", "/garden.jpg"],
  prompt: "[图0]中的猫在[图1]的花园里奔跑",
  resolution: "720p"
});
// Returns: "h1a2b3c4d5e6f7"
```

### Error Handling

| Error Condition | Error Message |
|----------------|---------------|
| 参考图数量<2或>4 | `"referenceImages必须包含2-4张图片"` |
| prompt缺少[图N]引用 | `"prompt必须包含至少一个[图N]引用"` |
| 图片引用索引越界 | `"图片引用[图N]超出范围"` |

---

## Method: videoPostProcessAsync

### Description
异步提交视频后处理任务（补帧、超分、音效），立即返回任务ID。

### Signature

```typescript
class VideoGenerator extends BaseClient {
  public async videoPostProcessAsync(
    params: VideoPostProcessUnifiedParams
  ): Promise<string>;
}
```

### Parameters

**params**: `VideoPostProcessUnifiedParams`

```typescript
interface VideoPostProcessUnifiedParams {
  operation: 'frame_interpolation' | 'super_resolution' | 'audio_effect';
  videoId: string;                        // 原始视频ID
  originHistoryId: string;                // 原始生成history_id

  // 补帧参数（operation = 'frame_interpolation'）
  targetFps?: 30 | 60;
  originFps?: number;

  // 超分参数（operation = 'super_resolution'）
  targetWidth?: number;                   // 范围768-2560
  targetHeight?: number;
  originWidth?: number;
  originHeight?: number;

  // 通用参数
  duration?: number;                      // 视频时长（毫秒）
  refresh_token?: string;
}
```

### Return Value

**Type**: `Promise<string>`
**Description**: 后处理任务的history_id

### Examples

```typescript
// 补帧到60fps
const historyId = await videoGen.videoPostProcessAsync({
  operation: 'frame_interpolation',
  videoId: "original_video_id",
  originHistoryId: "4721606420748",
  targetFps: 60,
  originFps: 24
});

// 超分辨率
const historyId = await videoGen.videoPostProcessAsync({
  operation: 'super_resolution',
  videoId: "original_video_id",
  originHistoryId: "4721606420748",
  targetWidth: 1920,
  targetHeight: 1080,
  originWidth: 1280,
  originHeight: 720
});
```

---

## Method: getImageResult (Extended)

### Description
查询单个任务的生成状态和结果。**已存在的方法**，已支持视频查询，本特性无需修改。

### Signature

```typescript
class JimengClient extends BaseClient {
  public async getImageResult(
    historyId: string
  ): Promise<QueryResultResponse>;
}
```

### Parameters

**historyId**: `string` - 任务唯一标识符

### Return Value

**Type**: `Promise<QueryResultResponse>`

```typescript
interface QueryResultResponse {
  status: GenerationStatus;               // 'pending'|'processing'|'completed'|'failed'
  progress: number;                       // 0-100
  imageUrls?: string[];                   // 仅图片任务
  videoUrl?: string;                      // 仅视频任务
  error?: string;                         // 仅失败时
}

type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

### Examples

```typescript
// 查询视频生成状态
const result = await client.getImageResult("4721606420748");

if (result.status === 'completed') {
  console.log('视频URL:', result.videoUrl);
} else if (result.status === 'processing') {
  console.log('进度:', result.progress, '%');
} else if (result.status === 'failed') {
  console.error('失败:', result.error);
}
```

### Error Handling

| Error Condition | Error Message |
|----------------|---------------|
| historyId为空 | `"无效的historyId格式: historyId不能为空"` |
| historyId格式错误 | `"无效的historyId格式: historyId必须是纯数字或以'h'开头的字母数字字符串"` |
| 记录不存在 | `"记录不存在"` |

### Behavioral Contract

1. **格式验证**: 立即验证historyId格式
2. **API查询**: 调用 `/mweb/v1/get_history_by_ids`
3. **状态映射**: 将API状态码映射为用户友好的字符串
4. **结果提取**: 自动识别图片或视频结果
5. **幂等性**: 多次查询返回一致结果（直到状态变化）

---

## Method: getBatchResults (NEW)

### Description
批量查询多个任务的生成状态和结果。

### Signature

```typescript
class JimengClient extends BaseClient {
  public async getBatchResults(
    historyIds: string[]
  ): Promise<BatchQueryResponse>;
}
```

### Parameters

**historyIds**: `string[]` - 任务ID数组，建议≤10个

### Return Value

**Type**: `Promise<BatchQueryResponse>`

```typescript
interface BatchQueryResponse {
  [historyId: string]: QueryResultResponse | { error: string };
}
```

### Examples

```typescript
const results = await client.getBatchResults([
  "4721606420748",
  "4721606420749",
  "invalid-id"
]);

// Results:
// {
//   "4721606420748": { status: "completed", progress: 100, videoUrl: "..." },
//   "4721606420749": { status: "processing", progress: 45 },
//   "invalid-id": { error: "无效的historyId格式" }
// }
```

### Error Handling

| Error Condition | Behavior |
|----------------|----------|
| 数组为空 | 抛出错误: `"historyIds数组不能为空"` |
| 数组长度>10 | 警告日志（不阻止执行） |
| 单个ID格式错误 | 在响应中标记为 `{ error: "..." }`，不中断其他ID查询 |
| API返回错误 | 抛出异常（全部失败） |

### Behavioral Contract

1. **数组验证**: 验证数组非空，建议长度≤10
2. **格式验证**: 预先验证所有ID格式，无效ID标记错误
3. **单次API调用**: 使用 `/mweb/v1/get_history_by_ids` 批量查询
4. **结果映射**: 为每个ID构建独立的 `QueryResultResponse`
5. **错误隔离**: 单个ID错误不影响其他ID结果

---

## Backward Compatibility

### Breaking Changes

**None** - 所有新增方法为扩展，现有方法签名和行为保持不变。

### Deprecated Methods

**None**

### Migration Guide

现有用户无需迁移。新功能通过以下方式使用：

```typescript
// Old (同步)
const videoUrl = await videoGen.generateVideo(params); // 等待完成

// New (异步)
const historyId = await videoGen.generateVideoAsync(params); // 立即返回
const result = await client.getImageResult(historyId);       // 稍后查询
```

---

## MCP Tool Mappings

本特性将通过MCP协议暴露以下工具：

### Tool: generateVideoAsync

```typescript
{
  name: "generateVideoAsync",
  description: "异步提交视频生成任务，立即返回任务ID",
  inputSchema: z.object({
    prompt: z.string(),
    resolution: z.enum(['720p', '1080p']).optional(),
    fps: z.number().min(12).max(30).optional(),
    // ... 其他参数
  })
}
```

### Tool: getVideoResult

```typescript
{
  name: "getVideoResult",  // 或复用 getImageResult
  description: "查询视频生成任务的状态和结果",
  inputSchema: z.object({
    historyId: z.string()
  })
}
```

### Tool: getBatchVideoResults

```typescript
{
  name: "getBatchVideoResults",
  description: "批量查询多个视频生成任务的状态",
  inputSchema: z.object({
    historyIds: z.array(z.string()).max(10)
  })
}
```

---

## Testing Contracts

### Contract Test Requirements

1. **generateVideoAsync**:
   - ✅ 返回值为字符串
   - ✅ 返回值符合historyId格式
   - ✅ 参数验证抛出正确错误
   - ✅ 不等待生成完成（< 5秒返回）

2. **getImageResult (video)**:
   - ✅ 正确映射视频URL
   - ✅ 状态码映射正确
   - ✅ 进度值范围0-100
   - ✅ 错误时包含error字段

3. **getBatchResults**:
   - ✅ 返回对象包含所有请求的ID
   - ✅ 无效ID返回error对象
   - ✅ 有效ID返回QueryResultResponse
   - ✅ 单次API调用（不是循环）

---

## Performance Contracts

| Method | Target Latency (p95) | Notes |
|--------|----------------------|-------|
| `generateVideoAsync` | < 3s | 包括图片上传时间 |
| `getImageResult` | < 500ms | 单个查询 |
| `getBatchResults` | < 500ms + 100ms/task | 批量查询 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-01 | Initial contract definition |