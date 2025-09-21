# JiMeng MCP 使用示例

## 图像生成新格式说明

### 📋 重要变更
- `filePath` 参数现在**仅支持数组格式**
- **必须使用绝对路径**，不支持相对路径
- 新增 `reference_strength` 参数支持每张参考图独立强度设置

### 🎨 基本用法示例

#### 1. 无参考图生成
```typescript
await generateImage({
  prompt: "一只可爱的橘色小猫",
  model: "jimeng-4.0",
  aspectRatio: "1:1"
})
```

#### 2. 单参考图生成
```typescript
await generateImage({
  filePath: ["/Users/username/Documents/reference.jpg"], // 必须用数组格式
  prompt: "将这张图片转换为油画风格",
  sample_strength: 0.7
})
```

#### 3. 多参考图生成（统一强度）
```typescript
await generateImage({
  filePath: [
    "/Users/username/Documents/style_ref.jpg",
    "/Users/username/Documents/content_ref.jpg",
    "/Users/username/Documents/color_ref.jpg"
  ],
  prompt: "融合三张图片的特征创作新图",
  sample_strength: 0.6 // 所有参考图使用相同强度
})
```

#### 4. 多参考图生成（独立强度）✨ 新功能
```typescript
await generateImage({
  filePath: [
    "/Users/username/Documents/style_ref.jpg",
    "/Users/username/Documents/content_ref.jpg", 
    "/Users/username/Documents/color_ref.jpg"
  ],
  prompt: "精细混合多种风格",
  reference_strength: [0.3, 0.8, 0.5] // 每张图独立设置强度
  // 第一张图30%强度，第二张80%，第三张50%
})
```

### 🎯 强度设置优先级
1. **`reference_strength[index]`** - 优先级最高
2. **`sample_strength`** - 作为后备值
3. **`0.5`** - 默认值

### ⚠️ 常见错误与解决

#### 错误：使用相对路径
```typescript
// ❌ 错误用法
filePath: ["./image.jpg", "../ref.png"]

// ✅ 正确用法  
filePath: ["/Users/username/project/image.jpg", "/Users/username/project/ref.png"]
```

#### 错误：使用字符串格式
```typescript
// ❌ 错误用法（旧格式，已不支持）
filePath: "/Users/username/image.jpg"

// ✅ 正确用法
filePath: ["/Users/username/image.jpg"]
```

#### 错误：强度数组长度不匹配
```typescript
// ❌ 错误：3张图但只提供2个强度值
filePath: ["img1.jpg", "img2.jpg", "img3.jpg"]
reference_strength: [0.3, 0.7] // 缺少第3张图的强度

// ✅ 正确：数组长度匹配或使用自动补充
filePath: ["img1.jpg", "img2.jpg", "img3.jpg"] 
reference_strength: [0.3, 0.7, 0.5] // 完整匹配

// ✅ 或者让系统自动处理
filePath: ["img1.jpg", "img2.jpg", "img3.jpg"]
reference_strength: [0.3, 0.7] // 第3张图自动使用 sample_strength 值
sample_strength: 0.6
```

### 🚀 高级用法技巧

#### 渐进式强度控制
```typescript
// 从强到弱的渐进混合
await generateImage({
  filePath: [
    "/path/to/primary_style.jpg",    // 主风格
    "/path/to/secondary_style.jpg",  // 次要风格  
    "/path/to/subtle_accent.jpg"     // 细节点缀
  ],
  prompt: "艺术风格的渐进融合",
  reference_strength: [0.8, 0.5, 0.2] // 从强到弱
})
```

#### 特定用途强度搭配
```typescript
// 风格转换：保持内容，改变风格
reference_strength: [0.9, 0.3] // 高内容保留 + 低风格影响

// 创意混合：平衡各种元素
reference_strength: [0.6, 0.6, 0.6] // 均匀混合

// 精细调节：突出某个特征
reference_strength: [0.4, 0.9, 0.2] // 突出中间的参考图
```

### 📝 参数完整说明

| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| `filePath` | `string[]` | 可选 | 参考图绝对路径数组，最多4张 |
| `prompt` | `string` | 必填 | 图像描述文字 |
| `model` | `string` | 可选 | 模型名称，默认jimeng-4.0 |
| `aspectRatio` | `string` | 可选 | 宽高比，如'1:1','16:9'等 |
| `sample_strength` | `number` | 可选 | 全局参考强度0-1，默认0.5 |
| `reference_strength` | `number[]` | 可选 | 每图独立强度数组0-1 |
| `negative_prompt` | `string` | 可选 | 负面提示词 |

这些修改让API使用更加一致和强大！ 🎉