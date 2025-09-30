# Research: 异步视频生成查询

**Feature**: 002-async-video-query
**Date**: 2025-10-01
**Status**: Complete

## Research Questions

### Q1: JiMeng API是否支持视频生成的异步查询机制？

**Decision**: 支持，使用 `/mweb/v1/get_history_by_ids` 接口

**Rationale**:
- 现有图片生成已实现异步模式 (`generateImageAsync` + `getImageResult`)
- 视频生成和图片生成都使用相同的 `/mweb/v1/aigc_draft/generate` 端点
- 响应都包含 `history_record_id` 字段用于后续查询
- `/mweb/v1/get_history_by_ids` 接口可同时查询图片和视频生成任务

**Evidence**:
```typescript
// src/api/JimengClient.ts:1521-1549
const pollResult = await this.request(
  'POST',
  '/mweb/v1/get_history_by_ids',
  {
    "history_ids": [historyId],
    "image_info": { /* ... */ }
  }
);

// 响应结构支持both图片和视频
const record = pollResult?.data?.[historyId];
if (firstItem.video_url) {
  response.videoUrl = firstItem.video_url; // 视频
} else if (firstItem.image_url) {
  response.imageUrls = [...]; // 图片
}
```

**Alternatives Considered**:
1. 创建新的视频专用查询端点 - ❌ API不提供
2. 使用draft_id轮询 - ❌ 图片生成已使用history_id模式，保持一致性

---

### Q2: 视频生成返回的history_id格式是否与图片一致？

**Decision**: 一致，都是纯数字字符串或'h'开头的字符串

**Rationale**:
- 图片和视频都通过 `/mweb/v1/aigc_draft/generate` 生成
- 响应结构中 `history_record_id` 字段格式相同
- 现有验证逻辑已覆盖两种格式：`/^[0-9]+$/` 或 `/^h[a-zA-Z0-9]+$/`

**Evidence**:
```typescript
// src/api/JimengClient.ts:1513-1516
const isValidFormat = /^[0-9]+$/.test(historyId) || /^h[a-zA-Z0-9]+$/.test(historyId);
```

---

### Q3: 批量查询的最佳实现方式？

**Decision**: 使用 `/mweb/v1/get_history_by_ids` 的原生批量能力

**Rationale**:
- API接口接受 `history_ids` 数组参数
- 单次请求可查询多个任务，减少网络开销
- 响应结构为对象，每个history_id对应一个结果

**Implementation**:
```typescript
const pollResult = await this.request(
  'POST',
  '/mweb/v1/get_history_by_ids',
  {
    "history_ids": [id1, id2, id3], // 批量查询
    "image_info": { /* ... */ }
  }
);

// 响应: { data: { [id1]: {...}, [id2]: {...}, [id3]: {...} } }
```

**Alternatives Considered**:
1. 并发多个单次查询 - ❌ 增加网络开销和API压力
2. 顺序查询 - ❌ 性能差

---

### Q4: 视频生成状态码映射规则？

**Decision**: 复用图片生成的状态映射逻辑

**Rationale**:
- 状态码定义在JiMeng API层面，图片和视频共享
- 现有映射已验证：50=completed, 30=failed, 20/42/45=pending/processing

**Status Mapping**:
```typescript
if (statusCode === 50) {
  status = 'completed';
} else if (statusCode === 30) {
  status = 'failed';
} else if (statusCode === 20 || statusCode === 42 || statusCode === 45) {
  status = finishedCount === 0 ? 'pending' : 'processing';
} else {
  status = 'processing'; // 未知状态码默认
}
```

---

### Q5: 异步视频生成提交接口实现方式？

**Decision**: 复用VideoGenerator现有方法，提取history_id立即返回

**Rationale**:
- 所有视频生成方法（传统、多帧、主体参考）都调用相同端点
- 响应中已包含 `history_record_id` 字段
- 只需移除轮询逻辑，立即返回ID即可

**Architecture**:
```
VideoGenerator (现有)
├── generateVideo() → 同步，等待完成
├── generateMainReferenceVideo() → 同步
└── videoPostProcess() → 同步

VideoGenerator (新增)
├── generateVideoAsync() → 异步，立即返回history_id
├── generateMainReferenceVideoAsync() → 异步
└── videoPostProcessAsync() → 异步
```

**Alternatives Considered**:
1. 修改现有方法添加async参数 - ❌ 违反向后兼容原则
2. 创建新的AsyncVideoGenerator类 - ❌ 过度工程，代码重复

---

## Technology Stack

