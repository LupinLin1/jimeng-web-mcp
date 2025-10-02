# Quickstart: 重构验收测试

**Date**: 2025-10-02
**Feature**: 006- 代码库简化与重构

## 概述

本文档定义重构完成后的验收步骤，确保所有功能正常且性能无退化。

---

## 前置条件

```bash
# 1. 确保在重构分支
git checkout 006-

# 2. 安装依赖（可能有新增image-size）
npm install

# 3. 设置环境变量
export JIMENG_API_TOKEN="your_session_id"
```

---

## 阶段1验收：低风险代码清理

### 1.1 测试文件重组验证

```bash
# 运行重组后的测试套件
npm run test

# 分层运行测试（验证新结构）
npm run test -- tests/unit/          # 单元测试
npm run test -- tests/integration/   # 集成测试
npm run test -- tests/e2e/          # 端到端测试

# ✅ 期望结果：
# - 所有测试通过
# - 无重复测试文件
# - 清晰的测试分层
```

### 1.2 工具文件整合验证

```bash
# 检查工具文件结构
ls src/utils/

# ✅ 期望结果：
# - 仅3-4个文件：http.ts, image.ts, validation.ts, logger.ts
# - 无timeout.ts, deprecation.ts
# - 代码总行数显著减少
```

### 1.3 日志清理验证

```bash
# 搜索调试日志（应该很少）
grep -r "logger.debug" src/
grep -r "console.log" src/

# ✅ 期望结果：
# - 仅关键错误和状态日志
# - 无过多调试信息dump
```

### 1.4 阶段1性能基准

```bash
# 运行性能测试建立基线
npm run test:performance

# ✅ 期望结果：
# - 记录当前性能指标
# - 为阶段2对比做准备
```

---

## 阶段2验收：核心架构重构

### 2.1 架构模式验证

```bash
# 检查代码结构
cat src/api/JimengClient.ts | head -50

# ✅ 期望结果：
# - 使用组合模式（private httpClient, imageUploader等）
# - 无extends BaseClient
# - 构造函数初始化各服务类
```

### 2.2 继承层次消除验证

```bash
# 搜索继承关键字
grep "extends" src/api/*.ts

# ✅ 期望结果：
# - 无CreditService extends JimengApiClient
# - 无BaseClient extends CreditService
# - 无JimengClient extends BaseClient
```

### 2.3 视频生成器合并验证

```bash
# 检查视频相关文件
ls src/api/video/

# ✅ 期望结果：
# - 仅VideoService.ts（或逻辑直接在JimengClient）
# - 无4个独立生成器类
```

### 2.4 依赖管理验证

```bash
# 检查package.json
cat package.json | grep -E "(zod|image-size)"

# ✅ 期望结果：
# - 无zod依赖（或移到devDependencies）
# - 有image-size依赖
```

---

## 功能测试：向后兼容性验证

### 3.1 图片生成功能

```typescript
// 测试脚本：test-image-generation.ts
import { JimengClient } from './src/api/JimengClient';

const client = new JimengClient(process.env.JIMENG_API_TOKEN!);

// 测试1：单张图片生成
const result1 = await client.generateImage({
  prompt: '一只可爱的猫',
  count: 1,
  model: 'jimeng-4.0'
});
console.log('✅ 单张图片生成:', result1.images.length === 1);

// 测试2：继续生成（>4张）
const result2 = await client.generateImage({
  prompt: '美丽的风景',
  count: 10,
  model: 'jimeng-4.0'
});
console.log('✅ 继续生成:', result2.images.length === 10);

// 测试3：多参考图
const result3 = await client.generateImage({
  prompt: '融合风格的艺术作品',
  count: 1,
  filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg']
});
console.log('✅ 多参考图:', result3.images.length === 1);
```

### 3.2 视频生成功能

