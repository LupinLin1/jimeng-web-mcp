# API Contract: Multi-Frame Video Generation

**Method**: `generateMultiFrameVideo(options: MultiFrameVideoOptions): Promise<VideoTaskResult>`
**Version**: 1.0.0
**Date**: 2025-10-01

## Purpose

根据多个关键帧配置生成视频，每个帧可以指定独立的提示词、时长和参考图片，支持同步/异步模式。

## Input Contract

### TypeScript Signature

```typescript
function generateMultiFrameVideo(options: MultiFrameVideoOptions): Promise<VideoTaskResult>
```

### Input Schema

```typescript
interface MultiFrameVideoOptions {
  // Required
  frames: FrameConfiguration[];            // 2-10个帧配置

  // Optional - Execution Mode
  async?: boolean;                         // 默认false（同步）

  // Optional - Video Parameters
  resolution?: '720p' | '1080p';
  videoAspectRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  fps?: number;                            // 12-30
  model?: string;
}

interface FrameConfiguration {
  idx: number;                             // 帧序号（0-based）
  duration_ms: number;                     // 帧时长（1000-5000ms）
  prompt: string;                          // 帧描述文本
  image_path: string;                      // 参考图片路径
}
```

### Validation Rules

| 字段 | 规则 | 错误消息 |
|------|------|----------|
| `frames` | 2-10个元素的数组 | "帧数量必须在2-10之间" |
| `frames[].idx` | 非负整数 | "帧序号必须为非负整数" |
| `frames[].duration_ms` | 1000-5000 | "帧时长必须在1-5秒之间" |
| `frames[].prompt` | 非空字符串 | "帧提示词不能为空" |
| `frames[].image_path` | 有效文件路径 | "参考图片路径无效" |

**Additional Rules**:
- 帧序号必须唯一且连续（0, 1, 2, ...）
- 所有帧的`duration_ms`总和不能超过15000ms
- 所有参考图片必须存在且可访问

## Output Contract

### Success Response (Sync Mode)

```typescript
{
  videoUrl: string;
  metadata: {
    duration: number;            // 实际总时长
    resolution: string;
    format: string;
    generationParams: {
      mode: 'multi_frame';
      model: string;
      frameCount: number;        // 帧数量
      fps: number;
      aspectRatio: string;
    }
  }
}
```

### Success Response (Async Mode)

```typescript
{
  taskId: string;
}
```

### Error Response

```typescript
{
  error: {
    code: 'TIMEOUT' | 'CONTENT_VIOLATION' | 'API_ERROR' | 'INVALID_PARAMS' | 'PROCESSING_FAILED';
    message: string;
    reason: string;
    taskId?: string;
    timestamp: number;
  }
}
```

## Behavioral Contract

### Frame Processing Order

1. 按`idx`字段升序排序帧
2. 依次上传每个帧的参考图片
3. 提交多帧任务到即梦API
4. 同步模式：轮询直到完成或超时
5. 异步模式：立即返回任务ID

### Duration Calculation

- 视频总时长 = sum(frames[].duration_ms)
- 帧间过渡由AI自动生成

### Image Upload Behavior

- 所有帧的图片在任务提交前批量上传
- 任何一张图片上传失败都会导致整个任务失败
- 上传顺序与帧序号无关（并行上传）

## Error Scenarios

### 1. Invalid Frame Count

**Input**: `{ frames: [single_frame] }`
**Output**: Error with code `INVALID_PARAMS`
**Message**: "帧数量必须在2-10之间"

### 2. Duplicate Frame Index

**Input**:
```typescript
{
  frames: [
    { idx: 0, duration_ms: 2000, prompt: "A", image_path: "/a.jpg" },
    { idx: 0, duration_ms: 2000, prompt: "B", image_path: "/b.jpg" }
  ]
}
```
**Output**: Error with code `INVALID_PARAMS`
**Message**: "帧序号必须唯一"

### 3. Total Duration Exceeds Limit

**Input**:
```typescript
{
  frames: [
    { idx: 0, duration_ms: 8000, ... },
    { idx: 1, duration_ms: 8000, ... }
  ]
}
```
**Output**: Error with code `INVALID_PARAMS`
**Message**: "总时长不能超过15秒"

### 4. Image Upload Failed

**Input**: `{ frames: [{ ..., image_path: "/nonexistent.jpg" }] }`
**Output**: Error with code `API_ERROR`
**Message**: "图片上传失败"
**Reason**: "文件不存在：/nonexistent.jpg"

## Usage Examples

### Example 1: Simple Two-Frame Video

