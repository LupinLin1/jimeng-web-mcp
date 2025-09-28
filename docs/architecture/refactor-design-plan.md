# JiMeng MCP服务器架构重构设计方案

## 🎯 重构目标

1. **分解JimengClient.ts**（2643行）为多个专注的服务
2. **实现依赖注入**，用组合替代继承
3. **添加领域驱动设计层**，提升代码组织性

## 📐 新架构设计

### 1. 领域驱动设计分层架构

```
src/
├── domain/                    # 领域层 - 核心业务逻辑
│   ├── entities/              # 领域实体
│   │   ├── GenerationRequest.ts
│   │   ├── CreditBalance.ts
│   │   └── FileUpload.ts
│   ├── services/              # 领域服务
│   │   ├── GenerationService.ts
│   │   ├── CreditService.ts
│   │   └── FileService.ts
│   ├── repositories/          # 仓储接口
│   │   ├── IGenerationRepository.ts
│   │   ├── ICreditRepository.ts
│   │   └── IFileRepository.ts
│   └── value-objects/        # 值对象
│       ├── ModelMapping.ts
│       ├── GenerationParams.ts
│       └── ApiConfig.ts
├── application/               # 应用层 - 用例编排
│   ├── commands/             # 命令处理
│   │   ├── GenerateImageCommand.ts
│   │   ├── GenerateVideoCommand.ts
│   │   └── UploadFileCommand.ts
│   ├── queries/              # 查询处理
│   │   ├── GetCreditQuery.ts
│   │   └── GetModelMappingQuery.ts
│   ├── dto/                  # 数据传输对象
│   │   ├── GenerationDto.ts
│   │   └── CreditDto.ts
│   └── services/             # 应用服务
│       ├── GenerationOrchestrator.ts
│       └── CreditManager.ts
├── infrastructure/           # 基础设施层
│   ├── api/                  # API客户端
│   │   ├── JimengApiClient.ts
│   │   ├── ImageGenerationService.ts
│   │   ├── VideoGenerationService.ts
│   │   ├── FileUploadService.ts
│   │   └── PollingService.ts
│   ├── auth/                 # 认证
│   │   └── AuthService.ts
│   ├── logging/              # 日志
│   │   └── Logger.ts
│   └── cache/                # 缓存
│       └── CacheManager.ts
├── presentation/             # 表现层
│   ├── mcp/                  # MCP服务器
│   │   ├── McpServer.ts
│   │   ├── ToolRegistry.ts
│   │   └── ResponseBuilder.ts
│   └── controllers/          # 控制器
│       └── GenerationController.ts
├── container/                # 依赖注入容器
│   ├── Container.ts
│   └── types.ts
└── strategies/              # 策略模式
    ├── GenerationStrategy.ts
    ├── SingleImageStrategy.ts
    ├── MultiImageStrategy.ts
    └── VideoGenerationStrategy.ts
```

### 2. 核心服务分解设计

#### 2.1 图像生成服务（~400行）

```typescript
// src/infrastructure/api/ImageGenerationService.ts
export class ImageGenerationService {
  constructor(
    private apiClient: IJimengApiClient,
    private creditService: ICreditService,
    pollingService: IPollingService,
    private cacheManager: ICacheManager
  ) {}

  async generateImage(params: ImageGenerationParams): Promise<string[]> {
    // 专注图像生成逻辑
  }

  async generateWithBatch(params: ImageGenerationParams): Promise<string[]> {
    // 批量生成逻辑
  }
}
```

#### 2.2 视频生成服务（~350行）

```typescript
// src/infrastructure/api/VideoGenerationService.ts
export class VideoGenerationService {
  constructor(
    private apiClient: IJimengApiClient,
    private pollingService: IPollingService
  ) {}

  async generateVideo(params: VideoGenerationParams): Promise<string> {
    // 专注视频生成逻辑
  }

  async postProcess(params: VideoPostProcessParams): Promise<string> {
    // 视频后处理逻辑
  }
}
```

