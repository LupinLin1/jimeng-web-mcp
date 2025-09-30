# Quickstart: 异步视频生成查询

**Feature**: 002-async-video-query
**Date**: 2025-10-01
**Purpose**: 验证异步视频生成功能的端到端工作流程

---

## Prerequisites

```bash
# 确保环境变量已设置
export JIMENG_API_TOKEN="your_session_id_from_cookies"

# 构建项目
cd /Users/lupin/mcp-services/jimeng-mcp
yarn build

# 验证测试环境
yarn test --testNamePattern="async" --listTests
```

---

## Scenario 1: 基础异步视频生成（传统模式）

### Step 1: 提交异步生成任务

```typescript
import { VideoGenerator } from './src/api/video/VideoGenerator.js';

const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);

// 提交任务
const historyId = await videoGen.generateVideoAsync({
  prompt: "海上升明月，天涯共此时。明月从波光粼粼的大海上缓缓升起",
  resolution: "720p",
  fps: 24,
  duration_ms: 5000,
  video_aspect_ratio: "16:9"
});

console.log('✅ 任务已提交, historyId:', historyId);
// Expected: 立即返回（< 3秒），historyId为纯数字或h开头字符串
```

**验收标准**:
- ✅ 方法在3秒内返回
- ✅ 返回的historyId匹配格式：`/^[0-9]+$/` 或 `/^h[a-zA-Z0-9]+$/`
- ✅ 控制台显示 "🚀 [Async] 提交异步视频生成任务"

---

### Step 2: 查询任务状态（pending）

```typescript
import { getApiClient } from './src/api.js';

const client = getApiClient();

// 立即查询（预期pending状态）
const result1 = await client.getImageResult(historyId);

console.log('📊 状态:', result1.status);
console.log('📈 进度:', result1.progress, '%');

// Expected Output:
// 📊 状态: pending
// 📈 进度: 0 %
```

**验收标准**:
- ✅ `result1.status` 为 `'pending'` 或 `'processing'`
- ✅ `result1.progress` 为 0-100 之间的整数
- ✅ 查询在500ms内返回
- ✅ 不抛出错误

---

### Step 3: 轮询直到完成

```typescript
// 等待30秒再查询（模拟用户稍后回来）
console.log('⏳ 等待30秒...');
await new Promise(resolve => setTimeout(resolve, 30000));

const result2 = await client.getImageResult(historyId);

console.log('📊 状态:', result2.status);
console.log('📈 进度:', result2.progress, '%');

if (result2.status === 'completed') {
  console.log('🎬 视频URL:', result2.videoUrl);
} else if (result2.status === 'failed') {
  console.error('❌ 失败原因:', result2.error);
} else {
  console.log('⏳ 仍在处理中，建议继续轮询');
}
```

**验收标准**:
- ✅ `result2.status` 为 `'completed'`、`'processing'` 或 `'failed'` 之一
- ✅ 如果 `status === 'completed'`，`videoUrl` 字段存在且为有效URL
- ✅ 如果 `status === 'failed'`，`error` 字段存在
- ✅ `progress` 值>=上次查询值（单调递增）

---

## Scenario 2: 主体参考视频异步生成

### Prerequisites

准备两张参考图片：
```bash
# 使用测试图片或自己的图片
TEST_IMAGE_1="/path/to/cat.jpg"
TEST_IMAGE_2="/path/to/garden.jpg"
```

### Step 1: 提交主体参考任务

```typescript
const historyId = await videoGen.generateMainReferenceVideoAsync({
  referenceImages: [TEST_IMAGE_1, TEST_IMAGE_2],
  prompt: "[图0]中的猫在[图1]的花园里奔跑",
  resolution: "720p",
  fps: 24,
  duration: 5000
});

console.log('✅ 主体参考任务已提交, historyId:', historyId);
```

**验收标准**:
- ✅ 返回有效historyId
- ✅ 图片上传日志显示上传2张图片
- ✅ 3秒内返回（不含生成时间）

---

### Step 2: 查询结果

```typescript
// 等待60秒（主体参考生成时间较长）
await new Promise(resolve => setTimeout(resolve, 60000));

const result = await client.getImageResult(historyId);

if (result.status === 'completed' && result.videoUrl) {
  console.log('🎬 主体参考视频生成完成:', result.videoUrl);
}
```

**验收标准**:
- ✅ 生成完成后 `videoUrl` 存在
- ✅ 视频内容包含两张参考图的主体元素

---

## Scenario 3: 批量查询多个任务

### Step 1: 并发提交多个任务

```typescript
const tasks = [];

// 同时提交3个任务
for (let i = 0; i < 3; i++) {
  const promise = videoGen.generateVideoAsync({
    prompt: `测试视频 ${i + 1}: 星空与流星`,
    resolution: "720p",
    duration_ms: 3000
  });
  tasks.push(promise);
}

const historyIds = await Promise.all(tasks);
console.log('✅ 已提交3个任务:', historyIds);
```

**验收标准**:
- ✅ 返回3个不同的historyId
- ✅ 所有任务在10秒内提交完成

---

### Step 2: 批量查询状态

```typescript
const batchResults = await client.getBatchResults(historyIds);

for (const [id, result] of Object.entries(batchResults)) {
  if ('error' in result) {
    console.error(`❌ ${id}: ${result.error}`);
  } else {
    console.log(`📊 ${id}: ${result.status} (${result.progress}%)`);
  }
}
```

