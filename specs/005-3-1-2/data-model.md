# Data Model: Video Generation Method Refactoring

**Feature**: Video Generation Method Refactoring
**Date**: 2025-10-01

## Overview

本文档定义视频生成方法重构涉及的数据模型、接口和类型定义。

## 1. Core Types

### 1.1 VideoGenerationMode

```typescript
/**
 * 视频生成模式枚举
 */
enum VideoGenerationMode {
  TEXT_TO_VIDEO = 'text_to_video',      // 文生视频及首尾帧
  MULTI_FRAME = 'multi_frame',          // 多帧视频
  MAIN_REFERENCE = 'main_reference'     // 主体参考
}
```

### 1.2 VideoTaskStatus

```typescript
/**
 * 视频任务状态
 */
type VideoTaskStatus =
  | 'pending'      // 等待处理
  | 'processing'   // 处理中
  | 'completed'    // 已完成
  | 'failed';      // 失败
```

### 1.3 VideoGenerationError

```typescript
/**
 * 视频生成错误对象
 */
interface VideoGenerationError {
  /** 错误码 */
  code:
    | 'TIMEOUT'            // 超时
    | 'CONTENT_VIOLATION'  // 内容违规
    | 'API_ERROR'          // API错误
    | 'INVALID_PARAMS'     // 参数无效
    | 'PROCESSING_FAILED'  // 处理失败
    | 'UNKNOWN';           // 未知错误

  /** 简短错误消息 */
  message: string;

  /** 详细原因说明 */
  reason: string;

  /** 关联的任务ID（如果有） */
  taskId?: string;

  /** 错误发生时间戳 */
  timestamp: number;
}
```

## 2. Request Types

### 2.1 BaseVideoGenerationOptions

```typescript
/**
 * 基础视频生成选项（所有方法共享）
 */
interface BaseVideoGenerationOptions {
  /** 是否异步模式，默认false（同步） */
  async?: boolean;

  /** 视频分辨率 */
  resolution?: '720p' | '1080p';

  /** 视频宽高比 */
  videoAspectRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

  /** 帧率 (12-30) */
  fps?: number;

  /** 时长（毫秒，3000-15000） */
  duration?: number;

  /** 模型名称 */
  model?: string;
}
```

### 2.2 TextToVideoOptions

```typescript
/**
 * 文生视频选项
 */
interface TextToVideoOptions extends BaseVideoGenerationOptions {
  /** 视频描述文本 */
  prompt: string;

  /** 首帧图片路径（可选） */
  firstFrameImage?: string;

  /** 尾帧图片路径（可选） */
  lastFrameImage?: string;
}
```

### 2.3 MultiFrameVideoOptions

```typescript
/**
 * 多帧视频选项
 */
interface MultiFrameVideoOptions extends BaseVideoGenerationOptions {
  /** 帧配置数组（2-10个） */
  frames: FrameConfiguration[];
}

/**
 * 单帧配置
 */
interface FrameConfiguration {
  /** 帧序号 */
  idx: number;

  /** 帧时长（毫秒） */
  duration_ms: number;

  /** 帧描述文本 */
  prompt: string;

  /** 参考图片路径 */
  image_path: string;
}
```

### 2.4 MainReferenceVideoOptions

```typescript
/**
 * 主体参考视频选项
 */
interface MainReferenceVideoOptions extends BaseVideoGenerationOptions {
  /** 参考图片路径数组（2-4张） */
  referenceImages: string[];

  /** 提示词，使用[图N]语法引用图片 */
  prompt: string;
}
```

## 3. Response Types

### 3.1 VideoTaskResult

```typescript
/**
 * 视频任务结果（统一返回类型）
 */
interface VideoTaskResult {
  /** 任务ID（异步模式返回） */
  taskId?: string;

  /** 视频URL（同步模式返回） */
  videoUrl?: string;

  /** 任务状态（查询时返回） */
  status?: VideoTaskStatus;

  /** 错误信息（失败时返回） */
  error?: VideoGenerationError;

  /** 视频元数据（完成时返回） */
  metadata?: VideoMetadata;
}
```

### 3.2 VideoMetadata

```typescript
/**
 * 视频元数据
 */
interface VideoMetadata {
  /** 实际时长（毫秒） */
  duration: number;

  /** 分辨率 */
  resolution: string;

  /** 文件大小（字节） */
  fileSize?: number;

  /** 格式 */
  format?: string;

  /** 生成参数快照 */
  generationParams: {
    mode: VideoGenerationMode;
    model: string;
    fps: number;
    aspectRatio: string;
  };
}
```

### 3.3 TaskStatusResponse

