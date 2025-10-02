
# Implementation Plan: Video Generation Method Refactoring

**Branch**: `005-3-1-2` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/lupin/mcp-services/jimeng-mcp/specs/005-3-1-2/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

将视频生成功能重构为三个独立的方法，每个方法统一支持同步/异步模式：

1. **文生视频及首尾帧生成** - 接受文本提示和可选的首尾帧图片
2. **多帧视频生成** - 支持2-10个帧配置，每帧包含独立提示词和时长
3. **主体参考视频生成** - 接受2-4张参考图片，使用[图N]语法在提示词中引用

关键要求：
- 统一的`async`参数控制同步/异步行为（不再有单独的异步方法）
- 同步模式超时时间为600秒（10分钟）
- 异步任务返回错误码、详细消息和原因说明
- 保留现有方法并显示废弃警告（过渡期策略）

## Technical Context
**Language/Version**: TypeScript 5.x with Node.js (ES modules)
**Primary Dependencies**: axios (HTTP), uuid (identifiers), zod (validation), dotenv (config)
**Storage**: N/A (API client, no persistent storage)
**Testing**: Jest with TypeScript support, ES module compatibility
**Target Platform**: Node.js (MCP server via stdio), npx zero-install deployment
**Project Type**: Single project (MCP server library)
**Performance Goals**: Sync operations timeout at 600 seconds, async operations return immediately
**Constraints**: 100% backward compatibility required, modular extension architecture, minimal code changes
**Scale/Scope**: 3 new video generation methods + deprecation wrapper for existing methods

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with constitutional principles from `.specify/memory/constitution.md`:

- [x] **Minimal Code Change**: 新增三个方法作为独立模块，现有方法仅添加废弃警告，核心逻辑无需修改
- [x] **Modular Extension**: 三个方法将作为VideoGenerator类的新方法实现，或作为独立模块通过JimengClient暴露
- [x] **Backward Compatibility**: 现有generateVideo/generateVideoAsync等方法保持不变，仅添加console.warn废弃提示
- [x] **Test-Driven Development**: 将先编写测试用例验证三个新方法的同步/异步行为
- [x] **API Contract Stability**: 新方法使用统一的参数接口，async参数为可选（默认false），保持类型稳定

**Violations**: None

**Mitigation**: N/A - 设计完全符合宪章原则

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── api/
│   ├── JimengClient.ts           # 现有主客户端（添加废弃警告）
│   ├── video/
│   │   ├── VideoGenerator.ts     # 现有视频生成器（将扩展）
│   │   ├── TextToVideoGenerator.ts      # 新增：文生视频方法
│   │   ├── MultiFrameVideoGenerator.ts  # 新增：多帧视频方法
│   │   └── MainReferenceVideoGenerator.ts # 现有主体参考
│   └── BaseClient.ts             # 基类（无需修改）
├── types/
│   └── api.types.ts              # 类型定义（扩展新接口）
├── utils/
│   └── timeout.ts                # 新增：超时处理工具
└── server.ts                     # MCP工具注册（添加新工具）

tests/
├── text-to-video.test.ts         # 新增：文生视频测试
├── multi-frame-video.test.ts     # 新增：多帧视频测试
├── main-reference-video.test.ts  # 现有：主体参考测试
├── deprecation.test.ts           # 新增：废弃警告测试
└── async-behavior.test.ts        # 新增：同步/异步行为测试
```

**Structure Decision**: 单项目结构（MCP服务器库）。新功能通过扩展VideoGenerator或创建新的Generator类实现，保持模块化架构。现有代码最小化修改（仅添加废弃警告）。

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **测试优先任务**（TDD原则）:
   - 为三个新方法各创建契约测试任务：text-to-video.contract.test.ts, multi-frame-video.contract.test.ts
   - 创建同步/异步行为测试：async-behavior.test.ts
   - 创建废弃警告测试：deprecation.test.ts
   - 创建超时处理测试：timeout.test.ts

2. **类型定义任务**:
   - 扩展src/types/api.types.ts，添加新接口（BaseVideoGenerationOptions, TextToVideoOptions等）
   - 添加VideoGenerationError、VideoTaskResult等类型

3. **工具类任务**:
   - 创建src/utils/timeout.ts，实现轮询和超时逻辑
   - 创建src/utils/deprecation.ts，实现废弃警告管理

4. **Generator类任务**（可并行 [P]）:
   - [P] 创建src/api/video/TextToVideoGenerator.ts
   - [P] 创建src/api/video/MultiFrameVideoGenerator.ts
   - [P] 更新src/api/video/MainReferenceVideoGenerator.ts（如需要支持async参数）

5. **集成任务**:
   - 更新src/api/video/VideoGenerator.ts，集成三个新Generator
   - 更新src/api/JimengClient.ts，添加废弃警告到旧方法
   - 更新src/server.ts，注册新的MCP工具

6. **验证任务**:
   - 运行所有测试套件确保通过
   - 手动验证quickstart.md中的示例代码
   - 验证废弃警告正确显示

**Ordering Strategy**:
- Phase 1: 类型定义（基础依赖）
- Phase 2: 工具类（公共功能）
- Phase 3: Generator类（核心实现，可并行）
- Phase 4: 集成和测试
- Phase 5: 文档和验证

**Task Categories**:
- [T] Test task - 编写测试
- [I] Implementation task - 实现功能
- [R] Refactor task - 重构现有代码
- [D] Documentation task - 文档更新
- [P] Parallel-safe - 可并行执行

**Estimated Output**:
- 约20-25个任务
- 5-8个可并行执行的任务
- 预计3-5个迭代周期完成

**Dependency Graph Summary**:
```
类型定义 → 工具类 → Generator类 → 集成 → 测试验证
             ↓
          测试任务（可提前创建）
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created (25 tasks)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - 无违规
- [x] Post-Design Constitution Check: PASS - 设计符合所有宪章原则
- [x] All NEEDS CLARIFICATION resolved - 技术上下文明确
- [x] Complexity deviations documented - 无复杂性偏差

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