#### 2.3 文件上传服务（~300行）

```typescript
// src/infrastructure/api/FileUploadService.ts
export class FileUploadService {
  constructor(
    private apiClient: IJimengApiClient,
    private authService: IAuthService
  ) {}

  async uploadFile(filePath: string): Promise<UploadResult> {
    // 文件上传逻辑
  }

  async uploadMultipleFiles(filePaths: string[]): Promise<UploadResult[]> {
    // 多文件上传逻辑
  }
}
```

#### 2.4 轮询服务（~250行）

```typescript
// src/infrastructure/api/PollingService.ts
export class PollingService {
  constructor(
    private apiClient: IJimengApiClient,
    private logger: ILogger
  ) {}

  async pollForResult(taskId: string, options: PollingOptions): Promise<any> {
    // 轮询逻辑
  }

  async pollVideoResult(taskId: string, options: PollingOptions): Promise<any> {
    // 视频轮询逻辑
  }
}
```

### 3. 依赖注入容器设计

#### 3.1 容器实现

```typescript
// src/container/Container.ts
export class Container {
  private services = new Map<string, any>();
  private singletons = new Map<string, any>();

  // 注册服务
  register<T>(key: string, factory: () => T, singleton = false): void {
    if (singleton) {
      const instance = factory();
      this.singletons.set(key, instance);
    } else {
      this.services.set(key, factory);
    }
  }

  // 获取服务
  get<T>(key: string): T {
    if (this.singletons.has(key)) {
      return this.singletons.get(key);
    }
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service ${key} not found`);
    }
    return factory();
  }

  // 初始化默认服务
  static createDefault(): Container {
    const container = new Container();

    // 基础设施服务
    container.register('apiClient', () => new JimengApiClient(), true);
    container.register('authService', () => new AuthService());
    container.register('cacheManager', () => new CacheManager(), true);
    container.register('logger', () => new Logger(), true);

    // 领域服务
    container.register('creditService', () => new CreditService(
      container.get('apiClient')
    ));

    container.register('fileUploadService', () => new FileUploadService(
      container.get('apiClient'),
      container.get('authService')
    ));

    container.register('pollingService', () => new PollingService(
      container.get('apiClient'),
      container.get('logger')
    ));

    // 应用服务
    container.register('imageGenerationService', () => new ImageGenerationService(
      container.get('apiClient'),
      container.get('creditService'),
      container.get('pollingService'),
      container.get('cacheManager')
    ));

    container.register('videoGenerationService', () => new VideoGenerationService(
      container.get('apiClient'),
      container.get('pollingService')
    ));

    return container;
  }
}
```

#### 3.2 接口定义

```typescript
// src/container/types.ts
export interface IJimengApiClient {
  request(method: string, path: string, data?: any, params?: any, headers?: any): Promise<any>;
}

export interface ICreditService {
  getCredit(): Promise<CreditInfo>;
  receiveCredit(): Promise<void>;
}

export interface IFileUploadService {
  uploadFile(filePath: string): Promise<UploadResult>;
  uploadMultipleFiles(filePaths: string[]): Promise<UploadResult[]>;
}

export interface IPollingService {
  pollForResult(taskId: string, options: PollingOptions): Promise<any>;
}

export interface ICacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}

export interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, error?: Error): void;
  debug(message: string, meta?: any): void;
}
```

### 4. 策略模式实现

#### 4.1 生成策略接口

```typescript
// src/strategies/GenerationStrategy.ts
export interface GenerationStrategy {
  canHandle(params: GenerationParams): boolean;
  generate(params: GenerationParams, context: GenerationContext): Promise<string[]>;
}

export interface GenerationContext {
  apiClient: IJimengApiClient;
  creditService: ICreditService;
  fileUploadService: IFileUploadService;
  pollingService: IPollingService;
  logger: ILogger;
}
```

#### 4.2 具体策略实现

```typescript
// src/strategies/SingleImageStrategy.ts
export class SingleImageStrategy implements GenerationStrategy {
  canHandle(params: GenerationParams): boolean {
    return !params.filePath || params.filePath.length === 0;
  }

