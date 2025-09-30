# Data Model: 视频生成代码模块化重构

## 类层次结构

### 继承关系图
```
CreditService (现有)
    ↑
    |
BaseClient (新增)
    ↑
    |
    ├─── JimengClient (修改：仅保留图片生成+委托)
    |
    └─── VideoGenerator (新增：视频生成核心)
            ↑
            |
            ├─── TraditionalVideoGenerator (可选：传统模式独立实现)
            ├─── MultiFrameVideoGenerator (可选：多帧模式独立实现)
            └─── MainReferenceVideoGenerator (迁移：从现有文件移动)
```

## 核心实体

### 1. BaseClient (抽象基类)

**职责**：提供HTTP请求、文件上传、轮询日志等共享功能

**属性**：
```typescript
protected sessionId: string
protected apiHost: string
```

**方法**：
```typescript
// 从JimengClient提升的共享方法
protected async request<T>(method: string, path: string, data?: any, params?: any): Promise<T>
protected async uploadImage(filePath: string): Promise<UploadResult>
protected logPollStart(type: 'POLL' | 'DRAFT' | 'VIDEO', ...): void
protected logPollData(type: 'POLL' | 'DRAFT' | 'VIDEO', ...): void
protected logPollError(type: 'POLL' | 'DRAFT' | 'VIDEO', ...): void
protected logPollStatusCheck(type: 'POLL' | 'DRAFT' | 'VIDEO', ...): void
protected logPollProgress(type: 'POLL' | 'DRAFT' | 'VIDEO', ...): void
protected logPollEnd(type: 'POLL' | 'DRAFT' | 'VIDEO', ...): void
protected logPollComplete(type: 'POLL' | 'DRAFT' | 'VIDEO', ...): void
protected getModel(modelName: string): string
protected generateRequestParams(): Record<string, string>
```

**继承关系**：
- 继承自：`CreditService`（获得积分管理能力）
- 被继承：`JimengClient`, `VideoGenerator`

**验证规则**：
- sessionId必须有效（从环境变量或构造参数获取）
- apiHost默认为JiMeng官方API地址

---

### 2. JimengClient (修改后)

**职责**：图片生成 + 视频生成委托 + 对外API

**属性**：
```typescript
private videoGen: VideoGenerator  // 新增：视频生成器实例
// ... 其他现有属性保持不变
```

**方法**（公共API - 完全保持不变）：
```typescript
// 图片生成（保留）
public async generateImage(params: ImageGenerationParams): Promise<string[]>
public async generateImageAsync(params: ImageGenerationParams): Promise<string>
public async getImageResult(historyId: string): Promise<GenerationResult>

// 视频生成（委托给videoGen）
public async generateVideo(params: VideoGenerationParams): Promise<string>
public async videoPostProcess(params: VideoPostProcessUnifiedParams): Promise<string>
public async generateMainReferenceVideo(params: MainReferenceVideoParams): Promise<string>

// 其他现有方法保持不变
```

**状态转换**：无（无状态设计）

**关系**：
- 继承：`BaseClient`
- 组合：`VideoGenerator`（私有实例）

---

### 3. VideoGenerator (新增)

**职责**：视频生成核心逻辑协调器

**属性**：
```typescript
// 继承BaseClient的所有protected属性
```

**方法**：
```typescript
// 公共API（被JimengClient调用）
public async generateVideo(params: VideoGenerationParams): Promise<string>
public async videoPostProcess(params: VideoPostProcessUnifiedParams): Promise<string>
public async generateMainReferenceVideo(params: MainReferenceVideoParams): Promise<string>

// 私有实现方法（从JimengClient迁移）
private async generateTraditionalVideo(params: VideoGenerationParams, actualModel: string): Promise<string>
private async generateMultiFrameVideo(params: VideoGenerationParams, actualModel: string): Promise<string>
private async pollVideoResult(videoId: string): Promise<string>

// 视频后处理私有方法
private async performFrameInterpolation(params: any): Promise<string>
private async performSuperResolution(params: any): Promise<string>
private async performAudioEffect(params: any): Promise<string>
```

**状态**：无状态（每次调用独立）

**验证规则**：
- VideoGenerationParams必须符合类型定义
- multiFrames数量限制：0-10帧
- duration_ms范围：3000-15000ms
- fps范围：12-30

**关系**：
- 继承：`BaseClient`
- 可能组合：`MainReferenceVideoGenerator`（如果采用组合模式）

