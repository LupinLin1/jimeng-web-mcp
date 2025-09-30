# Quickstart: Generation Status Query

**Feature**: 001- Generation Status Query Method
**Purpose**: Validate end-to-end user workflows for generation status queries
**Date**: 2025-09-30

## Prerequisites

1. **Environment Setup**:
   ```bash
   # Set API token
   export JIMENG_API_TOKEN="your_session_id_from_jimeng_cookies"

   # Install dependencies
   yarn install

   # Build project
   yarn build
   ```

2. **Verify Existing Functionality** (baseline test):
   ```bash
   # Run existing tests to ensure no regressions
   yarn test
   ```

## Scenario 1: Basic Image Query Workflow

**User Story**: Submit image generation, query status, retrieve results

**Steps**:

```typescript
import { generateImageAsync, getImageResult } from 'jimeng-web-mcp';

// Step 1: Submit async image generation
const historyId = await generateImageAsync({
  prompt: '美丽的山水风景画',
  refresh_token: process.env.JIMENG_API_TOKEN,
  model: 'jimeng-4.0'
});

console.log('✓ Generation submitted:', historyId);
// Expected: historyId matches /^h[a-zA-Z0-9]+$/

// Step 2: Poll for status updates
let result;
let attempts = 0;
const maxAttempts = 60;  // 5 minutes max (5s intervals)

while (attempts < maxAttempts) {
  result = await getImageResult(historyId);
  console.log(`Status: ${result.status}, Progress: ${result.progress}%`);

  if (result.status === 'completed') {
    console.log('✓ Generation completed!');
    console.log('Image URLs:', result.imageUrls);
    break;
  }

  if (result.status === 'failed') {
    console.log('✗ Generation failed:', result.error);
    break;
  }

  // Wait 5 seconds before next poll
  await new Promise(resolve => setTimeout(resolve, 5000));
  attempts++;
}

// Step 3: Verify results
if (result.status === 'completed') {
  console.assert(result.imageUrls!.length > 0, 'Should have at least one image URL');
  console.assert(result.progress === 100, 'Progress should be 100%');
  console.log('✓ All validations passed');
}
```

**Expected Output**:
```
✓ Generation submitted: h1234567890abcdef
Status: pending, Progress: 0%
Status: processing, Progress: 25%
Status: processing, Progress: 50%
Status: processing, Progress: 75%
Status: completed, Progress: 100%
✓ Generation completed!
Image URLs: [
  'https://p3-sign.jimeng.jianying.com/tos-xxx/image1.jpg',
  'https://p3-sign.jimeng.jianying.com/tos-xxx/image2.jpg'
]
✓ All validations passed
```

**Success Criteria**:
- [x] historyId returned from generateImageAsync
- [x] Status transitions from pending → processing → completed
- [x] Progress increments from 0 → 100
- [x] imageUrls array contains valid HTTPS URLs
- [x] No errors thrown during normal flow

---

## Scenario 2: Video Generation Query

**User Story**: Submit video generation, query status, retrieve video URL

**Steps**:

```typescript
import { generateVideo } from 'jimeng-web-mcp';  // Existing function
import { getImageResult } from 'jimeng-web-mcp';  // Works for videos too

// Step 1: Submit video generation (using existing function)
const videoPromise = generateVideo({
  prompt: '一只猫在草地上奔跑',
  refresh_token: process.env.JIMENG_API_TOKEN,
  model: 'jimeng-video-3.0',
  resolution: '720p',
  fps: 24,
  duration: 5000
});

// Extract historyId from generation process (would need modification to existing function)
// For now, assume we have historyId from async variant

// Step 2: Query video generation status
const historyId = 'h_video_example_123';  // From async submission
let result;

do {
  result = await getImageResult(historyId);  // Same function works for videos
  console.log(`Video Status: ${result.status}, Progress: ${result.progress}%`);

  if (result.status === 'completed') {
    console.log('✓ Video generation completed!');
    console.log('Video URL:', result.videoUrl);
    break;
  }

  if (result.status === 'failed') {
    console.log('✗ Video generation failed:', result.error);
    break;
  }

  await new Promise(resolve => setTimeout(resolve, 10000));  // 10s for videos
} while (result.status !== 'completed' && result.status !== 'failed');

// Step 3: Verify video result
if (result.status === 'completed') {
  console.assert(typeof result.videoUrl === 'string', 'Should have video URL');
  console.assert(result.videoUrl!.startsWith('http'), 'Should be valid URL');
  console.assert(result.imageUrls === undefined, 'Should not have image URLs');
  console.log('✓ Video validations passed');
}
```

