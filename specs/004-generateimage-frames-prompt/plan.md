# Implementation Plan: 统一图像生成接口与多帧提示词功能

**Branch**: `004-generateimage-frames-prompt` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-generateimage-frames-prompt/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
   → Spec found at /Users/lupin/mcp-services/jimeng-mcp/specs/004-generateimage-frames-prompt/spec.md
2. Fill Technical Context ✅
   → Project Type: Single project (TypeScript MCP server)
   → Structure Decision: Modular architecture in src/api/image/
3. Fill Constitution Check section ✅
4. Evaluate Constitution Check section ✅
   → No violations detected
   → Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md ⏳
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md ⏳
7. Re-evaluate Constitution Check section ⏳
8. Plan Phase 2 → Describe task generation approach ⏳
9. STOP - Ready for /tasks command ⏳
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Primary Requirement**: 统一图像生成接口，将同步方法`generateImage`和异步方法`generateImageAsync`合并为单一方法，通过`async`参数控制模式；同时添加`frames`字符串数组参数支持多场景提示词组合。

**Technical Approach**:
1. 修改`ImageGenerator`类的`generateImage`方法签名，添加可选的`async`和`frames`参数
2. 实现提示词组合逻辑：过滤、截断、拼接
3. 根据`async`参数值调用内部同步或异步实现
4. 保持向后兼容：所有新参数均为可选，默认值保持现有行为
5. 更新类型定义`ImageGenerationParams`

## Technical Context

**Language/Version**: TypeScript 5.8.3 (ESM modules)
**Primary Dependencies**:
- @modelcontextprotocol/sdk ^1.10.2 (MCP protocol)
- axios ^1.7.7 (HTTP requests)
- zod ^3.24.1 (parameter validation)
- uuid ^11.0.3 (ID generation)

**Storage**: N/A (stateless API client)
**Testing**: Jest with TypeScript support, ESM compatibility
**Target Platform**: Node.js (MCP server runtime)
**Project Type**: Single (TypeScript package with MCP server)
**Performance Goals**:
- Prompt generation: < 1ms (纯字符串操作)
- API call latency: 2-5s (同步) / < 100ms (异步提交)

**Constraints**:
- Frames数组最大15个元素 (对齐即梦AI count上限)
- 最终prompt字符数限制 (即梦AI模型限制，约2000-3000字符)
- 100%向后兼容现有代码

**Scale/Scope**:
- 影响1个核心类 (ImageGenerator)
- 修改2个类型定义 (ImageGenerationParams, 返回类型)
- 新增3个单元测试文件
- 0个新依赖

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with constitutional principles from `.specify/memory/constitution.md`:

- [x] **Minimal Code Change**: ✅ 只修改ImageGenerator.generateImage方法，新增辅助函数
  - 不修改JimengClient
  - 不修改BaseClient
  - 新增的prompt处理逻辑封装为私有方法

- [x] **Modular Extension**: ✅ 扩展现有ImageGenerator模块
  - frames处理逻辑封装在ImageGenerator内部
  - 不引入新的外部模块
  - 遵循现有的类继承结构

- [x] **Backward Compatibility**: ✅ 100%向后兼容
  - `async`参数可选，默认false
  - `frames`参数可选，默认undefined
  - 现有调用代码无需任何修改
  - 返回类型支持联合类型 (string[] | string)

- [x] **Test-Driven Development**: ✅ TDD流程
  - Phase 1创建失败的测试
  - Phase 4实现使测试通过
  - 测试覆盖所有边界情况

- [x] **API Contract Stability**: ✅ 保持稳定
  - ImageGenerationParams接口扩展（新增可选字段）
  - 不改变即梦AI调用方式
  - MCP tool定义更新（添加新参数）

**Violations**: None

**Mitigation**: N/A (无违规)

## Project Structure