---

### 4. MainReferenceVideoGenerator (迁移)

**职责**：主体参考视频生成（多图主体融合）

**当前状态**：已存在于src/api/video/MainReferenceVideoGenerator.ts，继承自JimengClient

**变更**：
- 修改继承：从`JimengClient`改为`BaseClient`
- 移动位置：保持在src/api/video/目录
- 集成方式：
  - 选项A：被VideoGenerator组合调用
  - 选项B：VideoGenerator直接实现generateMainReferenceVideo（复制代码）

**推荐**：选项A（组合模式），保持MainReferenceVideoGenerator独立性

---

## 类型定义（无变更）

### VideoGenerationParams
```typescript
interface VideoGenerationParams {
  prompt: string
  model?: string
  duration_ms?: number
  fps?: number
  resolution?: '720p' | '1080p'
  video_aspect_ratio?: string
  filePath?: string[]  // 首尾帧
  multiFrames?: MultiFrameConfig[]  // 多帧模式
  refresh_token?: string
  req_key?: string
}
```

### VideoPostProcessUnifiedParams
```typescript
interface VideoPostProcessUnifiedParams {
  operation: 'frame_interpolation' | 'super_resolution' | 'audio_effect'
  videoId: string
  originHistoryId: string
  duration?: number
  originFps?: number
  targetFps?: 30 | 60
  originWidth?: number
  originHeight?: number
  targetWidth?: number
  targetHeight?: number
}
```

### MainReferenceVideoParams
```typescript
interface MainReferenceVideoParams {
  referenceImages: string[]  // 2-4张
  prompt: string  // 包含[图N]引用
  model?: string
  resolution?: '720p' | '1080p'
  videoAspectRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'
  fps?: number  // 12-30
  duration?: number  // 3000-15000ms
}
```

---

## 依赖关系

### 模块依赖图
```
CreditService
    ↑
BaseClient
    ↑
    ├── JimengClient ──组合──> VideoGenerator
    |                              ↑
    └── VideoGenerator ──可能组合──> MainReferenceVideoGenerator
                                        ↑
                                    BaseClient
```

### 外部依赖
- `axios`: HTTP请求
- `uuid`: 生成唯一ID
- `@modelcontextprotocol/sdk`: MCP协议支持
- Node.js `fs`: 文件操作（上传）

---

## 数据流

### 视频生成流程
```
用户调用
    ↓
JimengClient.generateVideo(params)
    ↓
videoGen.generateVideo(params)
    ↓
判断模式：
    - 传统模式 → generateTraditionalVideo()
    - 多帧模式 → generateMultiFrameVideo()
    - 主体参考 → generateMainReferenceVideo()
    ↓
BaseClient.uploadImage(filePath) [如果有参考图]
    ↓
BaseClient.request('POST', '/video/generate', data)
    ↓
pollVideoResult(videoId)
    ↓
返回视频URL
```

---

## 迁移映射表

| 原位置（JimengClient） | 目标位置 | 类型 |
|----------------------|---------|------|
| generateVideo() | JimengClient (委托) + VideoGenerator | 公共API |
| generateTraditionalVideo() | VideoGenerator | 私有方法 |
| generateMultiFrameVideo() | VideoGenerator | 私有方法 |
| videoPostProcess() | JimengClient (委托) + VideoGenerator | 公共API |
| pollVideoResult() | VideoGenerator | 私有方法 |
| request() | BaseClient | 共享方法 |
| uploadImage() | BaseClient | 共享方法 |
| logPoll*() 系列 | BaseClient | 共享方法 |
| getModel() | BaseClient | 共享方法 |
| generateRequestParams() | BaseClient | 共享方法 |

---

## 验证规则总结

### BaseClient
- ✅ sessionId非空
- ✅ apiHost格式正确

### VideoGenerator
- ✅ prompt非空
- ✅ multiFrames数量 ≤ 10
- ✅ duration_ms: 3000-15000
- ✅ fps: 12-30
- ✅ resolution: '720p' | '1080p'

### MainReferenceVideoGenerator
- ✅ referenceImages数量: 2-4
- ✅ prompt包含至少一个[图N]引用
- ✅ 图片引用索引有效（0 to images.length-1）

---

## 状态管理

**设计原则**：无状态
- 所有类都是无状态的（除了配置属性如sessionId）
- 每次API调用独立执行
- 不维护生成历史或缓存

这符合项目的无状态API客户端定位。