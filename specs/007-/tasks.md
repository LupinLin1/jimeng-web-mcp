# Tasks: 继续生成功能代码质量优化

**Input**: Design documents from `/Users/lupin/mcp-services/jimeng-mcp/specs/007-/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. ✅ Load plan.md from feature directory
   → Tech stack: TypeScript 5.x, Node.js 16+, Jest testing
   → Structure: Single project (src/api/, src/types/, src/utils/)
2. ✅ Load optional design documents:
   → data-model.md: 2 entities (CacheEntry, LogEntry)
   → contracts/: 3 files (cache-manager, logger, prompt-validator)
   → research.md: 5 technical decisions validated
3. ✅ Generate tasks by category (see phases below)
4. ✅ Apply task rules:
   → Different files = mark [P]
   → TDD: Tests before implementation
   → Risk-ordered phases (low-risk first)
5. ✅ Number tasks sequentially (T001-T032)
6. ✅ Generate dependency graph (see Dependencies section)
7. ✅ Create parallel execution examples (see Phase sections)
8. ✅ Validate task completeness:
   → All 3 contracts have tests ✅
   → All 2 entities have type definitions ✅
   → All refactorings have validation tasks ✅
9. Return: SUCCESS (32 tasks ready for execution)
```

## Constitutional Markers

**IMPORTANT**: This feature operates under **Constitutional Exception: Principle VI (Technical Debt Remediation)**

Tasks that violate Principles I or II are marked with:
```
[CONSTITUTION-EXCEPTION: Tech Debt]
```

Commit messages for these tasks MUST include this prefix.

---

## Phase 3.1: Setup & Constants

**Purpose**: Low-risk preparation tasks, establish code standards

- [X] **T001** [P] Extract API constants to `src/types/constants.ts`
  - Define `MAX_IMAGES_PER_REQUEST = 4`
  - Define `STATUS_CODES` enum (COMPLETED: 50, FAILED: 30, PENDING: 20, etc.)
  - Define `POLLING` config (MAX_ATTEMPTS: 60, INTERVAL_MS: 2000)
  - Define `CACHE_CONFIG` (TTL_MS: 1800000, EVICTION_INTERVAL_MS: 300000)
  - **File**: `src/types/constants.ts` (NEW)
  - **Parallel**: Yes (new file, no dependencies)
  - **Constitutional marker**: None (additive change)

- [X] **T002** [P] Create cache types in `src/types/cache.types.ts`
  - Define `CacheEntry` interface per data-model.md
  - Define `CacheEntryState` enum (CREATED, ACTIVE, COMPLETED)
  - Define `CacheStats` interface
  - **File**: `src/types/cache.types.ts` (NEW)
  - **Parallel**: Yes (new file, no dependencies)
  - **Constitutional marker**: None (additive change)

- [X] **T003** Update `src/types/index.ts` to export new types
  - Add `export * from './constants.js'`
  - Add `export * from './cache.types.js'`
  - **File**: `src/types/index.ts` (MODIFIED)
  - **Depends on**: T001, T002
  - **Constitutional marker**: None (export update)

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation

### Contract Tests (Parallel - Independent Files)

- [X] **T004** [P] Write failing tests for CacheManager in `tests/unit/cache-manager.test.ts`
  - Test: `should store and retrieve cache entry`
  - Test: `should return undefined for expired entries`
  - Test: `should cleanup all related caches atomically`
  - Test: `should evict entries past TTL`
  - Test: `should track cache size accurately`
  - **File**: `tests/unit/cache-manager.test.ts` (NEW)
  - **Expected**: All tests FAIL (CacheManager not implemented yet)
  - **Parallel**: Yes (new file)
  - **Constitutional marker**: None (test-only)

- [X] **T005** [P] Write failing tests for Logger in `tests/unit/logger.test.ts`
  - Test: `should suppress debug logs when DEBUG=false`
  - Test: `should format structured context as JSON`
  - Test: `should redact sensitive keys (token, sessionid)`
  - Test: `should write to stderr for error level`
  - Test: `should respect minLevel configuration`
  - **File**: `tests/unit/logger.test.ts` (NEW)
  - **Expected**: All tests FAIL (Logger not fully implemented)
  - **Parallel**: Yes (new file)
  - **Constitutional marker**: None (test-only)

