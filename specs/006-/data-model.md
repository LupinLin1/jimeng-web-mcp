# Data Model: 代码库简化与重构

**Date**: 2025-10-02
**Feature**: 006- 代码库简化与重构

## 概述

本次重构主要涉及**架构模式重构**和**代码组织优化**，不涉及新的数据模型或实体变更。以下记录重构前后的架构实体对比。

---

## 架构实体对比

### 1. 客户端架构（核心重构）

#### 当前架构（继承模式）
```typescript
// 三层继承链
CreditService extends JimengApiClient
  ↑
BaseClient extends CreditService
  ↑
JimengClient extends BaseClient

// 特点：
// - 强耦合
// - 单一继承限制
// - 职责混杂
// - 难以测试
```

#### 目标架构（组合模式）
```typescript
// 独立服务类
class HttpClient {
  constructor(token: string)
  request(options: RequestOptions): Promise<Response>
  generateAuth(params: AuthParams): string
}

class ImageUploader {
  constructor(httpClient: HttpClient)
  upload(imagePath: string): Promise<UploadResult>
  detectFormat(buffer: Buffer): ImageFormat  // 使用image-size库
}

class CreditService {
  constructor(httpClient: HttpClient)
  getBalance(): Promise<number>
  deductCredits(amount: number): Promise<void>
}

class VideoService {
  constructor(httpClient: HttpClient, uploader: ImageUploader)
  generateTextToVideo(params: TextToVideoParams): Promise<VideoResult>
  generateMultiFrame(params: MultiFrameParams): Promise<VideoResult>
  generateMainReference(params: MainRefParams): Promise<VideoResult>
}

class JimengClient {
  private httpClient: HttpClient
  private imageUploader: ImageUploader
  private creditService: CreditService
  private videoService: VideoService

  constructor(token: string) {
    this.httpClient = new HttpClient(token)
    this.imageUploader = new ImageUploader(this.httpClient)
    this.creditService = new CreditService(this.httpClient)
    this.videoService = new VideoService(this.httpClient, this.imageUploader)
  }

  // 委托方法
  generateImage(...) { /* 直接实现或委托 */ }
  generateVideo(...) { return this.videoService.generate(...) }
  getCredits() { return this.creditService.getBalance() }
}

// 特点：
// - 松耦合
// - 依赖注入
// - 单一职责
// - 易于测试（可mock各服务）
```

---

### 2. 视频生成器（合并重构）

#### 当前架构
```
VideoGenerator (基类，1676行)
  ├── TextToVideoGenerator
  ├── MultiFrameVideoGenerator
  └── MainReferenceVideoGenerator

问题：
- 代码重复（轮询、上传、错误处理）
- 委托链复杂：JimengClient → VideoGenerator → Specific Generator
- 难以追踪逻辑
```

#### 目标架构
```typescript
class VideoService {
  private httpClient: HttpClient
  private uploader: ImageUploader

  // 直接方法，共享内部逻辑
  async generateTextToVideo(params: TextToVideoParams): Promise<VideoResult> {
    const taskId = await this.submitTask('text-to-video', params)
    return this.pollUntilComplete(taskId)
  }

  async generateMultiFrame(params: MultiFrameParams): Promise<VideoResult> {
    const uploadedFrames = await this.uploadFrames(params.frames)
    const taskId = await this.submitTask('multi-frame', { ...params, frames: uploadedFrames })
    return this.pollUntilComplete(taskId)
  }

  async generateMainReference(params: MainRefParams): Promise<VideoResult> {
    const uploadedImages = await this.uploader.uploadBatch(params.referenceImages)
    const taskId = await this.submitTask('main-reference', { ...params, images: uploadedImages })
    return this.pollUntilComplete(taskId)
  }

  // 共享内部方法
  private async pollUntilComplete(taskId: string): Promise<VideoResult> {
    // 内联轮询逻辑（≤30行）
    let interval = 2000
    const startTime = Date.now()
    while (Date.now() - startTime < 600000) {
      const status = await this.httpClient.request({ url: `/status/${taskId}` })
      if (status.completed) return status.result
      if (status.failed) throw new Error(status.error)
      await sleep(interval)
      interval = Math.min(interval * 1.5, 10000)
    }
    throw new Error('Timeout')
  }

  private async uploadFrames(frames: Frame[]): Promise<UploadedFrame[]> {
    return Promise.all(frames.map(f => this.uploader.upload(f.imagePath)))
  }

  private async submitTask(type: string, params: any): Promise<string> {
    const response = await this.httpClient.request({
      url: '/video/generate',
      method: 'POST',
      data: { type, ...params }
    })
    return response.taskId
  }
}

特点：
- 单一文件
- 共享逻辑复用
- 清晰的方法调用
- 易于理解和维护
```

---

### 3. 工具模块（整合重构）

