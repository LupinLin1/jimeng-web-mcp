# Refactoring Contract: 视频生成代码模块化

## 合约目的
确保重构后的代码保持与重构前完全一致的对外行为，零破坏性变更。

## 公共API合约

### 1. JimengClient.generateVideo()

**签名**（不变）：
```typescript
public async generateVideo(params: VideoGenerationParams): Promise<string>
```

**参数类型**（不变）：
```typescript
interface VideoGenerationParams {
  prompt: string
  model?: string
  duration_ms?: number
  fps?: number
  resolution?: '720p' | '1080p'
  video_aspect_ratio?: string
  filePath?: string[]
  multiFrames?: MultiFrameConfig[]
  refresh_token?: string
  req_key?: string
}
```

**返回值合约**：
- 成功：返回视频URL字符串
- 失败：抛出Error with message

**行为合约**：
- ✅ 积分检查逻辑不变
- ✅ 自动判断传统/多帧模式
- ✅ 轮询超时时间不变（5分钟）
- ✅ 网络错误重试次数不变（3次）
- ✅ 日志输出格式保持一致

**测试验证**：
```typescript
// 现有测试必须通过
describe('JimengClient.generateVideo', () => {
  it('should generate traditional video', async () => {
    const url = await client.generateVideo({
      prompt: '测试视频',
      duration_ms: 5000
    })
    expect(url).toMatch(/^https?:\/\//)
  })

  it('should generate multi-frame video', async () => {
    const url = await client.generateVideo({
      prompt: '测试',
      multiFrames: [/* ... */]
    })
    expect(url).toMatch(/^https?:\/\//)
  })
})
```

---

### 2. JimengClient.videoPostProcess()

**签名**（不变）：
```typescript
public async videoPostProcess(params: VideoPostProcessUnifiedParams): Promise<string>
```

**参数类型**（不变）：
```typescript
interface VideoPostProcessUnifiedParams {
  operation: 'frame_interpolation' | 'super_resolution' | 'audio_effect'
  videoId: string
  originHistoryId: string
  duration?: number
  originFps?: number
  targetFps?: 30 | 60
  originWidth?: number
  originHeight?: number
  targetWidth?: number
  targetHeight?: number
}
```

**返回值合约**：
- 成功：返回处理后的视频URL
- 失败：抛出Error

**行为合约**：
- ✅ 支持三种操作：补帧、超分、音效
- ✅ 参数验证逻辑不变
- ✅ 轮询行为不变

---

### 3. JimengClient.generateMainReferenceVideo()

**签名**（不变）：
```typescript
public async generateMainReferenceVideo(params: MainReferenceVideoParams): Promise<string>
```

**参数类型**（不变）：
```typescript
interface MainReferenceVideoParams {
  referenceImages: string[]
  prompt: string
  model?: string
  resolution?: '720p' | '1080p'
  videoAspectRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16'
  fps?: number
  duration?: number
}
```

**返回值合约**：
- 成功：返回视频URL
- 失败：抛出Error with validation message

**行为合约**：
- ✅ 2-4张参考图验证
- ✅ [图N]语法解析
- ✅ 图片上传顺序保持
- ✅ 错误消息格式不变

---

## 内部实现合约

### BaseClient创建合约

**要求**：
1. 从JimengClient提取以下方法到BaseClient：
   - `protected async request<T>(...)`
   - `protected async uploadImage(...)`
   - `protected logPollStart(...)`
   - `protected logPollData(...)`
   - `protected logPollError(...)`
   - `protected logPollStatusCheck(...)`
   - `protected logPollProgress(...)`
   - `protected logPollEnd(...)`
   - `protected logPollComplete(...)`
   - `protected getModel(...)`
   - `protected generateRequestParams()`

2. JimengClient修改为继承BaseClient

3. 验证：所有图片生成测试仍然通过

---

### VideoGenerator创建合约

**要求**：
1. 创建`src/api/video/VideoGenerator.ts`

