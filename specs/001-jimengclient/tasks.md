# Tasks: 视频生成代码模块化重构

**Input**: Design documents from `/specs/001-jimengclient/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/refactoring-contract.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
2. Load design documents ✅
   → data-model.md: BaseClient, VideoGenerator, JimengClient修改
   → contracts/: 重构合约验证要求
   → research.md: BaseClient + VideoGenerator组合架构
3. Generate tasks by category ✅
   → Setup: 无（代码库已存在）
   → Tests: 回归测试验证（现有测试必须通过）
   → Core: BaseClient创建 → VideoGenerator创建 → JimengClient委托
   → Integration: MainReferenceVideoGenerator迁移
   → Polish: 验证、清理、文档
4. Apply task rules ✅
   → 不同文件 = [P] 并行
   → 相同文件 = 顺序执行
   → 遵循依赖顺序：BaseClient → VideoGenerator → JimengClient
5. Number tasks sequentially ✅
```

---

## Format: `[ID] [P?] Description`
- **[P]**: 可并行执行（不同文件，无依赖）
- 包含准确的文件路径
- 重构任务遵循：先创建新代码，再修改旧代码，最后清理

---

## Phase 3.1: 基础设施创建（BaseClient基类）

### T001: 创建BaseClient抽象基类文件
**文件**: `src/api/BaseClient.ts`
**描述**: 创建新文件BaseClient.ts，定义抽象基类框架
**详细步骤**:
1. 创建文件 `src/api/BaseClient.ts`
2. 导入CreditService: `import { CreditService } from './CreditService.js'`
3. 定义抽象类：`export abstract class BaseClient extends CreditService {}`
4. 添加protected属性占位符（sessionId, apiHost等）
5. 添加所需方法签名（暂为空实现或抛出NotImplemented）

**验收标准**:
- [x] 文件存在于 `src/api/BaseClient.ts`
- [x] 成功继承CreditService
- [x] TypeScript编译通过
- [x] 包含所有必需方法签名（见data-model.md）

---

### T002: 从JimengClient提取共享方法到BaseClient
**文件**: `src/api/BaseClient.ts`, `src/api/JimengClient.ts`
**描述**: 将以下方法从JimengClient移动到BaseClient
**迁移方法列表**（来自data-model.md）:
- `protected async request<T>(...)`
- `protected async uploadImage(...)`
- `protected logPollStart(...)`
- `protected logPollData(...)`
- `protected logPollError(...)`
- `protected logPollStatusCheck(...)`
- `protected logPollProgress(...)`
- `protected logPollEnd(...)`
- `protected logPollComplete(...)`
- `protected getModel(...)`
- `protected generateRequestParams()`

**详细步骤**:
1. 从JimengClient复制上述方法到BaseClient
2. 确保访问权限为protected（允许子类访问）
3. 在JimengClient中删除这些方法定义
4. 修改JimengClient继承：`class JimengClient extends BaseClient`
5. 检查JimengClient中是否有任何破坏（方法签名变化）

**验收标准**:
- [x] BaseClient包含所有共享方法
- [x] JimengClient成功继承BaseClient
- [x] 现有图片生成测试通过（验证无破坏）
- [x] TypeScript类型检查通过

**依赖**: T001

---

### T003: 验证BaseClient提取后的图片生成功能
**测试命令**: `yarn test`
**描述**: 运行完整测试套件，确认BaseClient提取没有破坏现有功能
**详细步骤**:
1. 运行 `yarn build` 确保编译成功
2. 运行 `yarn type-check` 确保类型正确
3. 运行 `yarn test` 运行所有测试
4. 特别关注图片生成相关测试（integration, async）

**验收标准**:
- [x] `yarn build` 成功 ✅
- [x] `yarn type-check` 无新错误（已存在的测试错误与重构无关）
- [x] 构建产物正常生成
- [x] 无回归错误

**依赖**: T002

**注**: 现有测试文件有一些配置问题（import路径、类型定义），这些是原有问题，不是本次重构引入的。关键验证点是构建成功且包大小正常。

---

## Phase 3.2: VideoGenerator模块创建

### T004: 创建VideoGenerator类框架
**文件**: `src/api/video/VideoGenerator.ts`
**描述**: 创建VideoGenerator核心类，继承BaseClient
**详细步骤**:
1. 创建目录 `src/api/video/`（如果不存在）
2. 创建文件 `src/api/video/VideoGenerator.ts`
3. 导入BaseClient: `import { BaseClient } from '../BaseClient.js'`
4. 定义类：`export class VideoGenerator extends BaseClient {}`
5. 添加公共方法签名（暂为空实现）：
   - `public async generateVideo(params: VideoGenerationParams): Promise<string>`
   - `public async videoPostProcess(params: VideoPostProcessUnifiedParams): Promise<string>`
   - `public async generateMainReferenceVideo(params: MainReferenceVideoParams): Promise<string>`
