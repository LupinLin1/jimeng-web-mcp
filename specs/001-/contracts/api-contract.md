# API Contract: Generation Status Query

**Feature**: 001- Generation Status Query Method
**Protocol**: TypeScript Function API + MCP Tools
**Date**: 2025-09-30

## Overview

This document defines the programmatic contracts for querying generation status and retrieving results. All contracts maintain backward compatibility with existing API surface.

⚠️ **CRITICAL IMPLEMENTATION CONSTRAINT**

**User Requirement**: Cannot modify any existing endpoint requests or responses

**What This Means**:
- ✅ NEW functions can wrap existing internal methods
- ✅ NEW types can transform responses in wrapper layer
- ❌ CANNOT modify `/mweb/v1/aigc_draft/generate` endpoint
- ❌ CANNOT modify `/mweb/v1/get_history_by_ids` endpoint
- ❌ CANNOT change existing `generateImage()` or `generateVideo()` behavior
- ❌ CANNOT modify `pollTraditionalResult()` internal implementation

**Implementation Strategy**: Add thin wrapper functions that call existing polling infrastructure, transforming responses only at the wrapper boundary.

## Function API Contracts

### 1. generateImageAsync

**Purpose**: Submit image generation task without waiting for completion.

**Signature**:
```typescript
function generateImageAsync(
  params: ImageGenerationParams
): Promise<string>
```

**Parameters**:
- `params`: ImageGenerationParams (existing type, no changes)
  - `prompt`: string (required) - Generation prompt
  - `refresh_token`: string (required) - API authentication token
  - `model`: string (optional) - Model name (default: 'jimeng-4.0')
  - `filePath`: string[] (optional) - Reference image paths
  - ... (all other existing optional parameters)

**Returns**:
- Promise<string>: historyId for subsequent status queries

**Example**:
```typescript
const historyId = await generateImageAsync({
  prompt: '美丽的风景画',
  refresh_token: 'your_token_here',
  model: 'jimeng-4.0'
});
// historyId = 'h1234567890abcdef'
```

**Error Cases**:
```typescript
// Missing refresh_token
await generateImageAsync({ prompt: '...' });
// Throws: Error('refresh_token is required')

// Empty prompt
await generateImageAsync({ prompt: '', refresh_token: '...' });
// Throws: Error('prompt必须是非空字符串')

// API submission failure
await generateImageAsync({ prompt: '...', refresh_token: 'invalid' });
// Throws: Error('提交失败: [API error message]')
```

**Preconditions**:
- `params.refresh_token` must be valid JiMeng API token
- `params.prompt` must be non-empty string
- If `params.filePath` provided, files must exist and be accessible

**Postconditions**:
- Returns valid historyId (format: `^h[a-zA-Z0-9]+$`)
- historyId can be used immediately with getImageResult
- Generation processing continues asynchronously on JiMeng backend

**Side Effects**:
- Consumes JiMeng API credits (based on model and parameters)
- Creates generation task in JiMeng backend

---

### 2. getImageResult

**Purpose**: Query status and retrieve results for a generation task.

**Signature**:
```typescript
function getImageResult(
  historyId: string,
  refresh_token?: string
): Promise<QueryResultResponse>
```

**Parameters**:
- `historyId`: string (required) - Generation reference from generateImageAsync
- `refresh_token`: string (optional) - API token (falls back to JIMENG_API_TOKEN env var)

**Returns**:
- Promise<QueryResultResponse>: Current generation status and results

**Response Structure**:
```typescript
interface QueryResultResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;  // 0-100
  imageUrls?: string[];
  videoUrl?: string;
  error?: string;
}
```

**Examples**:

```typescript
// Pending state
const result1 = await getImageResult('h123', 'token');
// { status: 'pending', progress: 5 }

// Processing state
const result2 = await getImageResult('h123', 'token');
// { status: 'processing', progress: 50 }

// Completed state
const result3 = await getImageResult('h123', 'token');
// {
//   status: 'completed',
//   progress: 100,
//   imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
// }

// Failed state
const result4 = await getImageResult('h456', 'token');
// { status: 'failed', progress: 80, error: '内容被过滤' }

// Using environment variable
process.env.JIMENG_API_TOKEN = 'your_token';
const result5 = await getImageResult('h789');
// { status: 'completed', progress: 100, imageUrls: [...] }
```

