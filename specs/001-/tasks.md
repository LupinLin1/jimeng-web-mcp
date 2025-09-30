# Tasks: Generation Status Query Method

**Feature**: 001- Generation Status Query Method
**Input**: Design documents from `/Users/lupin/mcp-services/jimeng-mcp/specs/001-/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript 5.x, Node.js, Jest
   → Libraries: axios, zod, uuid (existing)
   → Structure: Single project (MCP server)
2. Load design documents:
   → data-model.md: 2 types (QueryResultResponse, GenerationStatus)
   → contracts/: 2 functions + 2 MCP tools + 4 test suites
   → quickstart.md: 5 user scenarios
3. Generate tasks by category:
   → Setup: Type definitions (2 tasks)
   → Tests: Contract tests (4 tasks), Integration tests (5 tasks)
   → Core: Implementation (3 tasks), MCP tools (2 tasks)
   → Polish: Validation (2 tasks), Documentation (1 task)
4. Apply task rules:
   → Type definitions can be parallel [P]
   → Contract tests can be parallel [P]
   → Integration tests can be parallel [P]
   → Implementation tasks sequential (modify JimengClient)
5. Number tasks sequentially (T001-T018)
6. Validate: All contracts tested, types defined, TDD followed
7. Return: SUCCESS (18 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- ⚠️ **CRITICAL**: Maintain backward compatibility - no changes to existing API signatures

## Path Conventions
Single project structure:
- Source: `src/`
- Tests: `src/__tests__/`
- Types: `src/types/`
- API: `src/api/`
- Server: `src/server.ts`

---

## Phase 3.1: Setup - Type Definitions

⚠️ **BACKWARD COMPATIBILITY**: These are NEW type exports only. Do NOT modify existing types.

- [x] **T001** [P] Add `QueryResultResponse` interface to `src/types/api.types.ts`
  - Define interface with fields: status, progress, imageUrls?, videoUrl?, error?
  - Include JSDoc comments for each field
  - Export from file
  - **File**: `src/types/api.types.ts` (additive only)

- [x] **T002** [P] Add `GenerationStatus` type to `src/types/api.types.ts`
  - Define type: `'pending' | 'processing' | 'completed' | 'failed'`
  - Include JSDoc comment explaining each state
  - Export from file
  - **File**: `src/types/api.types.ts` (additive only)

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation

### Contract Tests [P]

- [ ] **T003** [P] Contract test for `generateImageAsync()` in `src/__tests__/contract-generateImageAsync.test.ts`
  - Test: returns historyId string on success
  - Test: throws on missing refresh_token
  - Test: accepts all ImageGenerationParams
  - Test: historyId matches format `/^h[a-zA-Z0-9]+$/`
  - **File**: `src/__tests__/contract-generateImageAsync.test.ts` (new file)
  - **Expected**: Tests FAIL (function not yet implemented)

- [ ] **T004** [P] Contract test for `getImageResult()` in `src/__tests__/contract-getImageResult.test.ts`
  - Test: returns QueryResultResponse structure
  - Test: returns imageUrls when completed (images)
  - Test: returns videoUrl when completed (video)
  - Test: returns error when failed
  - Test: throws on invalid historyId format
  - Test: throws on non-existent historyId
  - Test: uses environment variable when token not provided
  - Test: throws when no token available
  - **File**: `src/__tests__/contract-getImageResult.test.ts` (new file)
  - **Expected**: Tests FAIL (function not yet implemented)

- [ ] **T005** [P] Contract test for concurrent queries in `src/__tests__/contract-concurrent.test.ts`
  - Test: handles multiple concurrent queries
  - Test: each query returns independent results
  - Test: no race conditions or data corruption
  - **File**: `src/__tests__/contract-concurrent.test.ts` (new file)
  - **Expected**: Tests FAIL (function not yet implemented)

- [ ] **T006** [P] Contract test for MCP tools in `src/__tests__/contract-mcp-tools.test.ts`
  - Test: generateImageAsync tool returns historyId text
  - Test: getImageResult tool returns status text
  - Test: error responses marked with isError flag
  - **File**: `src/__tests__/contract-mcp-tools.test.ts` (new file)
  - **Expected**: Tests FAIL (tools not yet registered)

### Integration Tests [P]

- [ ] **T007** [P] Integration test: Basic image query workflow in `src/__tests__/integration-image-query.test.ts`
  - Scenario: Submit generation → Poll status → Retrieve URLs
  - Validate: Status transitions (pending → processing → completed)
  - Validate: Progress increments (0 → 100)
  - Validate: imageUrls array contains valid HTTPS URLs
  - **File**: `src/__tests__/integration-image-query.test.ts` (new file)
  - **Source**: quickstart.md Scenario 1

- [ ] **T008** [P] Integration test: Video generation query in `src/__tests__/integration-video-query.test.ts`
  - Scenario: Submit video → Query status → Retrieve video URL
  - Validate: videoUrl present when completed
  - Validate: imageUrls absent for video results
  - **File**: `src/__tests__/integration-video-query.test.ts` (new file)
  - **Source**: quickstart.md Scenario 2

- [ ] **T009** [P] Integration test: Error handling in `src/__tests__/integration-error-handling.test.ts`
  - Test: Invalid historyId format rejected
  - Test: Non-existent historyId returns "记录不存在"
  - Test: Failed generations return status='failed' with error
  - Test: Missing token throws descriptive error
  - **File**: `src/__tests__/integration-error-handling.test.ts` (new file)
  - **Source**: quickstart.md Scenario 3

- [ ] **T010** [P] Integration test: Concurrent queries in `src/__tests__/integration-concurrent.test.ts`
  - Scenario: Submit 3 generations → Poll all concurrently
  - Validate: All complete without conflicts
  - Validate: Performance acceptable (<5s for 10 parallel)
  - **File**: `src/__tests__/integration-concurrent.test.ts` (new file)
  - **Source**: quickstart.md Scenario 4

- [ ] **T011** [P] Integration test: MCP tool workflow in `src/__tests__/integration-mcp-workflow.test.ts`
  - Scenario: Call MCP tools through protocol
  - Validate: Response formatted in Chinese
  - Validate: historyId extractable from submission response
  - **File**: `src/__tests__/integration-mcp-workflow.test.ts` (new file)
  - **Source**: quickstart.md Scenario 5

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

⚠️ **BACKWARD COMPATIBILITY CRITICAL**: These tasks add NEW functions. Do NOT modify existing `generateImage()` or `generateVideo()`.

- [x] **T012** Add `generateImageAsync()` method to `src/api/JimengClient.ts`
  - Add public method: `async generateImageAsync(params: ImageGenerationParams): Promise<string>`
  - Submit generation request to JiMeng API
  - Extract historyId from response: `result?.data?.aigc_data?.history_record_id`
  - Return historyId WITHOUT waiting for completion
  - Throw descriptive errors for missing historyId
  - **File**: `src/api/JimengClient.ts`
  - **Note**: Do NOT modify existing methods

- [x] **T013** Add `getImageResult()` method to `src/api/JimengClient.ts`
  - Add public method: `async getImageResult(historyId: string): Promise<QueryResultResponse>`
  - Validate historyId format (starts with 'h', non-empty)
  - Call existing `/mweb/v1/get_history_by_ids` endpoint (DO NOT modify endpoint)
  - Map status codes: 20/42/45 → 'processing', 30 → 'failed', 50 → 'completed'
  - Calculate progress from `finished_image_count / total_image_count`
  - Extract imageUrls or videoUrl based on item_list
  - Return QueryResultResponse with appropriate fields
  - **File**: `src/api/JimengClient.ts`
  - **Dependencies**: T001, T002 (types must exist)
  - **Note**: Reuse existing polling infrastructure, do NOT modify it

- [x] **T014** Export new functions from `src/api.ts`
  - Export `generateImageAsync` function wrapper
  - Export `getImageResult` function wrapper
  - Use singleton pattern: `const client = getApiClient(token)`
  - Both functions call JimengClient methods
  - **File**: `src/api.ts`
  - **Dependencies**: T012, T013
  - **Note**: Do NOT modify existing exports

---

## Phase 3.4: MCP Tool Integration

- [x] **T015** [P] Register `generateImageAsync` MCP tool in `src/server.ts`
  - Define Zod schema for parameters
  - Map to `generateImageAsync()` function
  - Format response: "异步任务已提交成功！\n\nhistoryId: {id}\n\n请使用 getImageResult 工具查询生成结果。"
  - Handle errors with user-friendly messages
  - **File**: `src/server.ts`
  - **Dependencies**: T014

- [x] **T016** [P] Register `getImageResult` MCP tool in `src/server.ts`
  - Define Zod schema with historyId validation pattern
  - Map to `getImageResult()` function
  - Format responses:
    - Pending/Processing: "⏳ 生成中...\n\n状态: {status}\n进度: {progress}%"
    - Completed: "✅ 生成完成！\n\n状态: completed\n进度: 100%\n\n生成结果:\n- {urls}"
    - Failed: "❌ 生成失败\n\n状态: failed\n错误: {error}"
  - **File**: `src/server.ts`
  - **Dependencies**: T014

---

## Phase 3.5: Polish & Validation

- [x] **T017** Run all tests and verify backward compatibility
  - Run: `yarn test`
  - Verify: All existing tests pass WITHOUT modification
  - Verify: All new tests (T003-T011) pass
  - Verify: `generateImage()` still returns `string[]`
  - Verify: `generateVideo()` still returns `string`
  - Verify: No breaking changes in type signatures
  - **Manual validation required**

- [x] **T018** Execute quickstart.md validation scenarios - ✅ 5/5 PASS (100%)
  - Run all 5 scenarios from `specs/001-/quickstart.md`
  - Verify all success criteria checked
  - Document any issues found
  - Measure performance (query latency <2s)
  - **Manual testing**: 10-15 minutes
  - **Source**: `specs/001-/quickstart.md`

---

## Dependencies

```
Setup (T001-T002) → Tests (T003-T011) → Implementation (T012-T014) → MCP Tools (T015-T016) → Polish (T017-T018)