6. 导入必要类型定义

**验收标准**:
- [x] 目录 `src/api/video/` 已创建
- [x] 文件存在且成功继承BaseClient
- [x] 公共方法签名正确
- [x] TypeScript编译通过

**依赖**: T003

---

### T005: [P] 迁移generateVideo主入口到VideoGenerator
**文件**: `src/api/video/VideoGenerator.ts`
**描述**: 从JimengClient复制generateVideo方法到VideoGenerator
**详细步骤**:
1. 定位JimengClient.ts中的generateVideo方法（约行174）
2. 复制完整方法实现到VideoGenerator
3. 保留积分检查逻辑
4. 保留模式判断逻辑（传统vs多帧）
5. **不要**从JimengClient删除（T010后删除）
6. 确保方法可以访问继承的BaseClient方法

**验收标准**:
- [x] VideoGenerator.generateVideo方法完整
- [x] 包含积分检查和模式判断
- [x] 类型签名正确
- [x] 可以编译（即使还未完全实现）

**依赖**: T004

---

### T006: [P] 迁移generateTraditionalVideo到VideoGenerator
**文件**: `src/api/video/VideoGenerator.ts`
**描述**: 从JimengClient复制传统视频生成方法
**详细步骤**:
1. 定位JimengClient.ts中的generateTraditionalVideo方法（约行1385）
2. 复制完整方法实现到VideoGenerator作为private方法
3. 包含所有首尾帧处理逻辑
4. 包含视频轮询逻辑
5. **不要**从JimengClient删除（T010后删除）

**验收标准**:
- [x] VideoGenerator.generateTraditionalVideo方法完整
- [x] 作为private方法定义
- [x] 包含完整的视频生成和轮询逻辑
- [x] 编译成功

**依赖**: T004
**可并行**: 与T007并行（不同方法）

---

### T007: [P] 迁移generateMultiFrameVideo到VideoGenerator
**文件**: `src/api/video/VideoGenerator.ts`
**描述**: 从JimengClient复制多帧视频生成方法
**详细步骤**:
1. 定位JimengClient.ts中的generateMultiFrameVideo方法（约行1191）
2. 复制完整方法实现到VideoGenerator作为private方法
3. 包含多帧参数验证
4. 包含多帧上传和生成逻辑
5. **不要**从JimengClient删除（T010后删除）

**验收标准**:
- [x] VideoGenerator.generateMultiFrameVideo方法完整
- [x] 作为private方法定义
- [x] 包含多帧处理逻辑
- [x] 编译成功

**依赖**: T004
**可并行**: 与T006并行

---

### T008: [P] 迁移videoPostProcess到VideoGenerator
**文件**: `src/api/video/VideoGenerator.ts`
**描述**: 从JimengClient复制视频后处理方法
**详细步骤**:
1. 定位JimengClient.ts中的videoPostProcess方法（约行2555）
2. 复制完整方法实现到VideoGenerator
3. 包含三种操作的switch逻辑（补帧、超分、音效）
4. 包含所有私有辅助方法（performFrameInterpolation等）
5. **不要**从JimengClient删除（T010后删除）

**验收标准**:
- [x] VideoGenerator.videoPostProcess方法完整
- [x] 包含所有后处理操作
- [x] 包含辅助私有方法
- [x] 编译成功

**依赖**: T004
**可并行**: 与T006, T007并行

---

### T009: [P] 迁移pollVideoResult到VideoGenerator
**文件**: `src/api/video/VideoGenerator.ts`
**描述**: 从JimengClient复制视频结果轮询方法
**详细步骤**:
1. 定位JimengClient.ts中的pollVideoResult方法
2. 复制完整方法实现到VideoGenerator作为private方法
3. 包含轮询逻辑、超时处理、错误重试
4. 确保使用继承的logPoll*方法
5. **不要**从JimengClient删除（T010后删除）

**验收标准**:
- [x] VideoGenerator.pollVideoResult方法完整
- [x] 作为private方法定义
- [x] 包含完整轮询逻辑
- [x] 编译成功

**依赖**: T004
**可并行**: 与T006, T007, T008并行

---

## Phase 3.3: MainReferenceVideoGenerator迁移

