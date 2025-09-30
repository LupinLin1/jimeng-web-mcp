# Implementation Constraints

**Feature**: 001- Generation Status Query Method
**Critical Requirement**: Maintain Backward Compatibility

---

## 🚨 CRITICAL CONSTRAINT: Backward Compatibility

### User Requirement

**保持向前兼容（Backward Compatibility）**

- ✅ 可以修改内部实现以添加新功能
- ✅ 可以重构代码以支持查询功能
- ❌ **不能改变现有 API 的签名和行为**
- ❌ 现有调用者不能感知到任何变化

This is an **absolute constraint** that must be followed throughout implementation.

---

## What You CANNOT Do

### ❌ Forbidden: Breaking Backward Compatibility

1. **Public API Signatures** (Must remain identical):
   ```typescript
   // ❌ CANNOT change these signatures
   export function generateImage(params: ImageGenerationParams): Promise<string[]>
   export function generateVideo(params: VideoGenerationParams): Promise<string>
   ```

2. **Existing Function Behavior** (Must work exactly as before):
   - ❌ `generateImage()` must still wait for completion and return image URLs
   - ❌ `generateVideo()` must still wait for completion and return video URL
   - ❌ Error messages and error types must remain consistent
   - ❌ Timing and performance characteristics should not degrade

3. **Type Definitions** (Existing types unchanged):
   - ❌ Cannot modify `ImageGenerationParams` interface
   - ❌ Cannot modify `VideoGenerationParams` interface
   - ❌ Cannot change return types of existing functions
   - ❌ Cannot make required fields optional or vice versa

