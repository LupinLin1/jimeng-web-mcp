# Quickstart: 继续生成功能代码质量优化验证

**Date**: 2025-10-03
**Status**: Ready for execution
**Purpose**: Validate refactoring success via executable test scenarios

## Overview

This quickstart provides hands-on validation scenarios to verify that the code quality improvements meet all acceptance criteria from the specification. Execute these scenarios after implementation to confirm success.

---

## Scenario 1: Memory Stability Validation

**Requirement**: FR-001 - System MUST automatically clean up cached data when tasks complete

**Acceptance Criteria**:
- Memory usage stable over 24 hours with 1000+ requests
- Cache size returns to baseline after tasks complete
- No unbounded growth in process memory

### Setup

```bash
# Install memory monitoring tool
npm install -g clinic

# Or use built-in Node.js memory tracking
NODE_ENV=production DEBUG=false npm start &
MCP_PID=$!
echo "MCP server PID: $MCP_PID"
```

### Test Execution

```bash
# Baseline memory measurement
ps aux | grep $MCP_PID | awk '{print $6}' > memory_baseline.txt
BASELINE=$(cat memory_baseline.txt)
echo "Baseline memory: ${BASELINE}KB"

# Run 1000 image generation requests
for i in {1..1000}; do
  # Generate image with continuation (6 images)
  echo "Request $i: Generating 6 images..."

  # Use npx or direct API call
  curl -X POST http://localhost:3000/generate \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "测试图片 #'$i'",
      "count": 6,
      "async": false
    }' 2>/dev/null | jq -r '.historyId' > /tmp/history_$i.txt

  # Wait for completion (sync mode should return immediately)
  sleep 0.1

  # Log memory every 100 requests
  if [ $((i % 100)) -eq 0 ]; then
    CURRENT=$(ps aux | grep $MCP_PID | awk '{print $6}')
    echo "After $i requests: ${CURRENT}KB (baseline: ${BASELINE}KB)"
  fi
done

# Final memory measurement
FINAL=$(ps aux | grep $MCP_PID | awk '{print $6}')
GROWTH=$((FINAL - BASELINE))

echo "===== Memory Stability Report ====="
echo "Baseline:  ${BASELINE}KB"
echo "Final:     ${FINAL}KB"
echo "Growth:    ${GROWTH}KB"
echo "Requests:  1000"
echo "================================="

# Success criteria: Growth < 50MB (51200KB)
if [ $GROWTH -lt 51200 ]; then
  echo "✅ PASS: Memory growth within acceptable range"
else
  echo "❌ FAIL: Memory growth exceeds 50MB limit"
fi
```

### Alternative: Simplified Test (Without Server)

```bash
# Run test script directly
npm run test:memory-leak

# Expected output:
# ✅ Memory stable over 1000 requests
# Cache size: 0 entries (all cleaned up)
# Memory growth: 15MB (acceptable)
```

**Expected Results**:
- Memory growth < 50MB over 1000 requests
- Cache size returns to 0 after all tasks complete
- No process crashes or OOM errors

---

## Scenario 2: Code Maintainability Verification

**Requirement**: FR-004 - Request building logic MUST be separated into focused methods <50 lines

**Acceptance Criteria**:
- `submitImageTask` method < 50 lines
- Helper methods (`buildInitialRequest`, `buildContinuationRequest`) each < 50 lines
- Code passes linter with no complexity warnings

### Test Execution

```bash
# Verify method line counts
echo "===== Method Line Count Verification ====="

# Count submitImageTask method lines
SUBMIT_LINES=$(sed -n '/async submitImageTask/,/^  \}/p' src/api/NewJimengClient.ts | wc -l)
echo "submitImageTask: $SUBMIT_LINES lines"

# Count buildInitialRequest lines
INITIAL_LINES=$(sed -n '/buildInitialRequest/,/^  \}/p' src/api/NewJimengClient.ts | wc -l)
echo "buildInitialRequest: $INITIAL_LINES lines"

# Count buildContinuationRequest lines
CONTINUATION_LINES=$(sed -n '/buildContinuationRequest/,/^  \}/p' src/api/NewJimengClient.ts | wc -l)
echo "buildContinuationRequest: $CONTINUATION_LINES lines"

echo "========================================="

# Success criteria: All methods < 50 lines
if [ $SUBMIT_LINES -lt 50 ] && [ $INITIAL_LINES -lt 50 ] && [ $CONTINUATION_LINES -lt 50 ]; then
  echo "✅ PASS: All methods under 50 lines"
else
  echo "❌ FAIL: One or more methods exceed 50 lines"
fi

# Run code complexity analysis
npm run lint:complexity || echo "⚠️  Install eslint-plugin-complexity for detailed analysis"
```

### Manual Code Review Checklist

```bash
# Open files for manual inspection
code src/api/NewJimengClient.ts
```

**Review Checklist**:
- [ ] `submitImageTask` method is readable and focused
- [ ] Helper methods have single responsibility
- [ ] No duplicate logic between helpers
- [ ] Code follows existing style patterns
- [ ] Comments explain "why" not "what"