### Documentation (this feature)
```
specs/004-generateimage-frames-prompt/
├── spec.md              # Feature specification ✅
├── plan.md              # This file (执行中)
├── research.md          # Phase 0 output (待生成)
├── data-model.md        # Phase 1 output (待生成)
├── quickstart.md        # Phase 1 output (待生成)
├── contracts/           # Phase 1 output (待生成)
│   └── ImageGenerator.interface.ts
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
src/
├── api/
│   ├── image/
│   │   ├── ImageGenerator.ts    # [MODIFY] 主要修改点
│   │   └── index.ts              # [NO CHANGE]
│   ├── JimengClient.ts           # [NO CHANGE] 保持委托
│   └── BaseClient.ts             # [NO CHANGE]
├── types/
│   ├── api.types.ts              # [MODIFY] 扩展ImageGenerationParams
│   └── models.ts                 # [NO CHANGE]
├── server.ts                     # [MODIFY] 更新MCP tool定义
└── utils/                        # [NO CHANGE]

tests/
├── unit/
│   ├── image-generator-frames.test.ts      # [NEW] frames逻辑测试
│   ├── image-generator-async-unified.test.ts # [NEW] 统一接口测试
│   └── prompt-builder.test.ts              # [NEW] prompt构建测试
├── integration/
│   └── backward-compatibility.test.ts      # [MODIFY] 添加兼容性验证
└── __tests__/
    └── image-generation.test.ts            # [MODIFY] 更新现有测试
```

**Structure Decision**: 单项目结构（TypeScript MCP服务器）。所有修改集中在`src/api/image/ImageGenerator.ts`，遵循现有的模块化架构。测试按照现有分类组织（unit/integration）。

## Phase 0: Outline & Research

### Research Tasks

#### R1: Prompt字符数限制研究
**Task**: 确定即梦AI的prompt最大字符数限制
**Rationale**: 需要验证frames拼接后是否会超出限制
**Method**:
- 查看现有代码中的prompt长度
- 测试不同长度的prompt
- 文档化最大限制值

**Expected Outcome**: 确定安全的prompt长度上限（估计2000-3000字符）

#### R2: TypeScript联合类型最佳实践
**Task**: 研究方法返回值的类型推断最佳实践
**Context**: `generateImage`需要根据`async`参数返回不同类型
**Options**:
- 方案A: 联合类型 `Promise<string[] | string>`
- 方案B: 函数重载
- 方案C: 泛型类型参数

**Expected Outcome**: 选择最符合TypeScript最佳实践的类型设计

#### R3: 现有测试模式分析
**Task**: 分析现有ImageGenerator测试的结构和模式
**Method**: 阅读 `tests/__tests__/image-generation.test.ts`
**Expected Outcome**: 了解mock模式、测试数据结构，确保新测试风格一致

### Research Output

生成`research.md`文档，包含：
1. 即梦AI prompt限制 (决策 + 依据)
2. TypeScript类型设计选择 (决策 + 对比)
3. 测试模式总结 (示例代码)
4. 向后兼容验证策略

**Output**: research.md with all decisions documented

## Phase 1: Design & Contracts

### 1. Data Model (`data-model.md`)

**Entities to Document**:

#### ImageGenerationParams (扩展)
```typescript
interface ImageGenerationParams {
  // 现有字段
  prompt: string;
  count?: number;
  model?: string;
  aspectRatio?: string;
  filePath?: string[];
  // ... 其他现有字段

  // 新增字段
  async?: boolean;        // 默认false，控制同步/异步模式
  frames?: string[];      // 可选，最多15个元素
}
```

**Validation Rules**:
- `frames`:
  - 元素类型: string
  - 长度限制: ≤15
  - 过滤规则: 移除null/undefined/空字符串
- `async`:
  - 类型: boolean | undefined
  - 默认值: false

**State Transitions**: N/A (无状态变化)

### 2. API Contracts (`contracts/`)

#### Contract: ImageGenerator.generateImage

**File**: `contracts/ImageGenerator.interface.ts`

```typescript
interface IImageGenerator {
  /**
   * 统一图像生成方法
   * @param params 生成参数
   * @returns 同步模式返回图片URL数组，异步模式返回historyId
   */
  generateImage(params: ImageGenerationParams): Promise<string[] | string>;

  // 保留现有方法用于内部实现
  generateImageAsync(params: ImageGenerationParams): Promise<string>;
  getImageResult(historyId: string): Promise<QueryResultResponse>;
  getBatchResults(historyIds: string[]): Promise<{ [id: string]: QueryResultResponse }>;
}
```

**Request Schema**:
- Input: ImageGenerationParams (扩展版)
- Validation: Zod schema in server.ts

**Response Schema**:
- 同步模式: `string[]` - 图片URL数组
- 异步模式: `string` - historyId

### 3. Contract Tests (Failing)

创建3个测试文件，所有测试初始状态为失败：

#### `tests/unit/prompt-builder.test.ts`
```typescript
describe('Prompt Builder Logic', () => {
  it('should combine prompt and frames correctly');
  it('should truncate frames array to 15 elements');
  it('should filter null/empty strings from frames');
  it('should add count suffix when frames provided');
  it('should use original prompt when frames empty');
});
```

