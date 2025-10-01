# Quickstart: 统一图像生成接口与多帧提示词功能

**Feature**: 004-generateimage-frames-prompt
**Purpose**: 快速验证功能实现的完整性和正确性

## Prerequisites

```bash
# 确保环境配置正确
export JIMENG_API_TOKEN="your_session_id"

# 安装依赖
yarn install

# 构建项目
yarn build
```

## Test Scenarios

### Scenario 1: 向后兼容验证 ✅

**目的**: 确保现有代码无需修改即可继续工作

```typescript
import { ImageGenerator } from './src/api/image/ImageGenerator.js';

const imageGen = new ImageGenerator(process.env.JIMENG_API_TOKEN);

// 测试1: 最基本的调用（不提供新参数）
const images1 = await imageGen.generateImage({
  prompt: "一只可爱的猫"
});

// 验收标准
console.assert(Array.isArray(images1), '❌ 应返回数组');
console.assert(images1.length === 1, '❌ 默认生成1张图');
console.assert(images1[0].startsWith('https://'), '❌ 应为有效URL');
console.log('✅ Scenario 1.1 PASS: 基本调用向后兼容');

// 测试2: 带count参数
const images2 = await imageGen.generateImage({
  prompt: "美丽的风景",
  count: 3
});

// 验收标准
console.assert(Array.isArray(images2), '❌ 应返回数组');
console.assert(images2.length === 3, '❌ 应生成3张图');
console.log('✅ Scenario 1.2 PASS: count参数兼容');

// 测试3: 带参考图
const images3 = await imageGen.generateImage({
  prompt: "##混合风格",
  filePath: ["./test-image.jpg"],
  count: 2
});

// 验收标准
console.assert(Array.isArray(images3), '❌ 应返回数组');
console.assert(images3.length === 2, '❌ 应生成2张图');
console.log('✅ Scenario 1.3 PASS: 参考图功能兼容');
```

**Expected**: 所有现有功能按原样工作，返回值类型不变

---

### Scenario 2: 异步模式 ✅

**目的**: 验证新的async参数控制同步/异步模式

```typescript
// 测试1: 显式同步模式
const images = await imageGen.generateImage({
  prompt: "测试同步",
  async: false  // 显式指定
});

// 验收标准
console.assert(Array.isArray(images), '❌ async=false应返回数组');
console.log('✅ Scenario 2.1 PASS: 显式同步模式');

// 测试2: 异步模式
const historyId = await imageGen.generateImage({
  prompt: "测试异步",
  async: true
});

// 验收标准
console.assert(typeof historyId === 'string', '❌ async=true应返回字符串');
console.assert(/^\d+$/.test(historyId), '❌ historyId应为数字字符串');
console.log('✅ Scenario 2.2 PASS: 异步模式返回historyId');

// 测试3: 查询异步结果
const result = await imageGen.getImageResult(historyId);

// 验收标准
console.assert(result.status !== undefined, '❌ 应有status字段');
console.assert(['pending', 'processing', 'completed', 'failed'].includes(result.status!),
  '❌ status应为有效值');
console.log('✅ Scenario 2.3 PASS: 异步结果查询');
```

**Expected**:
- `async: false` 或省略时，返回 `string[]`
- `async: true` 时，返回 `string` (historyId)
- historyId可用于后续查询

---

### Scenario 3: 多帧场景生成 ✅

**目的**: 验证frames数组功能和prompt组合逻辑

```typescript
// 测试1: 基本frames使用
const images1 = await imageGen.generateImage({
  prompt: "科幻电影分镜",
  frames: ["实验室场景", "时空隧道", "外星球"],
  count: 3
});

// 验收标准
console.assert(Array.isArray(images1), '❌ 应返回数组');
console.assert(images1.length === 3, '❌ 应生成3张图');
console.log('✅ Scenario 3.1 PASS: frames基本功能');

// 测试2: 15个frames（边界测试）
const frames15 = Array.from({ length: 15 }, (_, i) => `场景${i + 1}`);
const images2 = await imageGen.generateImage({
  prompt: "连续分镜",
  frames: frames15,
  count: 15
});

// 验收标准
console.assert(Array.isArray(images2), '❌ 应返回数组');
console.assert(images2.length === 15, '❌ 应生成15张图');
console.log('✅ Scenario 3.2 PASS: 15个frames边界情况');

// 测试3: 超过15个frames（截断测试）
const frames20 = Array.from({ length: 20 }, (_, i) => `场景${i + 1}`);
const images3 = await imageGen.generateImage({
  prompt: "超长分镜",
  frames: frames20,
  count: 3
});

// 验收标准
// 注意: 应该有警告日志输出
console.assert(Array.isArray(images3), '❌ 应返回数组');
console.log('✅ Scenario 3.3 PASS: 超长frames截断处理');
```

**Expected**:
- frames内容与prompt正确组合
- 最终prompt格式: `"{prompt} {frame1} {frame2} ...，一共N张图"`
- 超过15个frames时自动截断并记录警告

---

### Scenario 4: 空值处理 ✅

**目的**: 验证frames数组的空值过滤逻辑