**Expected Results**:
- All methods < 50 lines
- No ESLint complexity warnings
- Code review pass from peer developer

---

## Scenario 3: Backward Compatibility Check

**Requirement**: FR-003 (implied) - All existing API signatures preserved

**Acceptance Criteria**:
- Existing integration tests pass without modification
- Public API method signatures unchanged
- No breaking changes in parameters or return types

### Test Execution

```bash
# Run existing integration tests
echo "===== Backward Compatibility Test ====="

npm test -- continue-generation.test.ts

# Expected: All tests pass
# ✓ 同步模式：生成6张图片应自动继续生成
# ✓ 异步模式：生成8张图片应触发智能继续生成
# ✓ 验证继续生成API参数正确

# Run all existing tests
npm test

# Count passing/failing tests
PASS_COUNT=$(npm test 2>&1 | grep -o '\([0-9]\+\) passed' | grep -o '[0-9]\+')
FAIL_COUNT=$(npm test 2>&1 | grep -o '\([0-9]\+\) failed' | grep -o '[0-9]\+' || echo "0")

echo "====================================="
echo "Tests passed: $PASS_COUNT"
echo "Tests failed: $FAIL_COUNT"
echo "====================================="

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "✅ PASS: All existing tests pass"
else
  echo "❌ FAIL: $FAIL_COUNT tests failing"
fi
```

### API Signature Verification

```bash
# Extract public API signatures before/after refactor
# (Run this before refactoring to establish baseline)

# Before refactoring:
grep -E "^\s*(export\s+)?(async\s+)?function|^\s*export\s+class" src/api/NewJimengClient.ts > api_signatures_before.txt

# After refactoring:
grep -E "^\s*(export\s+)?(async\s+)?function|^\s*export\s+class" src/api/NewJimengClient.ts > api_signatures_after.txt

# Compare signatures
diff api_signatures_before.txt api_signatures_after.txt

# Expected: No differences (or only internal private methods added)
```

**Expected Results**:
- 100% of existing tests pass
- No API signature changes in diff
- TypeScript compiler shows no breaking changes

---

## Scenario 4: Logging Observability Validation

**Requirement**: FR-010, FR-011 - Structured logging with level-based suppression

**Acceptance Criteria**:
- DEBUG logs suppressed in production (DEBUG=false)
- INFO/WARN/ERROR logs visible in production
- Sensitive data (tokens, sessionid) redacted from logs

### Test Execution

```bash
# Test 1: Debug suppression
echo "===== Debug Log Suppression Test ====="

DEBUG=false npm start > prod_logs.txt 2>&1 &
PROD_PID=$!
sleep 2

# Generate request (should not show debug logs)
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"测试","count":2}' > /dev/null 2>&1

sleep 1
kill $PROD_PID

# Check for debug logs in output
DEBUG_COUNT=$(grep -c "\[DEBUG\]" prod_logs.txt || echo "0")

if [ "$DEBUG_COUNT" -eq 0 ]; then
  echo "✅ PASS: No debug logs in production mode"
else
  echo "❌ FAIL: Found $DEBUG_COUNT debug logs in production"
fi

# Test 2: PII redaction
echo "===== PII Redaction Test ====="

DEBUG=true npm start > debug_logs.txt 2>&1 &
DEBUG_PID=$!
sleep 2

# Generate request with sensitive data
curl -X POST http://localhost:3000/generate \
  -H "Authorization: Bearer test_token_12345" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"测试","count":1}' > /dev/null 2>&1

sleep 1
kill $DEBUG_PID

# Check that token is redacted
REDACTED=$(grep -c "\[REDACTED\]" debug_logs.txt || echo "0")
EXPOSED_TOKEN=$(grep -c "test_token_12345" debug_logs.txt || echo "0")

if [ "$REDACTED" -gt 0 ] && [ "$EXPOSED_TOKEN" -eq 0 ]; then
  echo "✅ PASS: Sensitive data properly redacted"
else
  echo "❌ FAIL: Token exposed in logs"
fi

# Cleanup
rm -f prod_logs.txt debug_logs.txt
```

**Expected Results**:
- 0 `[DEBUG]` entries in prod logs (DEBUG=false)
- All sensitive keys show `[REDACTED]` in context
- Logs readable and properly formatted

---

## Scenario 5: Prompt Validation Accuracy

**Requirement**: FR-007 - System MUST validate user prompts to avoid duplicate count declarations

**Acceptance Criteria**:
- Detects existing "一共N张图" patterns
- Does not append count when already present
- Appends count when missing

### Test Execution

```bash
# Run unit tests for prompt validator
npm test -- prompt-validator.test.ts

# Expected tests:
# ✓ should detect "一共5张图" pattern
# ✓ should detect variations ("共6张", "5张图")
# ✓ should append ", 一共5张图" when missing
# ✓ should not append when already present
# ✓ should handle edge case: "一共" at end of prompt
```

### Manual Validation Test Cases