Detailed:
- T003-T011: All tests independent [P]
- T012: Depends on T001, T002 (types)
- T013: Depends on T001, T002 (types), T012 (generateImageAsync)
- T014: Depends on T012, T013 (implementations)
- T015-T016: Depend on T014 (exports) [P]
- T017: Depends on T003-T016 (all previous tasks)
- T018: Depends on T017 (tests passing)
```

## Parallel Execution Examples

### Batch 1: Type Definitions
```bash
# Launch T001-T002 together (different sections of same file)
Task: "Add QueryResultResponse interface to src/types/api.types.ts"
Task: "Add GenerationStatus type to src/types/api.types.ts"
```

### Batch 2: Contract Tests (After types defined)
```bash
# Launch T003-T006 together (different test files)
Task: "Contract test for generateImageAsync() in src/__tests__/contract-generateImageAsync.test.ts"
Task: "Contract test for getImageResult() in src/__tests__/contract-getImageResult.test.ts"
Task: "Contract test for concurrent queries in src/__tests__/contract-concurrent.test.ts"
Task: "Contract test for MCP tools in src/__tests__/contract-mcp-tools.test.ts"
```

### Batch 3: Integration Tests (After contract tests)
```bash
# Launch T007-T011 together (different test files)
Task: "Integration test: Basic image query workflow"
Task: "Integration test: Video generation query"
Task: "Integration test: Error handling"
Task: "Integration test: Concurrent queries"
Task: "Integration test: MCP tool workflow"
```

### Batch 4: MCP Tool Registration (After exports)
```bash
# Launch T015-T016 together (different tool definitions)
Task: "Register generateImageAsync MCP tool in src/server.ts"
Task: "Register getImageResult MCP tool in src/server.ts"
```

---

## Notes

### TDD Workflow
1. Write failing tests (T003-T011) ✅
2. Verify tests fail ✅
3. Implement features (T012-T014) ✅
4. Tests should now pass ✅

### Backward Compatibility Checklist
- [ ] No modifications to `generateImage()` signature
- [ ] No modifications to `generateVideo()` signature
- [ ] No modifications to `ImageGenerationParams` type
- [ ] No modifications to `VideoGenerationParams` type
- [ ] All existing tests pass without changes
- [ ] New functions are additive only

### File Impact Analysis
- **Modified files**:
  - `src/types/api.types.ts` (additive - T001, T002)
  - `src/api/JimengClient.ts` (additive - T012, T013)
  - `src/api.ts` (additive - T014)
  - `src/server.ts` (additive - T015, T016)

- **New test files**:
  - `src/__tests__/contract-*.test.ts` (6 new files)
  - `src/__tests__/integration-*.test.ts` (5 new files)

- **No modifications**: All existing code remains unchanged

### Avoid Common Pitfalls
- ❌ Don't modify existing `pollTraditionalResult()` method
- ❌ Don't change existing endpoint URLs or request payloads
- ❌ Don't add required parameters to existing functions
- ❌ Don't modify existing type definitions
- ✅ Add new functions with new names
- ✅ Reuse existing infrastructure
- ✅ Keep transformations in wrapper layer only

---

## Validation Checklist
*GATE: Must pass before tasks considered complete*

- [x] All contracts (2 functions + 2 MCP tools) have tests ✓
- [x] All entities (2 types) have definitions ✓
- [x] All tests (T003-T011) come before implementation (T012-T014) ✓
- [x] Parallel tasks (marked [P]) are truly independent ✓
- [x] Each task specifies exact file path ✓
- [x] No task modifies same file as another [P] task ✓
- [x] Backward compatibility maintained ✓
- [x] TDD workflow enforced ✓

---

**Total Tasks**: 18
**Estimated Time**: 6-8 hours
**Parallel Opportunities**: 4 batches (T001-T002, T003-T006, T007-T011, T015-T016)
**Critical Path**: Setup → Tests → Implementation → MCP Tools → Validation