- [X] **T006** [P] Write failing tests for PromptValidator in `tests/unit/prompt-validator.test.ts`
  - Test: `should detect "一共5张图" pattern`
  - Test: `should detect variations ("共6张", "5张图")`
  - Test: `should append "，一共5张图" when missing`
  - Test: `should not append when already present`
  - Test: `should handle edge case: empty prompt`
  - **File**: `tests/unit/prompt-validator.test.ts` (NEW)
  - **Expected**: All tests FAIL (PromptValidator not implemented)
  - **Parallel**: Yes (new file)
  - **Constitutional marker**: None (test-only)

### Integration Tests (Parallel - Different Test Files)

- [X] **T007** [P] Write memory leak integration test in `tests/integration/memory-leak.test.ts`
  - Test: `should maintain stable memory over 1000 requests`
  - Test: `should cleanup cache on task completion`
  - Test: `should respect 30min TTL for abandoned tasks`
  - **File**: `tests/integration/memory-leak.test.ts` (NEW)
  - **Expected**: Tests FAIL (cache cleanup not implemented)
  - **Parallel**: Yes (new file)
  - **Constitutional marker**: None (test-only)

- [X] **T008** [P] Write concurrency safety test in `tests/integration/concurrency.test.ts`
  - Test: `should prevent duplicate continuation submissions`
  - Test: `should handle race condition on simultaneous queries`
  - Test: `should cleanup continuationSent flag on completion`
  - **File**: `tests/integration/concurrency.test.ts` (NEW)
  - **Expected**: Tests FAIL (cleanup not implemented)
  - **Parallel**: Yes (new file)
  - **Constitutional marker**: None (test-only)

### Refactoring Validation Tests

- [X] **T009** [P] Write method extraction tests in `tests/unit/new-client-refactor.test.ts`
  - Test: `buildInitialRequest should generate correct request body`
  - Test: `buildContinuationRequest should reuse cached parameters`
  - Test: `submitImageTask should delegate to correct helper`
  - **File**: `tests/unit/new-client-refactor.test.ts` (NEW)
  - **Expected**: Tests FAIL (helpers not extracted yet)
  - **Parallel**: Yes (new file)
  - **Constitutional marker**: None (test-only)

---

## Phase 3.3: Core Utility Implementation (ONLY after tests are failing)

**Purpose**: Implement utilities to make contract tests pass (Green phase)

- [X] **T010** [P] Implement CacheManager in `src/utils/cache-manager.ts`
  - Implement `set()`, `get()`, `cleanup()` per contract
  - Implement `evictExpired()` with TTL checking
  - Implement `size()` and `getStats()`
  - Add periodic eviction via `setInterval` (optional)
  - **File**: `src/utils/cache-manager.ts` (NEW)
  - **Depends on**: T002 (cache.types.ts), T004 (failing tests)
  - **Expected**: T004 tests now PASS
  - **Parallel**: Yes (new file, tests exist)
  - **Constitutional marker**: None (new module)

- [X] **T011** [P] Implement/enhance Logger in `src/utils/logger.ts`
  - Implement `debug()`, `info()`, `warn()`, `error()` methods
  - Add `isLevelEnabled()` level check
  - Add PII redaction in `sanitize()` helper
  - Respect `DEBUG` environment variable
  - **File**: `src/utils/logger.ts` (MODIFIED or NEW)
  - **Depends on**: T005 (failing tests)
  - **Expected**: T005 tests now PASS
  - **Parallel**: Yes (independent file)
  - **Constitutional marker**: None (utility enhancement)

- [X] **T012** [P] Implement PromptValidator in `src/utils/prompt-validator.ts`
  - Implement `hasCountDeclaration()` with regex patterns
  - Implement `appendCountIfMissing()` with deduplication
  - Define `COUNT_PATTERNS` array per contract
  - **File**: `src/utils/prompt-validator.ts` (NEW)
  - **Depends on**: T006 (failing tests)
  - **Expected**: T006 tests now PASS
  - **Parallel**: Yes (new file)
  - **Constitutional marker**: None (new module)