```typescript
// tests/manual/prompt-validation.ts
import { promptValidator } from '../src/utils/prompt-validator';

const testCases = [
  { prompt: '画一只猫', count: 5, expected: '画一只猫，一共5张图' },
  { prompt: '画一只猫，一共5张图', count: 5, expected: '画一只猫，一共5张图' },
  { prompt: '共6张小狗', count: 6, expected: '共6张小狗' },
  { prompt: '总共8张图片', count: 8, expected: '总共8张图片' },
  { prompt: '', count: 3, expected: '一共3张图' }
];

let passed = 0;
let failed = 0;

testCases.forEach(({ prompt, count, expected }) => {
  const result = promptValidator.appendCountIfMissing(prompt, count);
  if (result === expected) {
    console.log(`✅ PASS: "${prompt}" → "${result}"`);
    passed++;
  } else {
    console.log(`❌ FAIL: "${prompt}" → "${result}" (expected: "${expected}")`);
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
```

**Expected Results**:
- All 5 manual test cases pass
- 100% unit test coverage for prompt validator
- No duplicate count declarations in generated prompts

---

## Scenario 6: Concurrency Safety Validation

**Requirement**: FR-008 - System MUST handle concurrent continuation requests without race conditions

**Acceptance Criteria**:
- Multiple simultaneous queries don't trigger duplicate continuations
- `continuationSent` flag prevents double submission
- Cleanup removes stale flags

### Test Execution

```bash
# Run concurrency integration test
npm test -- concurrency.test.ts

# Expected tests:
# ✓ should prevent duplicate continuation submissions
# ✓ should handle race condition on simultaneous queries
# ✓ should cleanup continuationSent flag on completion
```

### Manual Concurrency Test

```bash
# Start server
npm start &
SERVER_PID=$!
sleep 2

# Submit 10 concurrent queries for same historyId
HISTORY_ID="4753456684812"  # Replace with actual ID from previous generation

for i in {1..10}; do
  curl -X GET "http://localhost:3000/query?historyId=$HISTORY_ID" &
done

wait

# Check server logs for continuation submissions
CONTINUATION_COUNT=$(grep -c "继续生成任务已提交" server.log || echo "0")

if [ "$CONTINUATION_COUNT" -eq 1 ]; then
  echo "✅ PASS: Only 1 continuation submitted (race condition prevented)"
else
  echo "❌ FAIL: $CONTINUATION_COUNT continuations submitted (expected 1)"
fi

kill $SERVER_PID
```

**Expected Results**:
- Exactly 1 continuation submission despite 10 concurrent queries
- No duplicate generation errors
- Clean shutdown with no stale cache entries

---

## Summary Validation Checklist

After running all scenarios, verify:

- [  ] **Scenario 1**: Memory growth < 50MB over 1000 requests ✅
- [  ] **Scenario 2**: All methods < 50 lines ✅
- [  ] **Scenario 3**: 100% existing tests pass ✅
- [  ] **Scenario 4**: Debug logs suppressed, PII redacted ✅
- [  ] **Scenario 5**: Prompt validation 100% accuracy ✅
- [  ] **Scenario 6**: No race conditions in concurrency test ✅

**Overall Success Criteria**: All 6 scenarios PASS

---

## Troubleshooting

### Scenario 1 Failures (Memory Leak)

**Symptom**: Memory growth > 100MB

**Debug Steps**:
1. Check if cleanup is called: `grep "cleanup" src/api/NewJimengClient.ts`
2. Verify cache size: Add `console.log(cacheManager.size())` in cleanup
3. Take heap snapshot: `node --inspect --heap-prof`

**Common Causes**:
- Cleanup not called on all completion paths (check error handlers)
- TTL eviction not working (check `evictExpired()` implementation)
- Circular references preventing GC (check object references)

### Scenario 3 Failures (Backward Compat)

**Symptom**: Tests fail after refactoring

**Debug Steps**:
1. Check test error messages for API signature changes
2. Run TypeScript compiler: `npm run type-check`
3. Compare before/after API exports

**Common Causes**:
- Public method signature changed (parameters, return type)
- Import paths changed (module reorganization)
- Breaking change in async/sync behavior

### Scenario 4 Failures (Logging)

**Symptom**: Debug logs still appear in production

**Debug Steps**:
1. Check environment: `echo $DEBUG`
2. Verify logger initialization: `console.log(logger.minLevel)`
3. Check level checks: `if (logger.isLevelEnabled(LogLevel.DEBUG))`

**Common Causes**:
- DEBUG env var not respected in logger constructor
- Level checks missing before log calls
- Logger config loaded incorrectly

---

## Continuous Validation

**Add to CI/CD Pipeline**:

```yaml
# .github/workflows/quality-check.yml
name: Code Quality Validation
on: [push, pull_request]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run lint:complexity
      - run: npm run test:memory-leak
      - run: npm run test:backward-compat
```

**Pre-commit Hook**:

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run lint:complexity || exit 1
npm test || exit 1
```

---

**Last Updated**: 2025-10-03
**Validation Status**: Ready for execution post-implementation
