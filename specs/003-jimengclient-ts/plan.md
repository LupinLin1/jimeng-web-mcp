# 实施计划：从 JimengClient.ts 中提取图像生成代码

**分支**: `003-jimengclient-ts` | **日期**: 2025-10-01 | **规格**: [spec.md](./spec.md)
**输入**: 功能规格来自 `/specs/003-jimengclient-ts/spec.md`

## 执行流程（/plan 命令范围）
```
1. 从输入路径加载功能规格
   → 如果未找到：错误 "在 {path} 找不到功能规格"
2. 填写技术上下文（扫描需要澄清的内容）
   → 从文件系统结构或上下文检测项目类型（web=前端+后端，mobile=应用+API）
   → 基于项目类型设置结构决策
3. 根据宪法文档内容填写宪法检查部分
4. 评估下面的宪法检查部分
   → 如果存在违规：在复杂性跟踪中记录
   → 如果无法提供理由：错误 "首先简化方法"
   → 更新进度跟踪：初始宪法检查
5. 执行阶段 0 → research.md
   → 如果仍有需要澄清的内容：错误 "解决未知问题"
6. 执行阶段 1 → 合约、data-model.md、quickstart.md、特定代理模板文件
7. 重新评估宪法检查部分
   → 如果有新违规：重构设计，返回阶段 1
   → 更新进度跟踪：设计后宪法检查
8. 规划阶段 2 → 描述任务生成方法（不创建 tasks.md）
9. 停止 - 准备好执行 /tasks 命令
```

**重要**: /plan 命令在步骤 7 停止。阶段 2-4 由其他命令执行：
- 阶段 2：/tasks 命令创建 tasks.md
- 阶段 3-4：实施执行（手动或通过工具）

## 摘要

将 JimengClient.ts 中约 800 行的图像生成代码提取到独立的 ImageGenerator 模块，以改善代码组织和可维护性。此重构必须保持 100% 向后兼容性，所有现有的公共 API（`generateImage`、`generateImageAsync`、`getImageResult`、`getBatchResults`）继续工作。采用与现有 VideoGenerator 相同的委托模式，JimengClient 保留公共接口并委托给新的 ImageGenerator 实现。

## 技术上下文

**语言/版本**: TypeScript 5.8.3, Node.js（ESM 模块）
**主要依赖**:
- @modelcontextprotocol/sdk ^1.10.2（MCP 协议）
- axios ^1.9.0（HTTP 请求）
- zod ^3.24.3（参数验证）
- uuid ^11.1.0（ID 生成）
- crc32 ^0.2.2（校验和计算）

**存储**: 内存中的静态缓存（asyncTaskCache、continuationSent Map）用于跟踪异步任务
**测试**: Jest 29.7.0，NODE_OPTIONS=--experimental-vm-modules（ESM 兼容性）
**目标平台**: Node.js 服务器，支持 npx 零安装部署
**项目类型**: 单一项目（MCP 服务器 + TypeScript 库）
**性能目标**:
- 图像生成：支持批量请求，count > 4 自动继续生成
- 轮询：30 次最大轮询，5 分钟总体超时
- 内存：静态缓存用于参数复用

**约束**:
- 必须保持向后兼容性（零破坏性更改）
- 必须保留 getApiClient() 单例模式
- 必须支持现有的 15 个私有辅助方法
- 所有现有测试必须无需修改即可通过

**规模/范围**:
- 提取约 800 行代码（generateImage 相关功能）
- 保留 JimengClient.ts 中约 900 行（视频生成和其他功能）
- 15 个私有辅助方法需要迁移
- 4 个公共 API 方法需要委托

## 宪法检查
*门禁：必须在阶段 0 研究之前通过。阶段 1 设计后重新检查。*

根据 `.specify/memory/constitution.md` 验证是否符合宪法原则：

- [x] **最小代码更改**: 这个功能是否避免修改现有代码？新模块优先？
  - ✅ **通过** - 创建新的 `src/api/image/ImageGenerator.ts` 模块
  - ✅ **通过** - JimengClient.ts 只需最小更改（删除迁移的方法，添加委托调用）
  - ✅ **通过** - 其他文件无需更改

- [x] **模块化扩展架构**: 这是否作为具有清晰接口的自包含模块实现？
  - ✅ **通过** - ImageGenerator 继承 BaseClient（与 VideoGenerator 相同模式）
  - ✅ **通过** - 通过构造函数注入 refreshToken
  - ✅ **通过** - 所有依赖显式声明（类型、工具）