  async generate(params: GenerationParams, context: GenerationContext): Promise<string[]> {
    // 单图生成逻辑
  }
}

// src/strategies/MultiImageStrategy.ts
export class MultiImageStrategy implements GenerationStrategy {
  canHandle(params: GenerationParams): boolean {
    return params.filePath && params.filePath.length > 0;
  }

  async generate(params: GenerationParams, context: GenerationContext): Promise<string[]> {
    // 多图生成逻辑
  }
}
```

### 5. 领域实体设计

#### 5.1 生成请求实体

```typescript
// src/domain/entities/GenerationRequest.ts
export class GenerationRequest {
  constructor(
    public readonly id: string,
    public readonly prompt: string,
    public readonly model: string,
    public readonly style?: string,
    public readonly width?: number,
    public readonly height?: number,
    public readonly status: RequestStatus = RequestStatus.Pending,
    public readonly createdAt: Date = new Date(),
    public readonly completedAt?: Date
  ) {}

  markAsCompleted(): GenerationRequest {
    return new GenerationRequest(
      this.id, this.prompt, this.model, this.style,
      this.width, this.height, RequestStatus.Completed,
      this.createdAt, new Date()
    );
  }

  validate(): void {
    if (!this.prompt || this.prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }
    if (this.prompt.length > 2000) {
      throw new Error('Prompt too long (max 2000 characters)');
    }
  }
}
```

#### 5.2 积分余额实体

```typescript
// src/domain/entities/CreditBalance.ts
export class CreditBalance {
  constructor(
    public readonly giftCredit: number,
    public readonly purchaseCredit: number,
    public readonly vipCredit: number
  ) {}

  get total(): number {
    return this.giftCredit + this.purchaseCredit + this.vipCredit;
  }

  canGenerate(requiredCredits: number = 1): boolean {
    return this.total >= requiredCredits;
  }

  deduct(amount: number): CreditBalance {
    if (!this.canGenerate(amount)) {
      throw new Error('Insufficient credits');
    }
    // 扣减逻辑
    return new CreditBalance(
      Math.max(0, this.giftCredit - amount),
      Math.max(0, this.purchaseCredit - amount),
      Math.max(0, this.vipCredit - amount)
    );
  }
}
```

### 6. 应用服务编排

#### 6.1 生成编排器

```typescript
// src/application/services/GenerationOrchestrator.ts
export class GenerationOrchestrator {
  constructor(
    private strategies: GenerationStrategy[],
    private creditService: ICreditService,
    private logger: ILogger
  ) {}

  async orchestrateGeneration(params: GenerationParams, context: GenerationContext): Promise<string[]> {
    // 1. 选择策略
    const strategy = this.selectStrategy(params);

    // 2. 检查积分
    const creditInfo = await this.creditService.getCredit();
    if (creditInfo.total <= 0) {
      await this.creditService.receiveCredit();
    }

    // 3. 执行生成
    this.logger.info('Starting generation', { strategy: strategy.constructor.name });
    const result = await strategy.generate(params, context);

    this.logger.info('Generation completed', { resultCount: result.length });
    return result;
  }

  private selectStrategy(params: GenerationParams): GenerationStrategy {
    const strategy = this.strategies.find(s => s.canHandle(params));
    if (!strategy) {
      throw new Error('No suitable generation strategy found');
    }
    return strategy;
  }
}
```

### 7. 向后兼容的客户端

#### 7.1 新的JimengClient设计

```typescript
// src/application/JimengClient.ts
export class JimengClient {
  constructor(
    private container: Container = Container.createDefault()
  ) {}