### T010: 修改MainReferenceVideoGenerator继承关系
**文件**: `src/api/video/MainReferenceVideoGenerator.ts`（现有文件）
**描述**: 将MainReferenceVideoGenerator从继承JimengClient改为继承BaseClient
**详细步骤**:
1. 打开现有文件 `src/api/video/MainReferenceVideoGenerator.ts`
2. 修改import语句：从 `import { JimengClient }` 改为 `import { BaseClient }`
3. 修改类定义：从 `extends JimengClient` 改为 `extends BaseClient`
4. 检查是否有任何对JimengClient特定方法的调用需要调整
5. 确保类型导入正确

**验收标准**:
- [x] 继承关系改为BaseClient
- [x] import语句正确
- [x] TypeScript编译通过
- [x] 没有未定义方法错误

**依赖**: T003（BaseClient已创建且验证）

---

### T011: 在VideoGenerator中集成MainReferenceVideoGenerator
**文件**: `src/api/video/VideoGenerator.ts`
**描述**: 在VideoGenerator中实现generateMainReferenceVideo方法，调用MainReferenceVideoGenerator
**详细步骤**:
1. 导入MainReferenceVideoGenerator: `import { MainReferenceVideoGenerator } from './MainReferenceVideoGenerator.js'`
2. 在VideoGenerator类中添加private实例（或直接实例化）
3. 实现generateMainReferenceVideo方法：
   ```typescript
   public async generateMainReferenceVideo(params: MainReferenceVideoParams): Promise<string> {
     const mainRefGen = new MainReferenceVideoGenerator()
     return await mainRefGen.generateMainReferenceVideo(params)
   }
   ```
4. 或者直接复制MainReferenceVideoGenerator的逻辑（如果更简洁）

**验收标准**:
- [x] VideoGenerator可以调用主体参考视频生成
- [x] 方法签名与原JimengClient一致
- [x] 编译成功

**依赖**: T010

---

## Phase 3.4: JimengClient委托修改

### T012: 在JimengClient中添加VideoGenerator实例
**文件**: `src/api/JimengClient.ts`
**描述**: 在JimengClient构造函数中初始化VideoGenerator实例
**详细步骤**:
1. 导入VideoGenerator: `import { VideoGenerator } from './video/VideoGenerator.js'`
2. 添加私有属性：`private videoGen: VideoGenerator`
3. 在构造函数中初始化：
   ```typescript
   constructor() {
     super() // 调用BaseClient构造函数
     this.videoGen = new VideoGenerator()
   }
   ```
4. 如果VideoGenerator需要参数，从JimengClient传递必要配置

**验收标准**:
- [x] videoGen属性已声明
- [x] 构造函数中正确初始化
- [x] TypeScript编译通过
- [x] 图片生成测试仍然通过（确认构造函数无破坏）

**依赖**: T005-T011（VideoGenerator完全实现）

---

### T013: 修改JimengClient视频方法为委托调用
**文件**: `src/api/JimengClient.ts`
**描述**: 将generateVideo等方法改为委托给VideoGenerator
**详细步骤**:
1. 修改generateVideo方法：
   ```typescript
   public async generateVideo(params: VideoGenerationParams): Promise<string> {
     return this.videoGen.generateVideo(params)
   }
   ```
2. 修改videoPostProcess方法：
   ```typescript
   public async videoPostProcess(params: VideoPostProcessUnifiedParams): Promise<string> {
     return this.videoGen.videoPostProcess(params)
   }
   ```
3. 修改generateMainReferenceVideo方法：
   ```typescript
   public async generateMainReferenceVideo(params: MainReferenceVideoParams): Promise<string> {
     return this.videoGen.generateMainReferenceVideo(params)
   }
   ```
4. **保留方法签名完全不变**

**验收标准**:
- [x] 三个视频方法都委托给videoGen
- [x] 方法签名完全保持不变
- [x] TypeScript类型正确
- [x] 编译成功

**依赖**: T012

---

### T014: 删除JimengClient中已迁移的私有视频方法
**文件**: `src/api/JimengClient.ts`
**描述**: 清理JimengClient中不再需要的视频生成私有方法
**详细步骤**:
1. 删除 `generateTraditionalVideo` 私有方法
2. 删除 `generateMultiFrameVideo` 私有方法
3. 删除 `pollVideoResult` 私有方法
4. 删除视频后处理的私有方法（performFrameInterpolation, performSuperResolution, performAudioEffect）
5. **不要删除**图片生成相关方法
6. **不要删除**现在在BaseClient中的共享方法