```typescript
// 测试1: 包含null和空字符串
const images1 = await imageGen.generateImage({
  prompt: "测试空值过滤",
  frames: ["场景1", null, "", "场景2", undefined, "   ", "场景3"],
  count: 3
});

// 验收标准
// 应该只使用有效的3个场景
console.assert(Array.isArray(images1), '❌ 应返回数组');
console.assert(images1.length === 3, '❌ 应生成3张图');
console.log('✅ Scenario 4.1 PASS: 空值过滤正确');

// 测试2: 空frames数组
const images2 = await imageGen.generateImage({
  prompt: "测试空数组",
  frames: [],
  count: 2
});

// 验收标准
// 应该回退到标准行为，不修改prompt
console.assert(Array.isArray(images2), '❌ 应返回数组');
console.assert(images2.length === 2, '❌ 应生成2张图');
console.log('✅ Scenario 4.2 PASS: 空数组回退处理');

// 测试3: 全是无效值的frames
const images3 = await imageGen.generateImage({
  prompt: "测试全无效",
  frames: [null, "", undefined, "   "],
  count: 1
});

// 验收标准
// 过滤后为空数组，应回退到标准行为
console.assert(Array.isArray(images3), '❌ 应返回数组');
console.log('✅ Scenario 4.3 PASS: 全无效值回退处理');
```

**Expected**:
- null, undefined, 空字符串被过滤
- 过滤后为空时，使用原始prompt
- 不影响正常生成流程

---

### Scenario 5: 组合场景 ✅

**目的**: 验证frames与其他参数的配合使用

```typescript
// 测试1: frames + 参考图
const images1 = await imageGen.generateImage({
  prompt: "宋式住宅漫游",
  frames: ["玄关", "客厅", "卧室"],
  filePath: ["./reference-interior.jpg"],
  count: 3
});

// 验收标准
console.assert(Array.isArray(images1), '❌ 应返回数组');
console.assert(images1.length === 3, '❌ 应生成3张图');
console.log('✅ Scenario 5.1 PASS: frames + 参考图组合');

// 测试2: frames + async模式
const historyId = await imageGen.generateImage({
  prompt: "故事分镜",
  frames: ["开始", "发展", "高潮", "结局"],
  count: 4,
  async: true
});

// 验收标准
console.assert(typeof historyId === 'string', '❌ 应返回historyId');
console.log('✅ Scenario 5.2 PASS: frames + 异步模式组合');

// 等待一段时间后查询结果
await new Promise(resolve => setTimeout(resolve, 30000)); // 30秒
const result = await imageGen.getImageResult(historyId);

console.assert(result.status !== undefined, '❌ 应有status字段');
console.log('✅ Scenario 5.3 PASS: 异步结果最终可查询');

// 测试3: frames + 不同宽高比
const images2 = await imageGen.generateImage({
  prompt: "竖版手机壁纸",
  frames: ["春", "夏", "秋", "冬"],
  count: 4,
  aspectRatio: "9:16"
});

// 验收标准
console.assert(Array.isArray(images2), '❌ 应返回数组');
console.assert(images2.length === 4, '❌ 应生成4张图');
console.log('✅ Scenario 5.4 PASS: frames + aspectRatio组合');
```

**Expected**:
- frames可与所有现有参数自由组合
- 不同参数之间不产生冲突
- 保持各自的功能特性

---

## Validation Checklist

运行所有场景后，验证以下检查点：

### 功能完整性
- [ ] Scenario 1: 向后兼容性 (3个子测试)
- [ ] Scenario 2: 异步模式控制 (3个子测试)
- [ ] Scenario 3: Frames功能 (3个子测试)
- [ ] Scenario 4: 空值处理 (3个子测试)
- [ ] Scenario 5: 组合场景 (4个子测试)

### 类型安全性
- [ ] TypeScript类型推断正确
- [ ] 无类型错误
- [ ] IDE智能提示工作

### 性能要求
- [ ] Prompt构建 < 1ms
- [ ] 同步调用 2-5秒完成
- [ ] 异步提交 < 100ms

### 日志输出
- [ ] frames截断时有警告日志
- [ ] 调试信息完整
- [ ] 无错误日志（正常流程）

---

## Quick Validation Script

```bash
# 运行完整验证
yarn build && node quickstart-validation.js

# 或使用TypeScript直接运行
yarn ts-node specs/004-generateimage-frames-prompt/quickstart.md
```

---

## Troubleshooting

### 问题1: TypeScript类型错误
```
error TS2322: Type 'string[] | string' is not assignable to type 'string[]'
```

**解决**: 确保函数重载正确实现，检查tsconfig.json的strictFunctionTypes配置

### 问题2: Frames被忽略
**检查**:
1. frames数组是否全为无效值
2. 是否正确传递给内部方法
3. 查看日志确认最终prompt

### 问题3: Async模式不生效
**检查**:
1. async参数是否正确传递
2. 返回值类型是否符合预期
3. 查看generateImageAsyncInternal是否被调用

---

## Success Criteria

✅ **所有16个子测试通过**
✅ **类型检查通过** (`yarn type-check`)
✅ **构建成功** (`yarn build`)
✅ **无警告日志**（除了frames截断场景）
✅ **执行时间在预期范围内**

---

**Last Updated**: 2025-10-01
**Validated By**: Implementation team
**Status**: Ready for Phase 4 implementation
