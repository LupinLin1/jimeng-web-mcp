# Data Model: 统一图像生成接口与多帧提示词功能

**Feature**: 004-generateimage-frames-prompt
**Date**: 2025-10-01

## Entities

### ImageGenerationParams (扩展)

**Location**: `src/types/api.types.ts`

**Description**: 图像生成参数接口，扩展添加async和frames参数

#### Schema

```typescript
export interface ImageGenerationParams {
  // ========== 现有字段（保持不变） ==========

  /** 主提示词 */
  prompt: string;

  /** 生成图片数量，默认1张 */
  count?: number;

  /** 模型名称 */
  model?: string;

  /** 宽高比预设 */
  aspectRatio?: string;

  /** 参考图片路径数组（最多4张） */
  filePath?: string[];

  /** 负向提示词 */
  negative_prompt?: string;

  /** 参考图影响强度 (0-1) */
  sample_strength?: number;

  /** 每张参考图的独立强度数组 */
  reference_strength?: number[];

  /** API刷新令牌（用于独立调用） */
  refresh_token?: string;

  // ========== 新增字段 ==========

  /**
   * 是否异步模式
   * - false (默认): 同步等待生成完成，返回图片URL数组
   * - true: 立即返回historyId，不等待完成
   */
  async?: boolean;

  /**
   * 多帧场景描述数组
   * - 最多15个元素
   * - 非空字符串才有效
   * - 会与prompt组合成最终提示词
   *
   * @example
   * frames: ["实验室场景", "时空隧道", "外星球"]
   * 最终prompt: "{prompt} 实验室场景 时空隧道 外星球，一共3张图"
   */
  frames?: string[];
}
```

#### Field Specifications

| Field | Type | Required | Default | Constraints | Version |
|-------|------|----------|---------|-------------|---------|
| prompt | string | ✅ Yes | - | 非空，建议<2000字符 | existing |
| count | number | No | 1 | 1-15 | existing |
| model | string | No | "jimeng-2.1" | 有效模型名称 | existing |
| aspectRatio | string | No | "auto" | 预设值或自定义 | existing |
| filePath | string[] | No | undefined | 0-4个有效路径 | existing |
| negative_prompt | string | No | "" | - | existing |
| sample_strength | number | No | 0.5 | 0-1 | existing |
| reference_strength | number[] | No | undefined | 每个元素0-1 | existing |
| refresh_token | string | No | env var | - | existing |
| **async** | boolean | No | **false** | - | **new** |
| **frames** | string[] | No | **undefined** | **0-15个非空字符串** | **new** |

#### Validation Rules

**`async` 参数**:
- 类型: `boolean | undefined`
- 默认值: `false`
- 验证: 无需额外验证（TypeScript类型保证）

**`frames` 参数**:
1. **类型检查**: 必须是数组或undefined
2. **长度限制**:
   - 最大15个元素
   - 超过15个：截断到前15个，记录警告
3. **元素过滤**:
   - 移除 `null`
   - 移除 `undefined`
   - 移除空字符串 `""`
   - 移除只包含空白字符的字符串
4. **空数组处理**:
   - 空数组等同于未提供
   - 使用原始prompt，不做任何修改

**Prompt组合规则** (当frames非空):
```
finalPrompt = `${prompt} ${validFrames.join(' ')}，一共${count || 1}张图`
```

示例:
```typescript
// 输入
{
  prompt: "科幻电影分镜",
  frames: ["实验室", null, "", "时空隧道", "   ", "外星球"],
  count: 3
}

// 处理后
validFrames = ["实验室", "时空隧道", "外星球"]
finalPrompt = "科幻电影分镜 实验室 时空隧道 外星球，一共3张图"
```

---

### Return Types

#### Sync Mode (async = false)

```typescript
type SyncResult = string[];
```

**说明**: 图片URL数组，长度等于`count`参数

**示例**:
```typescript
[
  "https://p9-dreamina-sign.byteimg.com/...",
  "https://p3-dreamina-sign.byteimg.com/...",
  "https://p26-dreamina-sign.byteimg.com/..."
]
```

#### Async Mode (async = true)

```typescript
type AsyncResult = string;
```

**说明**: historyId字符串，用于后续查询

**示例**:
```typescript
"4739198022156"
```

#### Unified Return Type

```typescript
type UnifiedResult = string[] | string;
```

**TypeScript函数重载推断**:
```typescript
// 自动推断为 Promise<string>
const id = await imageGen.generateImage({ prompt: "test", async: true });

// 自动推断为 Promise<string[]>
const urls = await imageGen.generateImage({ prompt: "test", async: false });
const urls2 = await imageGen.generateImage({ prompt: "test" }); // 默认false
```

