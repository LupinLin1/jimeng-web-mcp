# Refactoring Contracts: 架构接口定义

**Date**: 2025-10-02
**Feature**: 006- 代码库简化与重构

## 概述

本文档定义重构后的架构接口契约，确保向后兼容性和清晰的职责边界。

---

## 1. HttpClient 接口

### 职责
处理所有HTTP请求、认证和响应解析。

### 接口定义
```typescript
interface IHttpClient {
  /**
   * 执行HTTP请求
   * @param options 请求配置
   * @returns 响应数据
   * @throws ApiError 当请求失败时
   */
  request<T>(options: RequestOptions): Promise<T>

  /**
   * 生成请求认证签名
   * @param params 认证参数
   * @returns 认证token
   */
  generateAuth(params: AuthParams): string
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  headers?: Record<string, string>
  timeout?: number
}

interface AuthParams {
  timestamp: number
  nonce: string
  path: string
}
```

### 实现要求
- 必须支持超时控制（默认30s）
- 必须自动处理401认证失败
- 必须记录错误级别日志
- 响应解析必须统一错误格式

---

## 2. ImageUploader 接口

### 职责
处理图片上传、格式检测和尺寸计算。

### 接口定义
```typescript
interface IImageUploader {
  /**
   * 上传单张图片
   * @param imagePath 图片本地路径或URL
   * @returns 上传结果（包含服务器URL）
   */
  upload(imagePath: string): Promise<UploadResult>

  /**
   * 批量上传图片
   * @param imagePaths 图片路径数组
   * @returns 上传结果数组
   */
  uploadBatch(imagePaths: string[]): Promise<UploadResult[]>

  /**
   * 检测图片格式和尺寸（使用image-size库）
   * @param pathOrBuffer 文件路径或Buffer
   * @returns 图片元数据
   */
  detectFormat(pathOrBuffer: string | Buffer): ImageMetadata
}

interface UploadResult {
  url: string          // 服务器返回的URL
  originalPath: string // 原始本地路径
  size: number         // 文件大小（字节）
}

interface ImageMetadata {
  format: 'png' | 'jpeg' | 'webp' | 'gif'
  width: number
  height: number
}
```

### 实现要求
- 必须使用`image-size`库进行格式检测
- 上传失败必须抛出明确错误信息
- 批量上传必须并行处理（Promise.all）
- 支持本地文件路径和HTTP(S) URL

---

## 3. CreditService 接口

### 职责
管理用户积分查询和扣减。

### 接口定义
```typescript
interface ICreditService {
  /**
   * 查询当前积分余额
   * @returns 积分数量
   */
  getBalance(): Promise<number>

  /**
   * 扣除积分
   * @param amount 扣除数量
   * @param reason 扣除原因
   * @throws InsufficientCreditsError 积分不足时
   */
  deductCredits(amount: number, reason: string): Promise<void>

  /**
   * 检查是否有足够积分
   * @param amount 需要的积分数量
   * @returns 是否足够
   */
  hasEnoughCredits(amount: number): Promise<boolean>
}
```

### 实现要求
- 积分不足必须抛出`InsufficientCreditsError`
- 每次扣除必须记录原因（日志）
- 查询失败时返回0而非抛出异常

---

## 4. VideoService 接口

### 职责
处理所有视频生成相关操作，合并4个独立生成器的功能。

### 接口定义
```typescript
interface IVideoService {
  /**
   * 文本生成视频（支持首尾帧）
   * @param params 生成参数
   * @returns 视频生成结果
   */
  generateTextToVideo(params: TextToVideoParams): Promise<VideoResult>

  /**
   * 多帧视频生成（2-10帧）
   * @param params 多帧参数
   * @returns 视频生成结果
   */
  generateMultiFrame(params: MultiFrameParams): Promise<VideoResult>

  /**
   * 主参考视频生成（2-4张参考图）
   * @param params 主参考参数
   * @returns 视频生成结果
   */
  generateMainReference(params: MainReferenceParams): Promise<VideoResult>
}

interface TextToVideoParams {
  prompt: string
  model?: string
  resolution?: '720p' | '1080p'
  fps?: number
  duration?: number
  async?: boolean
  firstFrameImage?: string
  lastFrameImage?: string
}

interface MultiFrameParams {
  frames: FrameConfig[]
  model?: string
  resolution?: '720p' | '1080p'
  fps?: number
  async?: boolean
}

interface MainReferenceParams {
  referenceImages: string[]  // 2-4张图片路径
  prompt: string             // 包含[图N]引用
  model?: string
  resolution?: '720p' | '1080p'
  fps?: number
  duration?: number
  async?: boolean
}

interface VideoResult {
  videoUrl?: string          // 同步模式返回
  taskId?: string            // 异步模式返回
  metadata: {
    model: string
    resolution: string
    duration: number
    fps: number
  }
}
```

