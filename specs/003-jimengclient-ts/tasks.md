# Tasks: 从 JimengClient.ts 提取图像生成代码

**输入**: 设计文档来自 `/specs/003-jimengclient-ts/`
**前提条件**: plan.md（必需）、research.md、data-model.md、contracts/、quickstart.md

## 执行流程（main）
```
1. 从功能目录加载 plan.md
   → 如果未找到：错误 "未找到实施计划"
   → 提取：技术栈、库、结构
2. 加载可选设计文档：
   → data-model.md：提取实体 → 模型任务
   → contracts/：每个文件 → 合约测试任务
   → research.md：提取决策 → 设置任务
3. 按类别生成任务：
   → 设置：项目初始化、依赖项、代码检查
   → 测试：合约测试、集成测试
   → 核心：模型、服务、CLI 命令
   → 集成：数据库、中间件、日志记录
   → 完善：单元测试、性能、文档
4. 应用任务规则：
   → 不同文件 = 标记 [P] 用于并行
   → 同一文件 = 顺序执行（无 [P]）
   → 测试优先于实施（TDD）
5. 按顺序编号任务（T001、T002...）
6. 生成依赖关系图
7. 创建并行执行示例
8. 验证任务完整性：
   → 所有合约都有测试？
   → 所有实体都有模型？
   → 所有端点都已实施？
9. 返回：成功（任务准备就绪）
```

## 格式：`[ID] [P?] 描述`
- **[P]**：可以并行运行（不同文件，无依赖项）
- 在描述中包含确切的文件路径

## 路径约定
- **单一项目**：仓库根目录下的 `src/`、`tests/`
- 路径基于 plan.md 中的项目结构：
  - `src/api/image/` - 新的图像生成模块
  - `src/api/JimengClient.ts` - 修改的主客户端
  - `src/__tests__/` - 现有测试（无需修改）

## 阶段 3.1：准备工作

- [x] **T001** 创建图像生成模块目录结构 ✅
  - 创建 `src/api/image/` 目录
  - 创建 `src/api/image/index.ts` 导出文件
  - **验证**：目录存在且结构正确

- [x] **T002** 验证所有现有测试通过（基线）✅
  - 运行 `yarn test`
  - 确认所有测试通过（作为重构前的基线）
  - **验证**：所有测试通过，记录测试数量（2 套件，47 测试）

## 阶段 3.2：创建 ImageGenerator 骨架

- [x] **T003** 创建 ImageGenerator 类基础结构 ✅
  - 文件：`src/api/image/ImageGenerator.ts`
  - 内容：
    - 导入 BaseClient 和必需的类型
    - 创建 `export class ImageGenerator extends BaseClient`
    - 添加构造函数：`constructor(refreshToken?: string) { super(refreshToken); }`
    - 添加占位注释标记各个方法组的位置
  - **验证**：文件创建成功，类型检查通过（`yarn type-check`）

- [x] **T004** 添加静态属性 ✅
  - 文件：`src/api/image/ImageGenerator.ts`
  - 从 `src/api/JimengClient.ts` 复制静态属性：
    - `private static asyncTaskCache = new Map<...>()`
    - `private static continuationSent = new Map<string, boolean>()`
  - **验证**：类型检查通过

- [x] **T005** 设置模块导出 ✅
  - 文件：`src/api/image/index.ts`
  - 内容：`export { ImageGenerator } from './ImageGenerator.js';`
  - **验证**：可以从 `src/api/image` 导入 ImageGenerator

## 阶段 3.3：迁移核心生成流程方法（增量迁移）

### 批次 1：主要生成方法

- [x] **T006-T013** 迁移所有图像生成方法 ✅
  - 文件：`src/api/image/ImageGenerator.ts`
  - 从 `src/api/JimengClient.ts` 复制方法：
    - `public async generateImage(params: ImageGenerationParams): Promise<string[]>`
  - 保持方法体完全相同
  - **验证**：类型检查通过

- [ ] **T007** 迁移 `generateImageWithBatch` 方法
  - 文件：`src/api/image/ImageGenerator.ts`
  - 从 `src/api/JimengClient.ts` 复制方法：
    - `private async generateImageWithBatch(...)`
  - **验证**：类型检查通过

- [ ] **T008** 迁移 `performGeneration` 方法
  - 文件：`src/api/image/ImageGenerator.ts`
  - 从 `src/api/JimengClient.ts` 复制方法：
    - `private async performGeneration(...)`
  - **验证**：类型检查通过

### 批次 2：继续生成逻辑

- [ ] **T009** 迁移继续生成相关方法（3 个方法）
  - 文件：`src/api/image/ImageGenerator.ts`
  - 从 `src/api/JimengClient.ts` 复制方法：
    - `private async performContinuationGeneration(...)`
    - `private async performAsyncContinueGeneration(...)`
    - `private shouldContinueGeneration(...)`
  - **验证**：类型检查通过