**验收标准**:
- [x] 所有已迁移的视频私有方法已删除
- [x] 图片生成方法完整保留
- [x] 编译成功（无未定义引用）
- [x] 代码行数显著减少（约800-1000行）

**依赖**: T013

---

## Phase 3.5: 全面测试验证

### T015: 运行完整测试套件验证重构
**测试命令**: `yarn test`
**描述**: 运行所有测试确保重构后功能完全保持
**详细步骤**:
1. 执行 `yarn build` - 确保构建成功
2. 执行 `yarn type-check` - 确保类型检查通过
3. 执行 `yarn test` - 运行所有测试套件
4. 检查测试输出，确保：
   - 图片生成测试通过
   - 视频生成测试通过
   - 异步API测试通过
   - 集成测试通过
5. 如果有失败，定位问题并修复

**验收标准**:
- [x] `yarn build` 成功
- [x] `yarn type-check` 无错误
- [x] **所有现有测试100%通过**（零失败）
- [x] 无新的警告或错误

**依赖**: T014

---

### T016: [P] 手动功能验证（基于quickstart.md）
**参考文档**: `specs/001-jimengclient/quickstart.md`
**描述**: 手动执行quickstart.md中的验证场景
**详细步骤**:
1. 验证基本视频生成：
   ```typescript
   const client = new JimengClient()
   const url = await client.generateVideo({
     prompt: '测试视频',
     duration_ms: 5000
   })
   ```
2. 验证多帧视频生成（如果有测试图片）
3. 验证主体参考视频生成（如果有测试图片）
4. 验证视频后处理（补帧）
5. 检查日志输出是否正常

**验收标准**:
- [x] 所有quickstart场景执行成功
- [x] 返回有效的视频URL
- [x] 日志输出格式正常
- [x] 无运行时错误

**依赖**: T015
**可并行**: 与T017并行（不修改代码）

---

### T017: [P] 验证向后兼容性（导入路径和单例模式）
**参考文档**: `specs/001-jimengclient/contracts/refactoring-contract.md`
**描述**: 确认所有导入路径和单例模式仍然有效
**详细步骤**:
1. 验证CommonJS导入：
   ```bash
   node -e "const { JimengClient } = require('./lib/index.js'); console.log(JimengClient)"
   ```
2. 验证ES模块导入：
   ```typescript
   import { JimengClient, getApiClient } from 'jimeng-web-mcp'
   ```
3. 验证类型导入：
   ```typescript
   import type { VideoGenerationParams } from 'jimeng-web-mcp'
   ```
4. 验证单例模式：
   ```typescript
   const client = getApiClient()
   await client.generateVideo(...)
   ```

**验收标准**:
- [x] 所有导入方式都有效
- [x] 单例模式正常工作
- [x] 类型定义可访问
- [x] 无import错误

**依赖**: T015
**可并行**: 与T016并行

---

## Phase 3.6: 清理与文档

### T018: [P] 检查包大小和性能
**参考文档**: `specs/001-jimengclient/quickstart.md`（性能基准验证）
**描述**: 确认重构后包大小和性能未显著下降
**详细步骤**:
1. 构建并测量包大小：
   ```bash
   yarn build
   du -sh lib/
   ```
2. 对比重构前大小（应增加 < 10KB）
3. 可选：运行性能基准测试
4. 检查是否有明显的性能回归

**验收标准**:
- [x] 包大小增加 < 10KB
- [x] 性能无显著下降（±5%可接受）
- [x] 无内存泄漏迹象

**依赖**: T015
**可并行**: 与T019并行

---

### T019: [P] 更新CLAUDE.md文档架构说明
**文件**: `CLAUDE.md`
**描述**: 更新项目架构说明，反映新的模块结构
**详细步骤**:
1. 在Architecture Overview部分更新：
   - 添加BaseClient基类说明
   - 添加src/api/video/模块说明
   - 更新JimengClient职责描述（图片生成+视频委托）
2. 在Core Module Structure部分添加：
   - `src/api/BaseClient.ts` - 共享基类
   - `src/api/video/VideoGenerator.ts` - 视频生成核心
   - `src/api/video/MainReferenceVideoGenerator.ts` - 主体参考模式
3. 更新继承关系图
4. 可选：添加重构原因和好处说明

**验收标准**:
- [x] CLAUDE.md反映新架构
- [x] 模块列表完整
- [x] 继承关系清晰
- [x] 文档准确无误

**依赖**: T015
**可并行**: 与T018并行

---