  async generateImage(params: ImageGenerationParams): Promise<string[]> {
    const orchestrator = this.container.get<GenerationOrchestrator>('generationOrchestrator');
    const context: GenerationContext = {
      apiClient: this.container.get('apiClient'),
      creditService: this.container.get('creditService'),
      fileUploadService: this.container.get('fileUploadService'),
      pollingService: this.container.get('pollingService'),
      logger: this.container.get('logger')
    };

    return await orchestrator.orchestrateGeneration(params, context);
  }

  async generateVideo(params: VideoGenerationParams): Promise<string> {
    const videoService = this.container.get<VideoGenerationService>('videoGenerationService');
    return await videoService.generateVideo(params);
  }

  // 保持与原API兼容的方法
  async getCredit(): Promise<Record<string, number>> {
    const creditService = this.container.get<ICreditService>('creditService');
    return await creditService.getCredit();
  }
}
```

## 📊 预期效果

### 文件大小对比
- **重构前**: JimengClient.ts (2643行)
- **重构后**:
  - ImageGenerationService.ts (~400行)
  - VideoGenerationService.ts (~350行)
  - FileUploadService.ts (~300行)
  - PollingService.ts (~250行)
  - JimengClient.ts (~150行)

### 架构优势
1. **单一职责**: 每个服务专注特定功能
2. **依赖注入**: 松耦合，易于测试和扩展
3. **策略模式**: 支持不同生成策略的灵活切换
4. **领域驱动**: 清晰的分层架构
5. **向后兼容**: 保持原有API接口不变

## 🚀 实施计划

### 第一阶段：基础设施搭建（1-2天）
1. **创建依赖注入容器**
   - 实现Container类和服务注册机制
   - 定义核心接口（IJimengApiClient, ICreditService等）
   - 创建默认容器配置

2. **创建新的目录结构**
   - domain/（领域层）
   - application/（应用层）
   - infrastructure/（基础设施层）
   - presentation/（表现层）
   - container/（DI容器）

### 第二阶段：服务分解（3-4天）
1. **提取图像生成服务**
   - 从JimengClient.ts提取图像相关逻辑
   - 创建ImageGenerationService.ts
   - 实现生成策略模式

2. **提取视频生成服务**
   - 提取视频相关逻辑到VideoGenerationService.ts
   - 分离后处理功能

3. **提取文件上传服务**
   - 创建FileUploadService.ts
   - 统一文件处理逻辑

4. **提取轮询服务**
   - 创建PollingService.ts
   - 抽象轮询逻辑

### 第三阶段：领域模型实现（2-3天）
1. **创建领域实体**
   - GenerationRequest.ts
   - CreditBalance.ts
   - FileUpload.ts

2. **实现应用服务**
   - GenerationOrchestrator.ts
   - CreditManager.ts

### 第四阶段：集成测试（1-2天）
1. **单元测试**
   - 每个新服务的单元测试
   - 依赖注入容器测试

2. **集成测试**
   - 端到端功能测试
   - 向后兼容性测试

### 第五阶段：迁移和清理（1天）
1. **更新导入路径**
2. **删除旧代码**
3. **文档更新**

## 🔧 技术要点

### 核心设计模式
- **依赖注入**: 使用Container管理服务生命周期
- **策略模式**: 不同生成策略的灵活切换
- **工厂模式**: 服务实例创建
- **单一职责**: 每个服务专注特定功能

### 向后兼容
- 保持原有JimengClient API接口不变
- 内部使用新的架构实现
- 渐进式迁移，不影响现有功能

### 质量保证
- 100%类型安全
- 完整的错误处理
- 详细的日志记录
- 全面的测试覆盖

## 📈 项目收益

### 代码质量
- 文件大小从2643行降至最大400行
- 清晰的职责分离
- 提高代码可读性和维护性

### 开发效率
- 并行开发能力提升
- 单元测试更容易编写
- 新功能扩展更简单

### 系统稳定性
- 松耦合架构
- 更好的错误隔离
- 便于监控和调试

---

**创建时间**: 2025-01-26
**版本**: 1.0
**状态**: 设计完成，待实施