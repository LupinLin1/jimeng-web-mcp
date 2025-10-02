
# Implementation Plan: 代码库简化与重构

**Branch**: `006-` | **Date**: 2025-10-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-/spec.md`

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

本次重构旨在简化代码库，消除过度工程化问题，将3000+行代码减少到2000行以下。核心目标包括：

1. **扁平化继承层次**：将三层继承（CreditService → BaseClient → JimengClient）改为组合模式
2. **移除不必要抽象**：简化timeout.ts（249→30行）、deprecation.ts（151→10行）、移除Zod过度验证
3. **合并重复代码**：整合4个视频生成器类、9个工具文件合并为3-4个、清理20+重复测试文件
4. **提升开发体验**：新开发者上手时间从数天减少到1小时内理解架构

**执行策略**：按风险分阶段执行
- 阶段1：低风险代码清理（日志、测试、工具文件）
- 阶段2：核心架构重构（继承层次、视频生成器）

**兼容性承诺**：保持API签名不变，允许内部实现优化，所有现有测试必须通过

## Technical Context
**Language/Version**: TypeScript 5.x + Node.js (ES modules)
**Primary Dependencies**: 当前保留（axios, uuid, dotenv），移除Zod，新增image-size
**Storage**: N/A（API包装器，无持久化存储）
**Testing**: Jest with TypeScript, ES module support
**Target Platform**: Node.js 18+, npx零安装部署
**Project Type**: single（单一MCP服务器项目）
**Performance Goals**: 保持或提升当前性能，需要完整性能测试（基准对比、负载测试）
**Constraints**:
- 代码行数减少至少30%（3000+→<2000行）
- 保持100% API兼容性
- 所有现有测试必须通过
- 零安装部署约束（npx）
**Scale/Scope**:
- 核心文件重构：3个基类→组合模式
- 工具文件整合：9个→3-4个
- 测试清理：20+个→清晰三层结构
- 功能完整：15个MCP工具保持不变

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with constitutional principles from `.specify/memory/constitution.md`:

- [x] **Minimal Code Change**: ⚠️ VIOLATION - 重构需要大量修改现有代码
- [x] **Modular Extension**: ⚠️ VIOLATION - 无法通过新模块实现，必须重构现有架构
- [x] **Backward Compatibility**: ✅ PASS - 保持所有API签名不变，仅内部实现优化
- [x] **Test-Driven Development**: ✅ PASS - 所有现有测试先通过，重构后再次验证
- [x] **API Contract Stability**: ✅ PASS - MCP工具接口完全保持不变

**Violations**:

1. **Minimal Code Change** - 重构本质上需要修改大量现有代码（继承层次、视频生成器、工具文件）
2. **Modular Extension** - 过度工程化问题无法通过添加新模块解决，必须简化现有架构

**Mitigation**:

1. **分阶段执行降低风险**：
   - 阶段1：低风险代码清理（日志、测试文件、工具整合）- 影响范围小
   - 阶段2：核心架构重构（继承层次、视频生成器）- 有阶段1验证保障

2. **测试驱动保证质量**：
   - 每个阶段前：确保所有测试通过（建立基线）
   - 每次修改后：立即运行测试验证
   - 阶段完成后：完整性能测试对比

3. **API兼容性保证**：
   - 保持所有导出函数签名不变
   - 内部重构对外部调用透明
   - 继续生成等关键功能特别验证

4. **为什么不能用新模块方式**：
   - 继承层次问题：BaseClient已经被继承，无法通过新模块解决
   - 过度抽象问题：timeout.ts等已被多处引用，必须就地简化
   - 测试重复问题：需要删除而非添加文件

**结论**：这是必要的技术债务清理，通过严格的分阶段策略和测试覆盖降低风险


  **Constitutional Exception Applied**:

  根据Constitution v1.1.0 Principle VI (Technical Debt Remediation Exception)，本次重构符合所有例外条件：

  1. ✅ **Demonstrable Impact**: code-quality-pragmatist分析显示：
     - 新开发者上手时间：数天 → 目标1小时
     - 问题定位时间：减少50%+
     - 维护成本：显著降低
     - 代码复杂度：3000+行过度工程化

  2. ✅ **Impossibility of Modular Fix**:
     - 继承层次问题：BaseClient已被继承，无法通过新模块解决
     - 过度抽象问题：timeout.ts等已被多处引用，必须就地简化
     - 测试重复问题：需要删除而非添加文件
     - 经分析确认无法通过适配器或扩展方式解决

  3. ✅ **Documented Analysis**:
     - code-quality-pragmatist agent正式分析报告
     - 识别10个关键问题（继承层次、过度抽象、代码重复等）
     - 具体量化：757行BaseClient、1676行VideoGenerator、249行timeout抽象

  4. ✅ **Backward Compatibility Guarantee**:
     - FR-010: 所有MCP工具API签名不变
     - T017: JimengClient保持所有现有API签名
     - T035: 专门的向后兼容性测试
     - Principle III仍然100%遵守

  5. ✅ **Risk Mitigation Plan**:
     - 阶段1: 低风险代码清理（测试、日志、工具结构）
     - 阶段2: 核心架构重构（有阶段1验证保障）
     - 每阶段独立验证、性能测试、Git提交
     - 建立性能基线（T009）并持续对比（T034）

  **Approval and Tracking**:
  - Constitutional exception documented in Constitution v1.1.0 Principle VI
  - Git commits will be tagged with `[CONSTITUTION-EXCEPTION: Tech Debt]`
  - Post-implementation review scheduled to assess if permanent constitution updates needed
  - All mitigation safeguards (phase gating, test coverage, performance baseline, rollback plan) enforced in tasks.md

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
├── api/                    # API客户端实现（重构目标）
│   ├── JimengClient.ts    # 主客户端（当前继承BaseClient，目标：组合模式）
│   ├── BaseClient.ts      # 基础客户端（757行，目标：拆分为独立服务）
│   ├── CreditService.ts   # 积分服务（继承层次顶层）
│   └── video/             # 视频生成器（4个类，目标：合并）
│       ├── VideoGenerator.ts
│       ├── TextToVideoGenerator.ts
│       ├── MultiFrameVideoGenerator.ts
│       └── MainReferenceVideoGenerator.ts
├── types/                  # 类型定义（保持不变）
│   ├── api.types.ts
│   └── models.ts
├── utils/                  # 工具模块（9个文件，目标：3-4个）
│   ├── timeout.ts         # 249行，目标：≤30行
│   ├── deprecation.ts     # 151行，目标：完全移除
│   ├── auth.ts
│   ├── dimensions.ts
│   ├── logger.ts
│   └── ... (其他6个)
├── schemas/               # Zod验证（目标：简化或移除）
└── server.ts             # MCP服务器（保持不变）

tests/                     # 测试套件（20+文件，目标：清晰三层）
├── unit/                 # 单元测试（目标结构）
├── integration/          # 集成测试（目标结构）
└── e2e/                  # 端到端测试（目标结构）
```

