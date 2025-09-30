# Quickstart: 视频生成代码模块化重构

## 快速验证指南

本文档提供重构后的快速验证流程，确保所有功能正常工作。

---

## 前置条件

```bash
# 1. 环境准备
cd /Users/lupin/mcp-services/jimeng-mcp
yarn install

# 2. 设置API Token
export JIMENG_API_TOKEN="your_session_id_here"
```

---

## 验证步骤

### 步骤1：构建项目

```bash
# 清理旧构建
rm -rf lib/

# 执行构建
yarn build

# 验证输出
ls -la lib/
# 应该看到: index.js, index.d.ts, server.js 等文件
```

**期望结果**：✅ 构建成功，无错误

---

### 步骤2：类型检查

```bash
yarn type-check
```

**期望结果**：✅ 无类型错误

---

### 步骤3：单元测试

```bash
yarn test
```

**关键测试套件**：
- ✅ `JimengClient` - 图片生成测试
- ✅ `VideoGenerator` - 视频生成测试
- ✅ `BackwardCompatibility` - 向后兼容性测试

**期望结果**：所有测试通过

---

### 步骤4：集成测试

```bash
yarn test integration
```

**覆盖场景**：
- 图片生成完整流程
- 视频生成完整流程
- 继续生成功能

**期望结果**：✅ 集成测试通过

---

### 步骤5：异步API测试

```bash
yarn test async
```

**验证功能**：
- 异步图片生成
- 异步视频生成
- 状态查询

**期望结果**：✅ 异步测试通过

---

## 功能验证

### 验证1：基本视频生成

```typescript
import { JimengClient } from './lib/index.js'

const client = new JimengClient()

// 传统模式
const videoUrl = await client.generateVideo({
  prompt: '一只可爱的橘猫在阳光下奔跑',
  duration_ms: 5000,
  resolution: '720p'
})

console.log('视频URL:', videoUrl)
```

**期望结果**：
- ✅ 返回有效的视频URL
- ✅ 日志输出格式正常
- ✅ 无错误或警告

---

### 验证2：多帧视频生成

```typescript
const client = new JimengClient()

const videoUrl = await client.generateVideo({
  prompt: '测试多帧视频',
  multiFrames: [
    {
      idx: 0,
      duration_ms: 2000,
      prompt: '开始场景',
      image_path: '/path/to/frame1.jpg'
    },
    {
      idx: 1,
      duration_ms: 3000,
      prompt: '结束场景',
      image_path: '/path/to/frame2.jpg'
    }
  ],
  duration_ms: 5000
})

console.log('多帧视频URL:', videoUrl)
```

**期望结果**：✅ 成功生成多帧视频

---

### 验证3：主体参考视频生成

```typescript
const client = new JimengClient()

const videoUrl = await client.generateMainReferenceVideo({
  referenceImages: [
    '/path/to/cat.jpg',
    '/path/to/floor.jpg'
  ],
  prompt: '[图0]中的猫在[图1]的地板上跑',
  resolution: '720p',
  duration: 5000
})

console.log('主体参考视频URL:', videoUrl)
```

**期望结果**：✅ 成功生成主体参考视频

---

### 验证4：视频后处理

```typescript
const client = new JimengClient()

// 补帧
const interpolatedUrl = await client.videoPostProcess({
  operation: 'frame_interpolation',
  videoId: 'original_video_id',
  originHistoryId: 'history_id',
  originFps: 24,
  targetFps: 60,
  duration: 5000
})

console.log('补帧后视频:', interpolatedUrl)
```

**期望结果**：✅ 成功执行视频后处理

---

## 模块隔离验证

### 验证VideoGenerator独立性

```typescript
// 直接使用VideoGenerator（内部测试）
import { VideoGenerator } from './lib/api/video/VideoGenerator.js'

const videoGen = new VideoGenerator()

const url = await videoGen.generateVideo({
  prompt: '测试独立VideoGenerator',
  duration_ms: 5000
})

console.log('VideoGenerator独立生成:', url)
```

**期望结果**：
- ✅ VideoGenerator可独立工作
- ✅ 不依赖JimengClient实例

---

### 验证BaseClient共享

```typescript
// 确认JimengClient和VideoGenerator都继承自BaseClient
import { JimengClient } from './lib/index.js'
import { VideoGenerator } from './lib/api/video/VideoGenerator.js'

const client = new JimengClient()
const videoGen = new VideoGenerator()

// 两者都应该有相同的基础方法（通过类型检查验证）
// TypeScript会确保继承关系正确
```

