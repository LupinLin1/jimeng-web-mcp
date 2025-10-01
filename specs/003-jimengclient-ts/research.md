# 研究文档：图像生成代码提取

**功能**: 003-jimengclient-ts
**日期**: 2025-10-01
**状态**: 已完成

## 执行摘要

本文档记录了将图像生成代码从 `JimengClient.ts` 提取到独立 `ImageGenerator` 模块的研究成果。研究表明，可以采用与现有 `VideoGenerator` 完全相同的架构模式，确保一致性并最小化风险。

## 1. 现有架构模式分析

### 1.1 VideoGenerator 分离模式

**发现**：`VideoGenerator` 已成功从 `JimengClient` 分离，提供了完美的参考模式。

**关键特征**：
```typescript
// src/api/video/VideoGenerator.ts
export class VideoGenerator extends BaseClient {
  // 继承 BaseClient 获得：
  // - HTTP 请求方法（request）
  // - 图像上传方法（uploadImage）
  // - 模型管理（getModel）
  // - 积分管理（getCredit, receiveCredit）

  public async generateVideo(params: VideoGenerationParams): Promise<string> {
    // 完整的视频生成逻辑
  }
}
```

**JimengClient 委托模式**：
```typescript
// src/api/JimengClient.ts
export class JimengClient extends BaseClient {
  private videoGen: VideoGenerator;

  constructor(refreshToken?: string) {
    super(refreshToken);
    this.videoGen = new VideoGenerator(refreshToken);
  }

  public async generateVideo(params: VideoGenerationParams): Promise<string> {
    return this.videoGen.generateVideo(params);
  }
}
```

**决策**：采用完全相同的模式用于 `ImageGenerator`
**理由**：
- ✅ 已验证的架构模式
- ✅ 开发者熟悉的结构
- ✅ 一致的代码组织
- ✅ 经过测试的可行性

**替代方案**：
- ❌ 静态方法模式 - 不利于继承 BaseClient
- ❌ 组合模式（无继承）- 需要重复更多代码
- ❌ Mixin 模式 - TypeScript 中过于复杂

## 2. 需要迁移的代码识别

### 2.1 公共方法（4 个）

从 `JimengClient.ts` 迁移到 `ImageGenerator.ts`：

1. **generateImage(params: ImageGenerationParams): Promise<string[]>**
   - 行数：~800 行（包括所有辅助方法）
   - 依赖：BaseClient.uploadImage, BaseClient.request
   - 调用：generateImageWithBatch

2. **generateImageAsync(params: ImageGenerationParams): Promise<string>**
   - 行数：~80 行
   - 功能：异步提交，立即返回 historyId
   - 依赖：buildGenerationRequestData, uploadImage

3. **getImageResult(historyId: string): Promise<QueryResultResponse>**
   - 行数：~150 行
   - 功能：查询生成状态和结果
   - 特殊逻辑：触发异步继续生成

4. **getBatchResults(historyIds: string[]): Promise<{...}>**
   - 行数：~100 行
   - 功能：批量查询多个任务状态
   - 优化：单次 API 调用

### 2.2 私有辅助方法（15 个）

#### 核心生成流程
1. `generateImageWithBatch` - 批量生成主逻辑
2. `performGeneration` - 执行生成
3. `performContinuationGeneration` - 同步继续生成
4. `performAsyncContinueGeneration` - 异步继续生成
5. `shouldContinueGeneration` - 判断是否需要继续生成

#### 请求构建
6. `buildGenerationRequestData` - 构建请求数据
7. `buildBlendAbilities` - 构建 blend 模式 abilities
8. `buildGenerateAbilities` - 构建 generate 模式 abilities
9. `getReferenceStrength` - 获取参考图强度

#### 轮询相关
10. `pollDraftResult` - Draft 模式轮询
11. `pollTraditionalResult` - 传统模式轮询
12. `extractImageUrlsFromDraft` - 从 Draft 提取 URL
13. `extractImageUrls` - 从 item_list 提取 URL