```typescript
// 测试脚本：test-video-generation.ts

// 测试1：文本生成视频
const video1 = await client.generateTextToVideo({
  prompt: '海浪拍打沙滩',
  resolution: '720p',
  duration: 5000
});
console.log('✅ 文本生成视频:', video1.videoUrl);

// 测试2：多帧视频
const video2 = await client.generateMultiFrameVideo({
  frames: [
    { idx: 0, imagePath: '/frame1.jpg', duration_ms: 1000, prompt: '开始场景' },
    { idx: 1, imagePath: '/frame2.jpg', duration_ms: 1000, prompt: '中间场景' },
    { idx: 2, imagePath: '/frame3.jpg', duration_ms: 1000, prompt: '结束场景' }
  ],
  resolution: '720p'
});
console.log('✅ 多帧视频:', video2.videoUrl);

// 测试3：主参考视频
const video3 = await client.generateMainReferenceVideo({
  referenceImages: ['/cat.jpg', '/floor.jpg'],
  prompt: '[图0]中的猫在[图1]的地板上跑',
  resolution: '720p'
});
console.log('✅ 主参考视频:', video3.videoUrl);

// 测试4：旧API兼容性（generateVideo）
const video4 = await client.generateVideo({
  prompt: '测试旧API',
  filePath: ['/first.jpg'],
  duration_ms: 5000
});
console.log('✅ 旧API兼容:', video4.videoUrl);
```

### 3.3 MCP工具测试

```bash
# 启动MCP服务器
npm start &

# 使用MCP inspector测试
npx @modelcontextprotocol/inspector

# 测试工具调用
# 1. generateImage工具
# 2. generateTextToVideo工具
# 3. generateMultiFrameVideo工具
# 4. generateMainReferenceVideo工具
# 5. videoPostProcess工具

# ✅ 期望结果：
# - 所有工具正常响应
# - 参数验证正确
# - 返回格式正确
```

---

## 性能测试：对比验证

### 4.1 建立性能基准

```bash
# 运行性能测试套件
npm run test:performance

# 收集指标：
# - 图片生成延迟（单张、继续生成）
# - 视频生成延迟（各模式）
# - 内存占用
# - CPU使用率
```

### 4.2 负载测试

```bash
# 并发图片生成测试
node performance/concurrent-image-test.js

# 并发视频生成测试
node performance/concurrent-video-test.js

# ✅ 期望结果：
# - 延迟≤重构前基准
# - 内存占用≤重构前基准
# - 无内存泄漏
# - 并发处理稳定
```

### 4.3 性能报告

```bash
# 生成对比报告
npm run performance:report

# ✅ 期望输出示例：
# 图片生成延迟:
#   重构前: 2.5s    重构后: 2.3s    ✅ 提升8%
# 视频生成延迟:
#   重构前: 12.0s   重构后: 11.5s   ✅ 提升4%
# 内存占用:
#   重构前: 85MB    重构后: 72MB    ✅ 减少15%
# 代码行数:
#   重构前: 3200行  重构后: 1980行  ✅ 减少38%
```

---

## 代码质量验证

### 5.1 TypeScript类型检查

```bash
npm run type-check

# ✅ 期望结果：
# - 无类型错误
# - 移除Zod后仍保持类型安全
```

### 5.2 构建验证

```bash
npm run build

# ✅ 期望结果：
# - 构建成功
# - 生成CJS和ESM双格式
# - 无警告信息
```

### 5.3 代码覆盖率

```bash
npm run test:coverage

# ✅ 期望结果：
# - 覆盖率≥重构前
# - 核心模块（JimengClient、VideoService）覆盖率>90%
```

---

## 文档完整性验证

### 6.1 更新CLAUDE.md

```bash
# 检查项目说明更新
cat CLAUDE.md | grep -A 10 "架构"

# ✅ 期望内容：
# - 说明组合模式架构
# - 更新主要模块列表
# - 记录移除的抽象
```

### 6.2 更新CHANGELOG

```bash
cat CHANGELOG.md | head -30

# ✅ 期望内容：
# - 记录重构内容
# - 说明移除的deprecation系统
# - 列出新增依赖（image-size）
# - 标注向后兼容性保证
```

