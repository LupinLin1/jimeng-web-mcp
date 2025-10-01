# Tasks: 统一图像生成接口与多帧提示词功能

**Input**: Design documents from `/specs/004-generateimage-frames-prompt/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript 5.8.3, Jest, ESM modules
   → Structure: Single project, src/api/image/ImageGenerator.ts
2. Load optional design documents ✅
   → data-model.md: ImageGenerationParams扩展
   → contracts/: ImageGenerator.interface.ts
   → research.md: 函数重载方案
3. Generate tasks by category ✅
   → Setup: 类型定义扩展
   → Tests: 3个单元测试文件 (TDD)
   → Core: ImageGenerator方法实现
   → Integration: MCP server集成
   → Polish: 文档和向后兼容验证
4. Apply task rules ✅
   → 测试文件可并行 [P]
   → ImageGenerator实现顺序执行
5. Number tasks sequentially (T001-T015) ✅
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness ✅
   → Contract有对应测试 ✅
   → 所有边界情况覆盖 ✅
9. Return: SUCCESS (15个任务就绪)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Single project**: `src/api/image/`, `src/types/`, `tests/unit/`, `tests/integration/`

---

## Phase 3.1: Setup (类型定义准备)

- [X] **T001** [P] Extend ImageGenerationParams in `src/types/api.types.ts`
  - **Input**: data-model.md schema
  - **Output**:
    - 添加 `async?: boolean` 字段
    - 添加 `frames?: string[]` 字段
    - 添加JSDoc注释说明新字段用途
  - **Acceptance**:
    - TypeScript编译通过
    - 新字段为可选类型
    - 与现有字段兼容
  - **Dependencies**: None
  - **Estimated**: 5 min

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: 这些测试必须先编写并确认失败，然后才能实现代码

### Unit Tests (Parallel Execution)

- [X] **T002** [P] Create prompt builder unit tests in `tests/unit/prompt-builder.test.ts`
  - **Input**: contracts/ImageGenerator.interface.ts → IPromptBuilder
  - **Output**: 6个测试用例（all failing initially）
    ```typescript
    describe('Prompt Builder Logic', () => {
      it('should combine prompt and frames correctly')
      it('should truncate frames array to 15 elements')
      it('should filter null/empty strings from frames')
      it('should add count suffix when frames provided')
      it('should use original prompt when frames empty')
      it('should handle frames with prompt combination')
    })
    ```
  - **Acceptance**:
    - 所有6个测试编写完成
    - 运行 `yarn test` 全部失败（红色）
    - 每个测试有清晰的expect断言
  - **Dependencies**: T001 (需要类型定义)
  - **Estimated**: 15 min

- [X] **T003** [P] Create async mode unit tests in `tests/unit/image-generator-async-unified.test.ts`
  - **Input**: contracts/ImageGenerator.interface.ts → IImageGeneratorUnified
  - **Output**: 5个测试用例（all failing initially）
    ```typescript
    describe('Unified generateImage Method', () => {
      it('should return string[] when async=false')
      it('should return string when async=true')
      it('should default to sync mode when async undefined')
      it('should preserve backward compatibility')
      it('should infer correct TypeScript type')
    })
    ```
  - **Acceptance**:
    - 所有5个测试编写完成
    - Mock axios请求
    - 运行测试全部失败
  - **Dependencies**: T001
  - **Estimated**: 15 min

- [X] **T004** [P] Create frames handling unit tests in `tests/unit/image-generator-frames.test.ts`
  - **Input**: contracts/ImageGenerator.interface.ts → IFramesValidator
  - **Output**: 6个测试用例（all failing initially）
    ```typescript
    describe('Frames Parameter Handling', () => {
      it('should handle 15 frames correctly')
      it('should truncate >15 frames with warning')
      it('should handle empty frames array')
      it('should combine frames with count parameter')
      it('should filter invalid frames values')
      it('should log warning on truncation')
    })
    ```
  - **Acceptance**:
    - 所有6个测试编写完成
    - 测试日志输出验证
    - 运行测试全部失败
  - **Dependencies**: T001
  - **Estimated**: 15 min

### Integration Tests

- [X] **T005** Add integration tests to `tests/integration/backward-compatibility.test.ts`
  - **Input**: quickstart.md → Scenario 1-5
  - **Output**: 5个场景测试（extending existing file）
    ```typescript
    describe('Feature 004: Unified Image Generation', () => {
      it('Scenario 1: Sync mode preserves existing behavior')
      it('Scenario 2: Async mode returns historyId')
      it('Scenario 3: Frames array generates multi-scene')
      it('Scenario 4: Empty frames falls back')
      it('Scenario 5: Frames combines with count')
    })
    ```
  - **Acceptance**:
    - 5个场景全部测试
    - Mock完整API响应
    - 运行测试全部失败
  - **Dependencies**: T001
  - **Estimated**: 20 min

**Checkpoint**: 运行 `yarn test`，确认所有新测试失败（红色） ✅

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Private Helper Methods

- [X] **T006** Implement `validateAndFilterFrames` in `src/api/image/ImageGenerator.ts`
  - **Input**: contracts/ImageGenerator.interface.ts → IFramesValidator
  - **Output**: 私有方法实现
    ```typescript
    private validateAndFilterFrames(frames?: string[]): string[] {
      // 1. 类型检查
      // 2. 过滤null/undefined/空字符串
      // 3. Trim空白字符
      // 4. 长度限制（最多15个）
      // 5. 截断时记录警告
    }
    ```
  - **Acceptance**:
    - T004的6个测试中至少3个通过
    - 警告日志正确输出
  - **Dependencies**: T004 (测试必须先存在)
  - **Estimated**: 10 min

- [X] **T007** Implement `buildPromptWithFrames` in `src/api/image/ImageGenerator.ts`
  - **Input**: contracts/ImageGenerator.interface.ts → IPromptBuilder
  - **Output**: 私有方法实现
    ```typescript
    private buildPromptWithFrames(
      basePrompt: string,
      frames: string[],
      count: number
    ): string {
      // 1. frames为空 → 返回原prompt
      // 2. frames非空 → 拼接 `${basePrompt} ${frames.join(' ')}，一共${count}张图`
    }
    ```
  - **Acceptance**:
    - T002的所有6个测试通过（绿色）
    - Prompt格式正确
  - **Dependencies**: T002, T006
  - **Estimated**: 10 min

### Main Method Refactoring

- [X] **T008** Add function overloads for `generateImage` in `src/api/image/ImageGenerator.ts`
  - **Input**: research.md → TypeScript函数重载方案
  - **Output**: 3个函数签名声明
    ```typescript
    // 在类定义中添加重载
    public generateImage(params: ImageGenerationParams & { async: true }): Promise<string>;
    public generateImage(params: ImageGenerationParams & { async?: false }): Promise<string[]>;
    public generateImage(params: ImageGenerationParams): Promise<string[] | string>;
    ```
  - **Acceptance**:
    - TypeScript编译通过
    - IDE类型推断正确
    - 无类型错误
  - **Dependencies**: T001
  - **Estimated**: 5 min

- [X] **T009** Refactor `generateImage` implementation logic in `src/api/image/ImageGenerator.ts`
  - **Input**: T006, T007的辅助方法
  - **Output**: 重构后的方法实现
    ```typescript
    public generateImage(params: ImageGenerationParams): Promise<string[] | string> {
      // 1. 处理frames参数
      const validFrames = this.validateAndFilterFrames(params.frames);

      // 2. 构建最终prompt
      const count = params.count || 1;
      const finalPrompt = this.buildPromptWithFrames(params.prompt, validFrames, count);

      // 3. 更新params
      const processedParams = { ...params, prompt: finalPrompt };

      // 4. 根据async参数分支
      if (params.async) {
        return this.generateImageAsyncInternal(processedParams);
      } else {
        return this.generateImageWithBatch(processedParams);
      }
    }
    ```
  - **Acceptance**:
    - T003的所有5个测试通过
    - T004的所有6个测试通过
    - T005的所有5个集成测试通过
  - **Dependencies**: T003, T004, T005, T006, T007, T008
  - **Estimated**: 15 min

**Checkpoint**: 运行 `yarn test`，确认所有新测试通过（绿色） ✅

---

## Phase 3.4: Integration (MCP Server)

- [X] **T010** [P] Update MCP tool definition in `src/server.ts`
  - **Input**: data-model.md → ImageGenerationParams扩展
  - **Output**: 更新Zod schema
    ```typescript
    const generateImageSchema = z.object({
      // ... existing fields
      async: z.boolean().optional().describe("异步模式..."),
      frames: z.array(z.string()).max(15).optional().describe("多帧场景描述...")
    });
    ```
  - **Acceptance**:
    - Zod验证通过
    - MCP工具注册成功
    - 参数文档完整
  - **Dependencies**: T001, T009
  - **Estimated**: 10 min

- [X] **T011** Update JimengClient delegation (if needed) in `src/api/JimengClient.ts`
  - **Input**: 检查委托方法是否需要更新
  - **Output**:
    - 如果ImageGenerator签名改变，更新委托
    - 否则无需修改（保持向后兼容）
  - **Acceptance**:
    - JimengClient.generateImage类型正确
    - 委托正常工作
  - **Dependencies**: T009
  - **Estimated**: 5 min

---

## Phase 3.5: Polish & Validation

- [X] **T012** [P] Run full test suite and fix any issues
  - **Input**: 所有测试文件
  - **Action**:
    ```bash
    yarn test
    yarn test:coverage
    ```
  - **Acceptance**:
    - 所有47+16=63个测试通过
    - 新增代码覆盖率>80%
    - 无警告或错误
  - **Dependencies**: T009, T010
  - **Estimated**: 10 min

- [X] **T013** [P] Run type check and build
  - **Action**:
    ```bash
    yarn type-check
    yarn build
    ```
  - **Acceptance**:
    - 无TypeScript错误
    - 构建成功生成lib/
    - DTS文件正确
  - **Dependencies**: T009, T010
  - **Estimated**: 5 min

- [X] **T014** [P] Validate quickstart scenarios manually
  - **Input**: quickstart.md
  - **Action**:
    - 手动运行5个场景的示例代码
    - 验证每个场景的预期结果
  - **Acceptance**:
    - 16个子测试全部通过
    - 实际API调用成功
    - 无运行时错误
  - **Dependencies**: T013
  - **Estimated**: 20 min

- [X] **T015** [P] Update documentation
  - **Files to update**:
    - `CLAUDE.md`: 已更新 ✅
    - `README.md`: 添加frames参数示例
    - `src/api/image/ImageGenerator.ts`: JSDoc注释完善
  - **Acceptance**:
    - 文档清晰易懂
    - 包含frames使用示例
    - 说明async参数行为
  - **Dependencies**: T014
  - **Estimated**: 15 min

---

## Dependencies Graph

```
Phase 3.1: Setup
  T001 (类型定义) → [T002, T003, T004, T005, T008]

