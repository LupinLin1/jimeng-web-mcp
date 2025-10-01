# 数据模型：ImageGenerator 架构设计

**功能**: 003-jimengclient-ts
**日期**: 2025-10-01
**状态**: 已完成

## 概述

本文档定义了 `ImageGenerator` 类的详细设计，包括类结构、方法签名、数据流和状态管理。设计完全基于现有 `VideoGenerator` 模式，确保架构一致性。

## 1. 类层次结构

```
CreditService (src/api/CreditService.ts)
    ↓
BaseClient (src/api/BaseClient.ts)
    ├─→ VideoGenerator (src/api/video/VideoGenerator.ts)  [现有]
    ├─→ ImageGenerator (src/api/image/ImageGenerator.ts)  [新建]
    └─→ JimengClient (src/api/JimengClient.ts)            [修改]
```

## 2. ImageGenerator 类设计

### 2.1 类定义

```typescript
/**
 * ImageGenerator 图像生成核心类
 * 负责图像生成的所有逻辑，包括批量生成、继续生成和异步查询
 *
 * @extends BaseClient 继承基础客户端功能（HTTP、上传、积分管理）
 */
export class ImageGenerator extends BaseClient {

  // ============== 静态属性 ==============

  /**
   * 异步任务参数缓存
   * 用于继续生成时复用原始参数
   * 键：historyId
   * 值：生成任务的完整上下文
   */
  private static asyncTaskCache = new Map<string, {
    params: ImageGenerationParams;
    actualModel: string;
    modelName: string;
    hasFilePath: boolean;
    uploadResult: any;
    uploadResults: any[];
  }>();

  /**
   * 继续生成发送状态
   * 防止重复发送继续生成请求
   * 键：historyId
   * 值：是否已发送
   */
  private static continuationSent = new Map<string, boolean>();

  // ============== 公共方法 ==============

  /**
   * 同步图像生成（主要入口）
   * 支持单张和批量生成（count > 4 自动继续生成）
   * 支持多参考图（最多 4 张）
   */
  public async generateImage(params: ImageGenerationParams): Promise<string[]>;

  /**
   * 异步图像生成
   * 立即返回 historyId，不等待生成完成
   * 适合长时间任务或需要轮询状态的场景
   */
  public async generateImageAsync(params: ImageGenerationParams): Promise<string>;

  /**
   * 查询生成任务状态和结果
   * 支持自动触发继续生成（count > 4 且已完成 4 张时）
   */
  public async getImageResult(historyId: string): Promise<QueryResultResponse>;

  /**
   * 批量查询多个任务状态
   * 单次 API 调用，高效查询最多 10 个任务
   */
  public async getBatchResults(historyIds: string[]): Promise<{
    [historyId: string]: QueryResultResponse | { error: string }
  }>;

  // ============== 私有辅助方法 ==============

  // 核心生成流程（5 个方法）
  private async generateImageWithBatch(params): Promise<string[]>;
  private async performGeneration(params, ...): Promise<string[]>;
  private async performContinuationGeneration(params, ..., historyId): Promise<void>;
  private async performAsyncContinueGeneration(historyId): Promise<void>;
  private shouldContinueGeneration(total, finished, status): boolean;

  // 请求构建（4 个方法）
  private buildGenerationRequestData(params, ..., historyId?, isContinuation?): {...};
  private buildBlendAbilities(params, ..., uploadResults): object;
  private buildGenerateAbilities(params, ..., width, height): object;
  private getReferenceStrength(params, index): number;

  // 轮询相关（4 个方法）
  private async pollDraftResult(draftId): Promise<DraftResponse>;
  private async pollTraditionalResult(result, params?, ...): Promise<string[]>;
  private extractImageUrlsFromDraft(draftResponse): string[];
  private extractImageUrls(itemList): string[];

  // 辅助功能（2 个方法）
  private saveRequestLog(logData): void;
  private getSessionId(): string;
}
```

### 2.2 方法分组

#### **生成入口方法**（4 个公共方法）

| 方法 | 同步/异步 | 返回值 | 用途 |
|------|----------|--------|------|
| `generateImage` | 同步 | `Promise<string[]>` | 主要入口，等待生成完成 |
| `generateImageAsync` | 异步提交 | `Promise<string>` | 返回 historyId，不等待 |
| `getImageResult` | 查询 | `Promise<QueryResultResponse>` | 查询单个任务状态 |
| `getBatchResults` | 批量查询 | `Promise<{...}>` | 查询多个任务状态 |

#### **核心生成流程**（5 个私有方法）

