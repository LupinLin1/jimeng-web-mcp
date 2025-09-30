# Feature Specification: 异步视频生成查询

**Feature Branch**: `002-`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "让视频生成和图片一样支持调用这之后再查询"

## Execution Flow (main)
```
1. Parse user description from Input
   ✓ Description: 让视频生成和图片一样支持调用这之后再查询
2. Extract key concepts from description
   ✓ Identified: 异步API模式、视频生成、任务状态查询、参考图片生成API
3. For each unclear aspect:
   ✓ All clarified (see Clarifications section)
4. Fill User Scenarios & Testing section
   ✓ User flow: 提交任务 → 获取任务ID → 查询状态 → 获取结果
5. Generate Functional Requirements
   ✓ Each requirement testable
6. Identify Key Entities
   ✓ VideoGenerationTask identified
7. Run Review Checklist
   ✓ All requirements clarified
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-01
- Q: 任务历史记录保留时长是多久？ → A: 由JiMeng API端点决定，系统不控制保留时长
- Q: 是否需要支持批量查询多个视频生成任务？ → A: 支持批量查询
- Q: 查询接口是否需要内置轮询超时机制？ → A: 不需要轮询机制，异步查询是单次调用，每次查询返回当前状态

---

## User Scenarios & Testing

### Primary User Story
用户希望异步生成视频，不需要在生成过程中保持连接等待，可以先提交生成任务获得任务ID，然后在稍后的时间通过任务ID查询生成状态和结果，类似于当前图片生成的异步模式。

**使用场景**：
1. **长时间视频生成**：用户提交视频生成请求后可以关闭应用，稍后再回来查看结果
2. **批量视频生成**：用户可以同时提交多个视频生成任务，然后批量查询完成状态
3. **集成场景**：第三方系统可以异步调用视频生成服务，避免长时间占用连接

### Acceptance Scenarios

1. **Given** 用户有有效的API令牌和视频生成参数
   **When** 用户调用异步视频生成接口
   **Then** 系统立即返回任务ID和初始状态（pending）

2. **Given** 用户已获得视频生成任务ID
   **When** 用户使用任务ID查询生成状态
   **Then** 系统返回当前状态（pending/processing/completed/failed）和进度信息

3. **Given** 视频生成任务已完成
   **When** 用户查询该任务状态
   **Then** 系统返回completed状态和视频URL

4. **Given** 视频生成任务失败
   **When** 用户查询该任务状态
   **Then** 系统返回failed状态和具体错误信息

5. **Given** 用户提交了无效的任务ID
   **When** 用户查询该任务状态
   **Then** 系统返回明确的错误提示

6. **Given** 用户有多个视频生成任务ID
   **When** 用户调用批量查询接口
   **Then** 系统返回所有任务的当前状态和进度信息

### Edge Cases
- 查询一个不存在的任务ID时，系统应返回友好的错误信息而非崩溃
- 查询一个已过期的任务记录时，系统应明确告知任务已过期（过期策略由JiMeng API控制）
- 当生成任务处于队列中等待时，状态应清晰显示为pending而非processing
- 多次查询同一任务ID应返回一致的状态信息
- 视频生成超时的任务应标记为failed而非永久pending
- 批量查询中包含无效任务ID时，系统应为每个任务返回相应的状态或错误信息

## Requirements

### Functional Requirements

- **FR-001**: 系统必须提供异步视频生成接口，接受视频生成参数（提示词、分辨率、帧率等）并立即返回任务ID

- **FR-002**: 系统必须提供单个任务状态查询接口，接受任务ID作为参数

- **FR-003**: 系统必须提供批量任务状态查询接口，接受多个任务ID作为参数

- **FR-004**: 查询接口必须返回以下信息：
  - 任务当前状态（pending/processing/completed/failed）
  - 生成进度百分比（0-100）
  - 完成时的视频URL（仅completed状态）
  - 失败原因（仅failed状态）

- **FR-005**: 系统必须支持所有现有视频生成模式的异步调用：
  - 传统首尾帧模式
  - 智能多帧模式
  - 主体参考视频模式

- **FR-006**: 异步接口必须与现有同步接口保持参数兼容性

- **FR-007**: 任务记录保留时长由JiMeng API端点控制，系统不实施额外的保留策略

- **FR-008**: 查询不存在或无效的任务ID时，系统必须返回明确的错误信息

- **FR-009**: 系统必须确保任务ID的唯一性和不可预测性

- **FR-010**: 查询接口为无状态单次调用，不包含轮询逻辑或超时机制（由调用方控制查询频率）

- **FR-011**: 批量查询接口必须为每个任务ID返回独立的状态结果，无效ID应标记错误而非中断整个查询

### Key Entities

- **VideoGenerationTask**: 视频生成任务
  - 任务唯一标识符（taskId/historyId）
  - 任务状态（pending, processing, completed, failed）
  - 生成进度（0-100%）
  - 输入参数（提示词、分辨率、帧率等）
  - 创建时间
  - 完成时间（如已完成）
  - 生成结果（视频URL）
  - 错误信息（如失败）

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (3 clarifications needed)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Notes

**参考实现**: 项目中已有图片生成的异步模式实现（`generateImageAsync` 和 `getImageResult`），视频生成异步模式应保持API风格的一致性。

**依赖关系**: 此特性依赖于JiMeng API是否支持视频生成的draft_id查询机制（类似图片生成）。如果JiMeng API尚未提供此能力，需要与API提供方确认。

**成功标准**:
- 用户可以像使用图片异步生成一样使用视频异步生成
- 单次查询接口响应时间 < 500ms
- 批量查询每个任务的响应时间 < 100ms (额外开销)
- 任务ID生成后永不改变
- 所有现有视频生成功能都可以通过异步接口使用
- 批量查询支持至少10个任务同时查询