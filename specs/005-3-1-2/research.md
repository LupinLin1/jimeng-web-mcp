# Research Document: Video Generation Method Refactoring

**Feature**: Video Generation Method Refactoring
**Date**: 2025-10-01
**Status**: Complete

## Research Summary

本文档记录了视频生成方法重构的技术研究结果，包括架构决策、模式选择和实现策略。

## 1. 同步/异步统一处理模式

### Decision
采用**条件轮询模式** (Conditional Polling Pattern) 实现统一的同步/异步接口。

### Rationale
- 即梦API本质上是异步的（提交任务→返回ID→轮询状态）
- 同步模式通过内部轮询包装异步API，对用户透明
- 异步模式直接返回任务ID，由用户自行管理轮询

### Alternatives Considered
1. **Promise/Callback双接口** - 被拒绝：需要维护两套独立方法
2. **Async Iterators** - 被拒绝：过于复杂，用户体验不佳
3. **条件轮询模式** - ✅ 选择：简单、统一、易于理解

### Implementation Pattern
```typescript
interface VideoGenerationOptions {
  async?: boolean; // 默认false（同步模式）
  // ... 其他参数
}

async function generateVideo(options: VideoGenerationOptions) {
  const taskId = await submitTask(options);

  if (options.async) {
    return { taskId }; // 立即返回
  }

  // 同步模式：内部轮询直到完成
  return await pollUntilComplete(taskId, { timeout: 600000 });
}
```

## 2. 超时处理策略

### Decision
采用**指数退避轮询 + 硬超时限制**（Exponential Backoff with Hard Timeout）

### Rationale
- 600秒（10分钟）对于视频生成是合理的上限
- 指数退避减少API调用频率，避免过度轮询
- 硬超时确保用户不会无限等待

### Polling Schedule
- 初始间隔：2秒
- 最大间隔：10秒
- 退避因子：1.5
- 硬超时：600秒

### Implementation
```typescript
async function pollUntilComplete(taskId: string, options: { timeout: number }) {
  const startTime = Date.now();
  let interval = 2000; // 2秒
  const maxInterval = 10000; // 10秒

  while (Date.now() - startTime < options.timeout) {
    const result = await checkTaskStatus(taskId);
    if (result.status === 'completed') return result;
    if (result.status === 'failed') throw new Error(result.error);

    await sleep(interval);
    interval = Math.min(interval * 1.5, maxInterval);
  }

  throw new TimeoutError('同步视频生成超时（600秒），请使用async模式');
}
```

## 3. 错误处理结构

### Decision
采用**结构化错误对象**（Structured Error Objects）

### Rationale
- 满足FR-014要求：错误码、详细消息、原因说明
- 易于解析和处理
- 支持国际化（中英文消息）

### Error Schema
```typescript
interface VideoGenerationError {
  code: string;           // 错误码（如：TIMEOUT、CONTENT_VIOLATION）
  message: string;        // 简短消息
  reason: string;         // 详细原因说明
  taskId?: string;        // 关联的任务ID（如果有）
  timestamp: number;      // 错误发生时间
}
```

### Common Error Codes
- `TIMEOUT` - 同步模式超时
- `CONTENT_VIOLATION` - 内容违规
- `API_ERROR` - API调用失败
- `INVALID_PARAMS` - 参数无效
- `PROCESSING_FAILED` - 生成失败

## 4. 废弃策略实现

### Decision
采用**软废弃 + Console警告**（Soft Deprecation with Console Warnings）

### Rationale
- 满足FR-015要求：保持功能可用，显示警告
- 不破坏现有用户代码
- 提供迁移指导

### Implementation Pattern
```typescript
function generateVideo(...args) {
  console.warn(
    '[DEPRECATED] generateVideo() is deprecated. ' +
    'Use generateTextToVideo() with async parameter instead. ' +
    'Migration guide: https://docs.example.com/migration'
  );

  // 原有逻辑保持不变
  return originalGenerateVideo(...args);
}
```

### Migration Guide Content
- 旧方法 → 新方法映射表
- 参数转换示例
- 行为差异说明（如果有）

## 5. 模块组织策略

### Decision
采用**Generator类模式**（Generator Class Pattern）

### Rationale
- 符合现有架构（MainReferenceVideoGenerator已存在）
- 清晰的职责分离
- 易于测试和维护

