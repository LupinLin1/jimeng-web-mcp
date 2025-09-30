# Data Model: Generation Status Query

**Feature**: 001- Generation Status Query Method
**Date**: 2025-09-30

## Overview

This document defines the data structures and type contracts for the generation status query feature. All types follow TypeScript conventions and integrate with existing codebase patterns.

## Core Entities

### 1. QueryResultResponse

**Purpose**: Unified response structure for status queries across both image and video generations.

```typescript
interface QueryResultResponse {
  /** Current status of the generation task */
  status: GenerationStatus;

  /** Progress percentage (0-100) */
  progress: number;

  /** Generated image URLs (present when status='completed' for images) */
  imageUrls?: string[];

  /** Generated video URL (present when status='completed' for videos) */
  videoUrl?: string;

  /** Error message (present when status='failed') */
  error?: string;
}
```

**Validation Rules**:
- `progress` MUST be between 0 and 100 (inclusive)
- `imageUrls` OR `videoUrl` MAY be present, but NOT both
- `imageUrls` MUST contain at least 1 URL when present
- `error` MUST be non-empty string when status='failed'
- When status='completed', either `imageUrls` or `videoUrl` MUST be present

**State Invariants**:
```typescript
// Invalid combinations (enforce at runtime):
status='completed' && !imageUrls && !videoUrl  // ERROR: No result URLs
status='completed' && imageUrls && videoUrl    // ERROR: Both types present
status='failed' && !error                      // ERROR: Missing error message
progress < 0 || progress > 100                 // ERROR: Invalid range
imageUrls && imageUrls.length === 0            // ERROR: Empty array
```

### 2. GenerationStatus

**Purpose**: Type-safe enumeration of possible generation states.

```typescript
type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

**State Semantics**:
- **`pending`**: Task submitted, waiting to start (internal code: 20)
- **`processing`**: Actively generating content (internal codes: 20, 42, 45)
- **`completed`**: Generation finished successfully (internal code: 50)
- **`failed`**: Generation failed with error (internal code: 30)

**State Transitions** (allowed changes):
```
pending → processing
processing → completed
processing → failed
(No reverse transitions allowed)
```

### 3. StatusCodeMapping

**Purpose**: Internal mapping from JiMeng numeric codes to user-facing statuses.

```typescript
const STATUS_CODE_MAP: Record<number, GenerationStatus> = {
  20: 'processing',  // Also used for 'pending' context
  30: 'failed',
  42: 'processing',
  45: 'processing',
  50: 'completed'
};

