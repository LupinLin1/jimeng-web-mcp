# Research: 代码库简化与重构

**Date**: 2025-10-02
**Feature**: 006- 代码库简化与重构

## 研究概览

本文档记录重构相关的技术决策研究，所有技术上下文已在澄清阶段明确，无NEEDS CLARIFICATION项。

---

## 1. 继承层次重构：组合模式设计

### Decision
将三层继承（CreditService → BaseClient → JimengClient）重构为**组合模式**，创建独立服务类并通过依赖注入组合。

### Rationale
1. **降低耦合**：继承创建强耦合，组合提供松耦合
2. **职责清晰**：每个服务类单一职责（HttpClient、ImageUploader、CreditService等）
3. **易于测试**：可独立mock各个服务
4. **灵活扩展**：新功能通过添加服务而非修改继承链

### Implementation Pattern
```typescript
// 目标架构
class JimengClient {
  private httpClient: HttpClient;
  private imageUploader: ImageUploader;
  private creditService: CreditService;
  private videoService: VideoService;

  constructor(token: string) {
    this.httpClient = new HttpClient(token);
    this.imageUploader = new ImageUploader(this.httpClient);
    this.creditService = new CreditService(this.httpClient);
    this.videoService = new VideoService(this.httpClient, this.imageUploader);
  }
}
```

### Alternatives Considered
- **保持继承但简化**：仍然耦合，无法解决根本问题
- **完全函数式**：与现有面向对象架构冲突，重构成本过高

---

## 2. 图片格式解析：使用image-size库

### Decision
移除手动实现的PNG/JPEG/WebP解析代码（132行），使用`image-size`库（npm周下载1400万）。

### Rationale
1. **成熟可靠**：久经考验的库，覆盖所有边缘情况
2. **代码减少**：132行→1行函数调用
3. **维护成本低**：社区维护，自动获得bug修复和新格式支持
4. **轻量级**：100KB，符合零安装部署约束

### Implementation
```typescript
// 之前：132行手动解析
// 之后：
import sizeOf from 'image-size';
const dimensions = sizeOf(buffer);
```

### Alternatives Considered
- **保留手动解析**：维护负担重，易有bug
- **其他库（sharp）**：功能过重（图像处理），我们只需获取尺寸

---

## 3. 超时与轮询简化

### Decision
移除`timeout.ts`的249行抽象，改为内联轮询逻辑（目标≤30行）。

### Rationale
1. **使用场景单一**：仅3处使用，且都是相同的视频轮询模式
2. **过度抽象**：泛型+配置对象+错误处理，复杂度不匹配实际需求
3. **可读性提升**：内联逻辑更直观，无需跳转文件理解

### Implementation Pattern
```typescript
async function pollVideoStatus(taskId: string): Promise<string> {
  let interval = 2000;
  const startTime = Date.now();

  while (Date.now() - startTime < 600000) {
    const status = await checkStatus(taskId);
    if (status.completed) return status.url;
    if (status.failed) throw new Error(status.error);

    await sleep(interval);
    interval = Math.min(interval * 1.5, 10000);
  }
  throw new Error('Timeout after 10 minutes');
}
```

### Alternatives Considered
- **保留抽象但简化**：仍然是间接层，收益不足
- **使用第三方库**：增加依赖，不符合最小化原则

---

## 4. 弃用系统移除

### Decision
完全移除`deprecation.ts`（151行），弃用的方法直接删除或在文档中标注。

### Rationale
1. **项目年轻**：仅几周历史，无大量遗留用户
2. **API稳定后实施**：重构后API将稳定，无需复杂弃用机制
3. **文档优先**：CHANGELOG和API文档清晰说明变更即可

### Implementation
- 删除`src/utils/deprecation.ts`
- 更新CHANGELOG记录移除的方法
- 在README添加迁移指南（如有需要）

### Alternatives Considered
- **保留简化版（warnOnce）**：仍需维护，且项目规模不需要

---

## 5. Zod验证简化

### Decision
移除`src/schemas/`中的Zod验证，改用TypeScript类型+简单运行时检查。

### Rationale
1. **MCP SDK已验证**：参数已在框架层验证
2. **类型安全足够**：TypeScript编译期检查
3. **减少依赖**：移除Zod依赖
4. **性能提升**：无运行时验证开销

### Implementation
```typescript
// 之前：Zod schema
const schema = z.object({
  frames: z.array(...).min(2).max(10).refine(...)
});

// 之后：TypeScript + 简单检查
interface MultiFrameOptions {
  frames: FrameConfig[];
}

function validateFrames(frames: FrameConfig[]) {
  if (frames.length < 2 || frames.length > 10) {
    throw new Error('需要2-10个帧');
  }
}
```

### Alternatives Considered
- **保留Zod但简化**：仍然是额外依赖，收益不大
- **使用其他验证库**：同样问题

---

## 6. 视频生成器合并

### Decision
将4个独立视频生成器类合并为`VideoService`单一类或直接作为JimengClient的方法。