**Expected Output**:
```
Video Status: processing, Progress: 0%
Video Status: processing, Progress: 45%
Video Status: processing, Progress: 90%
Video Status: completed, Progress: 100%
✓ Video generation completed!
Video URL: https://p3-sign.jimeng.jianying.com/tos-xxx/video.mp4
✓ Video validations passed
```

**Success Criteria**:
- [x] getImageResult works for video historyIds
- [x] videoUrl present when status='completed'
- [x] imageUrls absent for video results
- [x] Video URL is valid HTTPS link

---

## Scenario 3: Error Handling

**User Story**: Handle various error conditions gracefully

### 3A: Invalid historyId

```typescript
// Test invalid format
try {
  await getImageResult('invalid_format');
} catch (error) {
  console.assert(
    error.message.includes('无效的historyId格式'),
    'Should reject invalid format'
  );
  console.log('✓ Invalid format detected');
}

// Test non-existent historyId
try {
  await getImageResult('h_nonexistent_12345');
} catch (error) {
  console.assert(
    error.message.includes('记录不存在'),
    'Should reject non-existent ID'
  );
  console.log('✓ Non-existent ID detected');
}
```

### 3B: Failed Generation

```typescript
// Submit generation that will fail (content policy violation)
const historyId = await generateImageAsync({
  prompt: '不适当的内容测试',  // Inappropriate content
  refresh_token: process.env.JIMENG_API_TOKEN
});

// Poll until failure
let result;
do {
  result = await getImageResult(historyId);
  await new Promise(resolve => setTimeout(resolve, 5000));
} while (result.status === 'pending' || result.status === 'processing');

// Verify failure handling
console.assert(result.status === 'failed', 'Should be failed status');
console.assert(typeof result.error === 'string', 'Should have error message');
console.assert(result.error === '内容被过滤', 'Should indicate content filtering');
console.log('✓ Failed generation handled correctly');
```

### 3C: Missing Token

```typescript
// Test missing token
delete process.env.JIMENG_API_TOKEN;

try {
  await getImageResult('h123');
} catch (error) {
  console.assert(
    error.message.includes('JIMENG_API_TOKEN'),
    'Should require token'
  );
  console.log('✓ Missing token detected');
}
```

**Success Criteria**:
- [x] Invalid historyId format rejected with clear error
- [x] Non-existent historyId returns "记录不存在"
- [x] Failed generations return status='failed' with error message
- [x] Missing token throws descriptive error

---

## Scenario 4: Concurrent Queries

**User Story**: Query multiple generations simultaneously

**Steps**:

```typescript
// Step 1: Submit multiple generations
const historyIds = await Promise.all([
  generateImageAsync({
    prompt: '风景画 1',
    refresh_token: process.env.JIMENG_API_TOKEN
  }),
  generateImageAsync({
    prompt: '风景画 2',
    refresh_token: process.env.JIMENG_API_TOKEN
  }),
  generateImageAsync({
    prompt: '风景画 3',
    refresh_token: process.env.JIMENG_API_TOKEN
  })
]);

console.log('✓ 3 generations submitted:', historyIds);

// Step 2: Poll all concurrently
let allCompleted = false;
let pollCount = 0;

while (!allCompleted && pollCount < 60) {
  const results = await Promise.all(
    historyIds.map(id => getImageResult(id))
  );

  console.log('Poll results:', results.map(r => `${r.status} (${r.progress}%)`));

  allCompleted = results.every(r =>
    r.status === 'completed' || r.status === 'failed'
  );

  if (!allCompleted) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    pollCount++;
  }
}

// Step 3: Verify all completed
const finalResults = await Promise.all(
  historyIds.map(id => getImageResult(id))
);

const completedCount = finalResults.filter(r => r.status === 'completed').length;
console.log(`✓ ${completedCount}/3 generations completed successfully`);

finalResults.forEach((result, index) => {
  if (result.status === 'completed') {
    console.assert(result.imageUrls!.length > 0, `Result ${index} should have URLs`);
  }
});

console.log('✓ Concurrent query validations passed');
```

**Expected Output**:
```
✓ 3 generations submitted: ['h123', 'h456', 'h789']
Poll results: ['processing (30%)', 'processing (25%)', 'processing (35%)']
Poll results: ['processing (60%)', 'processing (55%)', 'processing (65%)']
Poll results: ['completed (100%)', 'completed (100%)', 'processing (90%)']
Poll results: ['completed (100%)', 'completed (100%)', 'completed (100%)']
✓ 3/3 generations completed successfully
✓ Concurrent query validations passed
```

**Success Criteria**:
- [x] Multiple concurrent queries execute without conflicts
- [x] Each query returns independent results
- [x] No race conditions or data corruption
- [x] Performance remains acceptable (no serial bottlenecks)

---

## Scenario 5: MCP Tool Integration

**User Story**: Use query functionality through MCP protocol

