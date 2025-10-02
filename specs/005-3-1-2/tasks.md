# Tasks: Video Generation Method Refactoring

**Feature Branch**: `005-3-1-2`
**Input**: Design documents from `/Users/lupin/mcp-services/jimeng-mcp/specs/005-3-1-2/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Summary

本任务列表遵循TDD原则，将视频生成功能重构为三个独立方法（文生视频、多帧视频、主体参考），每个方法统一支持同步/异步模式。

**关键原则**:
- ✅ 测试优先（TDD）- 先写测试，确保失败
- ✅ 最小代码变更 - 新增模块，现有代码仅添加废弃警告
- ✅ 向后兼容 - 保留所有现有方法
- ✅ 模块化扩展 - 每个方法独立实现

**技术栈**:
- TypeScript 5.x + Node.js (ES modules)
- Jest (测试)
- Zod (验证)
- axios (HTTP)

---

## Format: `[ID] [P?] Description`
- **[P]**: 可并行执行（不同文件，无依赖）
- 每个任务包含具体文件路径

---

## Phase 3.1: Setup & Type Definitions

### T001: ✅ 扩展类型定义 - 核心类型
**File**: `src/types/api.types.ts`
**Description**: 添加视频生成相关的核心类型定义
**Actions**:
- ✅ 添加 `VideoGenerationMode` 枚举
- ✅ 添加 `VideoTaskStatus` 类型
- ✅ 添加 `VideoGenerationError` 接口
- ✅ 添加 `VideoMetadata` 接口
- ✅ 添加 `VideoTaskResult` 接口

**Acceptance**:
- ✅ 所有类型导出可用
- ✅ TypeScript编译无错误

---

### T002: ✅ 扩展类型定义 - 请求类型
**File**: `src/types/api.types.ts`
**Description**: 添加三个生成方法的请求选项类型
**Actions**:
- ✅ 添加 `BaseVideoGenerationOptions` 接口（包含async参数）
- ✅ 添加 `TextToVideoOptions` 接口
- ✅ 添加 `MultiFrameVideoOptions` 接口
- ✅ 添加 `FrameConfiguration` 接口
- ✅ 添加 `MainReferenceVideoOptionsExtended`（扩展支持async）

**Acceptance**:
- ✅ 所有选项类型完整定义
- ✅ 继承关系正确（Base → 具体Options）

---

## Phase 3.2: Utility Modules

### T003 [P]: 创建超时处理工具
**File**: `src/utils/timeout.ts`
**Description**: 实现轮询和超时逻辑
**Actions**:
- 实现 `pollUntilComplete(taskId, options)` 函数
  - 指数退避轮询（初始2秒，最大10秒，因子1.5）
  - 硬超时600秒
  - 返回完成结果或抛出TimeoutError
- 实现 `sleep(ms)` 辅助函数
- 导出 `TimeoutError` 类

**Acceptance**:
- 单元测试覆盖轮询逻辑
- 超时场景测试通过
- 指数退避行为验证

**Dependencies**: T001 (VideoTaskStatus类型)

---

### T004 [P]: 创建废弃警告工具
**File**: `src/utils/deprecation.ts`
**Description**: 实现废弃方法的警告管理
**Actions**:
- 实现 `deprecate(oldMethod, newMethod, migrationUrl)` 函数
- 支持 `warnOnce` 选项（避免重复警告）
- 格式化警告消息
- 导出辅助函数

**Acceptance**:
- console.warn正确调用
- warnOnce逻辑生效
- 消息格式清晰

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL**: 这些测试必须先编写，并且必须失败，然后才能进行实现！

### T005 [P]: 文生视频契约测试
**File**: `tests/text-to-video.contract.test.ts`
**Description**: 为generateTextToVideo方法编写契约测试
**Actions**:
- 测试最小有效输入（仅prompt）
- 测试同步模式返回videoUrl
- 测试异步模式返回taskId
- 测试空提示词抛出INVALID_PARAMS错误
- 测试首尾帧图片参数
- 测试超时场景（mock）

**Acceptance**:
- 所有测试编写完成
- 运行测试时全部FAIL（因为未实现）
- 测试覆盖contract文档中的所有场景

**Reference**: `specs/005-3-1-2/contracts/text-to-video-api.md`

---

### T006 [P]: 多帧视频契约测试
**File**: `tests/multi-frame-video.contract.test.ts`
**Description**: 为generateMultiFrameVideo方法编写契约测试
**Actions**:
- 测试2个帧的最小配置
- 测试同步模式返回videoUrl
- 测试异步模式返回taskId
- 测试少于2个帧抛出错误
- 测试超过10个帧抛出错误
- 测试重复帧序号抛出错误
- 测试总时长超限抛出错误

**Acceptance**:
- 所有测试编写完成
- 运行测试时全部FAIL
- 覆盖所有参数验证规则

**Reference**: `specs/005-3-1-2/contracts/multi-frame-video-api.md`

---

### T007 [P]: 主体参考视频契约测试（更新）
**File**: `tests/main-reference-video.test.ts`
**Description**: 更新现有主体参考测试，添加async参数支持
**Actions**:
- 添加异步模式测试用例
- 测试async参数的默认行为
- 验证taskId返回格式

**Acceptance**:
- 新测试用例添加完成
- 测试失败（async参数未实现）
- 不破坏现有测试

---

### T008 [P]: 同步/异步行为测试
**File**: `tests/async-behavior.test.ts`
**Description**: 测试统一的async参数行为
**Actions**:
- 测试async=false时等待完成
- 测试async=true时立即返回
- 测试三个方法的async行为一致性
- 测试同步模式的轮询机制
- Mock API响应（pending → processing → completed）

**Acceptance**:
- 测试编写完成
- 覆盖同步/异步切换场景
- 所有测试FAIL（未实现）

---

### T009 [P]: 废弃警告测试
**File**: `tests/deprecation.test.ts`
**Description**: 验证旧方法的废弃警告
**Actions**:
- 测试调用旧generateVideo显示警告
- 测试警告消息包含迁移指导
- 测试warnOnce行为
- 验证旧方法功能仍然可用

**Acceptance**:
- console.warn被正确捕获
- 警告内容验证通过
- 功能兼容性测试通过

**Dependencies**: T004 (deprecation工具)

---

### T010 [P]: 超时处理测试
**File**: `tests/timeout.test.ts`
**Description**: 测试超时逻辑和错误处理
**Actions**:
- 测试600秒硬超时
- 测试指数退避轮询
- 测试TimeoutError抛出
- 测试错误消息包含async建议
- Mock长时间运行任务

**Acceptance**:
- 超时测试编写完成
- 轮询行为测试覆盖
- 所有测试FAIL（未实现）

**Dependencies**: T003 (timeout工具)

---

## Phase 3.4: Core Implementation (ONLY after tests are failing)

**Gate Check**: 确保Phase 3.3的所有测试已编写且失败

### T011 [P]: 实现文生视频Generator
**File**: `src/api/video/TextToVideoGenerator.ts`
**Description**: 创建文生视频生成器类
**Actions**:
- 创建 `TextToVideoGenerator` 类
- 实现 `generate(options: TextToVideoOptions)` 方法
- 集成超时处理（同步模式）
- 实现首尾帧图片上传逻辑
- 调用即梦API提交任务
- 处理async参数（条件轮询）

**Acceptance**:
- T005测试开始通过
- 同步和异步模式都正常工作
- 错误处理完整

**Dependencies**: T001, T002, T003, T005

---

### T012 [P]: 实现多帧视频Generator
**File**: `src/api/video/MultiFrameVideoGenerator.ts`
**Description**: 创建多帧视频生成器类
**Actions**:
- 创建 `MultiFrameVideoGenerator` 类
- 实现 `generate(options: MultiFrameVideoOptions)` 方法
- 验证帧配置（数量、序号、时长）
- 批量上传帧图片
- 集成超时处理
- 处理async参数

**Acceptance**:
- T006测试开始通过
- 参数验证正确
- 多帧上传和生成正常

**Dependencies**: T001, T002, T003, T006

---

### T013 [P]: 更新主体参考Generator（async支持）
**File**: `src/api/video/MainReferenceVideoGenerator.ts`
**Description**: 为现有主体参考添加async参数支持
**Actions**:
- 在 `generate` 方法中添加async参数处理
- 集成超时处理工具
- 更新返回类型为VideoTaskResult
- 保持现有功能完全兼容

**Acceptance**:
- T007测试通过
- 异步模式正常工作
- 现有测试不受影响

**Dependencies**: T001, T002, T003, T007

---

### T014: 实现参数验证（Zod schemas）
**File**: `src/types/api.types.ts` 或 `src/utils/validation.ts`
**Description**: 创建Zod验证schemas
**Actions**:
- 创建 `TextToVideoOptionsSchema`
- 创建 `MultiFrameVideoOptionsSchema`
- 创建 `MainReferenceVideoOptionsSchema`
- 导出验证函数

**Acceptance**:
- Zod schemas定义完整
- 参数验证测试通过
- 错误消息清晰

**Dependencies**: T002

---

## Phase 3.5: Integration

### T015: 集成Generator到VideoGenerator
**File**: `src/api/video/VideoGenerator.ts`
**Description**: 将三个Generator集成到现有VideoGenerator类
**Actions**:
- 添加 `generateTextToVideo` 方法（委托给TextToVideoGenerator）
- 添加 `generateMultiFrameVideo` 方法（委托给MultiFrameVideoGenerator）
- 确保 `generateMainReferenceVideo` 使用更新的实现
- 导出新方法

**Acceptance**:
- 三个新方法可通过VideoGenerator调用
- 委托模式正确实现
- 类型定义完整

**Dependencies**: T011, T012, T013

---

### T016: 暴露方法到JimengClient
**File**: `src/api/JimengClient.ts`
**Description**: 在JimengClient中暴露新方法
**Actions**:
- 添加 `generateTextToVideo` 公共方法
- 添加 `generateMultiFrameVideo` 公共方法
- 委托给videoGenerator实例
- 添加JSDoc注释

**Acceptance**:
- 新方法从JimengClient可用
- API接口清晰
- 文档注释完整

**Dependencies**: T015

---

### T017: 添加废弃警告到旧方法
**File**: `src/api/JimengClient.ts`
**Description**: 为现有方法添加废弃警告
**Actions**:
- 在 `generateVideo` 方法开头添加deprecate调用
- 在 `generateVideoAsync` 方法添加废弃警告
- 提供迁移指导URL
- 保持原有功能完全不变

**Acceptance**:
- T009废弃测试通过
- 警告正确显示
- 功能无破坏性变更

**Dependencies**: T004, T016

---

### T018: 注册新MCP工具
**File**: `src/server.ts`
**Description**: 注册三个新的MCP工具
**Actions**:
- 注册 `generateTextToVideo` 工具
  - 定义Zod schema
  - 实现tool handler
- 注册 `generateMultiFrameVideo` 工具
  - 定义Zod schema
  - 实现tool handler
- 更新 `generateMainReferenceVideo` 工具（如需要）
  - 添加async参数到schema
- 更新工具描述文档

**Acceptance**:
- 三个工具注册成功
- MCP协议兼容
- 工具可通过Claude Desktop调用

**Dependencies**: T016

---

## Phase 3.6: Polish & Validation

### T019 [P]: 单元测试 - 超时处理
**File**: `tests/unit/timeout.test.ts`
**Description**: 为timeout.ts编写单元测试
**Actions**:
- 测试pollUntilComplete函数
- 测试指数退避算法
- 测试超时边界条件
- 测试错误抛出

**Acceptance**:
- 单元测试覆盖率>90%
- 所有边界情况测试通过

**Dependencies**: T003

---

### T020 [P]: 单元测试 - 废弃警告
**File**: `tests/unit/deprecation.test.ts`
**Description**: 为deprecation.ts编写单元测试
**Actions**:
- 测试deprecate函数
- 测试warnOnce逻辑
- 测试消息格式化

**Acceptance**:
- 单元测试覆盖率>90%
- warnOnce行为验证

**Dependencies**: T004

---

### T021 [P]: 集成测试 - 端到端工作流
**File**: `tests/integration/e2e-workflow.test.ts`
**Description**: 实现quickstart.md中的端到端示例
**Actions**:
- 测试简单文生视频（同步）
- 测试多帧视频（异步）
- 测试主体参考视频（同步）
- 测试异步任务状态查询
- 测试错误处理流程

**Acceptance**:
- Quickstart示例代码可执行
- 所有场景测试通过

**Reference**: `specs/005-3-1-2/quickstart.md`
**Dependencies**: T011, T012, T013, T016

---

### T022: 更新API文档
**File**: `CLAUDE.md`
**Description**: 更新项目文档说明新功能
**Actions**:
- 在"Key Features"部分添加新方法说明
- 更新"MCP Tools Available"列表
- 添加迁移指南链接
- 更新示例代码

**Acceptance**:
- 文档准确描述新功能
- 示例代码可运行

---

### T023: 运行完整测试套件
**Description**: 验证所有测试通过
**Actions**:
- 运行 `yarn test`
- 验证所有单元测试通过
- 验证所有契约测试通过
- 验证所有集成测试通过
- 检查测试覆盖率报告

**Acceptance**:
- 所有测试通过（0 failures）
- 代码覆盖率 >80%
- 无TypeScript编译错误

**Dependencies**: All implementation tasks

---

### T024: 构建验证
**Description**: 确保构建成功
**Actions**:
- 运行 `yarn build`
- 检查dist输出
- 验证类型声明文件生成
- 测试npx安装流程

**Acceptance**:
- 构建成功无错误
- dist/目录包含所有文件
- npx jimeng-web-mcp可执行

**Dependencies**: T023

---

### T025: 手动验证 - Quickstart场景
**Description**: 手动执行quickstart.md中的所有示例
**Actions**:
- 按照quickstart逐步执行
- 验证每个代码示例可运行
- 验证错误处理示例
- 验证迁移指南示例

**Acceptance**:
- 所有示例无误
- 文档与实际行为一致
- 用户体验流畅

**Reference**: `specs/005-3-1-2/quickstart.md`
**Dependencies**: T024

---

## Dependencies Graph

```
Setup & Types:
  T001 → T002
          ↓
  T003, T004 (Parallel)
          ↓