- [X] **T013** Update `src/utils/index.ts` to export new utilities
  - Add `export * from './cache-manager.js'`
  - Add `export { logger } from './logger.js'`
  - Add `export * from './prompt-validator.js'`
  - **File**: `src/utils/index.ts` (MODIFIED)
  - **Depends on**: T010, T011, T012
  - **Constitutional marker**: None (export update)

---

## Phase 3.4: Refactoring NewJimengClient (High-Risk, Sequential)

**Purpose**: Fix memory leak and complexity issues in core module

**⚠️ CRITICAL**: This phase modifies core module - execute sequentially with test gates

- [X] **T014** [CONSTITUTION-EXCEPTION: Tech Debt] Extract `buildInitialRequest()` helper method
  - Extract lines 630-690 (initial request building) into private helper
  - Method signature: `private buildInitialRequest(params: any): RequestBody`
  - Keep method under 50 lines
  - **File**: `src/api/NewJimengClient.ts` (MODIFIED - core module)
  - **Depends on**: T001 (constants.ts), T009 (refactor tests)
  - **Test gate**: Run T009 tests after extraction - must PASS ✅
  - **Constitutional marker**: Principle I violation (modifying core)
  - **Commit message**: `[CONSTITUTION-EXCEPTION: Tech Debt] refactor: extract buildInitialRequest helper`

- [X] **T015** [CONSTITUTION-EXCEPTION: Tech Debt] Extract `buildContinuationRequest()` helper method
  - Extract lines 620-640 (continuation request building) into private helper
  - Method signature: `private buildContinuationRequest(params: any): RequestBody`
  - Reuse cached parameters from `requestBodyCache`
  - Keep method under 50 lines
  - **File**: `src/api/NewJimengClient.ts` (MODIFIED - same file as T014)
  - **Depends on**: T014 (sequential - same file)
  - **Test gate**: Run T009 tests after extraction - must PASS ✅
  - **Constitutional marker**: Principle I violation (modifying core)
  - **Commit message**: `[CONSTITUTION-EXCEPTION: Tech Debt] refactor: extract buildContinuationRequest helper`

- [X] **T016** [CONSTITUTION-EXCEPTION: Tech Debt] Refactor `submitImageTask()` to use helper methods
  - Replace 130-line method with delegation to helpers
  - Logic: `params.history_id ? buildContinuationRequest() : buildInitialRequest()`
  - Reduce main method to <50 lines
  - **File**: `src/api/NewJimengClient.ts` (MODIFIED - same file)
  - **Depends on**: T015 (sequential - same file)
  - **Test gate**: Run T009 tests + existing integration tests - all must PASS ✅
  - **Constitutional marker**: Principle I violation (modifying core)
  - **Commit message**: `[CONSTITUTION-EXCEPTION: Tech Debt] refactor: simplify submitImageTask using helpers`

- [X] **T017** [CONSTITUTION-EXCEPTION: Tech Debt] Replace static Maps with CacheManager
  - Import `CacheManager` from `src/utils/cache-manager.ts`
  - Replace `asyncTaskCache`, `continuationSent`, `requestBodyCache` with single `CacheManager` instance
  - Update all `.set()`, `.get()`, `.has()` calls to use CacheManager API
  - **File**: `src/api/NewJimengClient.ts` (MODIFIED - same file)
  - **Depends on**: T010 (CacheManager implemented), T016 (sequential)
  - **Test gate**: Run T004, T007, T008 tests - all must PASS ✅
  - **Constitutional marker**: Principle I + II violation (core state management)
  - **Commit message**: `[CONSTITUTION-EXCEPTION: Tech Debt] fix: replace static Maps with CacheManager (memory leak fix)`

- [X] **T018** [CONSTITUTION-EXCEPTION: Tech Debt] Add cache cleanup on task completion
  - Call `cacheManager.cleanup(historyId)` in `waitForImageCompletion()` when status is 'completed' or 'failed'
  - Call `cacheManager.cleanup(historyId)` in error handlers
  - Add cleanup to continue generation completion path
  - **File**: `src/api/NewJimengClient.ts` (MODIFIED - same file)
  - **Depends on**: T017 (sequential - same file)
  - **Test gate**: Run T007 memory leak test - must PASS ✅
  - **Constitutional marker**: Principle I violation (modifying core)
  - **Commit message**: `[CONSTITUTION-EXCEPTION: Tech Debt] fix: add cache cleanup to prevent memory leak`