### 6.3 更新README

```bash
cat README.md | grep -A 5 "架构"

# ✅ 期望内容：
# - 更新架构图示
# - 说明简化后的代码组织
# - 更新开发命令（如有变更）
```

---

## 回归测试：边缘情况

### 7.1 错误处理

```typescript
// 测试各种错误场景
try {
  // 1. 积分不足
  await client.generateImage({ prompt: '...' }); // 假设积分不足
} catch (error) {
  console.log('✅ 积分不足错误:', error instanceof InsufficientCreditsError);
}

try {
  // 2. 内容违规
  await client.generateImage({ prompt: '违规内容' });
} catch (error) {
  console.log('✅ 内容违规错误:', error instanceof ContentViolationError);
}

try {
  // 3. 超时处理
  // 模拟超时场景
} catch (error) {
  console.log('✅ 超时错误:', error instanceof TimeoutError);
}
```

### 7.2 参数验证

```typescript
// 测试参数验证（移除Zod后）
try {
  await client.generateMultiFrameVideo({
    frames: [{ idx: 0, duration_ms: 1000, prompt: '...', imagePath: '...' }] // 只有1帧，应失败
  });
} catch (error) {
  console.log('✅ 帧数量验证:', error.message.includes('2-10'));
}

try {
  await client.generateMainReferenceVideo({
    referenceImages: ['only-one.jpg'], // 只有1张，应失败
    prompt: '[图0]的内容'
  });
} catch (error) {
  console.log('✅ 参考图数量验证:', error.message.includes('2-4'));
}
```

---

## 最终验收清单

### 阶段1完成标准
- [x] 测试文件重组完成，无重复
- [x] 工具文件整合为3-4个
- [x] 调试日志清理完成
- [x] 性能基线建立

### 阶段2完成标准
- [x] 继承层次消除，改为组合模式
- [x] 视频生成器合并完成
- [x] Zod移除，TypeScript类型安全保持
- [x] image-size库集成成功

### 功能验收标准
- [x] 所有图片生成功能正常
- [x] 所有视频生成功能正常
- [x] 继续生成功能保持
- [x] 旧API（generateVideo）向后兼容
- [x] MCP工具全部正常工作

### 性能验收标准
- [x] 延迟≤重构前基准
- [x] 内存占用≤重构前基准
- [x] 代码行数减少≥30%
- [x] 无性能退化

### 质量验收标准
- [x] 所有测试通过
- [x] TypeScript类型检查通过
- [x] 构建成功
- [x] 代码覆盖率≥重构前

### 文档验收标准
- [x] CLAUDE.md更新
- [x] CHANGELOG更新
- [x] README更新
- [x] API文档更新（如有）

---

## 运行完整验收

```bash
#!/bin/bash
# run-full-acceptance.sh

echo "=== 阶段1：低风险代码清理验证 ==="
npm run test
ls src/utils/
grep -r "logger.debug" src/ || echo "✅ 无过多调试日志"

echo -e "\n=== 阶段2：核心架构重构验证 ==="
grep "extends" src/api/*.ts || echo "✅ 无继承链"
ls src/api/video/

echo -e "\n=== 功能测试 ==="
npm run test:integration

echo -e "\n=== 性能测试 ==="
npm run test:performance
npm run performance:report

echo -e "\n=== 代码质量 ==="
npm run type-check
npm run build
npm run test:coverage

echo -e "\n=== 验收完成 ==="
echo "请检查所有✅标记，确保无❌"
```

---

## 回滚计划

如果验收失败：

```bash
# 1. 保存当前工作
git stash

# 2. 回到重构前状态
git checkout main

# 3. 分析失败原因
git diff 006- > refactor-diff.patch

# 4. 修复后重新验收
```

---

## 总结

验收通过后，重构完成，可以：
1. 合并到主分支
2. 发布新版本
3. 通知用户升级（虽然向后兼容，但建议使用新API）
4. 归档重构文档

**验收目标**：功能完整 + 性能提升 + 代码简化 + 向后兼容
