# JiMeng Web MCP Server - Quick Start Guide

**版本**: 1.12.0
**更新日期**: 2025-10-01
**功能**: 图像和视频生成，包括新的视频生成API (Feature 005-3-1-2)

## 🚀 快速开始

### 1. 环境准备

#### 1.1 安装依赖
```bash
# 克隆项目
git clone https://github.com/LupinLin1/jimeng-web-mcp.git
cd jimeng-web-mcp

# 安装依赖
yarn install
# 或
npm install
```

#### 1.2 获取API Token
1. 访问 [JiMeng AI官网](https://jimeng.jianying.com) 并登录
2. 打开浏览器开发者工具 (F12)
3. 进入 Application > Cookies
4. 找到 `sessionid` 值
5. 设置环境变量：
```bash
export JIMENG_API_TOKEN=your_session_id_here
```

#### 1.3 验证安装
```bash
# 类型检查
yarn type-check

# 构建项目
yarn build

# 运行测试
yarn test
```

### 2. 配置Claude Desktop

在Claude Desktop的配置文件中添加：

```json
{
  "mcpServers": {
    "jimeng-web-mcp": {
      "command": "npx",
      "args": ["-y", "--package=jimeng-web-mcp", "jimeng-web-mcp"],
      "env": {
        "JIMENG_API_TOKEN": "your_session_id_here"
      }
    }
  }
}
```

### 3. 启动服务器

```bash
# 启动MCP服务器
yarn start

# 或以HTTP API模式启动
yarn start:api

# 开发模式（热重载）
yarn dev
```

## 🎨 图像生成示例

### 基础图像生成
```typescript
// Claude Desktop中使用
generateImage({
  prompt: "一只可爱的橘猫，坐在窗台上，阳光洒在身上",
  aspectRatio: "16:9",
  model: "jimeng-4.0",
  count: 1
})
```

### 多参考图像生成
```typescript
generateImage({
  prompt: "将图0的风格应用到图1的内容上",
  referenceImages: [
    "/path/to/style-image.jpg",
    "/path/to/content-image.jpg"
  ],
  aspectRatio: "1:1",
  model: "jimeng-4.0"
})
```

### 批量生成（>4张自动触发继续生成）
```typescript
generateImage({
  prompt: "不同角度的风景照",
  count: 8,
  aspectRatio: "16:9",
  model: "jimeng-4.0"
})
// 自动返回8张图片
```

## 🎬 视频生成示例 (NEW API)

### 1. 文生视频 (Text-to-Video)

#### 基础文生视频
```typescript
generateTextToVideo({
  prompt: "夕阳西下，群山起伏，云彩绚烂",
  model: "jimeng-video-3.0",
  resolution: "1080p",
  videoAspectRatio: "16:9",
  fps: 24,
  duration: 5000,
  async: false  // 同步模式，等待完成
})
```

#### 带首尾帧的文生视频
```typescript
generateTextToVideo({
  prompt: "从白天的森林过渡到夜晚的森林",
  firstFrameImage: "/path/day-forest.jpg",
  lastFrameImage: "/path/night-forest.jpg",
  model: "jimeng-video-3.0",
  resolution: "1080p",
  fps: 24,
  duration: 8000,
  async: false
})
```

#### 异步模式
```typescript
const result = await generateTextToVideo({
  prompt: "海边日出，海浪轻拍",
  model: "jimeng-video-3.0",
  async: true  // 异步模式，立即返回任务ID
});
// 返回: { taskId: "4721606420748" }
```

### 2. 多帧视频 (Multi-Frame)

#### 基础多帧视频
```typescript
generateMultiFrameVideo({
  frames: [
    {
      idx: 0,
      imagePath: "/scene-1.jpg",
      duration_ms: 2000,
      prompt: "开场：宁静的湖面"
    },
    {
      idx: 1,
      imagePath: "/scene-2.jpg",
      duration_ms: 2000,
      prompt: "发展：天鹅游过湖面"
    },
    {
      idx: 2,
      imagePath: "/scene-3.jpg",
      duration_ms: 2000,
      prompt: "高潮：夕阳西下，湖面金黄"
    }
  ],
  prompt: "湖边天鹅的一天",
  model: "jimeng-video-3.0",
  resolution: "1080p",
  fps: 24,
  async: false
})
```

#### 高级多帧控制
```typescript
generateMultiFrameVideo({
  frames: [
    {
      idx: 0,
      imagePath: "/frame-0.jpg",
      duration_ms: 1000,
      prompt: "起始：城市天际线"
    },
    {
      idx: 1,
      imagePath: "/frame-1.jpg",
      duration_ms: 1500,
      prompt: "过渡：车流穿梭"
    },
    {
      idx: 2,
      imagePath: "/frame-2.jpg",
      duration_ms: 1000,
      prompt: "高潮：夜景灯光"
    },
    {
      idx: 3,
      imagePath: "/frame-3.jpg",
      duration_ms: 1500,
      prompt: "结尾：繁华夜景"
    }
  ],
  prompt: "城市从白天到夜晚的变化",
  model: "jimeng-video-3.0",
  resolution: "1080p",
  videoAspectRatio: "21:9",
  fps: 30,
  duration: 5000,
  async: false
})
```

### 3. 主体参考视频 (Main Reference)

#### 基础主体参考
```typescript
generateMainReferenceVideo({
  referenceImages: [
    "/path/person.jpg",
    "/path/beach.jpg"
  ],
  prompt: "[图0]中的人在[图1]的海滩上散步",
  model: "jimeng-video-3.0",
  resolution: "1080p",
  fps: 24,
  duration: 5000,
  async: false
})
```

#### 复杂场景组合
```typescript
generateMainReferenceVideo({
  referenceImages: [
    "/path/person.jpg",
    "/path/car.jpg",
    "/path/mountain.jpg"
  ],
  prompt: "[图0]中的人驾驶着[图1]的车在[图2]的山路上行驶",
  model: "jimeng-video-3.0",
  resolution: "1080p",
  videoAspectRatio: "16:9",
  fps: 24,
  duration: 8000,
  async: false
})
```

#### 四图组合
```typescript
generateMainReferenceVideo({
  referenceImages: [
    "/path/character.jpg",
    "/path/clothing.jpg",
    "/path/environment.jpg",
    "/path/prop.jpg"
  ],
  prompt: "[图0]中的人物穿着[图1]的衣服，在[图2]的环境中使用[图3]的道具",
  model: "jimeng-video-3.0",
  resolution: "1080p",
  fps: 24,
  duration: 6000,
  async: false
})
```

## ⚙️ 参数参考

### 通用参数

所有视频生成方法都支持以下通用参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `async` | boolean | false | 同步(false)或异步(true)模式 |
| `model` | string | "jimeng-video-3.0" | 视频生成模型 |
| `resolution` | "720p" \| "1080p" | "720p" | 视频分辨率 |
| `videoAspectRatio` | "21:9" \| "16:9" \| "4:3" \| "1:1" \| "3:4" \| "9:16" | "16:9" | 视频宽高比 |
| `fps` | number | 24 | 帧率 (12-30) |
| `duration` | number | 5000 | 持续时间 (3000-15000ms) |

### 图像生成参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `prompt` | string | - | 图像描述文本 |
| `aspectRatio` | string | "1:1" | 图像宽高比 |
| `model` | string | "jimeng-4.0" | 图像生成模型 |
| `count` | number | 1 | 生成数量 (1-15) |
| `referenceImages` | string[] | - | 参考图片路径数组 |

### 超时和轮询

同步模式使用智能轮询机制：
- **初始间隔**: 2秒
- **最大间隔**: 10秒
- **退避因子**: 1.5倍
- **总超时**: 600秒 (10分钟)
- **网络恢复**: 自动重试瞬时故障

## 🔄 异步操作

### 提交异步任务
```typescript
const result = await generateTextToVideo({
  prompt: "异步视频生成测试",
  async: true
});
// 返回: { taskId: "4721606420748" }
```

### 查询任务状态
```typescript
// 使用现有工具查询状态
const status = await getVideoResult({
  taskId: "4721606420748"
});
// 返回任务状态和结果
```

## 🧪 测试和验证

### 运行测试套件
```bash
# 运行所有测试
yarn test

# 运行特定测试
yarn test video-generation.test.ts
yarn test core-workflow.test.ts

# 生成覆盖率报告
yarn test:coverage

# 监视模式
yarn test:watch
```

### MCP Inspector测试
```bash
# 启动MCP Inspector进行手动测试
yarn test:mcp
```

### 构建验证
```bash
# 验证构建
yarn build

# 类型检查
yarn type-check
```

## 🔧 开发指南

### 添加新的视频生成工具
1. 在 `src/api/video/` 创建新的Generator类
2. 在 `src/schemas/video.schemas.ts` 添加验证Schema
3. 在 `src/server.ts` 注册MCP工具
4. 在 `src/types/api.types.ts` 添加类型定义
5. 编写单元测试和集成测试

### 项目结构
```
src/
├── api/
│   ├── BaseClient.ts              # 基础客户端
│   ├── JimengClient.ts            # 图像生成客户端
│   └── video/
│       ├── VideoGenerator.ts      # 视频生成基类
│       ├── TextToVideoGenerator.ts    # 文生视频生成器
│       ├── MultiFrameVideoGenerator.ts # 多帧视频生成器
│       └── MainReferenceVideoGenerator.ts # 主体参考视频生成器
├── schemas/
│   └── video.schemas.ts          # 视频参数验证
├── utils/
│   ├── timeout.ts                 # 超时处理工具
│   └── deprecation.ts            # 弃用警告工具
├── types/
│   └── api.types.ts               # API类型定义
└── server.ts                     # MCP服务器实现
```

## 🚨 错误处理

### 常见错误和解决方案

#### 1. API Token错误
```
错误: JIMENG_API_TOKEN 环境变量未设置
解决: 设置正确的sessionid值
```

#### 2. 文件路径错误
```
错误: 读取文件失败: /path/to/image.jpg
解决: 确保使用绝对路径且文件存在
```

#### 3. 参数验证错误
```
错误: 至少需要2张参考图片
解决: 主体参考视频需要2-4张参考图片
```

#### 4. 超时错误
```
错误: Polling timed out after 10 minutes
解决: 检查网络连接或使用异步模式
```

### 错误格式
```typescript
{
  error: {
    code: "TIMEOUT" | "CONTENT_VIOLATION" | "API_ERROR" | "INVALID_PARAMS",
    message: "用户友好的错误信息",
    reason: "详细错误原因",
    timestamp: 1699123456789
  }
}
```

## 📊 性能优化

### 建议配置
- **同步模式**: 适合快速生成和小任务
- **异步模式**: 适合长时间任务和批量处理
- **分辨率**: 720p适合预览，1080p适合最终输出
- **帧率**: 24fps平衡质量和文件大小

### 批量处理
```typescript
// 并发处理多个任务
const promises = [
  generateTextToVideo({ prompt: "场景1", async: true }),
  generateTextToVideo({ prompt: "场景2", async: true }),
  generateTextToVideo({ prompt: "场景3", async: true })
];

const results = await Promise.all(promises);
```

## 🆘 支持和故障排除

### 获取帮助
- **文档**: 查看 [CLAUDE.md](./CLAUDE.md) 获取详细API文档
- **测试**: 运行 `yarn test` 验证功能
- **日志**: 检查控制台输出获取调试信息

### 常见问题
1. **Q: 如何获取JiMeng API Token?**
   A: 登录JiMeng官网，在浏览器开发者工具中找到sessionid

2. **Q: 支持哪些图像/视频格式?**
   A: 支持JPG/PNG图像，输出MP4视频

3. **Q: 如何处理长时间运行的任务?**
   A: 使用 `async: true` 参数启用异步模式

4. **Q: 为什么视频生成失败?**
   A: 检查提示词是否符合内容政策，参考图片是否有效

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-01
**维护者**: JiMeng Web MCP Team