**Language**: TypeScript 5.8.3
**Runtime**: Node.js (ES2020 target)
**HTTP Client**: Inherited from BaseClient
**Testing**: Jest (async test patterns from `async-image-generation.test.ts`)
**Type System**: Existing types from `src/types/api.types.ts`

---

## Architecture Decisions

### AD-001: 模块位置
**Decision**: 在 `VideoGenerator` 类中添加异步方法

**Rationale**:
- VideoGenerator已管理所有视频生成逻辑
- 异步方法与同步方法共享大量代码（参数验证、图片上传、请求构建）
- 符合Constitution Principle II: Modular Extension Architecture

**Implementation**:
```typescript
// src/api/video/VideoGenerator.ts
export class VideoGenerator extends BaseClient {
  // 现有同步方法
  public async generateVideo(): Promise<string> { /* ... */ }

  // 新增异步方法
  public async generateVideoAsync(): Promise<string> {
    // 复用现有逻辑到提交请求
    // 返回history_id而非等待完成
  }

  public async getVideoResult(historyId: string): Promise<QueryResultResponse> {
    // 调用BaseClient的查询逻辑
  }
}
```

---

### AD-002: 查询接口统一
**Decision**: 图片和视频共享 `getImageResult` 方法，不创建单独的 `getVideoResult`

**Rationale**:
- API查询接口不区分图片/视频，通过 `item_list` 内容判断
- 现有 `getImageResult` 已支持视频URL提取（Line 1590-1593）
- 减少API表面积，降低用户学习成本

**User Experience**:
```typescript
// 用户无需关心是图片还是视频
const result = await client.getImageResult(historyId);
if (result.videoUrl) {
  console.log('视频:', result.videoUrl);
} else if (result.imageUrls) {
  console.log('图片:', result.imageUrls);
}
```

---

### AD-003: 批量查询接口设计
**Decision**: 创建 `getBatchResults` 方法，接受数组并返回映射对象

**Rationale**:
- API原生支持批量查询，应暴露此能力
- 返回映射对象保持与API响应结构一致
- 错误任务ID不中断整体查询，单独标记错误

**Interface**:
```typescript
interface BatchQueryResponse {
  [historyId: string]: QueryResultResponse | { error: string };
}

public async getBatchResults(historyIds: string[]): Promise<BatchQueryResponse> {
  // 验证所有ID格式
  // 单次API调用查询全部
  // 解析每个ID的结果
}
```

---

## Performance Considerations

### Network Optimization
- **单次查询**: 响应时间目标 < 500ms
- **批量查询**: 额外开销目标 < 100ms per task
- **并发限制**: 批量查询建议≤10个任务（API可能有限制）

### Error Handling
- 无效history_id立即失败，不调用API
- API返回的无效ID标记为error，不抛出异常
- 网络超时使用BaseClient现有重试逻辑

---

## Testing Strategy

### Test Coverage Required

1. **Unit Tests** (`async-video-generation.test.ts`):
   - `generateVideoAsync()` 参数验证
   - `generateVideoAsync()` 返回history_id格式
   - `getImageResult()` 支持视频URL提取
   - `getBatchResults()` 批量查询逻辑
   - 错误场景：无效ID、网络错误、API错误

2. **Integration Tests** (`async-mcp-tools.test.ts`):
   - MCP工具 `generateVideoAsync` 端到端
   - MCP工具 `getVideoResult` （复用 `getImageResult`）
   - 完整异步流程：提交→查询pending→查询completed

3. **Backward Compatibility Tests**:
   - 确保现有同步方法不受影响
   - 确保图片异步查询功能不变
   - 确保MCP工具签名保持兼容

---

## Dependencies

**New Dependencies**: None

**Existing Dependencies**:
- BaseClient (HTTP, upload, logging)
- VideoGenerator (video generation logic)
- Types from `api.types.ts` (QueryResultResponse, GenerationStatus)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| JiMeng API视频查询返回格式变化 | High | 参考图片查询已验证格式，添加格式兼容性测试 |
| history_id格式未来变化 | Medium | 使用灵活的正则验证，记录日志便于诊断 |
| 批量查询API限制未知 | Low | 文档建议≤10个任务，添加参数验证 |
| 状态码新增未知值 | Low | 未知状态码默认为processing，记录警告日志 |

---

## Open Questions

**None** - All clarifications resolved during /clarify phase.

---

## References

- 现有实现: `src/api/JimengClient.ts` (Line 1451-1620)
- 视频生成: `src/api/video/VideoGenerator.ts`
- 类型定义: `src/types/api.types.ts` (QueryResultResponse)
- 测试模式: `src/__tests__/async-image-generation.test.ts`