```typescript
/**
 * 任务状态查询响应
 */
interface TaskStatusResponse {
  /** 任务ID */
  taskId: string;

  /** 当前状态 */
  status: VideoTaskStatus;

  /** 进度百分比 (0-100) */
  progress?: number;

  /** 视频URL（完成时） */
  videoUrl?: string;

  /** 错误信息（失败时） */
  error?: VideoGenerationError;

  /** 元数据（完成时） */
  metadata?: VideoMetadata;

  /** 预计剩余时间（秒，可选） */
  estimatedTimeRemaining?: number;
}
```

## 4. Internal Types (Implementation)

### 4.1 PollingConfig

```typescript
/**
 * 轮询配置（内部使用）
 */
interface PollingConfig {
  /** 初始间隔（毫秒） */
  initialInterval: number;

  /** 最大间隔（毫秒） */
  maxInterval: number;

  /** 退避因子 */
  backoffFactor: number;

  /** 超时时间（毫秒） */
  timeout: number;
}
```

### 4.2 DeprecationWarning

```typescript
/**
 * 废弃警告配置
 */
interface DeprecationWarning {
  /** 旧方法名 */
  oldMethod: string;

  /** 新方法名 */
  newMethod: string;

  /** 迁移指南URL */
  migrationGuideUrl: string;

  /** 是否仅警告一次 */
  warnOnce?: boolean;
}
```

## 5. Validation Rules

### 5.1 TextToVideoOptions Validation

```typescript
const TextToVideoOptionsSchema = z.object({
  prompt: z.string().min(1, "提示词不能为空"),
  firstFrameImage: z.string().optional(),
  lastFrameImage: z.string().optional(),
  async: z.boolean().default(false),
  resolution: z.enum(['720p', '1080p']).default('720p'),
  videoAspectRatio: z.enum(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']).default('16:9'),
  fps: z.number().min(12).max(30).default(24),
  duration: z.number().min(3000).max(15000).default(5000),
  model: z.string().optional()
});
```

### 5.2 MultiFrameVideoOptions Validation

```typescript
const MultiFrameVideoOptionsSchema = z.object({
  frames: z.array(z.object({
    idx: z.number().int().nonnegative(),
    duration_ms: z.number().min(1000).max(5000),
    prompt: z.string().min(1),
    image_path: z.string()
  })).min(2).max(10),
  async: z.boolean().default(false),
  // ... 其他基础选项
});
```

### 5.3 MainReferenceVideoOptions Validation

```typescript
const MainReferenceVideoOptionsSchema = z.object({
  referenceImages: z.array(z.string()).min(2).max(4),
  prompt: z.string()
    .min(1)
    .refine(
      (p) => /\[图\d+\]/.test(p),
      "提示词必须包含至少一个[图N]引用"
    ),
  async: z.boolean().default(false),
  // ... 其他基础选项
});
```

## 6. State Transitions

### 6.1 Video Task State Machine

```
[Submit Task]
     ↓
  pending
     ↓
 processing
     ↓
  ├─→ completed → [Return Video URL]
  └─→ failed → [Return Error]
```

### 6.2 Sync Mode Flow

```
[Submit] → [Poll: pending] → [Poll: processing] → [Poll: completed] → [Return Result]
                                                ↘ [Timeout after 600s] → [Error]
```

### 6.3 Async Mode Flow

```
[Submit] → [Return Task ID]
             ↓
          [User Polls Manually]
             ↓
          [Get Status/Result]
```

## 7. Relationship Diagram

```
BaseVideoGenerationOptions
        ↑
        ├── TextToVideoOptions
        ├── MultiFrameVideoOptions
        └── MainReferenceVideoOptions
                ↓
          [Generator Classes]
                ↓
          VideoTaskResult
                ↓
        ┌──────┴──────┐
        ↓              ↓
   taskId         videoUrl
   (async)        (sync)
```

## 8. Constraints Summary

| 字段 | 约束 | 说明 |
|------|------|------|
| `prompt` | 非空字符串 | 所有模式必需 |
| `frames` | 2-10个元素 | 多帧模式 |
| `referenceImages` | 2-4个元素 | 主体参考模式 |
| `fps` | 12-30 | 帧率范围 |
| `duration` | 3000-15000ms | 时长范围 |
| `async` | boolean | 默认false |
| `resolution` | '720p' \| '1080p' | 分辨率选项 |
| `timeout` | 600000ms | 同步模式超时 |

## 9. Extension Points

### 未来可能的扩展

1. **批量生成** - 支持一次提交多个视频任务
2. **优先级控制** - 允许用户指定任务优先级
3. **回调通知** - 异步任务完成时通过webhook通知
4. **缓存机制** - 相同参数的视频结果缓存
5. **部分结果** - 处理中返回预览帧

---

**数据模型版本**: 1.0.0
**最后更新**: 2025-10-01