Phase 3.2: Tests (Parallel)
  T002 (prompt-builder tests) ──┐
  T003 (async-unified tests) ───┼→ T009 (Implementation)
  T004 (frames tests) ──────────┤
  T005 (integration tests) ─────┘

Phase 3.3: Implementation (Sequential)
  T006 (validateAndFilterFrames) → T007, T009
  T007 (buildPromptWithFrames) → T009
  T008 (function overloads) → T009
  T009 (generateImage refactor) → [T010, T011, T012]

Phase 3.4: Integration
  T010 (MCP server) ──┐
  T011 (JimengClient) ─┼→ T012

Phase 3.5: Polish (Parallel)
  T012 (tests) ──┐
  T013 (build) ──┼→ T014 → T015
```

---

## Parallel Execution Examples

### Example 1: Launch all unit tests together (T002-T004)

```bash
# In separate terminals or parallel Task agents:

# Terminal 1
Task: "Create prompt builder unit tests in tests/unit/prompt-builder.test.ts"

# Terminal 2
Task: "Create async mode unit tests in tests/unit/image-generator-async-unified.test.ts"

# Terminal 3
Task: "Create frames handling unit tests in tests/unit/image-generator-frames.test.ts"
```

### Example 2: Polish phase parallel tasks (T012-T013)

```bash
# Terminal 1
yarn test && yarn test:coverage

