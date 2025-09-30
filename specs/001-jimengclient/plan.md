
# Implementation Plan: 视频生成代码模块化重构

**Branch**: `001-jimengclient` | **Date**: 2025-01-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-jimengclient/spec.md`

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
将JimengClient中的视频生成相关代码提取到独立模块，提高代码可维护性和模块化程度。需要迁移的核心方法包括：generateVideo（主入口）、generateTraditionalVideo（传统模式）、generateMultiFrameVideo（多帧模式）、videoPostProcess（后处理）、pollVideoResult（结果轮询）以及generateMainReferenceVideo（主体参考模式）。重构必须保持公共API不变、现有测试不变，并最小化对JimengClient其他部分的改动。

## Technical Context
**Language/Version**: TypeScript 5.8.3, Node.js ES2020 target, NodeNext module resolution
**Primary Dependencies**: @modelcontextprotocol/sdk 1.10.2, axios 1.9.0, uuid 11.1.0, zod 3.24.3
**Storage**: N/A (无状态API客户端)
**Testing**: Jest 29.7.0 with ts-jest, unit/integration/async test categories
**Target Platform**: Node.js runtime (npx zero-install deployment)
**Project Type**: Single project (TypeScript library with MCP server)
**Performance Goals**: 保持现有性能特征（轮询超时5分钟，网络错误重试3次）
**Constraints**:
  - 保持100%向后兼容性
  - 最小化代码改动（遵循Minimal Code Change Policy）
  - 保持现有测试不变
  - 单例模式兼容性（getApiClient()函数）
**Scale/Scope**:
  - JimengClient当前约2860行
  - 需提取视频生成相关方法（约800-1000行估计）
  - 现有测试套件完整覆盖

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with constitutional principles from `.specify/memory/constitution.md`:

- [x] **Minimal Code Change**: ✓ 符合 - 创建新模块VideoGenerator，JimengClient仅保留委托调用
- [x] **Modular Extension**: ✓ 符合 - 视频生成逻辑完全封装在独立模块，通过继承或组合集成
- [x] **Backward Compatibility**: ✓ 符合 - 公共API签名完全保持不变（generateVideo, videoPostProcess, generateMainReferenceVideo）
- [x] **Test-Driven Development**: ⚠️ 特殊情况 - 现有测试已存在且必须保持不变，重构后测试应继续通过
- [x] **API Contract Stability**: ✓ 符合 - JiMeng API调用封装在新模块内部，外部接口稳定

**Violations**: None

**Mitigation**: TDD原则在重构场景中的应用方式：现有测试作为回归测试套件，确保重构不破坏功能。这符合宪法精神（测试先行），只是测试已存在而非新写。

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
│   ├── JimengClient.ts          # 保留图片生成和基础功能，视频方法变为委托调用
│   ├── ApiClient.ts             # 基础HTTP客户端（不变）
│   ├── CreditService.ts         # 积分管理服务（不变）
│   └── video/                   # ✨ 新增：视频生成模块
│       ├── VideoGenerator.ts    # 核心视频生成类
│       ├── TraditionalVideoGenerator.ts  # 传统模式实现
│       ├── MultiFrameVideoGenerator.ts   # 多帧模式实现
│       └── MainReferenceVideoGenerator.ts # 主体参考模式（从现有文件迁移）
├── types/
│   ├── api.types.ts             # 类型定义（可能需要小幅调整）
│   └── models.ts                # 模型映射（不变）
├── utils/                       # 工具函数（不变）
└── server.ts                    # MCP服务器（不变，委托给JimengClient）

src/__tests__/
├── unit/
├── integration/
└── async/                       # 现有测试保持不变
```

**Structure Decision**: 采用单项目结构（Option 1），在现有src/api/目录下新增video子目录。这种组织方式：
- 符合现有架构（ApiClient, JimengClient, CreditService的平级关系）
- 最小化对现有代码的影响
- 清晰隔离视频生成逻辑
- 便于未来进一步模块化（如需提取图片生成）

## Phase 0: Outline & Research

**已完成研究**：无NEEDS CLARIFICATION项，Technical Context已明确

**研究输出**：[research.md](./research.md)

