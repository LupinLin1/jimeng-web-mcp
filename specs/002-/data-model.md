# Data Model: 异步视频生成查询

**Feature**: 002-async-video-query
**Date**: 2025-10-01

## Entity: VideoGenerationTask

### Description
表示一个视频生成任务的完整生命周期状态，包括输入参数、当前状态、生成进度和最终结果。此实体复用图片生成的 `QueryResultResponse` 类型定义。

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| **historyId** | `string` | Yes | 任务唯一标识符，由JiMeng API生成 | 纯数字或'h'开头字母数字串，正则：`/^[0-9]+$/` 或 `/^h[a-zA-Z0-9]+$/` |
| **status** | `GenerationStatus` | Yes | 当前生成状态 | 枚举值：`'pending'` \| `'processing'` \| `'completed'` \| `'failed'` |
| **progress** | `number` | Yes | 生成进度百分比 | 整数，范围0-100 |
| **videoUrl** | `string` | Optional | 生成完成的视频URL | 仅当 `status='completed'` 时存在 |
| **imageUrls** | `string[]` | Optional | 生成完成的图片URL数组（若为图片任务） | 仅当 `status='completed'` 且为图片任务时存在 |
| **error** | `string` | Optional | 错误信息 | 仅当 `status='failed'` 时存在 |

### State Transitions

```
Initial State: pending
  ↓ (任务开始处理)
processing (progress: 1-99%)
  ↓ (生成完成)
completed (progress: 100, videoUrl or imageUrls populated)

OR

pending/processing
  ↓ (生成失败)
failed (error message populated)
```

### Type Definition (Existing)

```typescript
// src/types/api.types.ts (Lines 263-278)
export interface QueryResultResponse {
  status: GenerationStatus;
  progress: number;
  imageUrls?: string[];
  videoUrl?: string;
  error?: string;
}

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

**Note**: 此类型已存在于 `api.types.ts`，本特性复用无需修改。

---

## Entity: BatchQueryRequest

### Description
批量查询多个任务状态的请求参数。

### Fields

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| **historyIds** | `string[]` | Yes | 要查询的任务ID数组 | 数组长度1-10（建议上限），每个ID符合historyId验证规则 |

---

## Entity: BatchQueryResponse

### Description
批量查询的响应，包含每个任务的状态或错误信息。

### Structure

```typescript
interface BatchQueryResponse {
  [historyId: string]: QueryResultResponse | { error: string };
}
```

### Example

```json
{
  "4721606420748": {
    "status": "completed",
    "progress": 100,
    "videoUrl": "https://..."
  },
  "invalid-id": {
    "error": "无效的historyId格式"
  },
  "4721606420749": {
    "status": "processing",
    "progress": 45
  }
}
```

---

## Entity Relationships

```
VideoGenerationTask
  ↑ 1:1
  │
  ├─ Created by: generateVideoAsync()
  ├─ Queried by: getImageResult() (single)
  └─ Queried by: getBatchResults() (multiple)
```

**No Persistence**: 任务状态存储在JiMeng API后端，本系统不持久化任务记录。

---

## Validation Rules Summary

### historyId Format Validation

```typescript
function validateHistoryId(historyId: string): boolean {
  if (!historyId || historyId.trim() === '') {
    throw new Error('historyId不能为空');
  }
  const isValid = /^[0-9]+$/.test(historyId) || /^h[a-zA-Z0-9]+$/.test(historyId);
  if (!isValid) {
    throw new Error('historyId必须是纯数字或以"h"开头的字母数字字符串');
  }
  return true;
}
```

### Status Code Mapping (from JiMeng API)

| API Status Code | Mapped Status | Condition |
|-----------------|---------------|-----------|
| 50 | `completed` | 生成完成 |
| 30 | `failed` | 生成失败 |
| 20, 42, 45 | `pending` or `processing` | `finishedCount === 0 ? 'pending' : 'processing'` |
| Other | `processing` | 未知状态码默认处理中 |

---

## Data Flow

### Async Video Generation Flow

```
User Request → generateVideoAsync(params)
  ↓
[Validate params, upload images if needed]
  ↓
POST /mweb/v1/aigc_draft/generate
  ↓
API Response: { data: { aigc_data: { history_record_id } } }
  ↓
Return historyId (String)
```

### Query Flow (Single)

```
User Request → getImageResult(historyId)
  ↓
[Validate historyId format]
  ↓
POST /mweb/v1/get_history_by_ids { history_ids: [historyId] }
  ↓
API Response: { data: { [historyId]: { status, item_list, ... } } }
  ↓
[Map status codes, extract videoUrl or imageUrls]
  ↓
Return QueryResultResponse
```

### Query Flow (Batch)

```
User Request → getBatchResults(historyIds[])
  ↓
[Validate all historyId formats]
  ↓
POST /mweb/v1/get_history_by_ids { history_ids: [...] }
  ↓
API Response: { data: { [id1]: {...}, [id2]: {...}, ... } }
  ↓
[Map each result, handle invalid IDs separately]
  ↓
Return BatchQueryResponse
```

---

## API Response Structures (JiMeng Backend)

### Generate Response

```typescript
{
  "data": {
    "aigc_data": {
      "history_record_id": "4721606420748",  // 任务ID
      "submit_id": "...",
      "draft_id": "..."
    }
  }
}
```

### Query Response

```typescript
{
  "data": {
    "[historyId]": {
      "status": 50,  // 状态码
      "fail_code": 0,
      "finished_image_count": 1,
      "total_image_count": 1,
      "item_list": [
        {
          "video_url": "https://...",  // 视频结果
          // OR
          "image_url": "https://...",  // 图片结果（旧格式）
          // OR
          "image": {
            "large_images": [
              { "image_url": "https://..." }  // 图片结果（新格式）
            ]
          }
        }
      ]
    }
  }
}
```

---

## Edge Cases

### Invalid History ID

**Behavior**: 立即抛出验证错误，不调用API

```typescript
// Input: "invalid-id"
throw new Error('无效的historyId格式: historyId必须是纯数字或以"h"开头的字母数字字符串');
```

### Non-existent History ID (from API)

**Behavior**: API返回空记录，映射为错误

```typescript
const record = pollResult?.data?.[historyId];
if (!record) {
  throw new Error('记录不存在');
}
```

### Expired Task

**Behavior**: API控制过期策略，返回空记录或特定状态码

```typescript
// 处理与"不存在"相同
throw new Error('记录不存在或已过期');
```

### Mixed Valid/Invalid IDs in Batch Query

**Behavior**: 有效ID返回状态，无效ID返回错误对象

```typescript
{
  "4721606420748": { status: "completed", ... },
  "invalid-id": { error: "无效的historyId格式" }
}
```

---

## Non-Functional Attributes

### Performance Targets

- **Single Query Latency**: < 500ms (p95)
- **Batch Query Latency**: < 500ms + 100ms per task (p95)
- **Batch Size Limit**: 建议 ≤ 10 tasks per request

### Scalability

- **Stateless Design**: 无本地状态存储，所有状态查询直接访问JiMeng API
- **Concurrent Queries**: 支持多个并发查询请求，无全局锁

### Reliability

- **Idempotency**: 查询操作幂等，多次查询相同ID返回一致结果（直到状态变化）
- **Error Isolation**: 批量查询中单个ID错误不影响其他ID查询

---

## Type Exports

```typescript
// All types already defined in src/types/api.types.ts
export { QueryResultResponse, GenerationStatus } from './types/api.types.js';

// New type for batch queries (to be added)
export interface BatchQueryResponse {
  [historyId: string]: QueryResultResponse | { error: string };
}
```