---

## State Transitions

**N/A** - 此功能为无状态操作，不涉及状态机。

---

## Relationships

```
┌─────────────────────────┐
│  ImageGenerationParams  │
│  (Input Interface)      │
└───────────┬─────────────┘
            │ used by
            v
┌─────────────────────────┐
│   ImageGenerator        │
│   .generateImage()      │
└───────────┬─────────────┘
            │
            ├─ async=false ──> generateImageWithBatch()
            │                  └──> Promise<string[]>
            │
            └─ async=true  ──> generateImageAsyncInternal()
                               └──> Promise<string>
```

---

## Data Flow

### Scenario 1: 同步模式 + frames

```
Input:
{
  prompt: "电影分镜",
  frames: ["场景1", "场景2", "场景3"],
  count: 3,
  async: false  // 或省略
}

Processing:
1. validateAndFilterFrames(["场景1", "场景2", "场景3"])
   └─> validFrames = ["场景1", "场景2", "场景3"]

2. buildPromptWithFrames("电影分镜", validFrames, 3)
   └─> finalPrompt = "电影分镜 场景1 场景2 场景3，一共3张图"

3. generateImageWithBatch({ ...params, prompt: finalPrompt })
   └─> 调用即梦API，等待完成

Output:
[
  "https://p9.../image1.png",
  "https://p3.../image2.png",
  "https://p26.../image3.png"
]
```

### Scenario 2: 异步模式

```
Input:
{
  prompt: "测试图片",
  count: 5,
  async: true
}

Processing:
1. buildPromptWithFrames("测试图片", undefined, 5)
   └─> finalPrompt = "测试图片，一共5张图"

2. generateImageAsyncInternal({ ...params, prompt: finalPrompt })
   └─> 提交到即梦API，立即返回

Output:
"4739198022156"  // historyId
```

---

## Backwards Compatibility

### Existing Code Patterns (Must Continue Working)

```typescript
// Pattern 1: 最基本调用
const images = await imageGen.generateImage({
  prompt: "一只猫"
});
// ✅ 仍然返回 string[]

// Pattern 2: 带count
const images = await imageGen.generateImage({
  prompt: "风景",
  count: 4
});
// ✅ 仍然返回 string[]，长度4

// Pattern 3: 带参考图
const images = await imageGen.generateImage({
  prompt: "##混合风格",
  filePath: ["/path/to/ref.jpg"],
  count: 2
});
// ✅ 仍然按原逻辑处理
```

### New Features (Opt-in)

```typescript
// 新功能1: 显式异步模式
const historyId = await imageGen.generateImage({
  prompt: "测试",
  async: true  // 明确指定
});
// ✅ 返回 string

// 新功能2: 多帧组合
const images = await imageGen.generateImage({
  prompt: "故事分镜",
  frames: ["开始", "过程", "结尾"],
  count: 3
});
// ✅ 使用组合prompt生成
```

---

## Implementation Notes

### Private Helper Methods (新增)

```typescript
class ImageGenerator extends BaseClient {
  /**
   * 验证并过滤frames数组
   * @param frames 原始frames数组
   * @returns 过滤后的有效frames数组
   */
  private validateAndFilterFrames(frames?: string[]): string[] {
    if (!frames || !Array.isArray(frames)) {
      return [];
    }

    // 过滤无效元素
    const valid = frames
      .filter(f => f != null && typeof f === 'string' && f.trim() !== '')
      .map(f => f.trim());

    // 长度限制
    if (valid.length > 15) {
      console.warn(`[Frames] 截断frames数组: ${valid.length} -> 15`);
      return valid.slice(0, 15);
    }

    return valid;
  }

  /**
   * 构建包含frames的最终prompt
   * @param basePrompt 基础prompt
   * @param frames 有效frames数组
   * @param count 生成数量
   * @returns 最终prompt
   */
  private buildPromptWithFrames(
    basePrompt: string,
    frames: string[],
    count: number
  ): string {
    if (frames.length === 0) {
      return basePrompt;
    }

    const framesText = frames.join(' ');
    return `${basePrompt} ${framesText}，一共${count}张图`;
  }
}
```

---

## Migration Path

**Phase 1**: ✅ 添加新字段到类型定义（可选字段）
**Phase 2**: ✅ 实现处理逻辑（默认行为保持不变）
**Phase 3**: ✅ 添加测试验证兼容性
**Phase 4**: ✅ 更新文档和示例

**Breaking Changes**: 无 ✅