#### 辅助功能
14. `saveRequestLog` - 保存请求日志
15. `getSessionId` - 获取会话 ID

### 2.3 静态属性（2 个）

```typescript
// 异步任务参数缓存（用于继续生成）
private static asyncTaskCache = new Map<string, {
  params: ImageGenerationParams,
  actualModel: string,
  modelName: string,
  hasFilePath: boolean,
  uploadResult: any,
  uploadResults: any[]
}>();

// 继续生成发送状态（防重复）
private static continuationSent = new Map<string, boolean>();
```

**决策**：迁移为 `ImageGenerator` 的静态属性
**理由**：这些缓存是图像生成特有的，应该与图像生成逻辑一起管理

### 2.4 导入依赖

**类型导入**：
```typescript
import {
  ImageGenerationParams,
  DraftResponse,
  AigcMode,
  AbilityItem,
  QueryResultResponse,
  GenerationStatus
} from '../../types/api.types.js';
```

**工具导入**：
```typescript
import {
  DEFAULT_MODEL,
  DRAFT_VERSION,
  getResolutionType,
  ASPECT_RATIO_PRESETS,
  WEB_ID
} from '../../types/models.js';
import { ImageDimensionCalculator } from '../../utils/dimensions.js';
import { generateUuid, jsonEncode, urlEncode, generateMsToken, toUrlParams } from '../../utils/index.js';
import { generate_a_bogus } from '../../utils/a_bogus.js';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
// @ts-ignore
import crc32 from 'crc32';
```

## 3. 依赖关系分析

### 3.1 BaseClient 继承关系

**ImageGenerator 需要的 BaseClient 方法**：

```typescript
// HTTP 请求
protected async request(method, path, data, params): Promise<any>
protected generateRequestParams(): any

// 文件上传
protected async uploadImage(filePath: string): Promise<{uri, width, height, format}>

// 模型管理
protected getModel(modelName: string): string

// 积分管理
protected async getCredit(): Promise<CreditInfo>
protected async receiveCredit(): Promise<void>

// 会话管理
protected refreshToken: string
protected sessionId?: string
```

**验证**：✅ 所有方法都已在 BaseClient 中提供（与 VideoGenerator 使用相同）

### 3.2 类型依赖

**ImageGenerator 需要的类型**：
- `ImageGenerationParams` - 图像生成参数
- `DraftResponse` - Draft 响应类型
- `QueryResultResponse` - 查询结果响应
- `GenerationStatus` - 生成状态枚举
- `AigcMode` - AIGC 模式类型

**验证**：✅ 所有类型都在 `src/types/api.types.ts` 中定义，无需修改

### 3.3 工具依赖

**ImageGenerator 需要的工具函数**：
- `generateUuid` - UUID 生成
- `jsonEncode` - JSON 编码
- `ImageDimensionCalculator` - 尺寸计算
- `DEFAULT_MODEL` - 默认模型
- `DRAFT_VERSION` - Draft 版本

**验证**：✅ 所有工具都在 `src/utils/` 和 `src/types/models.ts` 中，无需修改

## 4. 测试覆盖分析

### 4.1 现有测试文件

**直接依赖 JimengClient.generateImage() 的测试**：

1. **src/__tests__/image-generation.test.ts**
   - 测试同步图像生成
   - 使用：`client.generateImage(params)`
   - 影响：✅ 无影响（委托模式透明）

2. **src/__tests__/async-image-generation.test.ts**
   - 测试异步图像生成
   - 使用：`client.generateImageAsync(params)`
   - 使用：`client.getImageResult(historyId)`
   - 影响：✅ 无影响（委托模式透明）

3. **src/__tests__/backward-compatibility.test.ts**
   - 测试向后兼容性
   - 验证：API 签名保持不变
   - 影响：✅ **关键验证点** - 必须通过

4. **src/__tests__/integration.test.ts**
   - 端到端集成测试
   - 使用：完整的图像生成流程
   - 影响：✅ 无影响