- [X] **T019** [CONSTITUTION-EXCEPTION: Tech Debt] Replace magic numbers with named constants
  - Import constants from `src/types/constants.ts`
  - Replace `4` → `MAX_IMAGES_PER_REQUEST`
  - Replace `30`, `50`, etc. → `STATUS_CODES.FAILED`, `STATUS_CODES.COMPLETED`
  - Replace `2000`, `60` → `POLLING.INTERVAL_MS`, `POLLING.MAX_ATTEMPTS`
  - **File**: `src/api/NewJimengClient.ts` (MODIFIED - same file)
  - **Depends on**: T001 (constants.ts), T018 (sequential)
  - **Test gate**: All existing tests must still PASS ✅
  - **Constitutional marker**: Principle I violation (modifying core)
  - **Commit message**: `[CONSTITUTION-EXCEPTION: Tech Debt] refactor: replace magic numbers with named constants`

---

## Phase 3.5: Logging Migration & Prompt Validation

**Purpose**: Replace console.log and add prompt validation

- [X] **T020** [CONSTITUTION-EXCEPTION: Tech Debt] Replace console.log with logger in NewJimengClient
  - Import `logger` from `src/utils/logger.ts`
  - Replace ~20 `console.log` statements with appropriate log levels:
    - Debug logs (🔍, 💾, 🔄 emoji prefixes) → `logger.debug()`
    - Info logs (✅ success) → `logger.info()`
    - Error logs (❌ failure) → `logger.error()`
  - Remove emoji prefixes, use structured context instead
  - **File**: `src/api/NewJimengClient.ts` (MODIFIED - same file)
  - **Depends on**: T011 (logger implemented), T019 (sequential)
  - **Test gate**: Run T005 logger tests - must PASS
  - **Constitutional marker**: Principle I violation (modifying core)
  - **Commit message**: `[CONSTITUTION-EXCEPTION: Tech Debt] refactor: replace console.log with structured logger`

- [X] **T021** [CONSTITUTION-EXCEPTION: Tech Debt] Add prompt validation to `generateImage()` method
  - Import `promptValidator` from `src/utils/prompt-validator.ts`
  - In `generateImage()`, after `buildPromptWithFrames()`:
    ```typescript
    if (count > 1 && validFrames.length === 0) {
      finalPrompt = promptValidator.appendCountIfMissing(finalPrompt, count);
    }
    ```
  - **File**: `src/api/NewJimengClient.ts` (MODIFIED - same file)
  - **Depends on**: T012 (promptValidator implemented), T020 (sequential)
  - **Test gate**: Run T006 prompt validator tests - must PASS
  - **Constitutional marker**: Principle I violation (modifying core)
  - **Commit message**: `[CONSTITUTION-EXCEPTION: Tech Debt] fix: add prompt validation to prevent duplicates`

---

## Phase 3.6: Integration & Validation

**Purpose**: Verify all improvements work together, no regressions

- [X] **T022** Run backward compatibility test suite
  - Execute `npm test -- continue-generation.test.ts`
  - Execute `npm test` (full test suite)
  - **Expected**: 100% of existing tests PASS (no regressions)
  - **Gate**: If any test fails, roll back to previous commit and debug
  - **Constitutional validation**: Confirm Principle III (Backward Compatibility) upheld

- [X] **T023** [P] Run memory stability validation (Quickstart Scenario 1)
  - Execute memory leak test per `quickstart.md` Scenario 1
  - Run 1000 image generation requests
  - Measure memory growth (must be <50MB)
  - Verify cache size returns to 0 after completion
  - **File**: Execute test script or manual scenario
  - **Expected**: Memory stable, FR-001 requirement met
  - **Parallel**: Yes (independent validation)

