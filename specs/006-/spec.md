# Feature Specification: 代码库简化与重构

**Feature Branch**: `006-`
**Created**: 2025-10-02
**Status**: Draft
**Input**: User description: "按照上面的要求重构"

## Execution Flow (main)
```
1. Parse user description from Input
   → Context: 基于code-quality-pragmatist分析的重构建议
2. Extract key concepts from description
   → Identified: 过度工程化、不必要抽象、继承层次复杂、代码重复
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: 重构的优先级顺序]
   → [NEEDS CLARIFICATION: 是否需要保持100%向后兼容]
   → [NEEDS CLARIFICATION: 测试覆盖率目标]
4. Fill User Scenarios & Testing section
   → User flow: 开发者维护和扩展代码库
5. Generate Functional Requirements
   → 每个需求必须可测试
6. Identify Key Entities
   → 重构涉及的核心模块和类
7. Run Review Checklist
   → WARN: 存在需要澄清的实施细节
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ 聚焦于代码可维护性和开发者体验
- ❌ 避免破坏现有API和功能
- 👥 为未来的代码维护者提供更简洁的代码库

---

## Clarifications

### Session 2025-10-02
- Q: 重构是否需要分阶段执行？ → A: 按风险分阶段（先低风险代码清理→再核心架构重构）
- Q: 是否允许引入新的轻量级依赖来替代手动实现？ → A: 允许引入（如image-size替代手动解析）
- Q: 重构后是否需要进行性能测试验证？ → A: 需要完整性能测试（基准对比、负载测试）
- Q: 弃用警告系统的处理策略？ → A: 完全移除弃用警告系统
- Q: 向后兼容性的保证程度？ → A: API兼容但内部行为可调整（性能优化等）

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
作为开发者，我需要一个简洁易懂的代码库，以便快速定位问题、添加新功能和修复bug，而不会被过度的抽象和复杂的继承关系所困扰。

### Acceptance Scenarios

  1. **Given** 开发者需要添加新的图片生成功能，**When** 查看JimengClient代码，**Then**
  能在≤3个文件中找到所有图片生成逻辑（JimengClient.ts、ImageUploader.ts、相关类型定义）

  2. **Given** 开发者需要调试视频生成失败问题，**When** 追踪代码调用链，**Then**
  在≤2层调用栈中定位问题（JimengClient → VideoService，无中间继承层）

  3. **Given** 开发者需要修改轮询逻辑，**When** 查找相关代码，**Then**
  在VideoService.ts单一文件的≤30行内联代码中找到完整轮询逻辑

  4. **Given** 新开发者加入项目，**When** 阅读代码库，**Then** 能回答以下架构问题：
     - 主客户端使用什么模式？（答：组合模式）
     - HTTP请求在哪个类处理？（答：HttpClient）
     - 图片上传在哪个类？（答：ImageUploader）
     - 视频生成在哪个类？（答：VideoService）

  5. **Given** 项目需要添加新的视频生成模式，**When** 实现新功能，**Then**
  仅需在VideoService.ts添加一个新方法（无需创建新类或文件）

### Edge Cases

- **重构后向后兼容性**：现有的MCP工具调用是否仍然正常工作？
- **测试覆盖**：重构后所有测试是否仍然通过？
- **性能影响**：简化后是否影响运行性能？
- **依赖移除**：移除Zod等依赖是否影响类型安全？

---

## Requirements *(mandatory)*

### Functional Requirements

#### 核心架构简化
- **FR-001**: 系统必须将三层继承结构（CreditService → BaseClient → JimengClient）简化为组合模式
- **FR-002**: 系统必须移除手动图片格式解析代码，改用成熟的第三方库（如image-size）
- **FR-003**: 系统必须将4个独立的视频生成器类合并为单一实现或直接方法

#### 抽象层移除
- **FR-004**: 系统必须将timeout.ts的249行抽象简化为内联轮询逻辑（目标≤30行）
- **FR-005**: 系统必须将deprecation.ts的151行系统简化为简单的警告函数（目标≤10行）
- **FR-005**: 系统必须完全移除deprecation.ts弃用警告系统（151行），直接在文档中说明API变更

#### 代码清理
- **FR-007**: 系统必须移除生产代码中过多的调试日志（保留关键错误和状态日志）
- **FR-008**: 系统必须合并重复的测试文件，建立清晰的测试组织结构
- **FR-009**: 系统必须将9个碎片化的工具文件整合为3-4个有明确职责的文件

#### 向后兼容性
- **FR-010**: 系统必须保持所有现有MCP工具的API签名不变，但允许内部实现优化和行为调整
- **FR-011**: 系统必须确保所有现有功能测试在重构后仍然通过
- **FR-012**: 系统必须保持generateImage的继续生成功能正常工作，允许性能优化

#### 代码质量目标
- **FR-013**: 重构后代码库总行数必须减少至少30%（从3000+行到2000行以下）
- **FR-014**: 系统必须保持或提高TypeScript类型安全性
- **FR-015**: 系统必须减少文件间的依赖关系，降低耦合度

#### 执行策略
- **FR-016**: 重构必须按风险分阶段执行：阶段1-低风险代码清理（日志、测试、工具文件整合），阶段2-核心架构重构（继承层次、视频生成器）
- **FR-017**: 允许引入轻量级成熟依赖来替代手动实现（例如使用image-size库替代手动图片格式解析）

#### 质量保证
- **FR-018**: 重构后必须进行完整性能测试，包括重构前后的基准对比和负载测试，确保无性能退化
- **FR-019**: 完全移除弃用警告系统（deprecation.ts），直接更新API文档说明变更

### Key Entities *(重构涉及的核心模块)*

- **JimengClient（主客户端）**:
  - 当前：继承自BaseClient，包含图片和视频生成功能
  - 目标：使用组合模式的独立类，清晰的职责划分

- **BaseClient（基础客户端）**:
  - 当前：757行的基类，包含HTTP、上传、认证、日志等混杂功能
  - 目标：拆分为独立的服务类（HttpClient、ImageUploader等）

- **VideoGenerator（视频生成器）**:
  - 当前：1676行的基类+3个独立的子类生成器
  - 目标：单一的视频服务类或JimengClient的直接方法

- **Utils模块（工具模块）**:
  - 当前：9个碎片化文件，包含过度抽象（timeout、deprecation）
  - 目标：3-4个职责清晰的工具文件，移除不必要的抽象

- **Test Suite（测试套件）**:
  - 当前：20+个重复的测试文件，组织混乱
  - 目标：清晰的三层测试结构（unit/integration/e2e）

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
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## 附加说明

### 重构收益预期
- **代码行数减少**: 从3000+行减少到约2000行（减少33%）
- **文件数量减少**: 移除或合并约10-15个文件
- **维护成本降低**: 新开发者上手时间从数天减少到数小时
- **调试效率提升**: 问题定位时间减少50%以上

### 风险评估
- **向后兼容性风险**: 中等（需要充分的测试覆盖）
- **功能回归风险**: 低（保持现有测试通过）
- **性能影响风险**: 极低（主要是结构性重构）

### 依赖影响
- **可能移除**: Zod（如果验证需求简单）
- **可能添加**: image-size（替代手动解析）
- **保持不变**: MCP SDK、TypeScript核心依赖