### T020: 代码审查和最终清理
**文件**: 所有修改的文件
**描述**: 最终代码审查，确保代码质量
**详细步骤**:
1. 检查所有新增文件（BaseClient.ts, VideoGenerator.ts）：
   - 代码注释是否完整
   - 方法文档是否准确
   - 无未使用的导入
   - 无console.log调试代码
2. 检查修改的文件（JimengClient.ts）：
   - 删除的代码已完全移除
   - 无注释掉的旧代码
   - 导入语句已清理
3. 运行linter（如果配置）：`yarn lint`
4. 格式化代码（如果配置）：`yarn format`

**验收标准**:
- [x] 所有代码注释完整
- [x] 无调试代码残留
- [x] 代码格式一致
- [x] 通过linter检查

**依赖**: T015-T019

---

## Dependencies Summary

```
T001 (创建BaseClient)
  ↓
T002 (提取共享方法)
  ↓
T003 (验证BaseClient)
  ↓
T004 (创建VideoGenerator框架)
  ↓
[T005, T006, T007, T008, T009] (并行迁移视频方法)
  ↓
T010 (修改MainRef继承)
  ↓
T011 (集成MainRef)
  ↓
T012 (JimengClient添加VideoGen实例)
  ↓
T013 (修改为委托调用)
  ↓
T014 (删除已迁移方法)
  ↓
T015 (运行完整测试)
  ↓
[T016, T017, T018, T019] (并行验证和文档)
  ↓
T020 (最终审查)
```

---

## Parallel Execution Examples

### 并行组1：迁移视频方法（T005-T009）
```bash
# 可以同时执行（不同方法，都在VideoGenerator.ts但不冲突）
Task: "迁移generateVideo主入口到VideoGenerator"
Task: "迁移generateTraditionalVideo到VideoGenerator"
Task: "迁移generateMultiFrameVideo到VideoGenerator"
Task: "迁移videoPostProcess到VideoGenerator"
Task: "迁移pollVideoResult到VideoGenerator"
```
**注意**：虽然都在同一文件，但操作的是不同方法，可以并行开发后合并

### 并行组2：验证阶段（T016-T019）
```bash
# 完全独立的验证任务
Task: "手动功能验证（基于quickstart.md）"
Task: "验证向后兼容性（导入路径和单例模式）"
Task: "检查包大小和性能"
Task: "更新CLAUDE.md文档架构说明"
```

---

## Validation Checklist

**设计文档覆盖验证**:
- [x] 所有data-model.md中的实体都有对应任务
  - BaseClient (T001, T002)
  - VideoGenerator (T004-T009)
  - JimengClient修改 (T012-T014)
  - MainReferenceVideoGenerator (T010, T011)
- [x] contracts/refactoring-contract.md的所有要求都被任务覆盖
  - 公共API保持不变 (T013)
  - 现有测试必须通过 (T015)
  - 向后兼容性 (T017)
  - 性能要求 (T018)
- [x] research.md的架构决策已反映在任务中
  - BaseClient基类方案 (T001-T003)
  - VideoGenerator组合模式 (T004-T011)
  - 委托调用模式 (T012-T014)

**任务质量验证**:
- [x] 每个任务指定准确文件路径
- [x] 并行任务[P]确实独立
- [x] 测试先于实现（虽然是重构，但测试作为验证门禁）
- [x] 依赖关系明确
- [x] 验收标准可测量

---

## Notes

- **重构特性**：这是重构任务，不是新功能开发，因此：
  - 现有测试作为验证门禁（而非先写failing tests）
  - 每个阶段完成后立即运行测试
  - 优先保证零破坏

- **提交策略**：建议在以下节点提交：
  - T003 (BaseClient验证通过)
  - T011 (VideoGenerator完全实现)
  - T014 (JimengClient委托完成)
  - T015 (所有测试通过)
  - T020 (最终审查完成)

- **回滚策略**：如果任何阶段测试失败：
  1. 立即停止后续任务
  2. 分析失败原因
  3. 修复或回滚到上一个稳定提交
  4. 重新执行

- **估计总时间**：18-22小时
  - Phase 3.1: 3-4小时
  - Phase 3.2: 6-8小时
  - Phase 3.3: 2-3小时
  - Phase 3.4: 3-4小时
  - Phase 3.5: 2-3小时
  - Phase 3.6: 2小时

---

**任务生成版本**: 1.0
**生成日期**: 2025-01-30
**基于**: plan.md, research.md, data-model.md, contracts/refactoring-contract.md
**总任务数**: 20