**Error Cases**:
```typescript
// Invalid historyId format
await getImageResult('', 'token');
// Throws: Error('无效的historyId格式')

await getImageResult('123abc', 'token');  // Missing 'h' prefix
// Throws: Error('无效的historyId格式')

// historyId not found
await getImageResult('h_nonexistent', 'token');
// Throws: Error('记录不存在')

// Expired historyId
await getImageResult('h_very_old_id', 'token');
// Throws: Error('historyId已过期')

// Missing token
await getImageResult('h123');  // No env var set
// Throws: Error('JIMENG_API_TOKEN 环境变量未设置')

// Network errors (after 3 retries)
await getImageResult('h123', 'token');
// Throws: Error('网络错误超过最大重试次数: [details]')
```

**Preconditions**:
- `historyId` must be valid format (`^h[a-zA-Z0-9]+$`)
- `refresh_token` or JIMENG_API_TOKEN must be set
- historyId must exist in JiMeng backend (not expired)

**Postconditions**:
- Returns current state of generation task
- Does not modify task state (idempotent)
- Can be called multiple times for same historyId

**Side Effects**:
- Makes HTTP request to JiMeng backend
- No credits consumed (query operations are free)

**Polling Recommendations**:
- Poll every 5-10 seconds for optimal balance
- Stop polling when status is 'completed' or 'failed'
- Implement exponential backoff for long-running tasks
- Maximum recommended polling duration: 5 minutes

---

## MCP Tool Contracts

### 1. generateImageAsync Tool

**MCP Schema**:
```typescript
{
  name: "generateImageAsync",
  description: "Submit async image generation without waiting for completion",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "Generation prompt" },
      model: { type: "string", description: "Model name (default: jimeng-4.0)" },
      filePath: {
        type: "array",
        items: { type: "string" },
        description: "Reference image paths"
      },
      aspectRatio: { type: "string", description: "Aspect ratio (e.g., 16:9)" },
      // ... other optional parameters
    },
    required: ["prompt"]
  }
}
```

**Tool Response**:
```typescript
// Success
{
  content: [{
    type: "text",
    text: "异步任务已提交成功！\n\nhistoryId: h1234567890abcdef\n\n请使用 getImageResult 工具查询生成结果。"
  }]
}

// Error
{
  content: [{
    type: "text",
    text: "❌ 提交失败: [error message]"
  }],
  isError: true
}
```

---

### 2. getImageResult Tool

**MCP Schema**:
```typescript
{
  name: "getImageResult",
  description: "Query generation status and retrieve results",
  inputSchema: {
    type: "object",
    properties: {
      historyId: {
        type: "string",
        description: "Generation reference ID from generateImageAsync",
        pattern: "^h[a-zA-Z0-9]+$"
      }
    },
    required: ["historyId"]
  }
}
```

**Tool Response**:
```typescript
// Pending/Processing
{
  content: [{
    type: "text",
    text: "⏳ 生成中...\n\n状态: processing\n进度: 50%"
  }]
}

// Completed (Images)
{
  content: [{
    type: "text",
    text: "✅ 生成完成！\n\n状态: completed\n进度: 100%\n\n生成结果:\n- https://example.com/img1.jpg\n- https://example.com/img2.jpg"
  }]
}

// Completed (Video)
{
  content: [{
    type: "text",
    text: "✅ 生成完成！\n\n状态: completed\n进度: 100%\n\n视频URL: https://example.com/video.mp4"
  }]
}

// Failed
{
  content: [{
    type: "text",
    text: "❌ 生成失败\n\n状态: failed\n进度: 80%\n错误: 内容被过滤"
  }],
  isError: true
}

// Error
{
  content: [{
    type: "text",
    text: "❌ 查询失败: 记录不存在"
  }],
  isError: true
}
```

---

## Contract Tests

### Test 1: generateImageAsync Contract

```typescript
describe('generateImageAsync contract', () => {
  it('returns historyId string on success', async () => {
    const historyId = await generateImageAsync({
      prompt: 'test',
      refresh_token: 'valid_token'
    });

    expect(typeof historyId).toBe('string');
    expect(historyId).toMatch(/^h[a-zA-Z0-9]+$/);
  });

  it('throws on missing refresh_token', async () => {
    await expect(
      generateImageAsync({ prompt: 'test' } as any)
    ).rejects.toThrow('refresh_token is required');
  });

  it('accepts all ImageGenerationParams', async () => {
    const historyId = await generateImageAsync({
      prompt: 'test',
      refresh_token: 'token',
      model: 'jimeng-4.0',
      filePath: ['/path/to/ref.jpg'],
      aspectRatio: '16:9',
      negative_prompt: 'bad quality'
    });

    expect(historyId).toMatch(/^h[a-zA-Z0-9]+$/);
  });
});
```