**验收标准**:
- ✅ 返回对象包含所有3个historyId
- ✅ 每个结果要么是 `QueryResultResponse` 要么是 `{error: string}`
- ✅ 批量查询在1秒内返回（< 500ms + 300ms）

---

## Scenario 4: 视频后处理异步

### Step 1: 生成原始视频（同步）

```typescript
// 先同步生成一个视频获取videoId
const videoUrl = await videoGen.generateVideo({
  prompt: "测试原始视频",
  resolution: "720p",
  duration_ms: 3000
});

// 从URL或响应中提取videoId（实际实现可能需要额外接口）
const videoId = "extracted_video_id";
const originHistoryId = "original_history_id";
```

---

### Step 2: 提交补帧任务

```typescript
const frameInterpolationId = await videoGen.videoPostProcessAsync({
  operation: 'frame_interpolation',
  videoId: videoId,
  originHistoryId: originHistoryId,
  targetFps: 60,
  originFps: 24
});

console.log('✅ 补帧任务已提交:', frameInterpolationId);
```

**验收标准**:
- ✅ 返回新的historyId（后处理任务ID）
- ✅ 可以用 `getImageResult` 查询此任务

---

## Scenario 5: 错误处理验证

### Test 1: 无效historyId格式

```typescript
try {
  await client.getImageResult("invalid-id-format");
} catch (error) {
  console.log('✅ 捕获预期错误:', error.message);
  // Expected: "无效的historyId格式: historyId必须是纯数字或以'h'开头的字母数字字符串"
}
```

---

### Test 2: 不存在的historyId

```typescript
try {
  await client.getImageResult("9999999999999");
} catch (error) {
  console.log('✅ 捕获预期错误:', error.message);
  // Expected: "记录不存在"
}
```

---

### Test 3: 批量查询包含无效ID

```typescript
const results = await client.getBatchResults([
  "4721606420748",  // 假设有效
  "invalid-id",     // 无效格式
  "9999999999999"   // 不存在
]);

console.log('混合结果:', results);
// Expected:
// {
//   "4721606420748": { status: "...", progress: ... },
//   "invalid-id": { error: "无效的historyId格式" },
//   "9999999999999": { error: "记录不存在" }
// }
```

**验收标准**:
- ✅ 不抛出异常（错误包含在响应中）
- ✅ 有效ID正常返回结果
- ✅ 无效ID标记为error

---

## Performance Benchmarks

### Benchmark 1: 异步提交延迟

```typescript
console.time('异步提交');
const historyId = await videoGen.generateVideoAsync({
  prompt: "性能测试",
  resolution: "720p"
});
console.timeEnd('异步提交');
// Target: < 3000ms
```

---

### Benchmark 2: 单次查询延迟

```typescript
console.time('单次查询');
const result = await client.getImageResult(historyId);
console.timeEnd('单次查询');
// Target: < 500ms
```

---

### Benchmark 3: 批量查询延迟

```typescript
const ids = Array(10).fill('4721606420748'); // 10个相同ID

console.time('批量查询10个任务');
const results = await client.getBatchResults(ids);
console.timeEnd('批量查询10个任务');
// Target: < 1500ms (500ms + 100ms*10)
```

---

## Integration Test Checklist

运行完整测试套件：

```bash
# 单元测试
yarn test async-video-generation.test.ts

# MCP工具测试
yarn test async-mcp-tools.test.ts

# 集成测试
yarn test --testNamePattern="Async Video.*Integration"

# 向后兼容性测试
yarn test backward-compatibility.test.ts
```

**验收标准**:
- ✅ 所有测试通过
- ✅ 无新增警告或错误
- ✅ 覆盖率保持或提升

---

## Cleanup

```bash
# 清理测试生成的临时文件（如有）
# （本特性无本地持久化，无需清理）
```

---

## Success Criteria Summary

### Functional
- [x] 异步提交立即返回historyId
- [x] 查询接口正确返回状态和进度
- [x] 完成状态包含videoUrl
- [x] 批量查询支持≥10个任务
- [x] 所有视频生成模式支持异步

### Non-Functional
- [x] 异步提交 < 3s
- [x] 单次查询 < 500ms
- [x] 批量查询 < 500ms + 100ms/task
- [x] 错误处理友好
- [x] 向后兼容保持100%

### Quality
- [x] 单元测试覆盖
- [x] 集成测试覆盖
- [x] MCP工具测试覆盖
- [x] 性能基准测试
- [x] 错误场景测试

---

## Troubleshooting

### Issue: historyId格式验证失败

**Solution**: 检查API返回的 `history_record_id` 格式，更新正则表达式。

```typescript
// 当前验证规则
const isValid = /^[0-9]+$/.test(historyId) || /^h[a-zA-Z0-9]+$/.test(historyId);
```

---

### Issue: 批量查询部分任务失败

**Solution**: 检查响应中的error字段，每个任务独立处理。

```typescript
for (const [id, result] of Object.entries(batchResults)) {
  if ('error' in result) {
    // 单独处理此任务的错误
  }
}
```

---

### Issue: 查询显示"记录不存在"

**Possible Causes**:
1. historyId拼写错误
2. 任务已过期（由JiMeng API控制）
3. API临时故障

**Solution**: 验证historyId正确性，检查API日志。

---

## Next Steps

After successful quickstart validation:

1. 运行 `/tasks` 命令生成详细任务列表
2. 开始实现任务（TDD模式）
3. 持续运行此quickstart验证功能正确性