| 方法 | 职责 | 依赖 |
|------|------|------|
| `generateImageWithBatch` | 批量生成主逻辑 | `performGeneration` |
| `performGeneration` | 执行单次生成 | `buildGenerationRequestData`, `pollDraftResult`, `pollTraditionalResult` |
| `performContinuationGeneration` | 同步继续生成 | `buildGenerationRequestData` |
| `performAsyncContinueGeneration` | 异步继续生成 | `asyncTaskCache`, `buildGenerationRequestData` |
| `shouldContinueGeneration` | 判断是否继续生成 | 无 |

#### **请求构建**（4 个私有方法）

| 方法 | 职责 | 输出 |
|------|------|------|
| `buildGenerationRequestData` | 构建完整请求数据 | `{ rqData, rqParams }` |
| `buildBlendAbilities` | 构建多参考图 abilities | `object` |
| `buildGenerateAbilities` | 构建纯文本生成 abilities | `object` |
| `getReferenceStrength` | 获取参考图强度 | `number` |

#### **轮询相关**（4 个私有方法）

| 方法 | 职责 | 返回值 |
|------|------|--------|
| `pollDraftResult` | Draft 模式轮询 | `DraftResponse` |
| `pollTraditionalResult` | 传统模式轮询 | `string[]` |
| `extractImageUrlsFromDraft` | 从 Draft 提取 URL | `string[]` |
| `extractImageUrls` | 从 item_list 提取 URL | `string[]` |

## 3. JimengClient 类设计（修改后）

### 3.1 新增属性

```typescript
export class JimengClient extends BaseClient {
  private videoGen: VideoGenerator;     // 现有
  private imageGen: ImageGenerator;     // 新增

  constructor(refreshToken?: string) {
    super(refreshToken);
    this.videoGen = new VideoGenerator(refreshToken);
    this.imageGen = new ImageGenerator(refreshToken);  // 新增
  }
}
```

### 3.2 委托方法

```typescript
// ============== 图像生成功能（委托给 ImageGenerator）==============

public async generateImage(params: ImageGenerationParams): Promise<string[]> {
  return this.imageGen.generateImage(params);
}

public async generateImageAsync(params: ImageGenerationParams): Promise<string> {
  return this.imageGen.generateImageAsync(params);
}

public async getImageResult(historyId: string): Promise<QueryResultResponse> {
  return this.imageGen.getImageResult(historyId);
}

public async getBatchResults(historyIds: string[]): Promise<{
  [historyId: string]: QueryResultResponse | { error: string }
}> {
  return this.imageGen.getBatchResults(historyIds);
}
```

### 3.3 删除的内容

- ❌ 删除所有图像生成私有方法（15 个）
- ❌ 删除静态属性（asyncTaskCache, continuationSent）
- ❌ 删除图像生成相关的导入

## 4. 数据流设计

### 4.1 同步生成流程

```
用户调用
    ↓
JimengClient.generateImage(params)
    ↓ [委托]
ImageGenerator.generateImage(params)
    ↓
generateImageWithBatch(params)
    ↓
uploadImage(filePath) [继承自 BaseClient]
    ↓
buildGenerationRequestData(params, ...)
    ↓
request('POST', '/mweb/v1/aigc_draft/generate', ...) [继承自 BaseClient]
    ↓
pollDraftResult(draftId) 或 pollTraditionalResult(result)
    ↓
[如果 count > 4 且 finished == 4]
    ↓
performContinuationGeneration(params, ..., historyId)
    ↓
pollTraditionalResult(result) [继续轮询]
    ↓
extractImageUrls(itemList)
    ↓
返回 string[] (图片 URL 数组)
```

### 4.2 异步生成流程

```
用户调用
    ↓
JimengClient.generateImageAsync(params)
    ↓ [委托]
ImageGenerator.generateImageAsync(params)
    ↓
uploadImage(filePath)
    ↓
buildGenerationRequestData(params, ...)
    ↓
request('POST', '/mweb/v1/aigc_draft/generate', ...)
    ↓
缓存参数到 asyncTaskCache
    ↓
返回 historyId (立即返回)

--- 稍后查询 ---

用户调用
    ↓
JimengClient.getImageResult(historyId)
    ↓ [委托]
ImageGenerator.getImageResult(historyId)
    ↓
request('POST', '/mweb/v1/get_history_by_ids', ...)
    ↓
[检测到需要继续生成]
    ↓
performAsyncContinueGeneration(historyId)
    ↓
从 asyncTaskCache 获取参数
    ↓
buildGenerationRequestData(..., historyId, isContinuation=true)
    ↓
request('POST', '/mweb/v1/aigc_draft/generate', ...)
    ↓
返回 QueryResultResponse
```

## 5. 状态管理

### 5.1 静态缓存

**asyncTaskCache**：
- **目的**：存储异步任务的完整上下文，用于继续生成
- **生命周期**：从 `generateImageAsync` 创建到任务完成
- **清理**：✅ **建议**：任务完成后清理（避免内存泄漏）