4. **User Experience** (From caller's perspective):
   - ❌ Existing users must not need to change their code
   - ❌ Existing tests must continue to pass without modification
   - ❌ No breaking changes in error handling
   - ❌ No new required dependencies

---

## What You CAN Do

### ✅ Allowed: Additive Changes and Internal Refactoring

1. **Add New Functions** (Without affecting existing ones):
   - ✅ Create NEW `generateImageAsync()` that returns historyId immediately
   - ✅ Create NEW `getImageResult(historyId)` that queries status
   - ✅ Add NEW exports to `api.ts`
   - ✅ Add NEW MCP tool definitions in `server.ts`

2. **Refactor Internal Implementation** (If behavior stays same):
   - ✅ Extract shared logic into helper methods
   - ✅ Optimize `pollTraditionalResult()` internals (if external behavior unchanged)
   - ✅ Improve error handling (as long as error types stay same)
   - ✅ Add logging and debugging (non-breaking)

3. **Add New Types and Interfaces** (Additive only):
   - ✅ Add `QueryResultResponse` interface
   - ✅ Add `GenerationStatus` type
   - ✅ Add new type exports to `src/types/api.types.ts`
   - ✅ Add optional fields to internal types (not exported)

4. **Enhance Existing Methods** (Backward compatible):
   - ✅ Make `pollTraditionalResult()` more flexible internally
   - ✅ Add optional parameters with default values
   - ✅ Support both old and new calling patterns
   - ✅ Improve performance without changing output

---

## Implementation Strategy

### Recommended Approach: Add New Async Functions

```typescript
// ✅ CORRECT: Add new async function that returns historyId immediately
export async function generateImageAsync(
  params: ImageGenerationParams
): Promise<string> {
  if (!params.refresh_token) {
    throw new Error('refresh_token is required');
  }

  const client = getApiClient(params.refresh_token);

  // Submit generation and return historyId without waiting
  const result = await client.submitGeneration(params);
  const historyId = result?.data?.aigc_data?.history_record_id;

  if (!historyId) {
    throw new Error('Failed to get historyId');
  }

  return historyId;
}

// ✅ CORRECT: Add new query function
export async function getImageResult(
  historyId: string,
  refresh_token?: string
): Promise<QueryResultResponse> {
  const token = refresh_token || process.env.JIMENG_API_TOKEN;
  if (!token) {
    throw new Error('JIMENG_API_TOKEN is required');
  }

  const client = getApiClient(token);

  // Query status once, don't wait for completion
  const status = await client.queryStatus(historyId);

  return {
    status: mapStatusCode(status.status),
    progress: calculateProgress(status),
    imageUrls: status.status === 50 ? extractUrls(status) : undefined,
    error: status.status === 30 ? getErrorMessage(status) : undefined
  };
}

// ✅ IMPORTANT: Keep existing generateImage() unchanged
export function generateImage(
  params: ImageGenerationParams
): Promise<string[]> {
  // This function continues to work exactly as before
  // Waits for completion and returns URLs
  // No changes to signature or behavior
}
```

### Incorrect Approaches

```typescript
// ❌ WRONG: Breaking existing function signature
export function generateImage(
  params: ImageGenerationParams,
  async?: boolean  // FORBIDDEN: New parameter
): Promise<string[] | string> {  // FORBIDDEN: Changing return type
  if (async) {
    return historyId;  // BREAKING CHANGE
  }
  return imageUrls;
}

// ❌ WRONG: Changing existing function behavior
export function generateImage(
  params: ImageGenerationParams
): Promise<string[]> {
  // FORBIDDEN: Making it async by default
  return historyId;  // Users expect URLs!
}
```

---

## Verification Checklist

Before committing any code, verify:

### Backward Compatibility Tests

- [ ] Existing `generateImage()` signature unchanged
- [ ] Existing `generateVideo()` signature unchanged
- [ ] Existing `ImageGenerationParams` type unchanged
- [ ] Existing `VideoGenerationParams` type unchanged
- [ ] All existing tests pass without modification
- [ ] Existing function behavior identical (returns same data types)

### New Functionality Tests

- [ ] `generateImageAsync()` returns historyId string
- [ ] `getImageResult()` accepts historyId and returns QueryResultResponse
- [ ] New MCP tools registered and functional
- [ ] New types exported correctly

### Integration Verification

- [ ] Can call `generateImage()` - still waits and returns URLs
- [ ] Can call `generateImageAsync()` + `getImageResult()` - async pattern works
- [ ] Both patterns work side by side
- [ ] No performance degradation in existing functions

---

## Code Review Gate

### Pre-merge Requirements

1. **Backward Compatibility Check**:
   ```bash
   # Run existing tests
   yarn test

   # All tests must pass without changes
   # Verify no test modifications needed
   ```

2. **API Contract Verification**:
   ```typescript
   // Test existing functions still work
   const urls = await generateImage({ prompt: 'test', refresh_token: 'xxx' });
   console.assert(Array.isArray(urls), 'generateImage returns array');

   const videoUrl = await generateVideo({ prompt: 'test', refresh_token: 'xxx' });
   console.assert(typeof videoUrl === 'string', 'generateVideo returns string');
   ```

3. **New Functionality Check**:
   ```typescript
   // Test new async pattern
   const historyId = await generateImageAsync({ prompt: 'test', refresh_token: 'xxx' });
   console.assert(typeof historyId === 'string', 'Returns historyId');

   const result = await getImageResult(historyId);
   console.assert(result.status !== undefined, 'Returns status');
   ```

---

## Rationale

### Why This Constraint Exists

1. **Production Stability**: Existing endpoints are in production use
2. **User Integrations**: External users depend on current behavior
3. **API Contract**: Changing endpoints breaks API contract guarantees
4. **Risk Management**: Modifications risk breaking existing functionality
5. **Zero-install Promise**: npx users expect stable, non-breaking updates

### Benefits of Wrapper Approach

1. ✅ **Zero Risk**: Existing code paths untouched
2. ✅ **Testable**: New wrappers can be tested independently
3. ✅ **Reversible**: New functions can be removed if needed
4. ✅ **Clear Boundaries**: Transformation logic isolated to wrapper layer
5. ✅ **Constitutional Compliance**: Satisfies "Minimal Code Change" principle

---

## Summary

**Golden Rule**: 保持向前兼容 = 现有用户代码不需要任何修改

**Correct Pattern**:
- ✅ Add NEW functions (`generateImageAsync`, `getImageResult`)
- ✅ Keep EXISTING functions unchanged (`generateImage`, `generateVideo`)
- ✅ Add NEW types (`QueryResultResponse`, `GenerationStatus`)
- ✅ Export NEW functionality through `api.ts`
- ✅ Register NEW MCP tools
- ✅ Internal refactoring allowed if behavior stays same

**Test Strategy**:
1. Existing tests must pass without modification
2. New tests validate new async pattern
3. Integration tests verify both patterns work together

**Result**:
- 📦 New feature added (async query capability)
- ✅ Zero breaking changes (existing code works identically)
- 🎯 Backward compatible (满足向前兼容要求)

---

**Version**: 1.0.0
**Date**: 2025-09-30
**Status**: Approved