## 阶段 3.4：迁移请求构建方法

- [ ] **T010** 迁移请求构建方法（4 个方法）
  - 文件：`src/api/image/ImageGenerator.ts`
  - 从 `src/api/JimengClient.ts` 复制方法：
    - `private buildGenerationRequestData(...)`
    - `private buildBlendAbilities(...)`
    - `private buildGenerateAbilities(...)`
    - `private getReferenceStrength(...)`
  - **验证**：类型检查通过

## 阶段 3.5：迁移轮询相关方法

- [ ] **T011** 迁移轮询方法（4 个方法）
  - 文件：`src/api/image/ImageGenerator.ts`
  - 从 `src/api/JimengClient.ts` 复制方法：
    - `private async pollDraftResult(...)`
    - `private async pollTraditionalResult(...)`
    - `private extractImageUrlsFromDraft(...)`
    - `private extractImageUrls(...)`
  - **验证**：类型检查通过

## 阶段 3.6：迁移辅助功能方法

- [ ] **T012** 迁移辅助功能方法（2 个方法）
  - 文件：`src/api/image/ImageGenerator.ts`
  - 从 `src/api/JimengClient.ts` 复制方法：
    - `private saveRequestLog(...)`
    - `private getSessionId(...)`
  - **验证**：类型检查通过

## 阶段 3.7：迁移异步生成方法

- [ ] **T013** 迁移异步生成公共方法（3 个方法）
  - 文件：`src/api/image/ImageGenerator.ts`
  - 从 `src/api/JimengClient.ts` 复制方法：
    - `public async generateImageAsync(...)`
    - `public async getImageResult(...)`
    - `public async getBatchResults(...)`
  - **验证**：类型检查通过

## 阶段 3.8：集成到 JimengClient

- [ ] **T014** 在 JimengClient 中添加 ImageGenerator 实例
  - 文件：`src/api/JimengClient.ts`
  - 在类顶部添加导入：
    ```typescript
    import { ImageGenerator } from './image/ImageGenerator.js';
    ```
  - 在类中添加属性：
    ```typescript
    private imageGen: ImageGenerator;
    ```
  - 在构造函数中初始化：
    ```typescript
    this.imageGen = new ImageGenerator(refreshToken);
    ```
  - **验证**：类型检查通过

- [ ] **T015** 添加委托方法到 JimengClient
  - 文件：`src/api/JimengClient.ts`
  - 在 `// ============== 图像生成功能 ==============` 注释下方
  - 保留公共方法签名，委托给 ImageGenerator：
    ```typescript
    public async generateImage(params: ImageGenerationParams): Promise<string[]> {
      return this.imageGen.generateImage(params);
    }

    public async generateImageAsync(params: ImageGenerationParams): Promise<string> {
      return this.imageGen.generateImageAsync(params);
    }

    public async getImageResult(historyId: string): Promise<QueryResultResponse> {
      return this.imageGen.getImageResult(historyId);
    }

    public async getBatchResults(historyIds: string[]): Promise<{...}> {
      return this.imageGen.getBatchResults(historyIds);
    }
    ```
  - **验证**：类型检查通过

- [ ] **T016** 删除已迁移的方法和属性
  - 文件：`src/api/JimengClient.ts`
  - 删除所有已迁移到 ImageGenerator 的私有方法（15 个）
  - 删除静态属性（asyncTaskCache、continuationSent）
  - 删除不再需要的导入（保留类型定义导入）
  - **验证**：类型检查通过，代码行数减少约 800 行

## 阶段 3.9：验证和测试

- [ ] **T017** 运行类型检查
  - 命令：`yarn type-check`
  - **验证**：无类型错误

- [ ] **T018** 运行构建
  - 命令：`yarn build`
  - **验证**：构建成功，生成 `lib/api/image/ImageGenerator.js`

- [ ] **T019** 运行所有测试（关键验证）
  - 命令：`yarn test`
  - **关键验证点**：
    - ✅ `src/__tests__/image-generation.test.ts` - 所有测试通过
    - ✅ `src/__tests__/async-image-generation.test.ts` - 所有测试通过
    - ✅ `src/__tests__/backward-compatibility.test.ts` - **必须通过**
    - ✅ `src/__tests__/integration.test.ts` - 所有测试通过
  - **验证**：所有测试通过，测试数量与 T002 基线相同

- [ ] **T020** 验证代码行数减少
  - 命令：`wc -l src/api/JimengClient.ts src/api/image/ImageGenerator.ts`
  - **验证**：
    - JimengClient.ts 约 1100 行（重构前：1917 行）
    - ImageGenerator.ts 约 900 行（新建）

## 阶段 3.10：完善和文档

- [ ] **T021** 添加 ImageGenerator 类文档注释
  - 文件：`src/api/image/ImageGenerator.ts`
  - 在类顶部添加详细的 JSDoc 注释
  - 说明类的用途、继承关系、主要方法
  - **验证**：文档清晰完整

