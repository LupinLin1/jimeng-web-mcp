# Feature Specification: 视频生成代码模块化重构

**Feature Branch**: `001-jimengclient`
**Created**: 2025-01-30
**Status**: Draft
**Input**: User description: "将视频生成代码从JimengClient里抽取出来，尽量小变动"

## Execution Flow (main)
```
1. Parse user description from Input
   → Extract requirement: separate video generation code from JimengClient
   → Constraint identified: minimize changes to existing code
2. Extract key concepts from description
   → Actors: Developers maintaining the codebase
   → Actions: Extract/separate video generation logic
   → Data: Video generation methods, dependencies
   → Constraints: Minimal code changes, maintain backward compatibility
3. For each unclear aspect:
   → ✓ Clarified: Must keep public API unchanged
   → ✓ Clarified: Must keep existing tests unchanged
4. Fill User Scenarios & Testing section
   → Primary scenario: Developer extracts video code without breaking functionality
5. Generate Functional Requirements
   → Each requirement must be testable
6. Identify Key Entities
   → VideoGenerator module, JimengClient class
7. Run Review Checklist
8. Return: SUCCESS (spec ready for planning)
```

---

## Clarifications

### Session 2025-01-30
- Q: 是否需要保持公共API不变？ → A: 是
- Q: 是否需要保持现有测试不变？ → A: 是
- Q: 是否需要同时提取主体参考视频生成功能（generateMainReferenceVideo）？该功能目前在独立文件MainReferenceVideoGenerator.ts中 → A: 是

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
开发人员需要将JimengClient中的视频生成相关代码提取到独立模块，以提高代码的可维护性和模块化程度，同时确保现有功能不受影响。

### Acceptance Scenarios
1. **Given** JimengClient类当前包含视频生成代码（约2860行），**When** 执行代码重构，**Then** 视频生成功能被提取到独立模块且原有功能正常工作
2. **Given** 现有的视频生成API调用，**When** 重构完成后，**Then** API接口保持不变，调用方无需修改代码
3. **Given** 现有的测试用例，**When** 重构完成后，**Then** 所有测试用例继续通过
4. **Given** 视频生成的三种模式（传统模式、多帧模式、主体参考模式），**When** 重构后，**Then** 所有模式都能正常工作

### Edge Cases
- 如果提取过程中发现循环依赖，如何处理？
- 如果某些私有方法被视频和图片生成共享，如何分配归属？
- 如何处理视频生成中的积分检查逻辑？

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: 系统必须将视频生成相关的方法从JimengClient提取到独立模块
- **FR-002**: 系统必须保持现有的视频生成公共API不变（generateVideo, videoPostProcess, generateMainReferenceVideo）
- **FR-003**: 系统必须保持现有测试用例的有效性，无需修改测试代码
- **FR-004**: 系统必须保持向后兼容性，不破坏现有的API调用
- **FR-005**: 系统必须将以下视频相关方法迁移到新模块：
  - generateVideo (主入口)
  - generateTraditionalVideo (传统模式)
  - generateMultiFrameVideo (多帧模式)
  - videoPostProcess (视频后处理)
  - pollVideoResult (视频结果轮询)
  - generateMainReferenceVideo (主体参考模式，当前在MainReferenceVideoGenerator.ts中)
- **FR-006**: 系统必须最小化对JimengClient其他部分的改动
- **FR-007**: 系统必须保留视频生成所需的辅助方法和工具函数访问权限
- **FR-008**: 系统必须确保MainReferenceVideoGenerator.ts的功能正确集成到新的视频生成模块中

### Key Entities *(include if feature involves data)*
- **JimengClient**: 当前包含所有API功能的主类，需要精简视频生成相关代码
- **VideoGenerator**: 新的独立模块，负责视频生成的所有逻辑
- **VideoGenerationParams**: 视频生成参数类型，定义视频生成所需的输入
- **VideoPostProcessUnifiedParams**: 视频后处理参数类型

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

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
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---