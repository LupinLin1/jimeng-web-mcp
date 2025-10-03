# Data Model: 继续生成功能代码质量优化

**Date**: 2025-10-03
**Status**: Complete
**Purpose**: Define cache lifecycle and logging data structures

## Overview

This document defines the internal data models required for fixing memory leaks and improving code maintainability in the continue generation feature. All models are implementation-internal and do not affect public API.

## Entity Definitions

### 1. CacheEntry

**Purpose**: Consolidated cache entry representing all state for a single image generation task.

**Current State** (Problem):
- 3 separate static Maps (asyncTaskCache, continuationSent, requestBodyCache)
- No lifecycle management
- Unbounded memory growth

**Target State** (Solution):
- Single unified entry with TTL
- Explicit state transitions
- Automatic cleanup on completion or expiry

**Fields**:

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `historyId` | `string` | Yes | Unique task identifier (PK) | Must match `/^\d+$/` (numeric) or UUID format |
| `params` | `ImageGenerationParams` | Yes | Original generation parameters | From user input |
| `uploadedImages` | `any[]` | Yes | Uploaded reference image metadata | Empty array if no references |
| `apiParams` | `any` | Yes | Transformed API parameters | Includes model_name, count, etc. |
| `requestBody` | `RequestBodyCache` | Yes | Cached request for continuation | See RequestBodyCache below |
| `continuationSent` | `boolean` | Yes | Continuation submission flag | Default: false |
| `createdAt` | `number` | Yes | Creation timestamp (ms since epoch) | Set on cache entry creation |
| `expiresAt` | `number` | Yes | Expiry timestamp (ms since epoch) | `createdAt + TTL_MS` |
| `state` | `CacheEntryState` | Yes | Lifecycle state | Enum: CREATED, ACTIVE, COMPLETED |

**RequestBodyCache Nested Type**:
```typescript
interface RequestBodyCache {
  submitId: string;        // Original submit_id (UUID)
  draftContent: string;    // JSON-encoded draft structure
  metricsExtra: string;    // JSON-encoded metrics
  extend: {                // Model configuration
    root_model: string;
  };
}
```

**CacheEntryState Enum**:
```typescript
enum CacheEntryState {
  CREATED   = 'created',    // Cache entry initialized, task not started
  ACTIVE    = 'active',     // Task in progress (polling)
  COMPLETED = 'completed'   // Task finished (success or failure)
}
```

**State Transition Diagram**:
```
[CREATED] → [ACTIVE] → [COMPLETED] → [EVICTED]
             ↓ TTL expired
          [EVICTED]

State Rules:
- CREATED: Entry just added to cache
- ACTIVE: submitImageTask called, polling in progress
- COMPLETED: Task reached 'completed' or 'failed' status
- EVICTED: Removed from cache (not stored, logical state)

Transition Triggers:
- CREATED → ACTIVE: submitImageTask() called
- ACTIVE → COMPLETED: waitForImageCompletion() returns
- COMPLETED → EVICTED: cleanupTaskCache() called
- ACTIVE → EVICTED: TTL expired (30min default)
- CREATED → EVICTED: TTL expired (abandoned task)
```

**Lifecycle Rules**:

1. **Creation**:
   ```typescript
   const entry: CacheEntry = {
     historyId,
     params,
     uploadedImages,
     apiParams,
     requestBody: { ... },
     continuationSent: false,
     createdAt: Date.now(),
     expiresAt: Date.now() + TTL_MS,  // Default: 30 minutes
     state: CacheEntryState.CREATED
   };
   ```

2. **Access**:
   - On `get()`: Check if `Date.now() > expiresAt` → Auto-evict if expired
   - Return `undefined` for expired entries

3. **Cleanup Triggers**:
   - **Explicit**: Task reaches 'completed' or 'failed' → Call `cleanupTaskCache(historyId)`
   - **TTL-based**: Periodic sweep via `evictExpired()` → Remove entries where `Date.now() > expiresAt`
   - **Manual**: User cancellation (future enhancement)

4. **Concurrency**:
   - JavaScript single-threaded → No need for locks
   - `continuationSent` flag prevents duplicate submissions
   - Must cleanup `continuationSent` to avoid stale locks

**Validation Rules**:

| Rule | Check | Error Message |
|------|-------|---------------|
| `historyId` format | `/^\d+$/` or UUID | "Invalid historyId format" |
| `expiresAt` > `createdAt` | `expiresAt > createdAt` | "Invalid TTL: expiresAt must be after createdAt" |
| No overwrites | `!cache.has(historyId)` before `set()` | "Cache entry already exists for historyId" |
| State transitions valid | Follow diagram rules | "Invalid state transition: {from} → {to}" |