const KNOWN_STATES = new Set([20, 30, 42, 45, 50]);
const PROCESSING_STATES = new Set([20, 42, 45]);
const COMPLETION_STATES = new Set([30, 50]);
```

**Rationale**: Isolates JiMeng API implementation details from user-facing API.

## Relationships

### Entity Relationship Diagram

```
QueryResultResponse
├── status: GenerationStatus (required)
├── progress: number (required, 0-100)
├── imageUrls: string[] (optional, mutually exclusive with videoUrl)
├── videoUrl: string (optional, mutually exclusive with imageUrls)
└── error: string (optional, required when status='failed')
```

**No database relationships**: This is a stateless query system. All persistence handled by JiMeng backend.

## Integration with Existing Types

### Extends ImageGenerationParams (src/types/api.types.ts)

**Existing**:
```typescript
interface ImageGenerationParams {
  prompt: string;
  refresh_token: string;
  model?: string;
  filePath?: string[];
  // ... other optional parameters
}
```

**New async variant** (no changes to existing type):
```typescript
// Reuses ImageGenerationParams as-is
function generateImageAsync(params: ImageGenerationParams): Promise<string>;
// Returns historyId string
```

### Complements Existing Poll Result Handling

**Existing internal structure** (src/api/JimengClient.ts):
```typescript
// Used internally by pollTraditionalResult
interface HistoryRecord {
  status: number;                    // 20/30/42/45/50
  fail_code?: string;                // '2038' for content filtering
  total_image_count: number;
  finished_image_count: number;
  item_list?: Array<{
    image_url: string;
    // ... other metadata
  }>;
}
```

**Transformation**:
```typescript
// QueryResultResponse is the PUBLIC contract
// HistoryRecord is the INTERNAL representation
function transformHistoryRecord(record: HistoryRecord): QueryResultResponse {
  const status = STATUS_CODE_MAP[record.status];
  const progress = (record.finished_image_count / record.total_image_count) * 100;

  if (status === 'completed') {
    return {
      status,
      progress: 100,
      imageUrls: record.item_list?.map(item => item.image_url)
    };
  }

  if (status === 'failed') {
    return {
      status,
      progress,
      error: record.fail_code === '2038' ? '内容被过滤' : '生成失败'
    };
  }

  return { status, progress };
}
```

## Field Specifications

### historyId (Input Parameter)

**Type**: `string`

**Format**: `^h[a-zA-Z0-9]+$` (starts with 'h', followed by alphanumeric)

**Examples**:
- Valid: `'h1234567890abcdef'`, `'h_e2e_test_123456'`, `'hABC123xyz'`
- Invalid: `''`, `'1234567890abcdef'` (missing 'h'), `'h'` (empty suffix)

**Validation**:
```typescript
function validateHistoryId(historyId: string): void {
  if (!historyId || historyId.trim() === '') {
    throw new Error('无效的historyId格式: historyId不能为空');
  }
  if (!historyId.startsWith('h')) {
    throw new Error('无效的historyId格式: historyId必须以"h"开头');
  }
  if (historyId.length < 2) {
    throw new Error('无效的historyId格式: historyId太短');
  }
}
```

### progress (Response Field)

**Type**: `number`

**Range**: `[0, 100]` (inclusive)

**Semantics**:
- `0-10`: Task submitted, initializing
- `10-90`: Active generation progress
- `100`: Generation complete (only when status='completed')

**Calculation**:
```typescript
progress = (finished_image_count / total_image_count) * 100
```

**Special Cases**:
- Video generation: Progress may not increment smoothly (server-determined)
- Failed tasks: Progress frozen at last known value

### imageUrls / videoUrl (Response Fields)

**Type**: `string[]` (images) | `string` (video)

**Format**: Absolute URLs (HTTPS preferred)

**Examples**:
- Image: `['https://example.com/image1.jpg', 'https://example.com/image2.jpg']`
- Video: `'https://example.com/video.mp4'`

**Validation**: URLs validated by JiMeng backend, client treats as opaque strings

### error (Response Field)

**Type**: `string | undefined`

**Common Messages**:
- `'记录不存在'`: historyId not found in backend
- `'无效的historyId格式'`: Client-side validation failure
- `'historyId已过期'`: Record too old, purged from backend
- `'内容被过滤'`: fail_code='2038', content policy violation
- `'生成失败'`: Generic failure (no specific fail_code)
- `'网络错误超过最大重试次数'`: Network connectivity issues

## Type Export Strategy

**Location**: `src/types/api.types.ts`

**Additions**:
```typescript
// Add to existing file
export interface QueryResultResponse {
  status: GenerationStatus;
  progress: number;
  imageUrls?: string[];
  videoUrl?: string;
  error?: string;
}

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

**Rationale**: Colocate with other API types (ImageGenerationParams, VideoGenerationParams) for consistency.

## Backward Compatibility

**Guarantee**: All existing types unchanged.

- `ImageGenerationParams` - No modifications
- `VideoGenerationParams` - No modifications
- `DraftResponse` - No modifications
- All other exports - No modifications

**New exports only**:
- `QueryResultResponse` (new)
- `GenerationStatus` (new)

## Test Data Fixtures

### Complete Response Fixtures

```typescript
// Pending state
const pendingFixture: QueryResultResponse = {
  status: 'pending',
  progress: 5
};

// Processing state
const processingFixture: QueryResultResponse = {
  status: 'processing',
  progress: 50
};

// Completed image generation
const completedImageFixture: QueryResultResponse = {
  status: 'completed',
  progress: 100,
  imageUrls: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg'
  ]
};

// Completed video generation
const completedVideoFixture: QueryResultResponse = {
  status: 'completed',
  progress: 100,
  videoUrl: 'https://example.com/video.mp4'
};

// Failed generation
const failedFixture: QueryResultResponse = {
  status: 'failed',
  progress: 75,
  error: '内容被过滤'
};
```

### Invalid State Fixtures (for negative testing)

```typescript
// Missing required fields
const invalidMissingStatus = { progress: 50 };  // ERROR: No status

// Invalid progress range
const invalidProgress = { status: 'pending', progress: 150 };  // ERROR: >100

// Both URL types present
const invalidBothUrls = {
  status: 'completed',
  progress: 100,
  imageUrls: ['https://example.com/image.jpg'],
  videoUrl: 'https://example.com/video.mp4'  // ERROR: Conflicting types
};

// Completed without URLs
const invalidNoUrls = {
  status: 'completed',
  progress: 100  // ERROR: Missing imageUrls/videoUrl
};

// Failed without error
const invalidNoError = {
  status: 'failed',
  progress: 80  // ERROR: Missing error field
};
```

## Summary

**Total New Types**: 2 (QueryResultResponse, GenerationStatus)

**Integration Points**: 3 (api.types.ts, api.ts exports, server.ts tools)

**Breaking Changes**: 0 (all additions, no modifications)

**Test Coverage Required**:
- Valid state transitions
- Invalid state combinations
- Progress range validation
- URL presence rules
- Error message propagation