Tests (Phase 3.3):
  T005, T006, T007, T008, T010 (Parallel, depend on T001-T004)
  T009 (depends on T004)
          ↓
Implementation (Phase 3.4):
  T014 (depends on T002)
  T011, T012, T013 (Parallel, depend on T001-T003, T005-T008)
          ↓
  T015 (depends on T011-T013)
          ↓
  T016 (depends on T015)
          ↓
  T017 (depends on T004, T016)
  T018 (depends on T016)
          ↓
Polish (Phase 3.6):
  T019, T020 (Parallel, depend on T003, T004)
  T021 (depends on T011-T013, T016)
  T022 (documentation, no code deps)
          ↓
  T023 (depends on all impl tasks)
          ↓
  T024 (depends on T023)
          ↓
  T025 (depends on T024)
```

---

## Parallel Execution Examples

### Batch 1: Utility Modules (After T002)
```bash
# Launch T003 and T004 together:
# Task: "创建超时处理工具 in src/utils/timeout.ts"
# Task: "创建废弃警告工具 in src/utils/deprecation.ts"
```

### Batch 2: Contract Tests (After T001-T004)
```bash
# Launch T005-T008 together:
# Task: "文生视频契约测试 in tests/text-to-video.contract.test.ts"
# Task: "多帧视频契约测试 in tests/multi-frame-video.contract.test.ts"
# Task: "主体参考视频契约测试 in tests/main-reference-video.test.ts"
# Task: "同步/异步行为测试 in tests/async-behavior.test.ts"
```

### Batch 3: Generator Implementation (After T005-T008)
```bash
# Launch T011-T013 together:
# Task: "实现文生视频Generator in src/api/video/TextToVideoGenerator.ts"
# Task: "实现多帧视频Generator in src/api/video/MultiFrameVideoGenerator.ts"
# Task: "更新主体参考Generator in src/api/video/MainReferenceVideoGenerator.ts"
```

### Batch 4: Unit Tests (After respective implementations)
```bash
# Launch T019-T020 together:
# Task: "单元测试-超时处理 in tests/unit/timeout.test.ts"
# Task: "单元测试-废弃警告 in tests/unit/deprecation.test.ts"
```

---

## Task Execution Guidelines

### Before Starting
1. 确保在feature分支：`git checkout 005-3-1-2`
2. 确保依赖已安装：`yarn install`
3. 确认所有设计文档已读：plan.md, research.md, data-model.md, contracts/

### For Each Task
1. 创建具体的文件路径（如未存在）
2. 编写代码前先理解契约/设计文档
3. 对于测试任务：确保测试先失败
4. 对于实现任务：让测试通过
5. 每个任务完成后运行相关测试
6. Commit每个已完成的任务

### Test-Driven Flow
```
1. Write test (T005-T010) → Test FAILS ✓
2. Implement feature (T011-T018) → Test PASSES ✓
3. Refactor if needed → Test still PASSES ✓
```

---

## Validation Checklist

在认为任务完成前，验证：

- [x] 所有契约都有对应测试（T005, T006, T007）
- [x] 所有核心类型已定义（T001, T002）
- [x] 所有测试在实现前编写（Phase 3.3 before 3.4）
- [x] 并行任务真正独立（不同文件）
- [x] 每个任务指定了准确文件路径
- [x] 没有两个[P]任务修改同一文件
- [x] 依赖关系清晰（见Dependencies Graph）
- [x] 向后兼容性验证（T017, T009）

---

## Notes

- **[P] 标记规则**: 只有在不同文件且无依赖时才标记[P]
- **TDD严格执行**: Phase 3.3必须在3.4之前完成
- **最小变更原则**: 现有代码仅添加废弃警告（T017）
- **提交频率**: 每完成一个任务提交一次
- **测试覆盖**: 目标覆盖率>80%

---

**任务总数**: 25个任务
**可并行任务**: 13个任务 (T003-T004, T005-T008, T011-T013, T019-T020)
**预计完成周期**: 3-5个迭代

**生成时间**: 2025-10-01
**基于宪章**: v1.0.0