- [x] **向后兼容性**: 所有现有 API 签名是否保留？新参数可选？
  - ✅ **通过** - 所有公共方法签名完全相同
  - ✅ **通过** - JimengClient 委托给 ImageGenerator，对用户透明
  - ✅ **通过** - getApiClient() 单例模式保持不变
  - ✅ **通过** - 导出保持不变（src/api.ts, src/index.ts）

- [x] **测试驱动开发**: 测试是否在实施之前编写？
  - ✅ **通过** - 所有现有测试已存在（image-generation.test.ts, async-image-generation.test.ts）
  - ✅ **通过** - 重构后测试无需修改即可通过（验证向后兼容性）
  - ✅ **通过** - backward-compatibility.test.ts 验证 API 稳定性

- [x] **API 合约稳定性**: 外部集成是否隔离在稳定的内部合约之后？
  - ✅ **通过** - 即梦 API 调用封装在 ImageGenerator 中
  - ✅ **通过** - 类型定义（ImageGenerationParams、QueryResultResponse）保持不变
  - ✅ **通过** - MCP 工具定义无需更改

**违规**: 无

**缓解措施**: 不适用 - 此重构完全符合所有宪法原则

## 项目结构

### 文档（此功能）
```
specs/003-jimengclient-ts/
├── spec.md              # 功能规格说明
├── plan.md              # 此文件（/plan 命令输出）
├── research.md          # 阶段 0 输出（/plan 命令）
├── data-model.md        # 阶段 1 输出（/plan 命令）
├── quickstart.md        # 阶段 1 输出（/plan 命令）
├── contracts/           # 阶段 1 输出（/plan 命令）
└── tasks.md             # 阶段 2 输出（/tasks 命令 - 不由 /plan 创建）
```

### 源代码（仓库根目录）

```
src/
├── api/
│   ├── BaseClient.ts           # 现有 - 基础客户端类（HTTP、上传）
│   ├── CreditService.ts        # 现有 - 积分服务
│   ├── ApiClient.ts            # 现有 - 传统 HTTP 客户端
│   ├── JimengClient.ts         # 修改 - 删除图像生成方法，添加委托
│   ├── image/                  # 新建 - 图像生成模块
│   │   ├── ImageGenerator.ts   # 新建 - 主要图像生成类
│   │   └── index.ts            # 新建 - 导出
│   └── video/                  # 现有 - 视频生成模块
│       ├── VideoGenerator.ts
│       ├── MainReferenceVideoGenerator.ts
│       └── index.ts
├── types/
│   ├── api.types.ts            # 现有 - 保持不变
│   ├── models.ts               # 现有 - 保持不变
│   └── ...
├── utils/                      # 现有 - 保持不变
├── api.ts                      # 现有 - 向后兼容导出，保持不变
├── index.ts                    # 现有 - 主导出，保持不变
└── server.ts                   # 现有 - MCP 服务器，保持不变

src/__tests__/
├── image-generation.test.ts        # 现有 - 无需修改
├── async-image-generation.test.ts  # 现有 - 无需修改
├── backward-compatibility.test.ts  # 现有 - 验证重构
└── ...                             # 其他测试保持不变
```

**结构决策**: 采用单一项目结构，新建 `src/api/image/` 目录与现有 `src/api/video/` 目录对称。ImageGenerator 类继承 BaseClient，遵循与 VideoGenerator 相同的架构模式。这保持了代码组织的一致性，使开发者易于理解。

## 阶段 0：大纲与研究

### 研究任务

1. **分析现有架构模式**
   - 研究 VideoGenerator 如何从 JimengClient 分离
   - 研究 VideoGenerator 如何继承 BaseClient
   - 研究 JimengClient 如何委托给 VideoGenerator

2. **识别需要迁移的代码**
   - 图像生成公共方法（4 个）
   - 图像生成私有辅助方法（15 个）
   - 静态属性（asyncTaskCache, continuationSent）
   - 导入依赖

3. **分析依赖关系**
   - ImageGenerator 需要从 BaseClient 继承什么
   - ImageGenerator 需要哪些类型定义
   - ImageGenerator 需要哪些工具函数

4. **验证测试覆盖**
   - 识别依赖 JimengClient.generateImage() 的测试
   - 验证测试不依赖内部实现细节
   - 确认测试只测试公共 API

**输出**: `research.md`，包含：
- 迁移策略（基于 VideoGenerator 模式）
- 需要迁移的完整方法列表
- 依赖关系图
- 测试影响分析

## 阶段 1：设计与合约

*前提条件：research.md 完成*

### 1. 数据模型（data-model.md）