### Module Structure
```
src/api/video/
├── VideoGenerator.ts              # 基类或工具方法
├── TextToVideoGenerator.ts        # 文生视频
├── MultiFrameVideoGenerator.ts    # 多帧视频
└── MainReferenceVideoGenerator.ts # 主体参考（已存在）
```

### Class Hierarchy
```typescript
// 选项1：继承现有BaseClient
class TextToVideoGenerator extends BaseClient {
  async generate(options: TextToVideoOptions): Promise<Result> { ... }
}

// 选项2：组合模式（推荐）
class TextToVideoGenerator {
  constructor(private client: JimengClient) {}
  async generate(options: TextToVideoOptions): Promise<Result> { ... }
}
```

## 6. 类型定义扩展

### Decision
扩展`api.types.ts`，添加新接口定义

### New Type Definitions
```typescript
// 基础选项接口
interface BaseVideoGenerationOptions {
  async?: boolean;
  resolution?: '720p' | '1080p';
  videoAspectRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  fps?: number;
  duration?: number;
  model?: string;
}

// 文生视频选项
interface TextToVideoOptions extends BaseVideoGenerationOptions {
  prompt: string;
  firstFrameImage?: string;
  lastFrameImage?: string;
}

// 多帧视频选项
interface MultiFrameVideoOptions extends BaseVideoGenerationOptions {
  frames: Array<{
    idx: number;
    duration_ms: number;
    prompt: string;
    image_path: string;
  }>;
}

// 任务结果
interface VideoTaskResult {
  taskId?: string;       // 异步模式返回
  videoUrl?: string;     // 同步模式返回
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error?: VideoGenerationError;
}
```

## 7. MCP工具注册

### Decision
注册三个新MCP工具，保留现有工具

### New MCP Tools
1. `generateTextToVideo` - 文生视频及首尾帧
2. `generateMultiFrameVideo` - 多帧视频
3. `generateMainReferenceVideo` - 主体参考（已存在，可能需要更新）

### Tool Schema Updates
```typescript
server.tool("generateTextToVideo", {
  description: "文生视频及首尾帧生成，支持同步/异步模式",
  inputSchema: z.object({
    prompt: z.string(),
    firstFrameImage: z.string().optional(),
    lastFrameImage: z.string().optional(),
    async: z.boolean().default(false),
    // ... 其他通用参数
  })
});
```

## 8. 测试策略

### Decision
采用**TDD + 分层测试**（TDD with Layered Testing）

### Test Categories
1. **单元测试** - 每个Generator类的独立测试
2. **集成测试** - 端到端API调用测试
3. **行为测试** - 同步/异步模式行为验证
4. **废弃测试** - 废弃警告的触发验证

### Mock Strategy
- 使用Jest mock模拟即梦API响应
- 模拟轮询场景（pending → processing → completed）
- 模拟失败场景（timeout、content_violation等）

### Test Coverage Goals
- 单元测试覆盖率：>90%
- 集成测试：每个方法至少2个场景（成功/失败）
- 边界测试：超时、参数验证、错误处理

## 9. 向后兼容性验证

### Decision
通过**回归测试套件**验证向后兼容性

### Verification Strategy
1. 保留所有现有测试用例不变
2. 新增废弃警告验证测试
3. 确保现有方法的行为完全一致（除了console.warn）

### Breaking Change Checklist
- [ ] 是否修改了公共API签名？→ 否
- [ ] 是否改变了返回值结构？→ 否
- [ ] 是否移除了任何导出函数？→ 否
- [ ] 是否改变了默认参数值？→ 否

## 10. 性能考虑

### Decision
接受**轮询开销**作为简单性的代价

### Performance Analysis
- 轮询频率：初始2秒，最大10秒
- 平均视频生成时间：30-180秒（估计）
- 预期轮询次数：5-20次
- 额外延迟：可忽略（<1秒）

### Optimization Opportunities (Future)
- WebSocket实时通知（需要即梦API支持）
- 客户端缓存任务状态
- 批量状态查询（同时轮询多个任务）

## Research Completion Checklist

- [x] 技术上下文中所有"NEEDS CLARIFICATION"已解决
- [x] 每个关键决策有明确的Rationale
- [x] 备选方案已评估并记录
- [x] 实现模式已定义
- [x] 性能和约束已考虑
- [x] 向后兼容性策略已验证

---

**研究完成时间**: 2025-10-01
**下一步**: Phase 1 - 设计与契约生成