### 实现要求
- **轮询逻辑内联**：移除timeout.ts抽象，直接实现（≤30行）
- **共享内部方法**：上传、提交任务、轮询状态等逻辑复用
- **超时处理**：同步模式必须在600秒超时
- **错误处理**：内容违规、API错误等必须有明确错误类型

---

## 5. JimengClient 主接口（向后兼容）

### 职责
作为用户入口，委托各服务类处理具体功能，保持API签名100%兼容。

### 接口定义
```typescript
interface IJimengClient {
  // === 图片生成（保持不变）===
  generateImage(params: ImageGenerationParams): Promise<ImageResult>
  generateImageAsync(params: ImageGenerationParams): Promise<{ taskId: string }>
  getImageResult(taskId: string): Promise<ImageResult>

  // === 视频生成（委托VideoService）===
  generateVideo(params: VideoGenerationParams): Promise<VideoResult>  // 已弃用，重定向
  generateTextToVideo(params: TextToVideoParams): Promise<VideoResult>
  generateMultiFrameVideo(params: MultiFrameParams): Promise<VideoResult>
  generateMainReferenceVideo(params: MainReferenceParams): Promise<VideoResult>

  // === 视频后处理 ===
  videoPostProcess(params: PostProcessParams): Promise<VideoResult>

  // === 积分管理（委托CreditService）===
  getCredits(): Promise<number>

  // === 批量查询 ===
  getBatchResults(historyIds: string[]): Promise<BatchResult[]>
}
```

### 向后兼容保证
```typescript
class JimengClient implements IJimengClient {
  private httpClient: HttpClient
  private imageUploader: ImageUploader
  private creditService: CreditService
  private videoService: VideoService

  constructor(token: string) {
    // 组合模式初始化
    this.httpClient = new HttpClient(token)
    this.imageUploader = new ImageUploader(this.httpClient)
    this.creditService = new CreditService(this.httpClient)
    this.videoService = new VideoService(this.httpClient, this.imageUploader)
  }

  // 向后兼容的弃用方法
  async generateVideo(params: VideoGenerationParams): Promise<VideoResult> {
    // 无警告，静默重定向到新方法
    if (params.filePath && params.filePath.length <= 2) {
      return this.videoService.generateTextToVideo(params)
    } else if (params.multiFrames) {
      return this.videoService.generateMultiFrame(params)
    }
    throw new Error('无法识别的视频生成模式')
  }

  // 新方法直接委托
  async generateTextToVideo(params: TextToVideoParams): Promise<VideoResult> {
    return this.videoService.generateTextToVideo(params)
  }

  // 图片生成保持原逻辑（或小幅优化）
  async generateImage(params: ImageGenerationParams): Promise<ImageResult> {
    // 继续生成逻辑保持不变
    if (params.count > 4) {
      // 自动触发继续生成
    }
    // ...
  }

  // 积分查询委托
  async getCredits(): Promise<number> {
    return this.creditService.getBalance()
  }
}
```

---

## 6. 工具函数接口

### http.ts
```typescript
// 认证相关（从auth.ts和a_bogus.ts整合）
export function generateAuth(params: AuthParams): string
export function createRequestConfig(options: RequestOptions): AxiosRequestConfig

// 响应处理
export function parseResponse<T>(response: AxiosResponse): T
export function handleApiError(error: AxiosError): never
```