2. 从JimengClient迁移以下方法：
   - `generateVideo()` (公共)
   - `generateTraditionalVideo()` (私有)
   - `generateMultiFrameVideo()` (私有)
   - `videoPostProcess()` (公共)
   - `pollVideoResult()` (私有)
   - 视频后处理相关私有方法

3. 继承BaseClient获得共享方法访问权限

4. 验证：VideoGenerator可以独立编译和测试

---

### JimengClient委托合约

**要求**：
1. JimengClient构造函数中初始化VideoGenerator实例

2. 视频相关公共方法改为委托调用：
   ```typescript
   public async generateVideo(params: VideoGenerationParams): Promise<string> {
     return this.videoGen.generateVideo(params)
   }
   ```

3. 删除JimengClient中已迁移的私有视频方法

4. 验证：所有现有测试通过（无需修改测试代码）

---

## 测试合约

### 回归测试要求

**必须通过的测试套件**：
1. `src/__tests__/unit/` - 所有单元测试
2. `src/__tests__/integration/` - 所有集成测试
3. `src/__tests__/async/` - 所有异步测试

**通过标准**：
```bash
yarn test  # 全部测试通过
yarn build # 构建成功
yarn type-check # 类型检查通过
```

### 新增测试（可选但推荐）

**VideoGenerator独立测试**：
```typescript
// src/__tests__/unit/VideoGenerator.test.ts
describe('VideoGenerator', () => {
  it('should generate traditional video independently', async () => {
    const gen = new VideoGenerator(/* ... */)
    const url = await gen.generateVideo({ prompt: 'test' })
    expect(url).toBeDefined()
  })
})
```

---

## 性能合约

**要求**：重构后性能不得降低

**基准**：
- 图片生成时间：保持不变（主要受API响应影响）
- 视频生成时间：保持不变
- 内存占用：不显著增加（< 5%）
- 包大小：不显著增加（< 10KB）

**测试方法**：
```bash
# 构建大小对比
yarn build
ls -lh lib/

# 运行时性能（通过现有async测试观察）
yarn test:async
```

---

## 兼容性合约

### 导入路径不变

**要求**：
```typescript
// 现有导入路径必须有效
import { JimengClient } from 'jimeng-web-mcp'
import { getApiClient } from 'jimeng-web-mcp'

// 类型定义导入不变
import type { VideoGenerationParams } from 'jimeng-web-mcp'
```

**验证**：
```bash
# 检查导出
node -e "const { JimengClient } = require('./lib/index.js'); console.log(JimengClient)"
```

### 单例模式兼容

**要求**：
```typescript
// src/api.ts 中的 getApiClient() 必须继续工作
const client = getApiClient()
await client.generateVideo({ prompt: 'test' })
```

---

## 文档合约

**要求**：
1. CLAUDE.md更新模块结构说明
2. 代码注释保留或改进
3. JSDoc类型注释保持完整

---

## 失败标准（零容忍）

以下情况视为合约违反，必须回滚或修复：

❌ **任何现有测试失败**
❌ **公共API签名变更**
❌ **导入路径失效**
❌ **类型定义破坏**
❌ **构建失败**
❌ **性能显著下降（> 20%）**
❌ **包大小显著增加（> 50KB）**

---

## 验收检查清单

- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 所有异步测试通过
- [ ] `yarn build` 成功
- [ ] `yarn type-check` 无错误
- [ ] 包大小未显著增加
- [ ] 导入路径验证通过
- [ ] VideoGenerator可独立测试
- [ ] BaseClient可被两个类共享
- [ ] 代码审查通过
- [ ] 文档已更新

---

## 回滚策略

如果合约验证失败且无法快速修复：

1. **立即回滚**：`git revert <commit>`
2. **分析失败原因**
3. **修订重构方案**
4. **重新实施**

**回滚触发条件**：
- 任何测试失败超过1小时未解决
- 发现设计缺陷需要重新架构
- 性能问题无法接受