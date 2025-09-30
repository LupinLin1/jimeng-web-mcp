# Implementation Plan: 异步视频生成查询

**Branch**: `002-` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/lupin/mcp-services/jimeng-mcp/specs/002-/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   ✓ Loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   ✓ All clarified via /clarify command
   ✓ Structure Decision: Single project (existing TypeScript MCP server)
3. Fill the Constitution Check section
   ✓ Completed - all principles satisfied
4. Evaluate Constitution Check section
   ✓ No violations, no complexity tracking needed
   ✓ Update Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   ✓ Generated: research.md
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   ✓ Generated: data-model.md, contracts/async-video-api.md, quickstart.md
7. Re-evaluate Constitution Check section
   ✓ No new violations post-design
   ✓ Update Progress Tracking: Post-Design Constitution Check PASS
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
   ✓ Described below
9. STOP - Ready for /tasks command
   ✓ Phase 0-1 complete, ready for /tasks
```

---

## Summary

**Primary Requirement**: 让视频生成支持异步调用模式，类似现有的图片异步生成（`generateImageAsync` + `getImageResult`）。

**Technical Approach**:
1. 在 `VideoGenerator` 类中添加异步方法（`generateVideoAsync`, `generateMainReferenceVideoAsync`, `videoPostProcessAsync`）
2. 复用现有视频生成逻辑，移除轮询等待部分，立即返回 `history_record_id`
3. 扩展 `JimengClient.getImageResult` 支持视频查询（已实现，无需修改）
4. 新增 `JimengClient.getBatchResults` 支持批量查询
5. 添加MCP工具暴露异步接口

**Key Innovation**: 利用JiMeng API的 `/mweb/v1/get_history_by_ids` 接口同时支持图片和视频查询，保持API统一性。

---

## Technical Context

**Language/Version**: TypeScript 5.8.3
**Primary Dependencies**: Node.js ES2020, axios (HTTP), uuid, zod (MCP validation)
**Storage**: N/A（无本地持久化，任务状态由JiMeng API管理）
**Testing**: Jest with async test patterns (参考 `async-image-generation.test.ts`)
**Target Platform**: Node.js 16+ (MCP server runtime)
**Project Type**: Single (existing TypeScript MCP server)
**Performance Goals**:
  - 异步提交 < 3s（含图片上传）
  - 单次查询 < 500ms (p95)
  - 批量查询 < 500ms + 100ms per task (p95)
**Constraints**:
  - 100% backward compatibility（不修改现有方法签名）
  - Zero-install deployment（保持bundle size）
  - MCP protocol compliance（Zod schema validation）
**Scale/Scope**:
  - 支持10+ concurrent async submissions
  - 批量查询建议≤10 tasks per request
  - 支持所有现有视频生成模式（传统、多帧、主体参考）

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with constitutional principles from `.specify/memory/constitution.md`:

- [x] **Minimal Code Change**: ✅ 新增异步方法，不修改现有同步方法。VideoGenerator扩展，JimengClient仅新增批量查询方法。
- [x] **Modular Extension**: ✅ 功能在VideoGenerator和JimengClient模块内扩展，符合现有架构分层。
- [x] **Backward Compatibility**: ✅ 所有现有API签名保持不变，新方法为可选使用。参数全部optional with defaults。
- [x] **Test-Driven Development**: ✅ 按照契约先编写测试（async-video-generation.test.ts, async-mcp-tools.test.ts），再实现功能。
- [x] **API Contract Stability**: ✅ JiMeng API调用隔离在VideoGenerator内部，外部接口稳定。TypeScript类型定义作为稳定契约。

**Violations**: None

**Mitigation**: N/A

---

## Project Structure

### Documentation (this feature)
```
specs/002-/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output ✓
├── data-model.md        # Phase 1 output ✓
├── quickstart.md        # Phase 1 output ✓
├── contracts/           # Phase 1 output ✓
│   └── async-video-api.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created yet)
```

### Source Code (repository root)
```
src/
├── api/
│   ├── BaseClient.ts            # 现有（无需修改）
│   ├── JimengClient.ts          # 扩展：添加 getBatchResults()
│   ├── CreditService.ts         # 现有（无需修改）
│   └── video/
│       ├── VideoGenerator.ts    # 扩展：添加3个async方法
│       └── MainReferenceVideoGenerator.ts  # 现有（无需修改）
├── types/
│   └── api.types.ts             # 扩展：添加 BatchQueryResponse 类型
├── server.ts                    # 扩展：添加新MCP工具定义
└── api.ts                       # 扩展：导出新方法（向后兼容）