### Rationale
1. **代码重复**：各生成器共享大量逻辑（轮询、上传、错误处理）
2. **简化调用链**：消除3层委托（JimengClient → VideoGenerator → Specific Generator）
3. **易于维护**：所有视频逻辑在一处

### Implementation Pattern
```typescript
class VideoService {
  async generateTextToVideo(params: TextToVideoParams) { /* ... */ }
  async generateMultiFrame(params: MultiFrameParams) { /* ... */ }
  async generateMainReference(params: MainRefParams) { /* ... */ }

  private async pollStatus(taskId: string) { /* 共享轮询逻辑 */ }
}
```

### Alternatives Considered
- **保持独立但重构共享逻辑**：仍然多文件，导航复杂
- **完全内联到JimengClient**：单个文件过大，考虑VideoService作为独立类

---

## 7. 测试组织清理

### Decision
重组20+测试文件为清晰的三层结构：unit/、integration/、e2e/。

### Rationale
1. **消除重复**：当前有多个测试相同功能的文件
2. **清晰分层**：按测试类型组织，易于运行特定层级
3. **提升速度**：单元测试快速反馈，集成测试深度验证

### Test Organization
```
tests/
├── unit/                    # 快速单元测试
│   ├── image-generation.test.ts
│   ├── video-service.test.ts
│   ├── http-client.test.ts
│   └── utils.test.ts
├── integration/             # API集成测试
│   ├── full-flow.test.ts
│   └── backward-compat.test.ts
└── e2e/                     # 端到端测试
    └── mcp-tools.test.ts
```

### Alternatives Considered
- **保持当前结构但删重复**：仍然混乱
- **单一tests/文件夹**：大型项目不可扩展

---

## 8. 工具文件整合

### Decision
将9个碎片化工具文件整合为3-4个职责清晰的文件。

### Rationale
1. **减少导航开销**：相关功能集中
2. **明确职责**：每个文件单一领域
3. **易于发现**：新开发者快速找到所需工具

### Target Structure
```
src/utils/
├── http.ts          # HTTP相关：认证、请求封装
├── image.ts         # 图片相关：上传、尺寸检测
├── validation.ts    # 验证相关：参数检查、格式验证
└── logger.ts        # 日志相关（保持独立）
```

### Consolidation Mapping
- `auth.ts` + 部分`a_bogus.ts` → `http.ts`
- `dimensions.ts` + 上传逻辑 → `image.ts`
- `validation.ts` + 简化的检查 → `validation.ts`
- 删除：`timeout.ts`, `deprecation.ts`, `logging.ts`（合并到logger）

### Alternatives Considered
- **保持9个文件**：导航成本高
- **合并为1个大文件**：违反单一职责

---

## 9. 性能测试策略

### Decision
建立完整性能测试基准，包括重构前后对比和负载测试。

### Rationale
1. **验证无退化**：确保重构不影响性能
2. **发现优化点**：可能通过简化提升性能
3. **建立基线**：未来变更的性能参考

### Performance Metrics
- **图片生成延迟**：单张/继续生成（>4张）
- **视频生成延迟**：各模式（文生视频、多帧、主参考）
- **内存占用**：重构前后对比
- **CPU使用**：轮询和上传操作
- **吞吐量**：并发请求处理能力

### Tools
- **基准测试**：自定义脚本 + Node.js perf_hooks
- **负载测试**：模拟多并发场景
- **对比报告**：重构前后数据对比表

### Alternatives Considered
- **仅冒烟测试**：无法发现性能退化
- **无性能测试**：存在风险，不符合质量要求

---

## 10. 日志清理策略

### Decision
移除生产代码中的过多调试日志，保留关键错误和状态日志。

### Rationale
1. **可读性提升**：实际逻辑不被日志淹没
2. **性能优化**：减少I/O操作
3. **专业性**：生产代码应精简

### Log Level Guidelines
- **保留**：ERROR（错误）、WARN（重要警告）、INFO（关键状态变化）
- **移除**：DEBUG（详细调试信息）、过多的参数dump

### Example
```typescript
// 移除
logger.debug('generateImage tool called!');
logger.debug('Timestamp:', new Date().toISOString());
logger.debug('Raw params received:', JSON.stringify(params, null, 2));

// 保留
logger.error('Image generation failed:', error);
logger.info('Generated 10 images for task:', taskId);
```

### Alternatives Considered
- **保留所有日志**：影响可读性和性能
- **完全移除日志**：失去故障排查能力

---

## 总结

所有技术决策已明确，无遗留的NEEDS CLARIFICATION项。核心策略：

1. **组合优于继承** - 扁平化架构
2. **成熟库优于手动实现** - image-size替代手动解析
3. **简单优于抽象** - 移除过度抽象（timeout、deprecation、Zod）
4. **整合优于碎片** - 合并视频生成器、工具文件、测试文件
5. **质量保证** - 完整性能测试确保无退化

所有决策均已考虑替代方案，并有清晰的理由说明。
