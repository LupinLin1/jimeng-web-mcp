# Quickstart Guide: Video Generation Method Refactoring

**Feature**: Video Generation Method Refactoring
**Date**: 2025-10-01
**Version**: 1.0.0

## 概述

本指南提供视频生成新方法的快速上手步骤，包括三种生成模式的基本使用和常见场景。

## 前置条件

```bash
# 确保已安装依赖
yarn install

# 确保测试通过
yarn test

# 确保构建成功
yarn build
```

## 三种视频生成方法

### 方法 1: 文生视频（Text-to-Video）

**适用场景**：根据文本描述生成视频，可选首尾帧

```typescript
import { generateTextToVideo } from 'jimeng-web-mcp';

// 基础用法（同步模式）
const result = await generateTextToVideo({
  prompt: "一只可爱的猫咪在草地上奔跑，阳光明媚"
});

console.log('视频URL:', result.videoUrl);
```

**进阶用法：添加首尾帧**

```typescript
const result = await generateTextToVideo({
  prompt: "从静态到动态的过渡效果",
  firstFrameImage: "/path/to/start-frame.jpg",
  lastFrameImage: "/path/to/end-frame.jpg",
  duration: 8000,  // 8秒
  resolution: '1080p'
});
```

**异步模式**

```typescript
// 提交任务
const { taskId } = await generateTextToVideo({
  prompt: "长时间复杂场景",
  async: true
});

// 稍后查询状态
const status = await checkVideoTaskStatus(taskId);
if (status.status === 'completed') {
  console.log('视频完成:', status.videoUrl);
}
```

---

### 方法 2: 多帧视频（Multi-Frame）

**适用场景**：需要精确控制多个关键帧和场景转换

```typescript
import { generateMultiFrameVideo } from 'jimeng-web-mcp';

// 基础用法：两个场景
const result = await generateMultiFrameVideo({
  frames: [
    {
      idx: 0,
      duration_ms: 3000,
      prompt: "开场：城市全景鸟瞰图",
      image_path: "/scenes/scene1.jpg"
    },
    {
      idx: 1,
      duration_ms: 4000,
      prompt: "结尾：街道特写镜头",
      image_path: "/scenes/scene2.jpg"
    }
  ]
});
```

**进阶用法：多场景叙事**

```typescript
const result = await generateMultiFrameVideo({
  frames: [
    { idx: 0, duration_ms: 2000, prompt: "日出", image_path: "/sunrise.jpg" },
    { idx: 1, duration_ms: 2000, prompt: "早晨", image_path: "/morning.jpg" },
    { idx: 2, duration_ms: 2000, prompt: "中午", image_path: "/noon.jpg" },
    { idx: 3, duration_ms: 2000, prompt: "日落", image_path: "/sunset.jpg" }
  ],
  fps: 30,
  resolution: '1080p',
  async: true  // 建议使用异步模式
});
```

---

### 方法 3: 主体参考视频（Main Reference）

**适用场景**：将多个图片中的主体组合到一个场景

```typescript
import { generateMainReferenceVideo } from 'jimeng-web-mcp';

// 基础用法：组合两个主体
const result = await generateMainReferenceVideo({
  referenceImages: [
    "/characters/cat.jpg",
    "/environments/garden.jpg"
  ],
  prompt: "[图0]中的猫在[图1]的花园里玩耍"
});
```

**进阶用法：复杂场景组合**

```typescript
const result = await generateMainReferenceVideo({
  referenceImages: [
    "/person.jpg",
    "/car.jpg",
    "/beach.jpg"
  ],
  prompt: "[图0]中的人坐在[图1]的车里，驶向[图2]的海滩",
  duration: 10000,
  videoAspectRatio: '16:9',
  async: true
});
```

---

## 统一的同步/异步模式

所有三种方法都支持统一的`async`参数控制：

```typescript
// 同步模式（默认）- 等待完成后返回结果
const { videoUrl } = await generateTextToVideo({
  prompt: "test",
  async: false  // 可省略，默认为false
});

// 异步模式 - 立即返回任务ID
const { taskId } = await generateTextToVideo({
  prompt: "test",
  async: true
});
```

## 错误处理最佳实践

### 处理超时错误

```typescript
try {
  const result = await generateTextToVideo({
    prompt: "复杂场景可能需要较长时间",
    duration: 15000
  });
} catch (error) {
  if (error.code === 'TIMEOUT') {
    console.log('同步模式超时，切换到异步模式');

    // 重试使用异步模式
    const { taskId } = await generateTextToVideo({
      prompt: "复杂场景可能需要较长时间",
      duration: 15000,
      async: true
    });

    console.log('任务已提交，任务ID:', taskId);
  }
}
```

### 处理参数验证错误

```typescript
try {
  const result = await generateMultiFrameVideo({
    frames: [/* 仅1个帧 */]
  });
} catch (error) {
  if (error.code === 'INVALID_PARAMS') {
    console.error('参数错误:', error.message);
    console.error('详细原因:', error.reason);
  }
}
```

### 处理内容违规错误

```typescript
try {
  const result = await generateTextToVideo({
    prompt: "某些可能违规的内容"
  });
} catch (error) {
  if (error.code === 'CONTENT_VIOLATION') {
    console.error('内容审核失败:', error.reason);
    // 提示用户修改提示词
  }
}
```

## 查询异步任务状态