**期望结果**：✅ 类型检查通过，证明继承关系正确

---

## 性能基准验证

### 测量构建大小

```bash
# 构建并查看大小
yarn build
du -sh lib/

# 对比重构前后
echo "重构前大小: [记录基准值]"
echo "重构后大小: $(du -sh lib/ | cut -f1)"
```

**期望结果**：大小增加 < 10KB

---

### 测量运行时性能

```typescript
import { JimengClient } from './lib/index.js'

const client = new JimengClient()

console.time('image-generation')
await client.generateImage({ prompt: '测试性能' })
console.timeEnd('image-generation')

console.time('video-generation')
await client.generateVideo({ prompt: '测试性能', duration_ms: 5000 })
console.timeEnd('video-generation')
```

**期望结果**：性能与重构前相当（±5%）

---

## 向后兼容性验证

### 验证导入路径

```typescript
// 所有这些导入必须有效
import { JimengClient } from 'jimeng-web-mcp'
import { getApiClient } from 'jimeng-web-mcp'
import type {
  VideoGenerationParams,
  ImageGenerationParams
} from 'jimeng-web-mcp'

const client1 = new JimengClient()
const client2 = getApiClient()

// 两种方式都应该工作
await client1.generateVideo({ prompt: 'test', duration_ms: 5000 })
await client2.generateVideo({ prompt: 'test', duration_ms: 5000 })
```

**期望结果**：✅ 所有导入和调用方式正常工作

---

### 验证MCP Server

```bash
# 启动MCP服务器
yarn start

# 在另一个终端测试
yarn test:mcp
```

**期望结果**：
- ✅ MCP服务器正常启动
- ✅ 所有工具可用：generateImage, generateVideo, videoPostProcess, generateMainReferenceVideo

---

## 故障排查

### 问题1：测试失败

**症状**：某些测试失败

**检查**：
```bash
# 查看详细错误
yarn test --verbose

# 单独运行失败的测试
yarn test path/to/failing.test.ts
```

**常见原因**：
- BaseClient方法签名不一致
- VideoGenerator缺少必要方法
- 类型定义不匹配

---

### 问题2：类型错误

**症状**：TypeScript编译错误

**检查**：
```bash
yarn type-check --pretty
```

**常见原因**：
- 方法访问权限不正确（protected vs private）
- 返回类型不匹配
- 泛型参数缺失

---

### 问题3：运行时错误

**症状**：代码执行时抛出异常

**检查**：
```typescript
// 添加详细日志
const client = new JimengClient()
console.log('JimengClient实例:', client)
console.log('VideoGenerator实例:', (client as any).videoGen)
```

**常见原因**：
- VideoGenerator未正确初始化
- BaseClient构造函数调用问题
- 循环依赖

---

## 验收标准

重构成功的最终检查清单：

### 构建与测试
- [ ] ✅ `yarn build` 成功
- [ ] ✅ `yarn type-check` 无错误
- [ ] ✅ `yarn test` 全部通过
- [ ] ✅ `yarn test:async` 全部通过

### 功能验证
- [ ] ✅ 图片生成正常
- [ ] ✅ 传统视频生成正常
- [ ] ✅ 多帧视频生成正常
- [ ] ✅ 主体参考视频生成正常
- [ ] ✅ 视频后处理正常

### 性能与兼容性
- [ ] ✅ 包大小未显著增加
- [ ] ✅ 运行时性能未下降
- [ ] ✅ 所有导入路径有效
- [ ] ✅ MCP Server正常工作

### 代码质量
- [ ] ✅ VideoGenerator独立可测
- [ ] ✅ BaseClient正确共享
- [ ] ✅ 代码注释完整
- [ ] ✅ 无ESLint警告

---

## 下一步

重构验证通过后：

1. **合并代码**：提交PR并等待审查
2. **更新文档**：更新CLAUDE.md中的架构说明
3. **发布版本**：按语义化版本发布（建议PATCH版本，因为无破坏性变更）
4. **监控反馈**：关注用户反馈和issue

---

## 快速命令参考

```bash
# 完整验证流程（一键执行）
yarn build && yarn type-check && yarn test

# 清理并重建
yarn clean && yarn build

# 监控模式（开发时）
yarn dev

# 运行特定测试
yarn test VideoGenerator

# 生成覆盖率报告
yarn test:coverage
```

---

**文档版本**：1.0
**最后更新**：2025-01-30
**维护者**：开发团队