#### `tests/unit/image-generator-async-unified.test.ts`
```typescript
describe('Unified generateImage Method', () => {
  it('should return string[] when async=false');
  it('should return string when async=true');
  it('should default to sync mode when async undefined');
  it('should preserve backward compatibility');
});
```

#### `tests/unit/image-generator-frames.test.ts`
```typescript
describe('Frames Parameter Handling', () => {
  it('should handle 15 frames correctly');
  it('should truncate >15 frames with warning');
  it('should handle empty frames array');
  it('should combine with count parameter');
});
```

### 4. Integration Test Scenarios

从spec.md的验收场景提取：

#### `tests/integration/backward-compatibility.test.ts` (扩展)
```typescript
describe('Feature 004: Unified Image Generation', () => {
  it('Scenario 1: Sync mode preserves existing behavior');
  it('Scenario 2: Async mode preserves existing behavior');
  it('Scenario 3: Frames array generates multi-scene images');
  it('Scenario 4: Empty frames falls back to standard');
  it('Scenario 5: Frames combines with count');
});
```

### 5. Quickstart Validation

**File**: `quickstart.md`

```markdown
# Quickstart: 统一图像生成接口

## 测试场景1: 向后兼容验证
```typescript
// 现有代码无需修改
const images = await imageGen.generateImage({
  prompt: "一只猫"
});
// 预期: 返回string[]
```

## 测试场景2: 异步模式
```typescript
const historyId = await imageGen.generateImage({
  prompt: "一只猫",
  async: true
});
// 预期: 返回string (historyId)
```

## 测试场景3: 多帧生成
```typescript
const images = await imageGen.generateImage({
  prompt: "科幻电影分镜",
  frames: ["实验室", "时空隧道", "外星球"],
  count: 3
});
// 预期: 使用组合prompt生成3张图
```
```

### 6. Agent Context Update

执行脚本更新CLAUDE.md：

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**更新内容**:
- 新增参数: `async`, `frames`
- 新增方法签名更新
- 保持文档在150行内

**Output**:
- data-model.md ✅
- contracts/ImageGenerator.interface.ts ✅
- 3个failing test files ✅
- quickstart.md ✅
- CLAUDE.md updated ✅

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **从Phase 1设计文档生成任务**:
   - 读取data-model.md → 类型定义任务
   - 读取contracts/ → 接口更新任务
   - 读取测试文件 → TDD任务序列

2. **任务分类**:
   - **[P] Parallel**: 可并行的独立任务
     - 单元测试编写（3个测试文件独立）
     - 类型定义更新（api.types.ts）
   - **[S] Sequential**: 必须顺序执行
     - 先写测试，再实现
     - 先实现核心逻辑，再集成

3. **任务顺序** (TDD):
   ```
   T001: [P] 扩展ImageGenerationParams类型定义
   T002: [P] 创建prompt-builder.test.ts (failing)
   T003: [P] 创建image-generator-async-unified.test.ts (failing)
   T004: [P] 创建image-generator-frames.test.ts (failing)
   T005: [S] 实现buildPromptWithFrames私有方法
   T006: [S] 实现validateAndFilterFrames私有方法
   T007: [S] 重构generateImage方法（添加async分支）
   T008: [S] 运行测试验证实现
   T009: [P] 更新server.ts的MCP tool定义
   T010: [P] 更新backward-compatibility.test.ts
   T011: [S] 集成测试验证
   T012: [S] 文档更新（CLAUDE.md, README示例）
   ```

4. **每个任务包含**:
   - 任务编号和描述
   - 输入（依赖的文件/任务）
   - 输出（生成的文件/变更）
   - 验收标准
   - 并行标记 [P] 或顺序标记 [S]

**Estimated Output**: 12个详细任务，6个可并行

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation
- 运行所有测试 `yarn test`
- 验证向后兼容性
- 执行quickstart.md验证
- 类型检查 `yarn type-check`
- 构建验证 `yarn build`

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None      | N/A        | N/A                                 |

**Summary**: 本实现方案完全符合所有宪法原则，无违规项。

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved (spec已明确)
- [x] Complexity deviations documented (无偏差)

**Artifacts Generated**:
- [x] research.md - 技术选型和最佳实践研究
- [x] data-model.md - 数据模型和接口扩展设计
- [x] contracts/ImageGenerator.interface.ts - TypeScript合约定义
- [x] quickstart.md - 5个验收场景，16个子测试
- [x] CLAUDE.md - Agent context已更新

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