**Structure Decision**: 单一项目结构（MCP服务器）。重构策略：
- 保持`src/`顶层结构不变
- 重构`src/api/`内部实现（继承→组合）
- 简化`src/utils/`（9→3-4个文件）
- 重组`tests/`（20+→清晰三层）
- 移除`src/schemas/`（Zod验证简化）

## Post-Design Constitution Check

**重新评估**（Phase 1设计完成后）：

- [x] **Minimal Code Change**: ⚠️ VIOLATION（未变化） - 仍需大量修改现有代码
- [x] **Modular Extension**: ⚠️ VIOLATION（未变化） - 仍需重构现有架构而非添加模块
- [x] **Backward Compatibility**: ✅ PASS（设计确认） - 架构设计保证API签名完全不变
- [x] **Test-Driven Development**: ✅ PASS（设计确认） - quickstart.md定义完整验收测试
- [x] **API Contract Stability**: ✅ PASS（设计确认） - contracts/定义稳定接口

**设计阶段验证**：
- ✅ 组合模式设计完成（data-model.md）
- ✅ 接口契约明确（contracts/refactoring-interfaces.md）
- ✅ 验收测试定义（quickstart.md）
- ✅ 向后兼容性策略明确（JimengClient保持所有API签名）

**结论**：违反情况与初始评估一致，缓解策略通过设计验证有效，可以进入任务规划阶段。

---

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

1. **阶段1任务（低风险代码清理）**：
   - 测试文件重组任务
   - 工具文件整合任务
   - 日志清理任务
   - 性能基线建立任务

2. **阶段2任务（核心架构重构）**：
   - 创建独立服务类（HttpClient, ImageUploader, CreditService）
   - 重构JimengClient为组合模式
   - 合并视频生成器为VideoService
   - 移除Zod，简化验证逻辑
   - 集成image-size库替代手动解析

3. **验证任务**：
   - 向后兼容性测试
   - 性能对比测试
   - 功能回归测试
   - 文档更新

**Ordering Strategy**:

**阶段1顺序**（低风险优先）：
1. 测试文件重组 [P]
2. 日志清理 [P]
3. 工具文件整合
4. 性能基线建立
5. 阶段1验证测试

**阶段2顺序**（依赖关系）：
1. 创建HttpClient [P]
2. 创建ImageUploader（依赖HttpClient）
3. 创建CreditService（依赖HttpClient）
4. 创建VideoService（依赖HttpClient + ImageUploader）
5. 重构JimengClient（依赖所有服务类）
6. 移除旧继承类
7. 集成image-size库
8. 移除Zod和deprecation
9. 阶段2验证测试

**验收顺序**（全面验证）：
1. 单元测试验证
2. 集成测试验证
3. 性能对比测试
4. 向后兼容性测试
5. 文档更新
6. 最终验收

**Estimated Output**:
- 阶段1: 8-10个任务
- 阶段2: 15-18个任务
- 验收: 8-10个任务
- **总计**: 约30-35个有序任务

**Parallel Execution Markers**:
- [P] 标记表示可并行执行的独立任务
- 阶段1的测试重组、日志清理可并行
- 阶段2的独立服务类创建可并行
- 验收阶段的不同类型测试可并行

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
| Minimal Code Change | 重构需要修改大量现有代码来消除技术债务 | 保持现状会导致代码库继续恶化，新开发者上手困难，维护成本持续增加 |
| Modular Extension | 继承层次和过度抽象问题无法通过添加模块解决 | 新模块无法修复现有架构问题，只会增加复杂度；必须重构现有结构 |

**风险缓解**：
- 分阶段执行（低风险→高风险）
- 每阶段完整测试验证
- 保持API签名不变确保兼容性
- 性能测试确保无退化


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: DOCUMENTED (violations with mitigation)
- [x] Post-Design Constitution Check: DOCUMENTED (violations with mitigation)
- [x] All NEEDS CLARIFICATION resolved (in spec.md clarifications section)
- [x] Complexity deviations documented

**Artifacts Generated**:
- [x] `/specs/006-/research.md` - 技术决策研究
- [x] `/specs/006-/data-model.md` - 架构实体对比
- [x] `/specs/006-/contracts/refactoring-interfaces.md` - 接口契约定义
- [x] `/specs/006-/quickstart.md` - 验收测试步骤
- [x] `/specs/006-/tasks.md` - 40个详细任务（阶段1:12个，阶段2:18个，验收:10个）

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
