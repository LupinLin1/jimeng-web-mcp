# Tasks: 代码库简化与重构

**Input**: Design documents from `/specs/006-/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md
**Branch**: `006-`
**Execution Strategy**: 按风险分阶段执行

---

## 执行流程概览

### 阶段1：低风险代码清理（T001-T012）
- 测试文件重组
- 日志清理
- 工具文件整合
- 性能基线建立

### 阶段2：核心架构重构（T013-T030）
- 创建独立服务类（组合模式）
- 重构JimengClient
- 合并视频生成器
- 移除旧继承类
- 集成image-size库
- 移除Zod和deprecation

### 阶段3：验收与文档（T031-T038）
- 功能验证
- 性能测试
- 向后兼容性验证
- 文档更新

---

## Phase 3.1: 阶段1 - 低风险代码清理

### 测试文件重组
- [ ] **T001** [P] 创建新测试目录结构 `tests/unit/`, `tests/integration/`, `tests/e2e/`
- [ ] **T002** [P] 移动单元测试文件到 `tests/unit/`
  - 从根目录和现有tests/子目录移动所有单元测试
  - 删除重复的测试文件（timeout.test.ts, deprecation.test.ts等）
- [ ] **T003** [P] 移动集成测试文件到 `tests/integration/`
  - 整合image-generation.test.ts, video-generation.test.ts
  - 整合async-*.test.ts到集成测试
- [ ] **T004** [P] 移动端到端测试到 `tests/e2e/`
  - MCP工具测试归类为e2e测试
- [ ] **T005** 删除根目录下的旧测试文件
  - 清理tests/根目录的冗余文件
  - 确保无重复测试

### 日志清理
- [ ] **T006** [P] 清理src/server.ts中的调试日志
  - 移除过多的logger.debug和console.log
  - 保留关键的error、warn、info日志
- [ ] **T007** [P] 清理src/api/中的调试日志
  - 检查JimengClient.ts, BaseClient.ts等
  - 仅保留关键状态日志

### 工具文件整合准备
- [ ] **T008** [P] 创建新工具文件结构
  - 创建 `src/utils/http.ts`（空文件，准备整合auth.ts和a_bogus.ts）
  - 创建 `src/utils/image.ts`（空文件，准备整合dimensions.ts和上传逻辑）
  - 创建 `src/utils/validation.ts`（空文件，准备整合验证逻辑）
  - 保留 `src/utils/logger.ts`

### 性能基线
- [ ] **T009** 创建性能测试脚本 `tests/performance/baseline.test.ts`
  - 测试图片生成延迟
  - 测试视频生成延迟
  - 测试内存占用
  - 记录重构前基准数据

### 阶段1验证
- [ ] **T010** 运行所有测试确保重组后通过
  - `npm test`
  - 验证tests/unit/, integration/, e2e/分层正确
- [ ] **T011** 运行性能基线测试
  - `npm run test:performance`
  - 保存基线数据到文件
- [ ] **T012** Git提交阶段1完成
  - 提交消息："refactor(stage1): 低风险代码清理完成 - 测试重组、日志清理、工具结构准备"

---

## Phase 3.2: 阶段2 - 核心架构重构

### 创建独立服务类（组合模式基础）
- [ ] **T013** [P] 创建HttpClient类 `src/api/HttpClient.ts`
  - 实现IHttpClient接口
  - 整合auth.ts和a_bogus.ts中的认证逻辑
  - 实现request方法和generateAuth方法
  - 迁移BaseClient中的HTTP相关代码
  - 单元测试：`tests/unit/http-client.test.ts`

- [ ] **T014** [P] 创建ImageUploader类 `src/api/ImageUploader.ts`
  - 实现IImageUploader接口
  - **安装image-size依赖**: `npm install image-size @types/image-size`
  - 使用image-size库替代手动格式检测（移除BaseClient的132行解析代码）
  - 实现upload, uploadBatch, detectFormat方法
  - 单元测试：`tests/unit/image-uploader.test.ts`

- [ ] **T015** [P] 创建CreditService类 `src/api/CreditService.ts`
  - 实现ICreditService接口
  - 迁移现有CreditService的积分逻辑
  - 改为组合模式（使用HttpClient而非继承）
  - 单元测试：`tests/unit/credit-service.test.ts`

### 创建VideoService（合并4个生成器）
- [ ] **T016** 创建VideoService类 `src/api/VideoService.ts`
  - 实现IVideoService接口
  - 合并TextToVideoGenerator, MultiFrameVideoGenerator, MainReferenceVideoGenerator功能
  - **内联轮询逻辑**（≤30行）：移除timeout.ts依赖，直接实现pollUntilComplete
  - 实现generateTextToVideo, generateMultiFrame, generateMainReference方法
  - 共享内部方法：uploadFrames, submitTask, pollUntilComplete
  - 单元测试：`tests/unit/video-service.test.ts`

### 重构JimengClient为组合模式
- [ ] **T017** 重构JimengClient `src/api/JimengClient.ts`
  - **移除extends BaseClient**
  - 使用组合模式：注入HttpClient, ImageUploader, CreditService, VideoService
  - 保持所有现有API签名不变（向后兼容）
  - 实现generateImage逻辑（保留继续生成功能）
  - 委托视频生成方法到VideoService
  - 委托积分方法到CreditService
  - 旧generateVideo方法静默重定向到新方法（无警告）

  - [ ] **T018** 删除旧的继承层次文件 **[预估删除: ~2500行]**
    - 删除 `src/api/BaseClient.ts` (~757行)
    - 删除 `src/api/video/VideoGenerator.ts` (~1676行)
    - 删除 `src/api/video/TextToVideoGenerator.ts` (~200行估)
    - 删除 `src/api/video/MultiFrameVideoGenerator.ts` (~200行估)
    - 删除 `src/api/video/MainReferenceVideoGenerator.ts` (~200行估)

  - [ ] **T019** [P] 移除deprecation系统 **[预估删除: ~151行]**
    - 删除 `src/utils/deprecation.ts` (151行)
    - 移除所有对deprecate函数的引用
    - 更新CHANGELOG记录弃用方法移除

  - [ ] **T020** [P] 移除timeout抽象 **[预估删除净: ~219行]**
    - 删除 `src/utils/timeout.ts` (249行)
    - 移除相关引用
    - **注**: 替代为VideoService中≤30行内联轮询逻辑（净减少219行）

### 移除Zod验证，简化为TypeScript类型
- [ ] **T021** 简化参数验证 **[预估删除净: ~81行]**
  - 删除 `src/schemas/` 目录（Zod验证模式，~91行）
  - 在相关函数中添加简单的运行时检查（替代Zod，~10行新增）
  - 保持TypeScript类型定义（src/types/api.types.ts不变）
  - 移除package.json中的zod依赖（或移到devDependencies）
  - **净减少**: ~81行

### 整合工具文件
- [ ] **T022** 整合工具文件到新结构 **[预估删除净: ~400行]**
  - **http.ts**: 整合auth.ts (~150行) + a_bogus.ts认证部分 (~400行) → ~350行
  - **image.ts**: 整合dimensions.ts (~80行) + 上传工具 → ~100行（使用image-size简化）
  - **validation.ts**: 整合validation.ts (~100行) + 简化检查 → ~80行
  - **logger.ts**: 合并logging.ts (~70行)内容 → ~100行
  - 删除旧文件：auth.ts (150行), a_bogus.ts (400行), dimensions.ts (80行), logging.ts (70行), index.ts (100行)
  - **总删除**: ~800行，**新增**: ~630行，**净减少**: ~170行

### 更新导出和索引
- [ ] **T023** 更新src/api.ts导出
  - 导出新的HttpClient, ImageUploader, CreditService, VideoService
  - 保持JimengClient作为主导出（向后兼容）
  - 移除旧类的导出引用

- [ ] **T024** 更新src/utils/index.ts（如果存在，否则删除）
  - 导出http, image, validation, logger模块
  - 确保所有引用路径正确

### 阶段2验证
- [ ] **T025** 运行所有单元测试
  - `npm run test -- tests/unit/`
  - 验证HttpClient, ImageUploader, CreditService, VideoService单元测试通过

- [ ] **T026** 运行集成测试
  - `npm run test -- tests/integration/`
  - 验证图片生成、视频生成完整流程

- [ ] **T027** 类型检查
  - `npm run type-check`
  - 确保移除Zod后TypeScript类型安全保持

- [ ] **T028** 构建验证
  - `npm run build`
  - 确保构建成功，CJS和ESM双格式正常

  - [ ] **T029** 代码行数验证
    - 统计重构后代码行数
    - 验证减少≥30%（3000+行 → <2000行）
    - **预估删除追踪汇总**:
      - T018: ~2500行（继承层次文件）
      - T019: ~151行（deprecation系统）
      - T020: ~219行净减少（timeout抽象，249删除-30新增）
      - T021: ~81行净减少（Zod验证，91删除-10新增）
      - T022: ~170行净减少（工具整合，800删除-630新增）
      - **删除总计**: ~3121行
      - **新增估算**: HttpClient(~200) + ImageUploader(~150) + CreditService(~100) + VideoService(~300) +
  其他(~200) = ~950行
      - **净减少**: ~2171行（约42%，超过30%目标）

- [ ] **T030** Git提交阶段2完成
  - 提交消息："refactor(stage2): 核心架构重构完成 - 组合模式、视频生成器合并、移除过度抽象"

---

## Phase 3.3: 验收与文档更新

### 功能验证
- [ ] **T031** 图片生成功能测试
  - 单张图片生成
  - 继续生成（>4张）
  - 多参考图生成
  - 验证所有功能正常

- [ ] **T032** 视频生成功能测试
  - 文本生成视频
  - 多帧视频
  - 主参考视频
  - 旧API（generateVideo）兼容性

- [ ] **T033** MCP工具端到端测试
  - 启动MCP服务器：`npm start`
  - 使用MCP inspector测试所有15个工具
  - 验证参数验证和返回格式正确

### 性能测试
- [ ] **T034** 性能对比测试
  - 运行性能测试：`npm run test:performance`
  - 对比重构前后基准数据
  - 生成性能报告
  - 验证无性能退化（延迟≤基准，内存≤基准）

### 向后兼容性验证
- [ ] **T035** 向后兼容性测试
  - 运行 `tests/integration/backward-compat.test.ts`
  - 验证所有API签名不变
  - 验证旧方法（generateVideo）正确重定向
  - 验证继续生成功能保持

### 文档更新
- [ ] **T036** [P] 更新CLAUDE.md
  - 记录组合模式架构
  - 更新主要模块列表
  - 说明移除的抽象（timeout, deprecation, Zod）
  - 更新依赖说明（新增image-size）

- [ ] **T037** [P] 更新CHANGELOG.md
  - 记录重构内容（继承→组合）
  - 说明移除的系统（deprecation）
  - 列出新增依赖（image-size）
  - 标注向后兼容性保证
  - 说明旧方法重定向

- [ ] **T038** [P] 更新README.md（如需要）
  - 更新架构说明
  - 更新开发命令（如有变更）
  - 说明代码简化成果

### 最终验收
- [ ] **T039** 运行完整验收脚本
  - 运行quickstart.md中的所有验收步骤
  - 验证所有✅检查项通过
  - 确保无❌失败项

- [ ] **T040** Git提交最终完成
  - 提交消息："refactor: 代码库简化与重构完成 - 3000+行→1980行，组合模式架构，100%向后兼容"
  - 创建PR到主分支

---

## Dependencies（依赖关系）

### 阶段内依赖
- **T001-T005** (测试重组) → 可并行，但T005依赖T001-T004完成
- **T006-T007** (日志清理) → 完全并行
- **T013-T015** (独立服务类) → 完全并行
- **T016** (VideoService) → 依赖T013 (HttpClient), T014 (ImageUploader)
- **T017** (JimengClient重构) → 依赖T013, T014, T015, T016全部完成
- **T018-T022** (删除旧文件、整合工具) → 依赖T017完成
- **T036-T038** (文档更新) → 完全并行

### 阶段间依赖
- **阶段2 (T013-T030)** → 必须在阶段1 (T001-T012) 完成后
- **阶段3 (T031-T040)** → 必须在阶段2 (T013-T030) 完成后

---

## Parallel Execution Examples（并行执行示例）

### 阶段1并行任务
```bash
# 测试重组（T002-T004可并行）
Task: "移动单元测试文件到 tests/unit/"
Task: "移动集成测试文件到 tests/integration/"
Task: "移动端到端测试到 tests/e2e/"

