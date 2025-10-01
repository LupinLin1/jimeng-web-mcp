# Feature Specification: 统一图像生成接口与多帧提示词功能

**Feature Branch**: `004-generateimage-frames-prompt`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "把生成图像同步和异步方法合为一个。提供是一个是否异步的参数。generateImage增加多一个frames的字符串数组参数，在需要一次性生成多张不同的图片时可以使用，如果这个参数非空，就把这些字符串连在一起和原prompt再加上'一共X张图片'形成最终的Prompt，数组长度最长为15."

## Execution Flow (main)
```
1. Parse user description from Input
   → Identified: 统一同步/异步接口 + 多帧提示词生成功能
2. Extract key concepts from description
   → Actors: API用户、开发者
   → Actions: 生成图像、合并提示词、选择同步/异步模式
   → Data: frames数组(最多15个)、是否异步参数
   → Constraints: 数组长度≤15、自动拼接提示词
3. Mark unclear aspects:
   → [ALREADY CLEAR] frames数组为空时的行为
   → [ALREADY CLEAR] 异步参数的默认值
4. Fill User Scenarios & Testing section
   → Primary: 使用frames数组生成多个不同场景的图片
   → Edge: frames数组超长、空数组、空字符串处理
5. Generate Functional Requirements
   → 每个需求都可通过单元测试验证
6. Identify Key Entities
   → ImageGenerationParams接口扩展
7. Review Checklist
   → 无实现细节、需求明确可测
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
作为使用即梦MCP SDK的开发者，我希望能够：
1. 使用统一的`generateImage`方法进行图像生成，无需区分同步/异步调用
2. 通过一个简单的参数控制是立即返回结果还是返回任务ID
3. 当需要生成多个不同场景的图片时，可以提供一个场景描述数组，系统自动将这些描述组合成完整的提示词
4. 系统自动在最终提示词中添加总数说明，提高AI对生成数量的理解

### Acceptance Scenarios

#### 场景1: 同步模式生成单张图片（保持现有行为）
- **Given** 开发者调用`generateImage({ prompt: "一只猫", async: false })`
- **When** 系统执行生成请求
- **Then** 方法等待生成完成并返回图片URL数组

#### 场景2: 异步模式生成图片（保持现有行为）
- **Given** 开发者调用`generateImage({ prompt: "一只猫", async: true })`
- **When** 系统提交生成任务
- **Then** 方法立即返回historyId字符串，不等待生成完成

#### 场景3: 使用frames数组生成多场景图片
- **Given** 开发者调用`generateImage({ prompt: "科幻电影分镜", frames: ["实验室场景", "时空隧道", "外星球"], count: 3 })`
- **When** 系统处理请求
- **Then** 最终提示词变为: "科幻电影分镜 实验室场景 时空隧道 外星球，一共3张图"
- **And** 系统按照count参数生成3张图片

#### 场景4: frames数组为空时回退到标准行为
- **Given** 开发者调用`generateImage({ prompt: "一只猫", frames: [] })`
- **When** 系统处理请求
- **Then** frames数组被忽略，使用原始prompt："一只猫"

#### 场景5: frames数组与count参数配合使用
- **Given** 开发者调用`generateImage({ prompt: "宋式住宅", frames: ["玄关", "客厅", "卧室"], count: 3 })`
- **When** 系统处理请求
- **Then** 最终提示词: "宋式住宅 玄关 客厅 卧室，一共3张图"
- **And** 生成数量以count参数为准

### Edge Cases

#### 数组长度限制
- **What happens when** frames数组长度超过15？
  - 系统必须截断数组到前15个元素
  - 系统应该记录警告日志
  - 最终count不受frames数组截断影响

#### 空值处理
- **What happens when** frames数组包含空字符串或null？
  - 系统必须过滤掉空值和null值
  - 只使用有效的非空字符串

#### 异步参数缺失
- **What happens when** async参数未提供？
  - 系统必须默认为同步模式(async: false)
  - 保持向后兼容现有代码

#### frames与prompt冲突
- **What happens when** 同时提供了详细prompt和frames数组？
  - 系统必须将两者组合：先prompt再frames内容
  - 例如: `prompt: "电影分镜", frames: ["场景1", "场景2"]` → "电影分镜 场景1 场景2，一共X张图"

---

## Requirements

### Functional Requirements

#### 接口统一
- **FR-001**: 系统必须提供统一的`generateImage`方法，同时支持同步和异步两种执行模式
- **FR-002**: 系统必须通过`async`布尔参数控制执行模式，默认值为`false`（同步）
- **FR-003**: 当`async: false`时，系统必须等待生成完成并返回图片URL数组
- **FR-004**: 当`async: true`时，系统必须立即返回historyId字符串
- **FR-005**: 系统必须保持与现有`generateImage`和`generateImageAsync`方法的100%向后兼容

#### 多帧提示词功能
- **FR-006**: 系统必须接受`frames`参数，类型为字符串数组，最大长度15
- **FR-007**: 当`frames`数组非空时，系统必须将数组元素与原始prompt组合
- **FR-008**: 组合规则必须为: `"{prompt} {frames[0]} {frames[1]} ... {frames[n]}，一共{count}张图"`
- **FR-009**: 系统必须在最终提示词末尾添加"一共X张图"，其中X为`count`参数值
- **FR-010**: 当`frames`数组为空或未提供时，系统必须使用原始prompt，不做修改

#### 数组长度限制
- **FR-011**: 系统必须限制`frames`数组最大长度为15个元素
- **FR-012**: 当`frames`数组长度超过15时，系统必须截断到前15个元素
- **FR-013**: 系统必须在截断发生时记录警告日志
- **FR-014**: 数组截断不得影响`count`参数的实际生成数量

#### 空值处理
- **FR-015**: 系统必须过滤`frames`数组中的空字符串("")
- **FR-016**: 系统必须过滤`frames`数组中的null和undefined值
- **FR-017**: 过滤后的数组为空时，系统必须回退到标准prompt处理

#### 参数组合
- **FR-018**: 系统必须支持`frames`、`prompt`、`count`参数的任意组合
- **FR-019**: 当同时提供`prompt`和`frames`时，系统必须先使用prompt内容，再追加frames内容
- **FR-020**: 最终提示词的总字符数必须符合AI模型的限制

### Key Entities

#### ImageGenerationParams（扩展）
- **async**: 布尔值，控制是否异步执行，默认false
- **frames**: 字符串数组，可选，最大15个元素，每个元素描述一个场景/分镜
- **prompt**: 字符串，主提示词（现有）
- **count**: 数字，生成图片数量（现有）
- **其他参数**: 保持不变（model, aspectRatio, filePath等）

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
- [x] Ambiguities marked (none found - spec is clear)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Notes

### Design Rationale
1. **统一接口**: 减少API学习成本，用户只需记住一个方法
2. **frames数组**: 支持多场景描述，特别适用于故事分镜、空间漫游等用例
3. **自动拼接**: 减轻用户手动组合提示词的负担
4. **15个限制**: 对齐即梦AI的count参数上限

### Backward Compatibility
- 现有代码无需修改即可继续工作
- `async`参数默认false保持同步行为
- `frames`参数可选，不影响现有调用

### Impact Analysis
- 影响模块: ImageGenerator类
- 兼容性: 100%向后兼容
- 破坏性变更: 无