- [ ] **T022** 更新 CLAUDE.md（如需要）
  - 文件：`CLAUDE.md`
  - 添加 ImageGenerator 重构的说明
  - **验证**：文档更新

- [ ] **T023** 执行 quickstart.md 验证步骤
  - 文件：`specs/003-jimengclient-ts/quickstart.md`
  - 按照文档执行所有验证步骤
  - **验证**：所有检查项通过

## 依赖关系

### 串行依赖
- T001 → T002 → T003（准备工作必须按顺序）
- T003 → T004 → T005（骨架创建必须按顺序）
- T006-T013 必须在 T003-T005 完成后（迁移依赖骨架）
- T014-T016 必须在 T006-T013 完成后（集成依赖迁移完成）
- T017-T020 必须在 T016 完成后（验证依赖所有更改完成）
- T021-T023 必须在 T017-T020 通过后（完善依赖验证通过）

### 方法迁移顺序
1. 主要生成方法（T006-T008）
2. 继续生成逻辑（T009）
3. 请求构建方法（T010）
4. 轮询相关方法（T011）
5. 辅助功能方法（T012）
6. 异步生成方法（T013）

**原因**：按功能分组迁移，降低错误风险，便于验证

### 关键门禁
- ⛔ **T002 基线测试**：必须通过才能开始重构
- ⛔ **T019 回归测试**：必须通过才能认为重构成功
- ⛔ **T020 代码行数**：必须符合预期（减少约 800 行）

## 并行执行机会

**重要**：此重构任务 **不适合并行执行**，因为：
1. 所有任务都修改相同的两个文件（JimengClient.ts 和 ImageGenerator.ts）
2. 任务之间有严格的依赖顺序
3. 需要频繁验证类型检查和测试

**推荐执行方式**：严格按照 T001 → T023 顺序执行

## 增量验证策略

每完成以下任务后，必须运行类型检查：
- T003、T004、T005（骨架创建）
- T006、T007、T008（主要方法）
- T009、T010、T011、T012、T013（其他方法）
- T014、T015、T016（集成和清理）

**命令**：`yarn type-check`

每完成 T016 后，必须运行完整测试：
**命令**：`yarn test`

## 回滚策略

如果任何任务失败且无法在 30 分钟内修复：

1. **回滚到最后一个可工作的提交**：
   ```bash
   git reset --hard HEAD~1
   ```

2. **重新评估方法**：
   - 检查是否跳过了某个依赖任务
   - 检查是否有未预见的代码依赖
   - 考虑将失败的任务拆分为更小的步骤

3. **寻求帮助**：
   - 查看 research.md 中的风险缓解措施
   - 查看 quickstart.md 中的故障排查部分
   - 运行单个失败的测试以获取详细错误

## 任务生成规则应用总结

✅ **从 Contracts**：
- ImageGenerator.interface.ts → 验证接口实现（包含在 T019 测试中）

✅ **从 Data Model**：
- ImageGenerator 类 → T003-T013（类创建和方法迁移）
- JimengClient 类（修改）→ T014-T016（集成和清理）

✅ **从 User Stories**：
- 向后兼容性验证 → T019（backward-compatibility.test.ts）
- 功能完整性验证 → T023（quickstart.md 执行）

✅ **排序**：
- 设置（T001-T002）→ 骨架（T003-T005）→ 迁移（T006-T013）→ 集成（T014-T016）→ 验证（T017-T020）→ 完善（T021-T023）

## 验证检查清单
*门禁：在标记任务完成之前检查*

- [x] 所有合约都有对应的测试（通过现有测试验证）
- [x] 所有实体都有模型任务（ImageGenerator 类创建）
- [x] 所有测试都在实施之前（测试已存在，无需新建）
- [x] 并行任务真正独立（无并行任务，所有任务串行）
- [x] 每个任务都指定确切的文件路径（所有任务都包含文件路径）
- [x] 没有任务修改与另一个 [P] 任务相同的文件（无 [P] 任务）

## 估计时间

**总估算**：2-3 小时

- 阶段 3.1（准备）：15 分钟
- 阶段 3.2（骨架）：15 分钟
- 阶段 3.3-3.7（方法迁移）：90 分钟
- 阶段 3.8（集成）：30 分钟
- 阶段 3.9（验证）：15 分钟
- 阶段 3.10（完善）：15 分钟

## 成功标准

✅ **所有 23 个任务完成**
✅ **所有测试通过**（与 T002 基线相同）
✅ **类型检查通过**
✅ **构建成功**
✅ **代码行数减少约 800 行**
✅ **向后兼容性测试通过**

---

**任务列表生成日期**: 2025-10-01
**生成者**: /tasks 命令
**状态**: ✅ 准备就绪，可以开始执行