### image.ts
```typescript
// 图片处理（从dimensions.ts整合，使用image-size）
export function getImageSize(path: string): Promise<ImageDimensions>
export function calculateDimensions(aspectRatio: string, maxSize: number): Dimensions
export function validateImageFormat(buffer: Buffer): boolean
export function readImageBuffer(path: string): Promise<Buffer>
```

### validation.ts
```typescript
// 简化的验证工具（替代Zod）
export function validateRange(value: number, min: number, max: number, field: string): void
export function validateEnum<T>(value: T, allowed: T[], field: string): void
export function validateArray<T>(arr: T[], minLength: number, maxLength: number, field: string): void
export function validateParams<T extends object>(params: T, rules: ValidationRules): void
```

### logger.ts
```typescript
// 清理后的日志接口（合并logging.ts）
export function error(message: string, context?: any): void
export function warn(message: string, context?: any): void
export function info(message: string, context?: any): void
// 移除debug级别（生产代码不需要）
```

---

## 7. 测试接口契约

### 单元测试接口
```typescript
// 每个服务类必须有独立的单元测试
describe('HttpClient', () => {
  it('应该正确生成认证签名', () => {})
  it('应该处理请求超时', () => {})
  it('应该统一错误格式', () => {})
})

describe('ImageUploader', () => {
  it('应该使用image-size检测格式', () => {})
  it('应该支持批量上传', () => {})
  it('应该处理上传失败', () => {})
})

describe('VideoService', () => {
  it('应该内联轮询逻辑', () => {})
  it('应该共享上传逻辑', () => {})
  it('应该处理超时', () => {})
})
```

### 集成测试接口
```typescript
describe('Image Generation Flow', () => {
  it('应该成功生成单张图片', async () => {})
  it('应该自动触发继续生成（>4张）', async () => {})
})

describe('Backward Compatibility', () => {
  it('旧的generateVideo应该重定向到新方法', async () => {})
  it('所有现有API签名必须保持不变', () => {})
})

describe('Performance Baseline', () => {
  it('图片生成延迟应≤重构前基准', async () => {})
  it('视频生成延迟应≤重构前基准', async () => {})
  it('内存占用应≤重构前基准', async () => {})
})
```

---

## 8. 错误处理契约

### 错误类型定义
```typescript
class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class InsufficientCreditsError extends ApiError {
  constructor(required: number, available: number) {
    super('INSUFFICIENT_CREDITS', `需要${required}积分，当前${available}`)
  }
}

class ContentViolationError extends ApiError {
  constructor(reason: string) {
    super('CONTENT_VIOLATION', `内容违规：${reason}`)
  }
}

class TimeoutError extends ApiError {
  constructor(operation: string) {
    super('TIMEOUT', `${operation}操作超时`)
  }
}
```

### 错误处理规范
- **HTTP错误**：统一转换为ApiError
- **业务错误**：使用具体错误子类
- **超时错误**：同步操作600s必须抛出TimeoutError
- **网络错误**：自动重试1次，失败后抛出

---

## 契约测试清单

所有接口必须通过以下契约测试：

- [ ] HttpClient - 认证签名正确性
- [ ] HttpClient - 请求超时处理
- [ ] ImageUploader - image-size库集成
- [ ] ImageUploader - 批量上传并行性
- [ ] CreditService - 积分不足错误
- [ ] VideoService - 轮询逻辑正确性（≤30行）
- [ ] VideoService - 超时600s验证
- [ ] JimengClient - 所有API签名兼容性
- [ ] JimengClient - generateVideo重定向正确性
- [ ] JimengClient - 继续生成功能保持
- [ ] 工具函数 - http.ts认证正确性
- [ ] 工具函数 - image.ts尺寸计算正确性
- [ ] 工具函数 - validation.ts验证逻辑
- [ ] 错误处理 - 所有错误类型正确抛出

---

## 总结

重构后的架构契约：

1. **松耦合**：组合模式，服务类独立
2. **单一职责**：每个服务类专注一个领域
3. **向后兼容**：所有API签名保持不变
4. **可测试性**：清晰的接口便于单元测试
5. **简化抽象**：移除不必要的抽象层（timeout、deprecation、Zod）

所有契约必须在实施前编写测试验证。