tests/
├── async-video-generation.test.ts   # 新增：单元测试
├── async-mcp-tools.test.ts          # 扩展：MCP工具测试
└── backward-compatibility.test.ts   # 扩展：兼容性验证
```

**Structure Decision**: 使用现有单项目结构，在 `src/api/video/` 目录下扩展视频生成功能。遵循模块化架构，VideoGenerator负责视频生成核心逻辑，JimengClient提供统一查询接口。

---

## Phase 0: Outline & Research ✓

### Research Completed

生成的 `research.md` 文档回答了以下关键问题：

1. **JiMeng API支持** - 确认 `/mweb/v1/get_history_by_ids` 接口可查询视频任务
2. **historyId格式** - 验证格式与图片一致（纯数字或h开头）
3. **批量查询实现** - 使用API原生批量能力，单次请求查询多任务
4. **状态码映射** - 复用图片生成的状态映射规则（50=completed, 30=failed等）
5. **异步提交实现** - 复用现有生成方法，移除轮询逻辑立即返回history_id

### Architecture Decisions

- **AD-001**: 异步方法添加到 `VideoGenerator` 类（复用现有逻辑）
- **AD-002**: 图片和视频共享 `getImageResult` 查询接口（API不区分类型）
- **AD-003**: 新增 `getBatchResults` 方法支持批量查询，返回映射对象

**Output**: ✅ research.md with all technical unknowns resolved

---

## Phase 1: Design & Contracts ✓

### Artifacts Generated

1. **data-model.md**:
   - 定义 `VideoGenerationTask` 实体（复用 `QueryResultResponse` 类型）
   - 定义状态转换规则 (pending → processing → completed/failed)
   - 定义 `BatchQueryResponse` 新类型
   - 验证规则和API响应结构映射

2. **contracts/async-video-api.md**:
   - `generateVideoAsync` 方法契约（参数、返回值、错误处理）
   - `generateMainReferenceVideoAsync` 方法契约
   - `videoPostProcessAsync` 方法契约
   - `getImageResult` 扩展说明（已支持视频，无需修改）
   - `getBatchResults` 新方法契约
   - MCP工具映射定义
   - 性能契约 (< 3s async submit, < 500ms query)

3. **quickstart.md**:
   - Scenario 1: 基础异步视频生成验证
   - Scenario 2: 主体参考视频异步生成
   - Scenario 3: 批量查询多个任务
   - Scenario 4: 视频后处理异步
   - Scenario 5: 错误处理验证
   - 性能基准测试脚本
   - 集成测试清单

### Contract Tests (To Be Written)

测试文件将在Phase 3实现：

- `src/__tests__/async-video-generation.test.ts`:
  - `generateVideoAsync` 参数验证
  - `generateVideoAsync` 返回格式验证
  - `getImageResult` 视频URL提取
  - `getBatchResults` 批量查询逻辑
  - 错误场景测试

- `src/__tests__/async-mcp-tools.test.ts`:
  - MCP工具 `generateVideoAsync` 端到端
  - MCP工具 `getVideoResult` 集成
  - 完整异步流程测试

**Output**: ✅ data-model.md, contracts/*, quickstart.md generated

---

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

The `/tasks` command will:

1. **Load base template**: `.specify/templates/tasks-template.md`
2. **Extract tasks from Phase 1 artifacts**:
   - Each method in `async-video-api.md` → implementation task
   - Each validation rule in `data-model.md` → validation task
   - Each scenario in `quickstart.md` → integration test task
3. **Generate test-first tasks**:
   - Contract tests for each method (红阶段)
   - Implementation tasks to pass tests (绿阶段)
   - Refactoring tasks if needed (重构阶段)

### Ordering Strategy

**Dependencies**:
```
T001: 类型定义 (BatchQueryResponse)
  ↓
T002-T004: 编写契约测试 [P]
  ↓
T005-T009: 实现异步方法使测试通过 [P]
  ↓
T010-T011: MCP工具注册 [P]
  ↓
T012-T014: 集成测试 [P]
  ↓
T015: 性能验证
  ↓
T016: 文档更新
```

**Parallelizable Tasks** (标记 [P]):
- T002-T004: 不同方法的契约测试可并行编写
- T005-T009: 实现任务间无依赖可并行
- T010-T011: MCP工具注册独立可并行
- T012-T014: 不同场景的集成测试可并行

### Estimated Task Count

- 类型定义: 1 task
- 契约测试: 5 tasks (5个新方法)
- 实现任务: 5 tasks (对应5个测试)
- MCP工具: 2 tasks (定义+验证)
- 集成测试: 3 tasks (quickstart场景)
- 性能验证: 1 task
- 文档更新: 1 task
- **Total**: ~18-20 tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

---

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

---

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No complexity deviations** - 所有constitutional principles满足，无需额外tracking。

---

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - none)

**Artifacts Generated**:
- [x] research.md
- [x] data-model.md
- [x] contracts/async-video-api.md
- [x] quickstart.md
- [ ] tasks.md (awaiting /tasks command)
- [ ] CLAUDE.md updated (will update via script)

---

## Next Steps

1. **Run `/tasks` command** to generate detailed task breakdown in `tasks.md`
2. **Execute tasks** following TDD workflow (Red → Green → Refactor)
3. **Validate with quickstart.md** after each milestone
4. **Run performance benchmarks** to ensure < 3s submit, < 500ms query targets
5. **Update CLAUDE.md** with new architecture (via update-agent-context.sh)

---

*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*