# 日志清理（T006-T007可并行）
Task: "清理src/server.ts中的调试日志"
Task: "清理src/api/中的调试日志"
```

### 阶段2并行任务
```bash
# 独立服务类创建（T013-T015可并行）
Task: "创建HttpClient类 src/api/HttpClient.ts"
Task: "创建ImageUploader类 src/api/ImageUploader.ts"
Task: "创建CreditService类 src/api/CreditService.ts"

# 删除旧文件（T019-T020可并行）
Task: "移除deprecation系统"
Task: "移除timeout抽象"

# 文档更新（T036-T038可并行）
Task: "更新CLAUDE.md"
Task: "更新CHANGELOG.md"
Task: "更新README.md"
```

---

## Validation Checklist（验证清单）

### 任务完整性
- [x] 所有契约接口有对应实现任务（HttpClient, ImageUploader, CreditService, VideoService）
- [x] 所有架构实体有重构任务（继承→组合、视频生成器合并）
- [x] 所有测试场景有验证任务（单元、集成、e2e、性能、兼容性）
- [x] 所有并行任务真正独立（不同文件，无依赖）
- [x] 每个任务指定具体文件路径
- [x] 无任务修改同一文件（避免冲突）

### TDD原则
- [x] 新组件有单元测试（HttpClient, ImageUploader, CreditService, VideoService）
- [x] 集成测试覆盖完整流程（图片生成、视频生成）
- [x] 性能测试有基线对比
- [x] 向后兼容性有专门测试

### 分阶段风险控制
- [x] 阶段1任务低风险（测试重组、日志清理）
- [x] 阶段2任务有阶段1验证保障
- [x] 每阶段有独立验证任务
- [x] 最终有完整验收任务

---

## Notes（注意事项）

1. **[P] 标记含义**：可并行执行的任务（不同文件，无依赖）
2. **TDD顺序**：测试先行，实现后验证
3. **提交策略**：每个阶段完成后提交一次
4. **回滚计划**：如果阶段验证失败，回滚到上一阶段
5. **性能要求**：重构后性能必须≥重构前基准
6. **兼容性要求**：所有API签名必须保持不变

---

## Estimated Effort（预估工作量）

- **阶段1**: 4-6小时（测试重组、日志清理、基线建立）
- **阶段2**: 12-16小时（核心架构重构、服务类创建、文件整合）
- **阶段3**: 4-6小时（功能验证、性能测试、文档更新）
- **总计**: 20-28小时

---

## Success Criteria（成功标准）

1. ✅ 代码行数减少≥30%（<2000行）
2. ✅ 所有测试通过（单元、集成、e2e）
3. ✅ 性能无退化（延迟≤基准、内存≤基准）
4. ✅ 100% API向后兼容
5. ✅ 继续生成功能保持
6. ✅ MCP工具全部正常
7. ✅ 文档完整更新
8. ✅ 构建成功，类型检查通过

---

**READY FOR EXECUTION** - 所有任务已就绪，可按顺序或并行执行