### 4.2 测试不依赖内部实现

**验证结果**：✅ **所有测试都通过公共 API 访问**

```typescript
// 测试代码示例（不依赖内部实现）
const client = new JimengClient(token);
const urls = await client.generateImage({ prompt: "测试" });
// ✅ 只测试公共接口，不访问私有方法
```

**决策**：重构后无需修改任何测试代码
**验证方法**：运行 `yarn test`，所有测试必须通过

## 5. 迁移策略

### 5.1 分阶段迁移

**阶段 1：创建骨架**
- 创建 `src/api/image/ImageGenerator.ts`
- 创建 `src/api/image/index.ts`
- 继承 BaseClient
- 定义静态属性

**阶段 2：迁移公共方法**
- 迁移 `generateImage`（主要方法）
- 迁移 `generateImageAsync`
- 迁移 `getImageResult`
- 迁移 `getBatchResults`

**阶段 3：迁移私有辅助方法**
- 迁移请求构建方法（3 个）
- 迁移轮询相关方法（4 个）
- 迁移核心生成流程（5 个）
- 迁移辅助功能（3 个）

**阶段 4：集成到 JimengClient**
- 在 JimengClient 构造函数中初始化 ImageGenerator
- 添加委托方法
- 删除已迁移的方法

**阶段 5：验证**
- 运行所有测试（`yarn test`）
- 验证类型检查（`yarn type-check`）
- 验证构建（`yarn build`）

### 5.2 风险缓解

**风险 1：静态属性共享**
- **问题**：静态属性在类之间共享
- **缓解**：确保 ImageGenerator 的静态属性独立于 JimengClient
- **验证**：测试多个实例的缓存隔离

**风险 2：循环依赖**
- **问题**：JimengClient 和 ImageGenerator 互相引用
- **缓解**：单向依赖（JimengClient → ImageGenerator）
- **验证**：构建成功，无循环依赖警告

**风险 3：测试失败**
- **问题**：重构导致测试失败
- **缓解**：增量迁移，频繁运行测试
- **验证**：每个阶段后运行 `yarn test`

## 6. 时间估算

**总估算**：2-3 小时

- 阶段 1：创建骨架 - 15 分钟
- 阶段 2：迁移公共方法 - 45 分钟
- 阶段 3：迁移私有方法 - 60 分钟
- 阶段 4：集成到 JimengClient - 30 分钟
- 阶段 5：验证和修复 - 30 分钟

## 7. 成功标准

1. ✅ 所有测试通过（`yarn test`）
2. ✅ 类型检查通过（`yarn type-check`）
3. ✅ 构建成功（`yarn build`）
4. ✅ 代码行数减少（JimengClient.ts 从 1917 行减少到 ~1100 行）
5. ✅ 向后兼容性验证通过（backward-compatibility.test.ts）
6. ✅ 与 VideoGenerator 架构一致性

## 8. 关键决策总结

| 决策点 | 选择 | 理由 | 替代方案 |
|--------|------|------|----------|
| 架构模式 | 继承 BaseClient + 委托 | 与 VideoGenerator 一致 | 静态方法、组合模式 |
| 静态属性 | 迁移到 ImageGenerator | 数据与逻辑在一起 | 保留在 JimengClient |
| 迁移策略 | 增量迁移 | 降低风险，频繁验证 | 一次性迁移 |
| 测试策略 | 无需修改测试 | 验证向后兼容性 | 重写测试 |
| 目录结构 | src/api/image/ | 与 src/api/video/ 对称 | src/services/image/ |

## 9. 下一步行动

1. 进入阶段 1（设计与合约）
2. 创建 `data-model.md` 详细设计
3. 创建 `contracts/ImageGenerator.interface.ts` 接口定义
4. 创建 `quickstart.md` 验证步骤
5. 执行 `/tasks` 命令生成任务列表

---

**研究完成日期**: 2025-10-01
**审核人**: 自动生成（/plan 命令）
**状态**: ✅ 所有未知问题已解决，准备进入设计阶段
