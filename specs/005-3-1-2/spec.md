# Feature Specification: Video Generation Method Refactoring

**Feature Branch**: `005-3-1-2`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "将生成视频拆分成3个方法 ，包括：1.文生视视及首尾帧  2.多帧  3.主体参考。 然后每个方法都可以指定同步还是异步，不单独有异步方法。"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## Clarifications

### Session 2025-10-01
- Q: 向后兼容策略 - 现有视频生成API应该如何处理？ → A: 废弃现有方法但保持可用；新增三个方法（过渡期内显示警告）
- Q: 异步任务失败时应返回什么错误信息？ → A: 返回错误码、详细消息和原因说明
- Q: 同步模式下最长等待时间应该是多少？ → A: 600秒/10分钟（允许复杂视频生成完成）
- Q: 异步任务ID有效期应该是多长？ → A: 由即梦API端点决定（不在此规范范围内）
- Q: 是否需要支持取消异步任务的功能？ → A: 不支持取消功能（任务一旦提交就会处理完成）

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## User Scenarios & Testing

### Primary User Story
As a video generation service user, I need a clear and organized way to generate videos using three distinct methods (text-to-video with first/last frames, multi-frame, and main reference) where I can choose whether each generation should wait for completion (synchronous) or return immediately for later retrieval (asynchronous).

### Acceptance Scenarios

**Scenario 1: Text-to-Video with First/Last Frames (Sync)**
1. **Given** I have a text prompt and optional first/last frame images, **When** I call the text-to-video generation method with sync mode, **Then** the system waits for video completion and returns the final video URL

**Scenario 2: Multi-Frame Video Generation (Async)**
2. **Given** I have a text prompt and 2-10 frame configurations with timestamps, **When** I call the multi-frame generation method with async mode, **Then** the system immediately returns a task ID for later status checking

**Scenario 3: Main Reference Video Generation (Sync)**
3. **Given** I have 2-4 reference images and a prompt using [图0], [图1] syntax, **When** I call the main reference generation method with sync mode, **Then** the system waits for processing and returns the final video URL

**Scenario 4: Method Parameter Consistency**
4. **Given** any of the three video generation methods, **When** I examine the parameters, **Then** each method has a consistent `async` boolean parameter to control sync/async behavior

**Scenario 5: Async Result Retrieval**
5. **Given** I have a task ID from an async video generation, **When** I check the task status, **Then** the system returns the current status and video URL when completed

### Edge Cases
- What happens when an async task fails during processing? System returns error code, detailed message, and reason explanation
- Async tasks cannot be cancelled once submitted - they will process to completion or failure
- Synchronous operations timeout after 600 seconds (10 minutes), after which users should use async mode
- Async task ID validity period is determined by the JiMeng API endpoint (outside specification scope)
- When sync mode times out, system returns timeout error and suggests using async mode for the request

## Requirements

### Functional Requirements

**Video Generation Methods**
- **FR-001**: System MUST provide a text-to-video generation method that accepts text prompts with optional first/last frame images
- **FR-002**: System MUST provide a multi-frame video generation method that accepts 2-10 frame configurations with individual prompts and durations
- **FR-003**: System MUST provide a main reference video generation method that accepts 2-4 reference images with [图N] syntax in prompts
- **FR-004**: Each video generation method MUST NOT have separate async variants - all async/sync behavior MUST be controlled by a single parameter

**Sync/Async Control**
- **FR-005**: Each video generation method MUST accept an `async` boolean parameter (or equivalent) to control execution mode
- **FR-006**: When async mode is enabled, the method MUST immediately return a task identifier without waiting for video completion
- **FR-007**: When async mode is disabled (sync), the method MUST wait for video generation to complete before returning the result
- **FR-007a**: Synchronous operations MUST timeout after 600 seconds (10 minutes) maximum waiting time
- **FR-007b**: When sync operation times out, system MUST return a timeout error with suggestion to use async mode
- **FR-008**: System MUST provide a method to check the status of async video generation tasks using the task identifier
- **FR-009**: System MUST return consistent result formats between sync and async modes (same video URL structure, metadata, etc.)

**Parameter Consistency**
- **FR-010**: All three video generation methods MUST share common parameters where applicable (resolution, aspect ratio, fps, duration, model)
- **FR-011**: The async control parameter MUST have the same name and behavior across all three methods

**Result Retrieval**
- **FR-012**: System MUST allow users to retrieve async task results using the task identifier
- **FR-013**: System MUST indicate task status (pending, processing, completed, failed) when checking async results
- **FR-014**: When async tasks fail, system MUST return error information containing: error code, detailed error message, and specific reason explanation
- **FR-014a**: System MUST NOT provide task cancellation functionality - once submitted, async tasks will process to completion or failure

**Backward Compatibility**
- **FR-015**: Existing video generation methods MUST remain functional during a transition period and display deprecation warnings when called
- **FR-016**: System MUST provide three new video generation methods (text-to-video, multi-frame, main reference) as the preferred API
- **FR-017**: Deprecation warnings MUST include guidance on migrating to the new methods with equivalent parameter mappings

### Key Entities

- **Video Generation Task**: Represents a video generation request with method type (text-to-video, multi-frame, main reference), parameters, execution mode (sync/async), and status
- **Task Identifier**: Unique identifier returned for async operations to enable result retrieval
- **Video Result**: Contains the generated video URL, metadata (duration, resolution, format), and generation parameters used
- **Frame Configuration**: Defines individual frame parameters for multi-frame generation (frame index, duration, prompt, reference image)
- **Reference Image Set**: Collection of 2-4 images used in main reference generation with corresponding [图N] indices

---

## Review & Acceptance Checklist

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (2 clarifications needed)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarifications)

---
