# 主体参考视频生成功能测试指南

## 测试状态

✅ **单元测试通过** (8/8)
- ✅ 提示词解析逻辑测试 (3/3)
- ✅ 参数验证逻辑测试 (5/5)

## 已完成测试

### 1. 提示词解析测试

测试了以下场景：
- `[图0]中的猫在[图1]的地板上跑` → 正确解析为4个片段
- `开头是文本[图0]中间[图1]结尾` → 正确处理前置文本
- `[图0][图1]连续引用` → 正确处理连续图片引用

### 2. 参数验证测试

验证了所有边界条件：
- ✅ 图片数量少于2张 → 正确抛出错误
- ✅ 图片数量多于4张 → 正确抛出错误
- ✅ 提示词缺少图片引用 → 正确抛出错误
- ✅ 图片索引超出范围 → 正确抛出错误
- ✅ 正常参数 → 验证通过

## 如何测试实际API调用

### 前置条件

1. 准备2-4张测试图片（JPG/PNG格式）
2. 确保有有效的 `JIMENG_API_TOKEN` 环境变量

### 方式1: 使用MCP工具（推荐）

在Claude Desktop中使用：

```json
{
  "tool": "generateMainReferenceVideo",
  "params": {
    "referenceImages": [
      "/Users/你的用户名/Pictures/cat.jpg",
      "/Users/你的用户名/Pictures/floor.jpg"
    ],
    "prompt": "[图0]中的猫在[图1]的地板上跑",
    "resolution": "720p",
    "videoAspectRatio": "16:9",
    "duration": 5000
  }
}
```

### 方式2: 直接调用代码

```typescript
import { MainReferenceVideoGenerator } from './lib/api/video/MainReferenceVideoGenerator.js';

const generator = new MainReferenceVideoGenerator(process.env.JIMENG_API_TOKEN);

const videoUrl = await generator.generate({
  referenceImages: [
    '/path/to/image1.jpg',
    '/path/to/image2.jpg'
  ],
  prompt: '[图0]中的主体在[图1]的场景中',
  resolution: '720p',
  duration: 5000
});

console.log('Video URL:', videoUrl);
```

### 方式3: 使用测试脚本

1. 修改 `test-main-reference.mjs` 中的 `testImages` 数组
2. 填入你的测试图片路径
3. 运行：`node test-main-reference.mjs`

## 测试用例建议

### 简单场景
```typescript
{
  referenceImages: ["cat.jpg", "room.jpg"],
  prompt: "[图0]在[图1]里"
}
```

### 中等复杂度
```typescript
{
  referenceImages: ["person.jpg", "car.jpg", "beach.jpg"],
  prompt: "[图0]中的人坐在[图1]的车里，背景是[图2]的海滩"
}
```

### 复杂场景
```typescript
{
  referenceImages: ["char1.jpg", "char2.jpg", "scene.jpg", "effect.jpg"],
  prompt: "[图0]和[图1]的角色在[图2]的场景中，添加[图3]的特效"
}
```

## 预期行为

### 成功情况
- 返回视频URL字符串
- 视频时长约5秒（默认）
- 可在浏览器中直接播放

### 失败情况及错误信息

| 错误信息 | 原因 | 解决方法 |
|---------|------|---------|
| "主体参考模式至少需要2张参考图片" | 图片少于2张 | 提供2-4张图片 |
| "主体参考模式最多支持4张参考图片" | 图片多于4张 | 减少到4张以内 |
| "提示词中必须包含至少一个图片引用" | 没有使用[图N]语法 | 在提示词中添加[图0]、[图1]等 |
| "图片引用[图N]超出范围" | 索引超出图片数量 | 检查索引是否在0到(图片数-1)范围内 |
| "上传失败" | 文件路径错误 | 使用绝对路径，确认文件存在 |

## 性能预期

- **图片上传**：每张约2-3秒
- **视频生成**：约30-120秒（取决于复杂度）
- **总耗时**：约1-2分钟

## 调试技巧

1. **查看日志**：所有步骤都有详细的console.log输出
2. **检查轮询**：注意轮询日志中的状态变化
3. **验证图片**：先确保图片路径正确且可访问
4. **测试网络**：确保能访问即梦API（jimeng.jianying.com）

## 已知限制

1. 图片必须是本地文件路径（暂不支持URL）
2. 图片格式限制：JPG、PNG
3. 单次最多4张参考图
4. 提示词必须包含至少一个图片引用

## 下一步计划

- [ ] 添加URL图片支持
- [ ] 优化上传速度
- [ ] 添加进度回调
- [ ] 支持更多图片格式
- [ ] 添加缓存机制避免重复上传

## 运行单元测试

```bash
# 快速验证代码逻辑
node test-main-reference-simple.mjs

# 预期输出
# === 主体参考功能单元测试 ===
# ...
# ✅ 所有测试通过！
```