**Setup**:
```json
// .mcp.json configuration
{
  "mcpServers": {
    "jimeng-web-mcp": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "JIMENG_API_TOKEN": "your_session_id_here"
      }
    }
  }
}
```

**Steps** (from Claude Desktop or MCP client):

```typescript
// Step 1: Submit via MCP tool
const response1 = await mcp.callTool('generateImageAsync', {
  prompt: '美丽的风景画'
});

// Extract historyId from response
const historyIdMatch = response1.content[0].text.match(/historyId: (h[a-zA-Z0-9]+)/);
const historyId = historyIdMatch[1];

console.log('✓ MCP submission successful:', historyId);

// Step 2: Query via MCP tool
let completed = false;
let attempts = 0;

while (!completed && attempts < 60) {
  const response2 = await mcp.callTool('getImageResult', {
    historyId: historyId
  });

  const text = response2.content[0].text;
  console.log('MCP Response:', text);

  completed = text.includes('✅ 生成完成') || text.includes('❌ 生成失败');

  if (!completed) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }
}

// Step 3: Verify MCP response format
const finalResponse = await mcp.callTool('getImageResult', {
  historyId: historyId
});

console.assert(
  finalResponse.content[0].type === 'text',
  'Should return text content'
);
console.assert(
  finalResponse.content[0].text.includes('状态:'),
  'Should include status in Chinese'
);

console.log('✓ MCP integration validations passed');
```

**Expected MCP Responses**:

```
// Submission response
异步任务已提交成功！

historyId: h1234567890abcdef

请使用 getImageResult 工具查询生成结果。

// Query response (processing)
⏳ 生成中...

状态: processing
进度: 50%

// Query response (completed)
✅ 生成完成！

状态: completed
进度: 100%

生成结果:
- https://p3-sign.jimeng.jianying.com/tos-xxx/image1.jpg
- https://p3-sign.jimeng.jianying.com/tos-xxx/image2.jpg
```

**Success Criteria**:
- [x] MCP tools callable from Claude Desktop
- [x] Responses formatted in user-friendly Chinese
- [x] historyId extractable from submission response
- [x] Query tool accepts historyId and returns structured status
- [x] Error responses marked with isError flag

---

## Performance Validation

### Latency Targets

```typescript
// Measure query response time
const start = Date.now();
const result = await getImageResult('h_existing_completed_task');
const latency = Date.now() - start;

console.assert(latency < 2000, 'Query should complete in <2s');
console.log(`✓ Query latency: ${latency}ms`);
```

**Success Criteria**:
- [x] Single query: <2 seconds (typical)
- [x] Concurrent queries: <5 seconds for 10 parallel queries
- [x] No memory leaks during extended polling

### Retry Mechanism

```typescript
// Test network error recovery
let networkErrors = 0;
const mockBadNetwork = () => {
  networkErrors++;
  if (networkErrors <= 2) {
    throw new Error('Network connection failed');
  }
};

// With retry logic, should succeed on 3rd attempt
// (Implementation detail - test validates behavior)
```

**Success Criteria**:
- [x] Network errors retry up to 3 times
- [x] Successful recovery after transient failures
- [x] Permanent failures throw descriptive errors

---

## Cleanup

```bash
# Stop any running MCP servers
pkill -f "jimeng-web-mcp"

# Clear test data (if any)
rm -f /tmp/jimeng-test-*

# Unset environment variables
unset JIMENG_API_TOKEN
```

---

## Summary Checklist

**Core Functionality**:
- [ ] generateImageAsync returns valid historyId
- [ ] getImageResult queries status correctly
- [ ] Status transitions follow expected flow (pending → processing → completed/failed)
- [ ] Progress increments appropriately (0-100%)
- [ ] Result URLs returned when status='completed'
- [ ] Error messages descriptive and actionable

**Error Handling**:
- [ ] Invalid historyId format rejected
- [ ] Non-existent historyId returns "记录不存在"
- [ ] Failed generations include error details
- [ ] Missing token throws clear error
- [ ] Network errors retry and recover

**Integration**:
- [ ] Works for both image and video generations
- [ ] MCP tools callable and functional
- [ ] Concurrent queries execute correctly
- [ ] Backward compatibility maintained (existing functions unchanged)

**Performance**:
- [ ] Query latency <2s (typical case)
- [ ] Handles concurrent requests efficiently
- [ ] No memory leaks during extended use

**Documentation**:
- [ ] All examples execute without errors
- [ ] Expected outputs match actual results
- [ ] Success criteria clearly defined and verifiable

---

**Total Test Duration**: ~10-15 minutes (includes generation wait times)

**Automated Test Command**: `yarn test`  (runs all existing + new tests)

**Manual Verification**: Execute scenarios 1-5 in sequence, verify all success criteria checked