**Type Definition** (TypeScript):
```typescript
// src/types/cache.types.ts
export interface CacheEntry {
  historyId: string;
  params: ImageGenerationParams;
  uploadedImages: any[];
  apiParams: any;
  requestBody: {
    submitId: string;
    draftContent: string;
    metricsExtra: string;
    extend: { root_model: string };
  };
  continuationSent: boolean;
  createdAt: number;
  expiresAt: number;
  state: CacheEntryState;
}

export enum CacheEntryState {
  CREATED = 'created',
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

export interface CacheStats {
  size: number;
  oldestEntry: number | null;  // createdAt of oldest entry
  expiredCount: number;         // Entries past TTL
}
```

---

### 2. LogEntry

**Purpose**: Structured logging model to replace ad-hoc `console.log` statements.

**Current State** (Problem):
- 20+ `console.log` with emoji prefixes ("🔍", "💾", "🔄")
- No level control (all logs visible in production)
- Sensitive data potentially logged (tokens, prompts)

**Target State** (Solution):
- Level-based filtering (DEBUG, INFO, WARN, ERROR)
- Structured context with PII redaction
- Environment-based suppression

**Fields**:

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `level` | `LogLevel` | Yes | Severity level | Enum: DEBUG, INFO, WARN, ERROR |
| `message` | `string` | Yes | Human-readable message | Max 500 chars |
| `context` | `Record<string, any>` | No | Structured metadata | PII keys redacted |
| `timestamp` | `number` | Yes | Log creation time (ms) | Set automatically |

**LogLevel Enum**:
```typescript
enum LogLevel {
  DEBUG = 0,  // Verbose diagnostic info (suppressed in prod)
  INFO = 1,   // Normal operational messages
  WARN = 2,   // Warning conditions (non-critical)
  ERROR = 3   // Error conditions (critical)
}
```

**Level Filtering Rules**:

| Environment | Min Level | DEBUG Visible? | INFO Visible? |
|-------------|-----------|----------------|---------------|
| `DEBUG=true` | DEBUG (0) | ✅ Yes | ✅ Yes |
| `DEBUG=false` (prod) | INFO (1) | ❌ No | ✅ Yes |
| `NODE_ENV=test` | WARN (2) | ❌ No | ❌ No |

**PII Redaction Rules**:

Automatically remove sensitive keys from `context`:
- `token`, `sessionid`, `password`, `api_key`
- Any key matching `/secret|credential|auth/i`
- Replace value with `"[REDACTED]"`

Example:
```typescript
logger.debug("Task submitted", {
  historyId: "12345",
  token: "abc123",  // ← Will be redacted
  model: "jimeng-4.0"
});

// Output: [DEBUG] Task submitted {"historyId":"12345","token":"[REDACTED]","model":"jimeng-4.0"}
```

**Output Format**:

- **Console**: `[LEVEL] message {context as JSON}`
- **Stderr**: ERROR level only (for monitoring tools)
- **Stdout**: DEBUG, INFO, WARN levels

**Type Definition** (TypeScript):
```typescript
// src/types/logger.types.ts (or inline in src/utils/logger.ts)
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: number;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  redactKeys: string[];
  enableTimestamps: boolean;
}
```

---

## Model Relationships

```
CacheEntry (1) ─┬─ requestBody: RequestBodyCache
                ├─ params: ImageGenerationParams (from api.types.ts)
                ├─ uploadedImages: any[]
                └─ apiParams: any

LogEntry (independent) ─ No relationships (utility model)
```

**Data Flow**:
1. **Image Generation Request** → Create `CacheEntry` with CREATED state
2. **Task Submission** → Update state to ACTIVE, store `requestBody`
3. **Continuation Triggered** → Reuse `requestBody` from cache, set `continuationSent=true`
4. **Task Completion** → Update state to COMPLETED, trigger cleanup
5. **Cleanup** → Remove `CacheEntry` from Map (EVICTED state)

---

## Storage Implementation

**Location**: `src/utils/cache-manager.ts`

**Storage Mechanism**: Single static `Map<string, CacheEntry>`

**Why Map?**:
- O(1) get/set/delete operations
- Native TypeScript support
- No serialization overhead (in-memory)
- Sufficient for <10K concurrent tasks

**Alternatives Rejected**:
- WeakMap: Requires object keys (historyId is string)
- Object literal: No guaranteed order, prototype pollution risk
- External cache (Redis): Overkill, adds latency and complexity

**TTL Management**:
- **Lazy eviction**: Check `expiresAt` on `get()` access
- **Proactive eviction**: Periodic `evictExpired()` sweep (every 5 minutes via setInterval)
- **Cleanup on completion**: Explicit `cleanup(historyId)` call