**continuationSent**：
- **目的**：防止重复发送继续生成请求
- **生命周期**：从检测到继续生成需求到任务完成
- **清理**：✅ **建议**：任务完成后清理

### 5.2 会话管理

**sessionId**（继承自 BaseClient）：
- **目的**：用于日志记录，关联同一会话的请求
- **生成**：首次调用 `getSessionId()` 时生成
- **格式**：`session_{timestamp}_{random}`

## 6. 类型定义

### 6.1 ImageGenerationParams（现有，不修改）

```typescript
export interface ImageGenerationParams {
  prompt: string;                    // 必填：图片描述
  model?: string;                    // 可选：模型名称
  aspectRatio?: string;              // 可选：宽高比
  filePath?: string[];               // 可选：参考图路径数组
  sample_strength?: number;          // 可选：全局参考图强度
  reference_strength?: number[];     // 可选：每张参考图的独立强度
  negative_prompt?: string;          // 可选：负向提示词
  count?: number;                    // 可选：生成数量（默认 1，最大 15）
}
```

### 6.2 QueryResultResponse（现有，不修改）

```typescript
export interface QueryResultResponse {
  status: GenerationStatus;          // 生成状态
  progress: number;                  // 进度百分比
  imageUrls?: string[];              // 图片 URL（完成时）
  videoUrl?: string;                 // 视频 URL（视频生成完成时）
  error?: string;                    // 错误信息（失败时）
}

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

## 7. 错误处理

### 7.1 错误类型

| 错误 | 场景 | 处理方式 |
|------|------|----------|
| `prompt必须是非空字符串` | 参数验证失败 | 立即抛出 |
| `记录ID不存在` | 无法获取 historyId | 立即抛出 |
| `内容被过滤` | failCode === '2038' | 抛出友好错误 |
| `生成失败` | status === 30 | 抛出通用错误 |
| `Draft轮询超时` | 超过最大轮询次数 | 抛出超时错误 |
| `网络错误超过最大重试次数` | 连续网络错误 | 抛出网络错误 |

### 7.2 重试机制

**网络请求重试**：
- 最大网络错误重试：3 次
- 总体超时：5 分钟（300,000 ms）
- 轮询间隔：
  - 首次：5 秒
  - 后续：3 秒
  - 特殊状态（42, 45）：首次 15/30 秒，后续 8/10 秒

## 8. 性能特性

### 8.1 批量生成优化

**继续生成机制**：
- 当 `count > 4` 时，自动分批生成
- 第一批：4 张图片
- 检测点：`finishedCount === 4`
- 触发：自动发送继续生成请求
- 结果：单次 API 调用返回所有图片

### 8.2 异步查询优化

**批量查询**：
- `getBatchResults(historyIds)` 支持一次查询最多 10 个任务
- 单次 API 调用，减少网络开销
- 适合批量监控多个生成任务

## 9. 向后兼容性保证

### 9.1 API 签名不变

✅ **所有公共方法签名完全相同**
```typescript
// 重构前
JimengClient.generateImage(params): Promise<string[]>

// 重构后
JimengClient.generateImage(params): Promise<string[]>
  ↓ [委托给]
ImageGenerator.generateImage(params): Promise<string[]>
```

### 9.2 行为不变

✅ **所有功能逻辑完全相同**
- 相同的参数验证
- 相同的错误处理
- 相同的轮询逻辑
- 相同的继续生成触发条件

### 9.3 类型不变

✅ **所有类型定义保持不变**
- `ImageGenerationParams`
- `QueryResultResponse`
- `GenerationStatus`

## 10. 与 VideoGenerator 的一致性

| 特性 | VideoGenerator | ImageGenerator | 一致性 |
|------|----------------|----------------|--------|
| 继承关系 | extends BaseClient | extends BaseClient | ✅ |
| 构造函数参数 | refreshToken | refreshToken | ✅ |
| 委托模式 | JimengClient → VideoGenerator | JimengClient → ImageGenerator | ✅ |
| 目录结构 | src/api/video/ | src/api/image/ | ✅ |
| 导出文件 | src/api/video/index.ts | src/api/image/index.ts | ✅ |
| 积分检查 | getCredit() + receiveCredit() | getCredit() + receiveCredit() | ✅ |
| 文件上传 | uploadImage() | uploadImage() | ✅ |

## 11. 下一步

1. ✅ 数据模型设计完成
2. 待完成：创建 `contracts/ImageGenerator.interface.ts`
3. 待完成：创建 `quickstart.md`
4. 待完成：更新 `CLAUDE.md`

---

**设计完成日期**: 2025-10-01
**审核人**: 自动生成（/plan 命令）
**状态**: ✅ 详细设计完成，准备创建合约