- [X] **T024** [P] Run code maintainability verification (Quickstart Scenario 2)
  - Execute method line count checks per `quickstart.md` Scenario 2
  - Verify `submitImageTask` <50 lines
  - Verify `buildInitialRequest` <50 lines
  - Verify `buildContinuationRequest` <50 lines
  - **File**: Shell script or manual check
  - **Expected**: All methods under limit, FR-004 requirement met
  - **Parallel**: Yes (independent validation)

- [X] **T025** [P] Run logging observability validation (Quickstart Scenario 4)
  - Execute debug suppression test per `quickstart.md` Scenario 4
  - Verify DEBUG logs suppressed when `DEBUG=false`
  - Verify PII redaction works (token → `[REDACTED]`)
  - **File**: Test logs in production mode
  - **Expected**: FR-010, FR-011, FR-012 requirements met
  - **Parallel**: Yes (independent validation)

- [X] **T026** [P] Run concurrency safety validation (Quickstart Scenario 6)
  - Execute concurrency test per `quickstart.md` Scenario 6
  - Verify no duplicate continuation submissions
  - Verify `continuationSent` flag cleanup works
  - **File**: Execute test script
  - **Expected**: FR-008 requirement met
  - **Parallel**: Yes (independent validation)

---

## Phase 3.7: Polish & Documentation

**Purpose**: Clean up, optimize, document changes

- [X] **T027** [P] Add JSDoc comments to new utility modules
  - Document `CacheManager` class and methods
  - Document `Logger` class and methods
  - Document `PromptValidator` class and methods
  - **Files**: `src/utils/cache-manager.ts`, `src/utils/logger.ts`, `src/utils/prompt-validator.ts`
  - **Parallel**: Yes (different files)
  - **Constitutional marker**: None (documentation)

- [X] **T028** [P] Update CHANGELOG.md with refactoring changes
  - Add section for v2.0.3 (or next version)
  - Document memory leak fix (FR-001, FR-002, FR-003)
  - Document code complexity reduction (FR-004, FR-005, FR-006)
  - Document logging improvements (FR-010, FR-011, FR-012)
  - Document prompt validation (FR-007)
  - **File**: `CHANGELOG.md` (MODIFIED)
  - **Parallel**: Yes (documentation file)
  - **Constitutional marker**: None (documentation)

- [X] **T029** [P] Update CLAUDE.md architecture notes
  - Document cache lifecycle management pattern
  - Document structured logging approach
  - Document prompt validation pattern
  - Update "Recent Changes" section with Feature 007
  - **File**: `CLAUDE.md` (MODIFIED)
  - **Note**: Already updated by `/plan`, verify completeness
  - **Parallel**: Yes (documentation file)
  - **Constitutional marker**: None (documentation)

- [X] **T030** Run performance benchmark before/after
  - Establish baseline: Run benchmark script for cache operations
  - Target: <50ms for get/set operations
  - Target: <5ms for submitImageTask method
  - **File**: `tests/benchmark/cache-perf.ts` (create if needed)
  - **Expected**: No performance regression, meet FR targets
  - **Constitutional safeguard**: Performance baseline validation

- [X] **T031** Remove debug test files from `tests/debug/`
  - Clean up temporary test scripts used during development
  - Keep only production-ready tests in `tests/unit/` and `tests/integration/`
  - **Files**: `tests/debug/test-continue-api.ts`, `tests/debug/test-auto-continue.ts`
  - **Action**: Move to archive or delete if no longer needed
  - **Constitutional marker**: None (cleanup)

- [X] **T032** Final validation: Run complete test suite
  - Execute `npm test` (all tests)
  - Execute `npm run build` (verify production bundle)
  - Execute `npm run type-check` (TypeScript validation)
  - **Expected**: 100% tests pass, clean build, no type errors
  - **Gate**: If any failure, fix before considering feature complete
  - **Constitutional validation**: Final backward compatibility check

---

## Dependencies

**Sequential Chains** (must execute in order):
1. **Setup**: T001, T002 → T003
2. **Tests**: None (all parallel)
3. **Utils**: T004 → T010, T005 → T011, T006 → T012 → T013
4. **Core Refactor** (same file, sequential): T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021
5. **Validation**: T022 (blocks Polish), T023-T026 (parallel after T022)
6. **Polish**: T027-T029 (parallel), T030 → T031 → T032