**Default TTL**: 30 minutes (`1800000` ms)

**Rationale**:
- Image generation typically completes in <2 minutes
- 30min TTL catches abandoned tasks (user cancels, network failure)
- Balance between memory retention and cleanup frequency

---

## Migration Strategy

**Current Cache Structure** (3 separate Maps):
```typescript
// src/api/NewJimengClient.ts (lines 35-50)
private static asyncTaskCache = new Map<string, {
  params: ImageGenerationParams;
  uploadedImages: any[];
  apiParams: any;
}>();

private static continuationSent = new Map<string, boolean>();

private static requestBodyCache = new Map<string, {
  submitId: string;
  draftContent: string;
  metricsExtra: string;
  extend: any;
}>();
```

**Target Structure** (Unified CacheEntry):
```typescript
// src/utils/cache-manager.ts
export class CacheManager {
  private static cache = new Map<string, CacheEntry>();
  private static readonly TTL_MS = 30 * 60 * 1000;

  static set(historyId: string, entry: Omit<CacheEntry, 'createdAt' | 'expiresAt' | 'state'>): void {
    if (this.cache.has(historyId)) {
      throw new Error(`Cache entry already exists: ${historyId}`);
    }

    const now = Date.now();
    this.cache.set(historyId, {
      ...entry,
      createdAt: now,
      expiresAt: now + this.TTL_MS,
      state: CacheEntryState.CREATED
    });
  }

  static get(historyId: string): CacheEntry | undefined {
    const entry = this.cache.get(historyId);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(historyId);
      return undefined;
    }

    return entry;
  }

  static cleanup(historyId: string): boolean {
    return this.cache.delete(historyId);
  }

  static evictExpired(): number {
    let count = 0;
    const now = Date.now();

    for (const [id, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(id);
        count++;
      }
    }

    return count;
  }

  static size(): number {
    return this.cache.size;
  }

  static getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    return {
      size: entries.length,
      oldestEntry: entries.length > 0
        ? Math.min(...entries.map(e => e.createdAt))
        : null,
      expiredCount: entries.filter(e => Date.now() > e.expiresAt).length
    };
  }
}
```

**Migration Steps** (executed in tasks.md):
1. Create `CacheManager` class with all methods
2. Add tests for each method (TDD - red phase)
3. Implement methods to pass tests (green phase)
4. Replace 3 Maps in `NewJimengClient.ts` with `CacheManager` calls
5. Add `cleanup()` calls on task completion
6. Add periodic `evictExpired()` via setInterval (optional, for long-running servers)

---

## Testing Strategy

**Unit Tests** (`tests/unit/cache-manager.test.ts`):
- ✅ `set()` creates entry with correct TTL
- ✅ `get()` returns entry if not expired
- ✅ `get()` returns undefined if expired (auto-evicts)
- ✅ `cleanup()` removes entry and returns true
- ✅ `cleanup()` returns false if entry doesn't exist
- ✅ `evictExpired()` removes all expired entries
- ✅ `size()` returns accurate count
- ✅ `getStats()` returns correct metrics

**Integration Tests** (`tests/integration/memory-leak.test.ts`):
- ✅ Cache size remains stable over 1000 requests
- ✅ TTL eviction triggers after 30 minutes
- ✅ Cleanup on task completion removes entry
- ✅ No stale `continuationSent` flags after cleanup

---

## Performance Considerations

**Memory Footprint per Entry**:
- `historyId`: ~20 bytes (string)
- `params`: ~200 bytes (object with ~10 fields)
- `uploadedImages`: ~50 bytes (empty array or small metadata)
- `apiParams`: ~150 bytes (transformed params)
- `requestBody`: ~1KB (draft_content JSON string)
- `continuationSent`: 1 byte (boolean)
- `timestamps`: 16 bytes (2 numbers)
- **Total**: ~1.5KB per entry

**Capacity Estimate**:
- 1000 concurrent tasks = ~1.5MB memory
- 10,000 concurrent tasks = ~15MB memory
- Acceptable for long-running Node.js process

**Eviction Performance**:
- `evictExpired()`: O(n) where n = cache size
- With 10K entries: ~5-10ms per sweep
- Run every 5 minutes → negligible CPU impact

---

## Conclusion

Two core data models defined:
1. **CacheEntry**: Unified cache with TTL lifecycle management
2. **LogEntry**: Structured logging with PII redaction

**Ready for contracts generation** (Phase 1 next step)

**No external dependencies required** - All models use built-in TypeScript/Node.js types.