**实体**:
- **ImageGenerator 类**
  - 继承：BaseClient
  - 静态属性：asyncTaskCache, continuationSent
  - 公共方法：generateImage, generateImageAsync, getImageResult, getBatchResults
  - 私有方法：15 个辅助方法

- **JimengClient 类（修改后）**
  - 新增属性：imageGen: ImageGenerator
  - 委托方法：4 个图像生成公共方法
  - 保留：所有视频生成方法

### 2. API 合约（contracts/）

**内部合约**（不是 REST API，是类接口）:
```typescript
// contracts/ImageGenerator.interface.ts
interface IImageGenerator {
  generateImage(params: ImageGenerationParams): Promise<string[]>;
  generateImageAsync(params: ImageGenerationParams): Promise<string>;
  getImageResult(historyId: string): Promise<QueryResultResponse>;
  getBatchResults(historyIds: string[]): Promise<{[id: string]: QueryResultResponse | {error: string}}>;
}
```

### 3. 合约测试

现有测试已覆盖：
- `src/__tests__/image-generation.test.ts` - 同步图像生成
- `src/__tests__/async-image-generation.test.ts` - 异步图像生成
- `src/__tests__/backward-compatibility.test.ts` - API 向后兼容性

这些测试在重构后必须无需修改即可通过。

### 4. 快速开始（quickstart.md）

重构验证步骤：
1. 运行现有测试：`yarn test`
2. 验证构建：`yarn build`
3. 验证类型检查：`yarn type-check`
4. 手动测试：使用 MCP Inspector 测试图像生成

### 5. 更新代理上下文

运行：`.specify/scripts/bash/update-agent-context.sh claude`

**输出**:
- `data-model.md` - ImageGenerator 和 JimengClient 的类设计
- `contracts/ImageGenerator.interface.ts` - 接口定义
- `quickstart.md` - 重构验证步骤
- `CLAUDE.md` - 更新的项目上下文

## 阶段 2：任务规划方法
*此部分描述 /tasks 命令将执行的操作 - 在 /plan 期间不执行*

**任务生成策略**:
1. 从 `.specify/templates/tasks-template.md` 加载基础模板
2. 基于阶段 1 设计文档生成任务
3. 按 TDD 顺序：测试保持不变 → 实施 → 验证

**任务类别**:
- **准备任务**：创建目录结构、设置导出
- **迁移任务**：
  - 创建 ImageGenerator 类骨架（继承 BaseClient）
  - 迁移静态属性（asyncTaskCache、continuationSent）
  - 迁移公共方法（4 个，一次一个）
  - 迁移私有辅助方法（15 个，分组迁移）
- **集成任务**：
  - 在 JimengClient 中添加 ImageGenerator 实例
  - 添加委托方法
  - 更新导入
- **验证任务**：
  - 运行所有测试
  - 验证类型检查
  - 验证构建
  - 验证向后兼容性

**排序策略**:
- 顺序执行（重构不适合并行）
- 测试优先（确保测试无需修改即可通过）
- 增量迁移（一次迁移一个方法，频繁验证）

**预计输出**: 15-20 个编号、有序的任务，在 tasks.md 中

**重要**: 此阶段由 /tasks 命令执行，不由 /plan 执行

## 阶段 3+：未来实施
*这些阶段超出了 /plan 命令的范围*

**阶段 3**: 任务执行（/tasks 命令创建 tasks.md）
**阶段 4**: 实施（按照宪法原则执行 tasks.md）
**阶段 5**: 验证（运行测试、执行 quickstart.md、向后兼容性验证）

## 复杂性跟踪
*仅在宪法检查有必须证明的违规时填写*

无违规 - 此重构完全符合所有宪法原则。

## 进度跟踪
*此检查清单在执行流程期间更新*

**阶段状态**:
- [x] 阶段 0：研究完成（/plan 命令）✅ 2025-10-01
- [x] 阶段 1：设计完成（/plan 命令）✅ 2025-10-01
- [x] 阶段 2：任务规划完成（/plan 命令 - 仅描述方法）✅ 2025-10-01
- [x] 阶段 3：任务生成完成（/tasks 命令）✅ 2025-10-01
- [ ] 阶段 4：实施完成
- [ ] 阶段 5：验证通过

**门禁状态**:
- [x] 初始宪法检查：通过 ✅
- [x] 设计后宪法检查：通过 ✅
- [x] 所有需要澄清的内容已解决 ✅
- [x] 复杂性偏差已记录 ✅（无违规）

---
*基于宪法 v1.0.0 - 参见 `.specify/memory/constitution.md`*