**关键决策**：
1. **架构方案**：创建BaseClient基类 + VideoGenerator组合模式
2. **模块组织**：src/api/video/目录，包含VideoGenerator及三种模式实现
3. **共享方法处理**：提升request(), uploadImage(), logPoll*()到BaseClient
4. **向后兼容策略**：JimengClient保持公共API不变，内部委托给VideoGenerator

**备选方案评估**：
- 独立VideoClient（拒绝：代码重复）
- 纯内部重构（拒绝：不符合SRP）

**Output**: ✅ research.md 已创建

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

**已完成设计工作**：

1. ✅ **data-model.md创建**：
   - 类层次结构（BaseClient → JimengClient/VideoGenerator）
   - 核心实体定义（4个类）
   - 迁移映射表
   - 验证规则

2. ✅ **API合约文档**：
   - [contracts/refactoring-contract.md](./contracts/refactoring-contract.md)
   - 公共API合约（3个方法）
   - 内部实现合约
   - 测试合约
   - 兼容性合约

3. ✅ **快速启动指南**：
   - [quickstart.md](./quickstart.md)
   - 验证步骤（5个阶段）
   - 功能验证场景（4个）
   - 故障排查指南
   - 验收标准清单

4. ✅ **Agent文件更新**：
   - 执行 `.specify/scripts/bash/update-agent-context.sh claude`
   - CLAUDE.md已更新技术栈信息

**输出文件**：
- ✅ [data-model.md](./data-model.md)
- ✅ [contracts/refactoring-contract.md](./contracts/refactoring-contract.md)
- ✅ [quickstart.md](./quickstart.md)
- ✅ CLAUDE.md (已更新)

**注意**：由于这是重构任务，现有测试已存在，无需生成新的failing tests。重构的验证方式是确保现有测试继续通过。

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**：
- 基于data-model.md的类层次结构生成任务
- 基于contracts/refactoring-contract.md的合约要求生成验证任务
- 基于quickstart.md的验证步骤生成测试任务
- 遵循渐进式重构原则：先创建新代码，再修改旧代码，最后清理

**任务分类预估**：
1. **基础设施任务**（3-4个）：
   - 创建BaseClient基类
   - 提取共享方法
   - 验证JimengClient继承BaseClient后测试通过

2. **VideoGenerator创建任务**（5-6个）：
   - 创建VideoGenerator类框架
   - 迁移generateVideo方法
   - 迁移generateTraditionalVideo方法
   - 迁移generateMultiFrameVideo方法
   - 迁移videoPostProcess方法
   - 迁移pollVideoResult方法

3. **MainReferenceVideoGenerator迁移任务**（2-3个）：
   - 移动文件到video目录
   - 修改继承关系
   - 集成到VideoGenerator

4. **JimengClient委托任务**（3-4个）：
   - 添加VideoGenerator实例
   - 修改公共API为委托调用
   - 删除已迁移的私有方法
   - 运行完整测试套件

5. **验证与清理任务**（3-4个）：
   - 运行所有测试
   - 构建验证
   - 类型检查
   - 代码审查和文档更新

**排序策略**：
- 遵循依赖顺序：BaseClient → VideoGenerator → JimengClient委托
- 每个阶段完成后运行测试验证
- 标记可并行任务[P]（如不同模式的迁移）

**预估输出**：18-22个有序任务

**重要**：此阶段由/tasks命令执行，不在/plan中执行

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**结果**：无违反宪法原则的情况

所有constitutional原则都已满足：
- ✅ Minimal Code Change: 新建模块，JimengClient仅委托调用
- ✅ Modular Extension: 独立video模块
- ✅ Backward Compatibility: 100%兼容
- ✅ Test-Driven: 现有测试作为回归测试
- ✅ API Contract Stability: 外部接口稳定


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [x] Phase 3: Tasks generated (/tasks command) ✅ - 20个任务已生成
- [ ] Phase 4: Implementation complete - 待执行
- [ ] Phase 5: Validation passed - 待执行

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented ✅ (无违反)

**生成的设计文档**：
- ✅ research.md (研究与架构决策)
- ✅ data-model.md (数据模型与类层次)
- ✅ contracts/refactoring-contract.md (重构合约)
- ✅ quickstart.md (快速验证指南)
- ✅ CLAUDE.md (已更新技术栈)
- ✅ tasks.md (任务清单 - 20个任务)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