# Terminal 2
yarn type-check && yarn build
```

---

## Task Execution Checklist

### Pre-Implementation
- [x] Constitution principles verified
- [x] Design documents complete
- [x] Test scenarios defined

### Implementation
- [ ] Phase 3.1: Setup (1 task)
- [ ] Phase 3.2: Tests (4 tasks, 3 parallel)
- [ ] Phase 3.3: Core (4 tasks, sequential)
- [ ] Phase 3.4: Integration (2 tasks, 1 parallel)
- [ ] Phase 3.5: Polish (4 tasks, 3 parallel)

### Post-Implementation
- [ ] All tests passing (63 total)
- [ ] Type check passing
- [ ] Build successful
- [ ] Quickstart validated
- [ ] Documentation updated

---

## Notes

### Parallel Tasks Summary
- **Phase 3.1**: 1个独立任务
- **Phase 3.2**: 3个测试文件可并行 (T002, T003, T004)
- **Phase 3.3**: 顺序执行（共享ImageGenerator.ts文件）
- **Phase 3.4**: T010可并行
- **Phase 3.5**: 3个任务可并行 (T012, T013, T015)

**Total**: 15 tasks, 8 parallel, 7 sequential

### TDD Workflow
1. **Red Phase**: T002-T005 编写失败的测试
2. **Green Phase**: T006-T009 实现使测试通过
3. **Refactor Phase**: T010-T015 优化和文档

### Commit Strategy
- 每个Phase完成后commit
- Commit message格式:
  - Phase 3.1: `feat: extend ImageGenerationParams with async and frames`
  - Phase 3.2: `test: add unit and integration tests for feature 004`
  - Phase 3.3: `feat: implement unified generateImage with frames support`
  - Phase 3.4: `feat: integrate unified API to MCP server`
  - Phase 3.5: `docs: update documentation for unified image generation`

### Estimated Total Time
- Setup: 5 min
- Tests: 65 min (45 min parallel + 20 min integration)
- Implementation: 40 min
- Integration: 15 min
- Polish: 50 min (35 min parallel + 15 min sequential)
- **Total**: ~3 hours (with parallelization)

---

**Generated**: 2025-10-01
**Feature**: 004-generateimage-frames-prompt
**Status**: Ready for execution
**Next**: Execute tasks T001-T015 following TDD workflow