**Critical Path** (longest dependency chain):
```
T001 (constants) → T003 (exports) → T014 (buildInitialRequest) → T015 (buildContinuationRequest)
→ T016 (submitImageTask) → T017 (CacheManager integration) → T018 (cleanup) → T019 (constants)
→ T020 (logger migration) → T021 (prompt validation) → T022 (backward compat) → T032 (final validation)

Total: 13 sequential tasks (estimated 8-12 hours with testing)
```

**Parallelizable Work**:
- Phase 3.1: T001, T002 (2 tasks in parallel)
- Phase 3.2: T004, T005, T006, T007, T008, T009 (6 tasks in parallel)
- Phase 3.3: T010, T011, T012 (3 tasks in parallel after dependencies met)
- Phase 3.6: T023, T024, T025, T026 (4 tasks in parallel after T022)
- Phase 3.7: T027, T028, T029 (3 tasks in parallel)

**Estimated Total Tasks**: 32
**Estimated Parallel Work**: 18 tasks can run concurrently (56%)
**Estimated Sequential Work**: 14 tasks must run sequentially (44%)

---

## Parallel Execution Examples

### Example 1: Setup Phase (T001-T002)
```bash
# Launch 2 tasks in parallel:
# Terminal 1
npm run task -- "Extract API constants to src/types/constants.ts"

# Terminal 2
npm run task -- "Create cache types in src/types/cache.types.ts"
```

### Example 2: Test Phase (T004-T009)
```bash
# Launch 6 test tasks in parallel (different files):
# Task agents or concurrent test execution
npx jest tests/unit/cache-manager.test.ts &
npx jest tests/unit/logger.test.ts &
npx jest tests/unit/prompt-validator.test.ts &
npx jest tests/integration/memory-leak.test.ts &
npx jest tests/integration/concurrency.test.ts &
npx jest tests/unit/new-client-refactor.test.ts &
wait

# All tests should FAIL (no implementation yet) - This is correct TDD behavior
```

### Example 3: Utility Implementation (T010-T012)
```bash
# After dependencies met, launch 3 implementations in parallel:
# Terminal 1
# Implement CacheManager

# Terminal 2
# Implement Logger

# Terminal 3
# Implement PromptValidator

# Verify tests pass:
npm test -- cache-manager.test.ts logger.test.ts prompt-validator.test.ts
```

### Example 4: Validation Phase (T023-T026)
```bash
# After T022 passes, run 4 validations in parallel:
npm run quickstart:memory &
npm run quickstart:maintainability &
npm run quickstart:logging &
npm run quickstart:concurrency &
wait

# Aggregate results
```

---

## Notes

- **[P] markers**: 18 tasks can run in parallel (different files, no dependencies)
- **Constitutional exceptions**: 8 tasks modify core module (T014-T021) - commit messages must include marker
- **Test-first approach**: 6 test tasks (T004-T009) MUST fail before implementation begins
- **Risk mitigation**: Core refactor (T014-T021) is sequential with test gates between each task
- **Backward compatibility**: Validated at T022 (before polish) and T032 (final check)
- **Estimated completion time**:
  - With parallelization: ~10-14 hours
  - Sequential only: ~20-24 hours
  - Time savings: ~40-50% via parallel execution

---

## Validation Checklist

**GATE: Verify before marking feature complete**

- [  ] All 3 contracts have corresponding tests (T004, T005, T006) ✅
- [  ] All 2 entities have type definitions (T002) ✅
- [  ] All tests come before implementation (Phase 3.2 before 3.3) ✅
- [  ] Parallel tasks truly independent (verified via file paths) ✅
- [  ] Each task specifies exact file path ✅
- [  ] No task modifies same file as another [P] task ✅
- [  ] Constitutional exceptions documented (8 tasks marked) ✅
- [  ] Test gates defined for high-risk tasks ✅
- [  ] Backward compatibility validated twice (T022, T032) ✅
- [  ] All 12 functional requirements from spec.md mapped to tasks ✅

---

**Last Updated**: 2025-10-03
**Status**: Ready for execution
**Total Tasks**: 32 (18 parallel, 14 sequential)
**Estimated Duration**: 10-14 hours with parallel execution