### Test 2: getImageResult Contract

```typescript
describe('getImageResult contract', () => {
  it('returns QueryResultResponse structure', async () => {
    const result = await getImageResult('h123', 'token');

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('progress');
    expect(result.status).toMatch(/^(pending|processing|completed|failed)$/);
    expect(result.progress).toBeGreaterThanOrEqual(0);
    expect(result.progress).toBeLessThanOrEqual(100);
  });

  it('returns imageUrls when completed (images)', async () => {
    const result = await getImageResult('h_completed_image', 'token');

    expect(result.status).toBe('completed');
    expect(result.progress).toBe(100);
    expect(Array.isArray(result.imageUrls)).toBe(true);
    expect(result.imageUrls!.length).toBeGreaterThan(0);
    expect(result.videoUrl).toBeUndefined();
  });

  it('returns videoUrl when completed (video)', async () => {
    const result = await getImageResult('h_completed_video', 'token');

    expect(result.status).toBe('completed');
    expect(result.progress).toBe(100);
    expect(typeof result.videoUrl).toBe('string');
    expect(result.imageUrls).toBeUndefined();
  });

  it('returns error when failed', async () => {
    const result = await getImageResult('h_failed', 'token');

    expect(result.status).toBe('failed');
    expect(typeof result.error).toBe('string');
    expect(result.error!.length).toBeGreaterThan(0);
  });

  it('throws on invalid historyId format', async () => {
    await expect(
      getImageResult('', 'token')
    ).rejects.toThrow('无效的historyId格式');

    await expect(
      getImageResult('123abc', 'token')
    ).rejects.toThrow('无效的historyId格式');
  });

  it('throws on non-existent historyId', async () => {
    await expect(
      getImageResult('h_nonexistent', 'token')
    ).rejects.toThrow('记录不存在');
  });

  it('uses environment variable when token not provided', async () => {
    process.env.JIMENG_API_TOKEN = 'env_token';
    const result = await getImageResult('h123');

    expect(result).toHaveProperty('status');
  });

  it('throws when no token available', async () => {
    delete process.env.JIMENG_API_TOKEN;

    await expect(
      getImageResult('h123')
    ).rejects.toThrow('JIMENG_API_TOKEN 环境变量未设置');
  });
});
```

### Test 3: Concurrent Query Contract

```typescript
describe('concurrent queries', () => {
  it('handles multiple concurrent queries', async () => {
    const historyIds = ['h1', 'h2', 'h3'];
    const promises = historyIds.map(id => getImageResult(id, 'token'));
    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('progress');
    });
  });
});
```

### Test 4: MCP Tool Contract

```typescript
describe('MCP tool contracts', () => {
  it('generateImageAsync tool returns historyId text', async () => {
    const response = await server.callTool('generateImageAsync', {
      prompt: 'test'
    });

    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toContain('historyId:');
    expect(response.content[0].text).toMatch(/h[a-zA-Z0-9]+/);
  });

  it('getImageResult tool returns status text', async () => {
    const response = await server.callTool('getImageResult', {
      historyId: 'h123'
    });

    expect(response.content[0].type).toBe('text');
    expect(response.content[0].text).toMatch(/状态:/);
    expect(response.content[0].text).toMatch(/进度:/);
  });
});
```

---

## Versioning and Evolution

**Current Version**: 1.0.0 (Initial implementation)

**Backward Compatibility Promise**:
- All existing function signatures unchanged
- New functions are additive only
- Response structure fields are stable (new fields may be added as optional)
- Error messages may change wording but not semantics

**Future Extensions** (would be backward compatible):
- Add `metadata` optional field to QueryResultResponse
- Add `estimatedTimeRemaining` field for processing states
- Add `cancelGeneration(historyId)` function
- Add batch query function `getMultipleResults(historyIds[])`

**Breaking Changes** (would require major version bump):
- Change historyId format
- Remove required fields from QueryResultResponse
- Change status enum values
- Remove existing functions

---

## Summary

**Total Contracts**: 4 (2 functions + 2 MCP tools)

**Input Validation**: historyId format, token presence, parameter types

**Output Guarantees**: Type-safe responses, exhaustive status coverage, consistent error messages

**Compatibility**: 100% backward compatible, additive-only changes

**Test Coverage**: Unit tests, integration tests, contract tests, MCP tool tests