#### 当前架构
```
src/utils/
├── a_bogus.ts (14KB)     # AWS认证相关
├── auth.ts (5KB)         # 认证工具
├── deprecation.ts (3KB)  # 弃用警告系统
├── dimensions.ts (1KB)   # 尺寸计算
├── index.ts (1KB)        # 导出
├── logger.ts (500B)      # 日志
├── logging.ts (1KB)      # 结构化日志
├── timeout.ts (6KB)      # 轮询抽象
└── validation.ts (3KB)   # 验证

问题：
- 文件碎片化
- 导航成本高
- 部分过度抽象（timeout 249行，deprecation 151行）
```

#### 目标架构
```
src/utils/
├── http.ts          # HTTP相关（auth.ts + a_bogus.ts认证部分）
│   ├── generateAuth(params): string
│   ├── createRequestConfig(options): AxiosConfig
│   └── parseResponse<T>(response): T
├── image.ts         # 图片相关（dimensions.ts + 上传逻辑）
│   ├── getImageSize(path): Dimensions  // 使用image-size库
│   ├── calculateDimensions(aspectRatio, maxSize): Dimensions
│   └── validateImageFormat(buffer): boolean
├── validation.ts    # 验证相关（简化的检查）
│   ├── validateParams<T>(params, rules): T
│   ├── validateRange(value, min, max): void
│   └── validateEnum<T>(value, allowed): T
└── logger.ts        # 日志相关（logging.ts合并，清理调试日志）
    ├── error(message, context): void
    ├── warn(message, context): void
    └── info(message, context): void

删除：
- timeout.ts（轮询逻辑内联到VideoService）
- deprecation.ts（完全移除弃用系统）
- index.ts（按需导入，无需统一导出）

特点：
- 职责清晰
- 易于发现
- 减少文件数
```

---

### 4. 测试架构（重组）

#### 当前架构
```
tests/
├── timeout.test.ts
├── deprecation.test.ts
├── image-generation.test.ts
├── video-generation.test.ts
├── async-image.test.ts
├── async-video.test.ts
├── backward-compat.test.ts
├── simple-integration.test.ts
├── unit/
│   ├── timeout.test.ts (重复!)
│   ├── timeout-simple.test.ts (重复!)
│   ├── deprecation.test.ts (重复!)
│   └── ...
└── integration/
    └── ...

问题：
- 文件重复（同一功能多个测试文件）
- 组织混乱（顶层+子目录混杂）
- 难以运行特定层级测试
```

#### 目标架构
```
tests/
├── unit/                           # 单元测试（快速，无网络）
│   ├── http-client.test.ts        # HttpClient单元测试
│   ├── image-uploader.test.ts     # ImageUploader单元测试
│   ├── credit-service.test.ts     # CreditService单元测试
│   ├── video-service.test.ts      # VideoService单元测试
│   ├── image-utils.test.ts        # image.ts工具测试
│   ├── http-utils.test.ts         # http.ts工具测试
│   └── validation.test.ts         # validation.ts测试
├── integration/                    # 集成测试（API依赖，mock网络）
│   ├── image-generation.test.ts   # 图片生成完整流程
│   ├── video-generation.test.ts   # 视频生成完整流程
│   ├── backward-compat.test.ts    # 向后兼容性验证
│   └── performance.test.ts        # 性能基准测试
└── e2e/                            # 端到端测试（真实MCP调用）
    └── mcp-tools.test.ts          # MCP工具完整验证

特点：
- 清晰分层
- 无重复
- 易于CI/CD分级运行（先unit→integration→e2e）
```

---

## 类型定义（保持不变）

重构不改变类型定义，保持在`src/types/`：

```typescript
// src/types/api.types.ts - 保持不变
export interface ImageGenerationParams { /* ... */ }
export interface VideoGenerationParams { /* ... */ }
export interface GenerationResult { /* ... */ }

// src/types/models.ts - 保持不变
export const IMAGE_MODELS = { /* ... */ }
export const VIDEO_MODELS = { /* ... */ }
```

---

## 状态转换（无变更）

重构不涉及状态机变更，现有的异步任务状态保持不变：

```
pending → processing → completed/failed
```

---

## 验证规则（简化）

#### 当前
- Zod schema验证（91行复杂schema）
- 运行时深度验证
- 自定义refine函数

#### 目标
```typescript
// 简单TypeScript类型 + 基础运行时检查
function validateMultiFrameParams(params: MultiFrameParams): void {
  if (params.frames.length < 2 || params.frames.length > 10) {
    throw new Error('帧数量必须在2-10之间')
  }

  const indices = params.frames.map(f => f.idx)
  const uniqueIndices = new Set(indices)
  if (indices.length !== uniqueIndices.size) {
    throw new Error('帧索引必须唯一')
  }

  const totalDuration = params.frames.reduce((sum, f) => sum + f.duration_ms, 0)
  if (totalDuration !== params.duration) {
    throw new Error('帧时长总和必须等于视频总时长')
  }
}
```

---

## 总结

重构的核心是**架构模式变更**而非数据模型变更：

1. **继承 → 组合**：解耦客户端架构
2. **多类 → 单类**：合并视频生成器
3. **碎片 → 整合**：合并工具文件
4. **混乱 → 分层**：重组测试结构
5. **复杂 → 简单**：移除过度抽象和验证

所有变更保持API签名不变，确保向后兼容性。
