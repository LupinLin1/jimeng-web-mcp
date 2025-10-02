# API Contract: Text-to-Video Generation

**Method**: `generateTextToVideo(options: TextToVideoOptions): Promise<VideoTaskResult>`
**Version**: 1.0.0
**Date**: 2025-10-01

## Purpose

生成文本描述的视频，支持可选的首尾帧图片，统一支持同步/异步模式。

## Input Contract

### TypeScript Signature

```typescript
function generateTextToVideo(options: TextToVideoOptions): Promise<VideoTaskResult>
```

### Input Schema

```typescript
interface TextToVideoOptions {
  // Required
  prompt: string;                           // 视频描述文本

  // Optional - Frame Images
  firstFrameImage?: string;                 // 首帧图片路径
  lastFrameImage?: string;                  // 尾帧图片路径

  // Optional - Execution Mode
  async?: boolean;                          // 默认false（同步）

  // Optional - Video Parameters
  resolution?: '720p' | '1080p';            // 默认'720p'
  videoAspectRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';  // 默认'16:9'
  fps?: number;                             // 12-30，默认24
  duration?: number;                        // 3000-15000ms，默认5000
  model?: string;                           // 默认'jimeng-video-3.0'
}
```

### Validation Rules

| 字段 | 规则 | 错误消息 |
|------|------|----------|
| `prompt` | 非空字符串 | "提示词不能为空" |
| `firstFrameImage` | 可选，有效文件路径 | "首帧图片路径无效" |
| `lastFrameImage` | 可选，有效文件路径 | "尾帧图片路径无效" |
| `async` | 布尔值 | "async参数必须为布尔值" |
| `fps` | 12-30 | "帧率必须在12-30之间" |
| `duration` | 3000-15000 | "时长必须在3-15秒之间" |

## Output Contract

### Success Response (Sync Mode)

```typescript
{
  videoUrl: string;              // 生成的视频URL
  metadata: {
    duration: number;            // 实际时长（毫秒）
    resolution: string;          // 分辨率
    format: string;              // 格式（如'mp4'）
    generationParams: {
      mode: 'text_to_video';
      model: string;
      fps: number;
      aspectRatio: string;
    }
  }
}
```

### Success Response (Async Mode)

```typescript
{
  taskId: string;               // 任务ID，用于后续查询
}
```

### Error Response

```typescript
{
  error: {
    code: 'TIMEOUT' | 'CONTENT_VIOLATION' | 'API_ERROR' | 'INVALID_PARAMS' | 'PROCESSING_FAILED';
    message: string;            // 简短错误消息
    reason: string;             // 详细原因说明
    taskId?: string;            // 任务ID（如果有）
    timestamp: number;          // 错误时间戳
  }
}
```

## Behavioral Contract

### Sync Mode (`async: false` or unspecified)

1. 提交任务到即梦API
2. 立即开始轮询任务状态
3. 等待直到完成或超时（600秒）
4. 返回视频URL或抛出错误

**Timeout Behavior**:
- 超时时间：600秒（10分钟）
- 超时时抛出`TimeoutError`，错误码为`TIMEOUT`
- 错误消息包含建议："请使用async模式重试"

### Async Mode (`async: true`)

1. 提交任务到即梦API
2. 立即返回任务ID
3. 用户自行通过`checkVideoTaskStatus(taskId)`查询状态

### Image Upload Behavior

- 如果提供`firstFrameImage`或`lastFrameImage`，方法自动上传图片
- 上传失败时立即抛出错误（不创建任务）
- 支持本地路径和HTTP/HTTPS URL

## Error Scenarios

### 1. Invalid Prompt

**Input**: `{ prompt: "" }`
**Output**: Error with code `INVALID_PARAMS`
**Message**: "提示词不能为空"

### 2. Sync Timeout

**Input**: `{ prompt: "test", async: false }` (任务耗时>600秒)
**Output**: Error with code `TIMEOUT`
**Message**: "同步视频生成超时（600秒）"
**Reason**: "视频生成超过最大等待时间，请使用async模式"

### 3. Content Violation

**Input**: `{ prompt: "违规内容" }`
**Output**: Error with code `CONTENT_VIOLATION`
**Message**: "内容审核未通过"
**Reason**: "提示词包含违规内容：[具体原因]"

### 4. API Error

**Input**: Any valid input
**Output**: Error with code `API_ERROR`
**Message**: "API调用失败"
**Reason**: "即梦API返回错误：[具体错误]"

## Usage Examples

### Example 1: Simple Sync Generation

```typescript
const result = await generateTextToVideo({
  prompt: "一只猫在阳光下奔跑"
});

console.log(result.videoUrl);
// Output: "https://example.com/video/abc123.mp4"
```

### Example 2: With First/Last Frames (Sync)

```typescript
const result = await generateTextToVideo({
  prompt: "从静态到动态的转换",
  firstFrameImage: "/path/to/start.jpg",
  lastFrameImage: "/path/to/end.jpg",
  duration: 8000
});
```

### Example 3: Async Mode

```typescript
const result = await generateTextToVideo({
  prompt: "长时间复杂场景",
  async: true,
  duration: 15000
});

console.log(result.taskId);
// Output: "task_abc123"

// Later: check status
const status = await checkVideoTaskStatus(result.taskId);
```

### Example 4: Error Handling

```typescript
try {
  const result = await generateTextToVideo({
    prompt: "test video"
  });
} catch (error) {
  if (error.code === 'TIMEOUT') {
    console.log("超时，重试异步模式");
    const asyncResult = await generateTextToVideo({
      prompt: "test video",
      async: true
    });
  }
}
```

## Contract Tests

### Test Suite: `text-to-video-contract.test.ts`

```typescript
describe('generateTextToVideo Contract', () => {
  test('应该接受最小有效输入', async () => {
    const result = await generateTextToVideo({ prompt: "test" });
    expect(result).toHaveProperty('videoUrl');
  });

  test('同步模式应返回videoUrl', async () => {
    const result = await generateTextToVideo({ prompt: "test", async: false });
    expect(result.videoUrl).toBeDefined();
    expect(result.taskId).toBeUndefined();
  });

  test('异步模式应返回taskId', async () => {
    const result = await generateTextToVideo({ prompt: "test", async: true });
    expect(result.taskId).toBeDefined();
    expect(result.videoUrl).toBeUndefined();
  });

  test('空提示词应抛出INVALID_PARAMS错误', async () => {
    await expect(generateTextToVideo({ prompt: "" }))
      .rejects.toMatchObject({
        code: 'INVALID_PARAMS',
        message: expect.stringContaining('提示词')
      });
  });

  test('超时应抛出TIMEOUT错误', async () => {
    // Mock long-running task
    await expect(generateTextToVideoWithTimeout({ prompt: "test" }))
      .rejects.toMatchObject({
        code: 'TIMEOUT',
        reason: expect.stringContaining('async模式')
      });
  });
});
```

## Compatibility Notes

### Deprecation Path

现有的`generateVideo()`方法将显示废弃警告，引导用户迁移到`generateTextToVideo()`。

**Migration Example**:
```typescript
// Old (deprecated)
await generateVideo({ prompt: "test", filePath: ["/first.jpg", "/last.jpg"] });

// New
await generateTextToVideo({
  prompt: "test",
  firstFrameImage: "/first.jpg",
  lastFrameImage: "/last.jpg"
});
```

## Version History

- **1.0.0** (2025-10-01): Initial contract definition

---

**Contract Owner**: Video Generation Team
**Last Updated**: 2025-10-01
