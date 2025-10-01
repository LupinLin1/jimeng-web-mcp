# Research: 统一图像生成接口与多帧提示词功能

**Date**: 2025-10-01
**Feature**: 004-generateimage-frames-prompt

## R1: Prompt字符数限制研究

### Decision
即梦AI的prompt安全上限设定为 **2000字符**。

### Rationale
1. **现有代码分析**:
   - 查看`src/api/image/ImageGenerator.ts`现有prompt使用情况
   - 大部分prompt在50-500字符范围
   - 最长的测试用例约800字符

2. **API响应观察**:
   - 未发现明确的错误提示指明字符数限制
   - 推测基于主流AI模型的token限制（约2048 tokens）
   - 中文字符与token比例约1:1.5

3. **安全边界**:
   - 保守估计: 2000字符 ≈ 3000 tokens
   - 留出余量给系统提示词和格式化

### Implementation Impact
- frames拼接时需要监控最终prompt长度
- 如果超出2000字符，截断frames数组或记录警告
- 不强制限制，依赖即梦API的实际错误响应

### Alternatives Considered
- **3000字符**: 过于激进，可能触发API错误
- **1000字符**: 过于保守，限制用户使用
- **动态计算**: 复杂度高，收益有限

---

## R2: TypeScript联合类型最佳实践

### Decision
采用 **函数重载（Function Overloads）** 方案。

### Options Evaluated

#### 方案A: 联合类型
```typescript
generateImage(params: ImageGenerationParams): Promise<string[] | string>;
```

**优点**: 简单直接
**缺点**:
- 调用方需要类型断言或类型守卫
- IDE无法根据`async`参数推断返回类型
- 用户体验差

#### 方案B: 函数重载 ✅ **SELECTED**
```typescript
generateImage(params: ImageGenerationParams & { async: true }): Promise<string>;
generateImage(params: ImageGenerationParams & { async?: false }): Promise<string[]>;
generateImage(params: ImageGenerationParams): Promise<string[] | string>;
```

**优点**:
- TypeScript能根据参数推断正确的返回类型
- 编译时类型安全
- 更好的IDE智能提示
- 符合TypeScript最佳实践

**缺点**: 需要3个函数签名声明

#### 方案C: 泛型类型参数
```typescript
generateImage<A extends boolean = false>(
  params: ImageGenerationParams & { async?: A }
): Promise<A extends true ? string : string[]>;
```

**优点**: 最强的类型推断
**缺点**:
- 复杂度高，可读性差
- 对用户不友好（需要理解泛型）
- 过度设计

### Rationale
方案B在类型安全和用户体验之间取得最佳平衡，是TypeScript社区推荐的处理条件返回类型的标准方法。

### Implementation Example
```typescript
// 在ImageGenerator类中
public generateImage(params: ImageGenerationParams & { async: true }): Promise<string>;
public generateImage(params: ImageGenerationParams & { async?: false }): Promise<string[]>;
public generateImage(params: ImageGenerationParams): Promise<string[] | string> {
  if (params.async) {
    return this.generateImageAsyncInternal(params);
  } else {
    return this.generateImageSyncInternal(params);
  }
}
```

---

## R3: 现有测试模式分析

### Current Test Structure

#### Location
- `tests/__tests__/image-generation.test.ts` - 主要图像生成测试
- `tests/unit/` - 单元测试（尚未建立）
- `tests/integration/` - 集成测试（尚未建立）

#### Test Patterns Observed

**1. Mock Strategy**:
```typescript
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock uploadImage
mockedAxios.post.mockResolvedValue({
  data: { /* mock response */ }
});
```

**2. Test Data Structure**:
```typescript
const mockParams: ImageGenerationParams = {
  prompt: "测试提示词",
  model: "jimeng-4.0",
  count: 4,
  aspectRatio: "16:9"
};
```

**3. Assertion Pattern**:
```typescript
expect(result).toHaveLength(4);
expect(result[0]).toContain('https://');
```

### Recommended Test Organization

**Unit Tests** (新建):
```
tests/unit/
├── prompt-builder.test.ts           # 纯函数逻辑测试
├── image-generator-frames.test.ts   # frames处理逻辑
└── image-generator-async-unified.test.ts # async分支逻辑
```

**Integration Tests** (扩展):
```
tests/integration/
└── backward-compatibility.test.ts   # 添加Feature 004验收场景
```

### Testing Strategy

1. **Unit Tests**: 隔离测试prompt构建逻辑
   - 无需mock HTTP
   - 直接测试私有方法（通过类型断言或提取到utils）
   - 快速执行

2. **Integration Tests**: 端到端验证
   - Mock axios请求
   - 验证完整的生成流程
   - 确保向后兼容

3. **TDD Workflow**:
   - 先写failing tests
   - 运行`yarn test`确认失败
   - 实现代码
   - 再次运行`yarn test`确认通过

---

## R4: 向后兼容验证策略

### Strategy
通过自动化测试确保100%向后兼容。

### Verification Checklist

#### 1. 现有调用模式
```typescript
// ✅ 必须继续工作
const images = await imageGen.generateImage({ prompt: "测试" });
```

#### 2. 新参数可选性
```typescript
// ✅ 所有新参数都必须是可选的
type NewParams = {
  async?: boolean;
  frames?: string[];
};
```

#### 3. 默认行为不变
```typescript
// ✅ 不提供新参数时，行为与旧版本完全一致
const result1 = await imageGen.generateImage({ prompt: "A" }); // 同步
const result2 = await imageGen.generateImage({ prompt: "A", async: false }); // 同步
// result1 === result2
```

#### 4. 类型兼容性
```typescript
// ✅ 旧代码的类型声明仍然有效
const params: ImageGenerationParams = { prompt: "test" };
const result: Promise<string[]> = imageGen.generateImage(params);
```

### Test Implementation
在`tests/integration/backward-compatibility.test.ts`添加：

```typescript
describe('Feature 004: Backward Compatibility', () => {
  it('should work without async parameter', async () => {
    const result = await imageGen.generateImage({ prompt: "test" });
    expect(Array.isArray(result)).toBe(true);
  });

  it('should work without frames parameter', async () => {
    const result = await imageGen.generateImage({ prompt: "test", count: 3 });
    expect(result).toHaveLength(3);
  });

  it('should accept old params type', () => {
    const params: ImageGenerationParams = { prompt: "test" };
    // Should compile without errors
    expect(() => imageGen.generateImage(params)).not.toThrow();
  });
});
```

---

## Summary

| Research Item | Decision | Confidence |
|---------------|----------|-----------|
| Prompt limit  | 2000 chars | Medium (estimated) |
| Type design   | Function overloads | High (best practice) |
| Test pattern  | Unit + Integration | High (existing pattern) |
| Compatibility | Automated tests | High (comprehensive) |

**All NEEDS CLARIFICATION items resolved**: ✅

**Ready for Phase 1**: ✅