```typescript
import { checkVideoTaskStatus } from 'jimeng-web-mcp';

// 提交异步任务
const { taskId } = await generateTextToVideo({
  prompt: "test",
  async: true
});

// 轮询状态
const pollStatus = async (taskId: string) => {
  while (true) {
    const status = await checkVideoTaskStatus(taskId);

    console.log('当前状态:', status.status);
    console.log('进度:', status.progress + '%');

    if (status.status === 'completed') {
      console.log('视频完成:', status.videoUrl);
      return status.videoUrl;
    }

    if (status.status === 'failed') {
      throw new Error(`生成失败: ${status.error?.message}`);
    }

    // 等待3秒后重试
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
};

const videoUrl = await pollStatus(taskId);
```

## 迁移指南（从旧API）

### 迁移：generateVideo() → generateTextToVideo()

```typescript
// 旧方法（将显示废弃警告）
await generateVideo({
  prompt: "test",
  filePath: ["/first.jpg", "/last.jpg"]
});

// 新方法
await generateTextToVideo({
  prompt: "test",
  firstFrameImage: "/first.jpg",
  lastFrameImage: "/last.jpg"
});
```

### 迁移：generateVideo(multiFrames) → generateMultiFrameVideo()

```typescript
// 旧方法（将显示废弃警告）
await generateVideo({
  prompt: "ignored",
  multiFrames: [
    { idx: 0, duration_ms: 2000, prompt: "A", image_path: "/a.jpg" },
    { idx: 1, duration_ms: 2000, prompt: "B", image_path: "/b.jpg" }
  ]
});

// 新方法
await generateMultiFrameVideo({
  frames: [
    { idx: 0, duration_ms: 2000, prompt: "A", image_path: "/a.jpg" },
    { idx: 1, duration_ms: 2000, prompt: "B", image_path: "/b.jpg" }
  ]
});
```

### 迁移：generateVideoAsync() → async参数

```typescript
// 旧方法（将显示废弃警告）
const { historyId } = await generateVideoAsync({
  prompt: "test"
});

// 新方法
const { taskId } = await generateTextToVideo({
  prompt: "test",
  async: true
});
```

## 完整示例：端到端工作流

```typescript
import {
  generateTextToVideo,
  generateMultiFrameVideo,
  generateMainReferenceVideo,
  checkVideoTaskStatus
} from 'jimeng-web-mcp';

async function videoGenerationWorkflow() {
  console.log('=== 视频生成工作流 ===\n');

  // 1. 简单文生视频（同步）
  console.log('1. 生成简单文生视频...');
  const simple = await generateTextToVideo({
    prompt: "一只猫在奔跑"
  });
  console.log('✓ 完成:', simple.videoUrl);

  // 2. 多帧视频（异步）
  console.log('\n2. 生成多帧视频（异步）...');
  const { taskId } = await generateMultiFrameVideo({
    frames: [
      { idx: 0, duration_ms: 3000, prompt: "开场", image_path: "/s1.jpg" },
      { idx: 1, duration_ms: 3000, prompt: "结尾", image_path: "/s2.jpg" }
    ],
    async: true
  });
  console.log('✓ 任务已提交:', taskId);

  // 3. 主体参考视频（同步）
  console.log('\n3. 生成主体参考视频...');
  const mainRef = await generateMainReferenceVideo({
    referenceImages: ["/cat.jpg", "/garden.jpg"],
    prompt: "[图0]中的猫在[图1]的花园里"
  });
  console.log('✓ 完成:', mainRef.videoUrl);

  // 4. 查询异步任务状态
  console.log('\n4. 查询异步任务状态...');
  const status = await checkVideoTaskStatus(taskId);
  console.log('状态:', status.status);
  if (status.status === 'completed') {
    console.log('✓ 多帧视频完成:', status.videoUrl);
  }

  console.log('\n=== 工作流完成 ===');
}

// 运行工作流
videoGenerationWorkflow().catch(console.error);
```

## 性能建议

### 何时使用同步模式

- 简单场景（<5秒视频）
- 需要立即获取结果的交互式应用
- 开发/测试环境

### 何时使用异步模式

- 复杂场景（>10秒视频）
- 多帧视频（>5个帧）
- 批量生成任务
- 生产环境高负载场景

### 参数优化建议

| 场景 | 建议参数 | 原因 |
|------|---------|------|
| 快速预览 | `resolution: '720p'`, `fps: 24` | 生成速度快 |
| 高质量输出 | `resolution: '1080p'`, `fps: 30` | 视觉质量好 |
| 长视频 | `async: true`, `duration: 15000` | 避免超时 |
| 多帧复杂 | `async: true`, `frames: >5` | 处理时间长 |

## 故障排查

### 问题：同步模式频繁超时

**解决方案**：
1. 切换到异步模式
2. 减少视频时长
3. 降低分辨率（1080p → 720p）

### 问题：参数验证失败

**解决方案**：
1. 检查必需字段是否填写
2. 验证数值范围（fps: 12-30, duration: 3000-15000）
3. 确认帧数量在2-10之间（多帧模式）

### 问题：图片上传失败

**解决方案**：
1. 确认图片路径正确
2. 检查文件权限
3. 验证图片格式（支持JPG/PNG）

## 下一步

- 阅读 [API契约文档](./contracts/)了解详细规范
- 查看 [数据模型文档](./data-model.md)了解类型定义
- 运行测试套件验证环境：`yarn test`

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-01