```typescript
const result = await generateMultiFrameVideo({
  frames: [
    {
      idx: 0,
      duration_ms: 3000,
      prompt: "开场：静态风景",
      image_path: "/frames/frame0.jpg"
    },
    {
      idx: 1,
      duration_ms: 3000,
      prompt: "结尾：动态镜头",
      image_path: "/frames/frame1.jpg"
    }
  ]
});

console.log(result.videoUrl);
```

### Example 2: Multi-Scene Video (Sync)

```typescript
const result = await generateMultiFrameVideo({
  frames: [
    { idx: 0, duration_ms: 2000, prompt: "场景1", image_path: "/s1.jpg" },
    { idx: 1, duration_ms: 2000, prompt: "场景2", image_path: "/s2.jpg" },
    { idx: 2, duration_ms: 2000, prompt: "场景3", image_path: "/s3.jpg" },
    { idx: 3, duration_ms: 2000, prompt: "场景4", image_path: "/s4.jpg" }
  ],
  fps: 30,
  resolution: '1080p'
});
```

### Example 3: Async Mode

```typescript
const result = await generateMultiFrameVideo({
  frames: [...],
  async: true
});

// Poll for status
const status = await checkVideoTaskStatus(result.taskId);
```

### Example 4: Error Handling

```typescript
try {
  const result = await generateMultiFrameVideo({
    frames: [...]
  });
} catch (error) {
  if (error.code === 'INVALID_PARAMS') {
    console.error("参数验证失败:", error.reason);
  } else if (error.code === 'API_ERROR') {
    console.error("API错误:", error.message);
  }
}
```

## Contract Tests

### Test Suite: `multi-frame-video-contract.test.ts`

```typescript
describe('generateMultiFrameVideo Contract', () => {
  test('应该接受2个帧的最小配置', async () => {
    const result = await generateMultiFrameVideo({
      frames: [
        { idx: 0, duration_ms: 2000, prompt: "A", image_path: "/a.jpg" },
        { idx: 1, duration_ms: 2000, prompt: "B", image_path: "/b.jpg" }
      ]
    });
    expect(result).toHaveProperty('videoUrl');
  });

  test('同步模式应返回videoUrl', async () => {
    const result = await generateMultiFrameVideo({
      frames: [...],
      async: false
    });
    expect(result.videoUrl).toBeDefined();
  });

  test('异步模式应返回taskId', async () => {
    const result = await generateMultiFrameVideo({
      frames: [...],
      async: true
    });
    expect(result.taskId).toBeDefined();
  });

  test('少于2个帧应抛出错误', async () => {
    await expect(generateMultiFrameVideo({
      frames: [{ idx: 0, duration_ms: 2000, prompt: "A", image_path: "/a.jpg" }]
    })).rejects.toMatchObject({
      code: 'INVALID_PARAMS',
      message: expect.stringContaining('2-10')
    });
  });

  test('超过10个帧应抛出错误', async () => {
    const frames = Array.from({ length: 11 }, (_, i) => ({
      idx: i,
      duration_ms: 1000,
      prompt: `Frame ${i}`,
      image_path: `/frame${i}.jpg`
    }));

    await expect(generateMultiFrameVideo({ frames }))
      .rejects.toMatchObject({
        code: 'INVALID_PARAMS'
      });
  });

  test('重复的帧序号应抛出错误', async () => {
    await expect(generateMultiFrameVideo({
      frames: [
        { idx: 0, duration_ms: 2000, prompt: "A", image_path: "/a.jpg" },
        { idx: 0, duration_ms: 2000, prompt: "B", image_path: "/b.jpg" }
      ]
    })).rejects.toMatchObject({
      code: 'INVALID_PARAMS',
      message: expect.stringContaining('唯一')
    });
  });
});
```

## Compatibility Notes

### Deprecation Path

现有的`generateVideo({ multiFrames: [...] })`调用方式将显示废弃警告。

**Migration Example**:
```typescript
// Old (deprecated)
await generateVideo({
  prompt: "main prompt",
  multiFrames: [
    { idx: 0, duration_ms: 2000, prompt: "A", image_path: "/a.jpg" },
    { idx: 1, duration_ms: 2000, prompt: "B", image_path: "/b.jpg" }
  ]
});

// New
await generateMultiFrameVideo({
  frames: [
    { idx: 0, duration_ms: 2000, prompt: "A", image_path: "/a.jpg" },
    { idx: 1, duration_ms: 2000, prompt: "B", image_path: "/b.jpg" }
  ]
});
```

## Performance Notes

- 图片上传时间与帧数量成正比（串行上传）
- 建议使用异步模式处理超过5个帧的视频
- 1080p生成时间约为720p的1.5-2倍

## Version History

- **1.0.0** (2025-10-01): Initial contract definition

---

**Contract Owner**: Video Generation Team
**Last Updated**: 2025-10-01
