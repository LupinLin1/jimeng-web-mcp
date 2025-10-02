# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **JiMeng Web MCP Server** - a TypeScript-based Model Context Protocol (MCP) server that integrates JiMeng AI's image and video generation services. The project directly calls JiMeng's official APIs through reverse engineering, bypassing third-party services.

### Key Features
- **Continue Generation**: Automatically triggers when requesting >4 images, returns all images in a single response
- **Multi-reference Image Generation**: Supports up to 4 reference images for style mixing and fusion
- **Video Generation**: Traditional first/last frame mode, intelligent multi-frame mode, and **main reference mode**
- **Main Reference Video**: NEW! Combines subjects from multiple images (2-4) into one scene using `[图0]`, `[图1]` syntax
- **Video Post-processing**: Frame interpolation, super-resolution, and audio effect generation
- **Zero-install Deployment**: Supports npx auto-installation for Claude Desktop

## Development Commands

### Build & Development
```bash
# Development with hot reload
yarn dev              # or npm run dev

# Build project
yarn build            # or npm run build

# Type checking
yarn type-check       # or npm run type-check

# Development server with auto-restart
yarn start:dev        # or npm run start:dev
```

### Testing
```bash
# Run all tests
yarn test             # or npm run test

# Watch mode for development
yarn test:watch       # or npm run test:watch

# Coverage report
yarn test:coverage    # or npm run test:coverage

# Test individual files
yarn test image-generation.test.ts
yarn test video-generation.test.ts

# MCP server testing
yarn test:mcp         # or npm run test:mcp
```

### Running the Server
```bash
# Start MCP server (stdio mode)
yarn start            # or npm run start

# Start as HTTP API service
yarn start:api        # or npm run start:api
```

## Architecture Overview

### Core Module Structure
The project follows a **composition-based architecture** after a comprehensive refactoring that reduced code by 74.6% (from 5,268 to 1,335 lines):

- **`src/api.ts`** - Main entry point with backward-compatible exports
- **`src/server.ts`** - MCP server implementation with tool definitions
- **`src/api/NewJimengClient.ts`** - Main API client using composition pattern (351 lines)
- **`src/api/HttpClient.ts`** - Centralized HTTP client with authentication (256 lines)
- **`src/api/ImageUploader.ts`** - Image upload service using image-size library (221 lines)
- **`src/api/NewCreditService.ts`** - Credit management using composition (114 lines)
- **`src/api/VideoService.ts`** - Unified video generation service (393 lines)
  - Merges all video generation modes (text-to-video, multi-frame, main reference)
  - Inline polling logic (~25 lines, replacing 249-line timeout abstraction)
- **`src/types/api.types.ts`** - Complete API type definitions (200 lines)
- **`src/types/models.ts`** - Model mappings and constants (80 lines)
- **`src/utils/`** - Authentication, dimension calculation, logging utilities
- **`src/schemas/video.schemas.ts`** - Zod validation schemas for MCP tool parameters only

**Removed Components** (74.6% code reduction):
- ❌ `BaseClient.ts` (748 lines) - Replaced by HttpClient + ImageUploader
- ❌ `VideoGenerator.ts` (1,676 lines) - Merged into VideoService
- ❌ `TextToVideoGenerator.ts` (378 lines) - Merged into VideoService
- ❌ `MultiFrameVideoGenerator.ts` (467 lines) - Merged into VideoService
- ❌ `MainReferenceVideoGenerator.ts` (710 lines) - Merged into VideoService
- ❌ `timeout.ts` (249 lines) - Inlined polling logic (~25 lines)
- ❌ `deprecation.ts` (150 lines) - Completely removed

### Key Architectural Patterns

**Composition Over Inheritance**: The architecture uses dependency injection instead of inheritance chains:
```typescript
class NewJimengClient {
  private httpClient: HttpClient
  private imageUploader: ImageUploader
  private creditService: NewCreditService
  private videoService: VideoService

  constructor(token?: string) {
    this.httpClient = new HttpClient(token);
    this.imageUploader = new ImageUploader(this.httpClient);
    this.creditService = new NewCreditService(this.httpClient);
    this.videoService = new VideoService(this.httpClient, this.imageUploader);
  }
}
```

**Single Responsibility**: Each service class has a clear, focused purpose:
- **HttpClient**: HTTP requests and authentication (no inheritance)
- **ImageUploader**: Image upload and format detection using image-size library
- **NewCreditService**: Credit/point management (composition, not inheritance)
- **VideoService**: All video generation modes in one unified service
- **NewJimengClient**: Main API facade, delegates to specialized services

**Unified Service Pattern**: VideoService consolidates all video generation:
- Text-to-video with optional first/last frame support
- Multi-frame video generation (2-10 frames)
- Main reference video with [图N] syntax
- Shared internal methods for upload, submission, and polling
- Inline polling logic with exponential backoff (2s → 10s, 1.5x factor, 600s timeout)

**Singleton Pattern**: The `getApiClient()` function maintains a global client instance for backward compatibility.

**Unified Async/Sync Pattern**: All new video generation methods support a single `async` parameter instead of separate async methods. When `async=false`, the system uses conditional polling with 600s timeout and exponential backoff (2s→10s, 1.5x factor).

**Type Safety**: Comprehensive TypeScript definitions with Zod validation for MCP tool parameters.

**Modular Design**: Separates concerns into distinct modules while maintaining 100% backward compatibility.

### Continue Generation Implementation
The continue generation feature is implemented in `src/api/JimengClient.ts` around the `generateImage` method:
- Automatically detects when `total_image_count > 4`
- Makes single additional API call to generate remaining images
- Waits for completion and returns combined results
- Transparent to users - no configuration needed

### Multi-Reference Image System
Supports complex image mixing through:
- **Single Reference**: Automatic `##` prefix in prompt
- **Multi-Reference**: Automatic `####` prefix for up to 4 images
- **File Path Support**: Local absolute/relative paths and URLs
- **Strength Control**: Individual strength per reference image

## MCP Tools Available (10 Core Tools)

### 🎨 Image Generation (2 tools)
- **`image`**: Generate single image (default: sync)
  - Fast single image generation with reference image support
  - Supports up to 4 reference images for style mixing
  - Default async: `false` (synchronous)

- **`image_batch`**: Series image generation (default: async)
  - **专用于高相关性系列图片**：同一房子不同空间、故事分镜、绘本画面、产品多角度
  - **prompts写法**：每个元素是一小段话（不是单个词），重点描述图与图的差异
  - Final prompt format: `第1张：xxx 第2张：yyy，一共N张图`
  - Automatic continue generation for counts > 4
  - Default async: `true` (asynchronous)

  **适用场景**：
  - ✅ 同一套房子的不同空间照片（客厅、卧室、厨房）
  - ✅ 一个故事的连续分镜（场景1、场景2、场景3）
  - ✅ 一个绘本的不同画面（第1页、第2页、第3页）
  - ✅ 同一物品的不同角度照片（正面、侧面、背面）

  **参数说明**：
  - **prompts**: 每张图的差异描述（一小段话）
  - **basePrompt**: 整体通用描述（可选），会添加在最终prompt最前面
    - 房间系列 → 描述整体风格、户型
    - 产品多角度 → 描述产品材质、颜色、品牌
    - 故事分镜 → 描述世界观、角色特征
    - 绘本画面 → 描述画风、色调

  **正确示例1 - 房间系列**：
  ```json
  {
    "basePrompt": "三室两厅现代简约风格，木地板，暖色调照明，简约家具",
    "prompts": [
      "客厅，灰色布艺沙发靠窗，落地窗洒入阳光，茶几上放着杂志",
      "主卧室，米色床品整齐铺展，木质床头柜上有台灯，墙面淡蓝色",
      "开放式厨房，白色橱柜整齐排列，大理石台面，中岛台上摆放水果篮"
    ],
    "async": true
  }
  ```
  **最终prompt**: "三室两厅现代简约风格，木地板，暖色调照明，简约家具 第1张：客厅，灰色布艺沙发靠窗... 第2张：主卧室... 第3张：开放式厨房...，一共3张图"

  **正确示例2 - 产品多角度**：
  ```json
  {
    "basePrompt": "苹果AirPods Pro 2代，白色陶瓷材质，磨砂质感，苹果logo",
    "prompts": [
      "正面特写，充电盒开盖，耳机在盒内，LED指示灯可见",
      "侧面45度角，展示充电盒厚度和圆润边缘，耳机柄露出",
      "背面视角，充电口特写，序列号区域清晰，磁吸接触点"
    ]
  }
  ```

  **错误示例** ❌：
  ```json
  {
    "prompts": ["客厅", "卧室", "厨房"]  // 过分简短，缺少差异描述
  }
  ```

### 🎬 Video Generation (4 tools)
- **`video`**: Pure text-to-video generation (default: async)
  - Generate video from text description only
  - No reference images required
  - Default async: `true`

- **`video_frame`**: First/last frame controlled video (default: async)
  - Control video start and/or end frames
  - Supports first frame only, last frame only, or both
  - Default async: `true`

- **`video_multi`**: Multi-frame precision control (default: async)
  - **工作原理**: 提供2-10个关键帧图片，系统在帧间生成平滑过渡动画
  - **⚠️ 重要**: prompt描述的是"从当前帧到下一帧的过渡过程"，必须包含：
    1. **镜头移动**：推进、拉远、摇移、跟随等
    2. **画面变化**：主体动作、场景变化、光影变化
    3. **转场效果**：淡入淡出、切换方式等
  - **⚠️ 注意**: 最后一帧的prompt不生效（因为没有下一帧了），可以留空或随意填写
  - **时长限制**: 每帧1-6秒（1000-6000毫秒），总时长≤15秒
  - Default async: `true`

  **参数说明**:
  ```typescript
  {
    frames: [
      {
        idx: 0,                           // 帧序号，从0开始
        imagePath: "/abs/path/frame0.jpg", // 绝对路径
        duration_ms: 2000,                 // 这段过渡动画的时长（毫秒，1000-6000）
        prompt: "镜头从正面缓慢推进，猫从坐姿站起，光线从左侧照入"  // 描述0→1的镜头、动作、转场
      },
      {
        idx: 1,
        imagePath: "/abs/path/frame1.jpg",
        duration_ms: 2000,
        prompt: "猫向前迈步行走，尾巴摇摆"  // 描述1→2的变换过程
      },
      {
        idx: 2,
        imagePath: "/abs/path/frame2.jpg",
        duration_ms: 1000,
        prompt: "（此prompt不生效，可留空）"  // 最后一帧，无下一帧
      }
    ],
    fps: 24,
    resolution: "720p"
  }
  ```

  **生成效果** (总时长5秒):
  - 0-2秒: 显示frame0 + 执行"站起来"动画 → 渐变到frame1
  - 2-4秒: 显示frame1 + 执行"行走"动画 → 渐变到frame2
  - 4-5秒: 显示frame2作为结尾画面

- **`video_mix`**: Multi-image subject fusion (default: async)
  - Combine subjects from 2-4 reference images into one scene
  - Use `[图0]`, `[图1]` syntax to reference images
  - Example: `[图0]的猫在[图1]的地板上跑`
  - Default async: `true`

### 🔍 Query Tools (2 tools)
- **`query`**: Query single task status and result
  - Supports both image and video tasks
  - Returns status, progress, and URLs when completed

- **`query_batch`**: Batch query multiple tasks
  - Query up to 10 tasks at once
  - Efficient for checking multiple tasks

### 🏓 Utility Tools (1 tool)
- **`ping`**: Test server connection
  - Health check and connectivity test

### 🗑️ Removed Legacy Tools
The following tools have been removed in favor of the new unified tools:
- ❌ `generateImage` → use `image` or `image_batch`
- ❌ `generateVideo` → use `video`, `video_frame`, or `video_multi`
- ❌ `generateTextToVideo` → use `video` or `video_frame`
- ❌ `generateMultiFrameVideo` → use `video_multi`
- ❌ `generateMainReferenceVideo` → use `video_mix`
- ❌ `generateMainReferenceVideoUnified` → use `video_mix`
- ❌ `videoPostProcess` → deprecated
- ❌ All `*Async` tools → use `async: true` parameter instead
- ❌ `hello` → use `ping`
- ❌ `greeting` resource → removed
- ❌ `info` resource → removed

### Default Async Behavior
- **Sync by default (1 tool)**: `image` - fast single image generation
- **Async by default (6 tools)**: All other generation tools default to async mode
  - `image_batch`, `video`, `video_frame`, `video_multi`, `video_mix`
  - All support `async: false` to switch to sync mode if needed

## Testing Strategy

### Test Categories
- **Unit Tests**: Individual component testing (`clients.test.ts`, `utilities.test.ts`)
- **Integration Tests**: Full API flow testing (`integration.test.ts`, `simple-integration.test.ts`)
- **Async Tests**: Non-blocking API testing (`async-*.test.ts`)
- **Build Verification**: Ensures build process works correctly
- **Backward Compatibility**: Verifies refactoring maintains compatibility

### Test Configuration
- Uses Jest with TypeScript support
- ES module compatibility with `.js` extension handling
- Coverage collection excludes type definitions and test files
- Mock configuration for network requests

## Environment Configuration

### Required Environment Variables
```bash
JIMENG_API_TOKEN=your_session_id_from_jimeng_cookies
```

### Getting API Token
1. Visit [JiMeng AI官网](https://jimeng.jianying.com) and login
2. Open browser dev tools (F12)
3. Go to Application > Cookies
4. Find `sessionid` value and set as `JIMENG_API_TOKEN`

### MCP Configuration (Claude Desktop)
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

## Model Support

### Image Models
- `jimeng-4.0` (recommended) - Latest model with enhanced capabilities
- `jimeng-3.0` - Rich aesthetic diversity, more vivid images
- `jimeng-2.1` - Default model, balanced performance
- `jimeng-2.0-pro` - Pro version for advanced use cases
- `jimeng-1.4` - Legacy model support
- `jimeng-xl-pro` - Special XL version

### Video Models
- `jimeng-video-3.0` - Main video generation model (default)
- `jimeng-video-3.0-pro` - High-quality video generation
- `jimeng-video-2.0-pro` - Compatible with multiple scenarios
- `jimeng-video-2.0` - Basic video generation

## Common Development Tasks

### Adding New Image Generation Tools
1. Define tool in `src/server.ts` using Zod schemas
2. Add corresponding function in `src/api/JimengClient.ts`
3. Update type definitions in `src/types/api.types.ts`
4. Add tests in appropriate test file

### Adding New Video Generation Tools
1. Create dedicated generator class in `src/api/video/` extending `VideoGenerator`
2. Define tool in `src/server.ts` using Zod schemas from `src/schemas/video.schemas.ts`
3. Update type definitions in `src/types/api.types.ts`
4. Expose method through JimengClient delegation
5. Add tests in appropriate test file (unit/, integration/, e2e/)
6. Add timeout and error handling using shared utilities

### Testing API Changes
1. Use existing async test patterns for network-dependent tests
2. Mock network requests for unit testing
3. Verify backward compatibility with integration tests
4. Run full test suite before committing

### Build Process
- Uses `tsup` for bundling with dual CJS/ESM output
- Generates TypeScript declarations automatically
- Clean build removes previous artifacts
- Source maps included for debugging

## Important Notes

- **Backward Compatibility**: All changes must maintain 100% compatibility with existing API
- **Unified Async/Sync API**: New video methods use single `async` parameter instead of separate async methods
- **Soft Deprecation**: Legacy methods show warnings but remain functional using `warnOnce` system
- **Timeout Management**: Synchronous operations use 600s timeout with exponential backoff (2s→10s, 1.5x factor)
- **Zero-install**: The npx deployment method is preferred over manual installation
- **Security**: Never commit API tokens or sensitive information
- **Performance**: The singleton pattern prevents duplicate client instances
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Modular Testing**: Three-tier testing strategy (unit → integration → e2e) ensures reliability

## Main Reference Video Generation (NEW Feature)

### Overview

**Main Reference Video** is a NEW video generation mode that allows combining subjects from multiple images (2-4) into a single scene. It enables precise control over which elements from each reference image to use.

### Key Capabilities

- **Multi-Image Subject Fusion**: Extract subjects from different images and place them in one scene
- **Precise Reference Control**: Use `[图0]`, `[图1]`, `[图2]`, `[图3]` syntax to reference specific images
- **Flexible Composition**: Mix characters, objects, and environments from different sources
- **Natural Language Prompts**: Describe the desired scene using natural language with image references

### Usage Examples

#### Example 1: Character in Different Environment
```typescript
// Combine a cat from image 1 with a floor from image 2
{
  referenceImages: ["/path/to/cat.jpg", "/path/to/floor.jpg"],
  prompt: "[图0]中的猫在[图1]的地板上跑",
  // Translation: "The cat from [image 0] running on the floor from [image 1]"
}
```

#### Example 2: Multiple Subject Composition
```typescript
{
  referenceImages: [
    "/path/to/person.jpg",
    "/path/to/car.jpg",
    "/path/to/beach.jpg"
  ],
  prompt: "[图0]中的人坐在[图1]的车里，背景是[图2]的海滩",
  // "Person from image 0 sitting in car from image 1, with beach from image 2 as background"
}
```

#### Example 3: Object Replacement
```typescript
{
  referenceImages: ["/path/to/room.jpg", "/path/to/furniture.jpg"],
  prompt: "[图0]的房间里放着[图1]的家具",
  // "Room from image 0 with furniture from image 1"
}
```

### Parameter Reference

```typescript
interface MainReferenceVideoParams {
  referenceImages: string[];          // 2-4 image file paths (absolute paths)
  prompt: string;                     // Prompt with [图N] syntax to reference images
  model?: string;                     // Default: "jimeng-video-3.0"
  resolution?: '720p' | '1080p';      // Default: '720p'
  videoAspectRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';  // Default: '16:9'
  fps?: number;                       // Frame rate 12-30, default: 24
  duration?: number;                  // Duration in ms, 3000-15000, default: 5000
}
```

### Important Notes

1. **Image Count**: Requires 2-4 reference images (less than 2 or more than 4 will fail)
2. **Prompt Requirements**: Must include at least one image reference using `[图N]` syntax
3. **Valid Indices**: Image indices must be valid (0-based, within range of provided images)
4. **Model Support**: Requires jimeng-video-3.0 or later models
5. **Processing Time**: May take longer than traditional video generation due to multi-image processing

### Technical Details

#### Architecture
- **Location**: `src/api/video/MainReferenceVideoGenerator.ts`
- **Inheritance**: Extends `JimengClient` to reuse upload and request capabilities
- **Independence**: Fully independent implementation, no modifications to existing code

#### Implementation Features
- Automatic prompt parsing to extract image references and text segments
- Converts `[图N]` syntax to API's `idip_meta_list` structure
- Uploads all reference images before generation
- Polls video generation status with exponential backoff
- Comprehensive parameter validation

#### API Mapping
The tool translates user-friendly syntax into JiMeng's internal format:
- `video_mode: 2` - Identifies main reference mode
- `idip_frames` - Uploaded reference images
- `idip_meta_list` - Structured prompt with image references and text segments
- `functionMode: "main_reference"` - Tracking metadata

### Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "至少需要2张参考图片" | Less than 2 images provided | Provide 2-4 images |
| "最多支持4张参考图片" | More than 4 images provided | Reduce to 4 or fewer |
| "必须包含至少一个图片引用" | No `[图N]` in prompt | Add image references like `[图0]` |
| "图片引用[图N]超出范围" | Index exceeds image count | Use valid indices (0 to imageCount-1) |
| "上传失败" | Image file not found/accessible | Check file paths are absolute and valid |

### MCP Tool Registration

The feature is registered as `generateMainReferenceVideo` in MCP server:
```typescript
server.tool("generateMainReferenceVideo", ...)
```

Available in Claude Desktop once MCP server is configured.

## Video Generation API Reference (Feature 005-3-1-2)

### Overview

The video generation API has been refactored into three specialized methods, each supporting unified async/sync operation through a single `async` parameter.

### New Video Generation Methods

#### 1. generateTextToVideo

Text-to-video generation with optional first/last frame support.

```typescript
// Usage in Claude Desktop
generateTextToVideo({
  prompt: "A beautiful sunset over mountains",
  model: "jimeng-video-3.0",
  resolution: "1080p",
  videoAspectRatio: "16:9",
  fps: 24,
  duration: 5000,
  async: false,  // Sync mode (default)
  firstFrameImage: "/path/to/first.jpg",  // Optional
  lastFrameImage: "/path/to/last.jpg"    // Optional
})
```

**Key Features:**
- **Text-to-Video**: Generate video from text description
- **First/Last Frame**: Optional control over start and end frames
- **Unified Async**: Single `async` parameter for sync/async modes
- **600s Timeout**: Automatic polling with exponential backoff for sync mode

#### 2. generateMultiFrameVideo

Multi-frame video generation with precise control over 2-10 frames.

```typescript
generateMultiFrameVideo({
  frames: [
    {
      idx: 0,
      imagePath: "/frame-0.jpg",
      duration_ms: 1000,
      prompt: "Starting scene"
    },
    {
      idx: 1,
      imagePath: "/frame-1.jpg",
      duration_ms: 1000,
      prompt: "Middle scene"
    },
    {
      idx: 2,
      imagePath: "/frame-2.jpg",
      duration_ms: 1000,
      prompt: "Ending scene"
    }
  ],
  prompt: "Smooth transition between frames",
  model: "jimeng-video-3.0",
  resolution: "720p",
  fps: 24,
  duration: 8000,
  async: false
})
```

**Key Features:**
- **2-10 Frames**: Precise control over frame sequence
- **Frame Timing**: Individual duration control per frame
- **Automatic Sorting**: Frames automatically sorted by index
- **Validation**: Comprehensive parameter validation

#### 3. generateMainReferenceVideo

Main reference video generation using [图N] syntax for multi-image composition.

```typescript
generateMainReferenceVideo({
  referenceImages: [
    "/path/to/person.jpg",
    "/path/to/car.jpg",
    "/path/to/beach.jpg"
  ],
  prompt: "[图0]中的人坐在[图1]的车里，背景是[图2]的海滩",
  model: "jimeng-video-3.0",
  resolution: "1080p",
  videoAspectRatio: "16:9",
  fps: 24,
  duration: 5000,
  async: false
})
```

**Key Features:**
- **Multi-Image Fusion**: Combine subjects from 2-4 reference images
- **[图N] Syntax**: Natural language with precise image references
- **Smart Parsing**: Automatic extraction of image references
- **Validation**: Ensures valid indices and required image references

### Async/Sync Pattern

All new methods use the unified async parameter:

```typescript
// Synchronous mode (async: false)
const result = await generateTextToVideo({
  prompt: "Test video",
  async: false
});
// Returns: { videoUrl: "...", metadata: {...} }

// Asynchronous mode (async: true)
const result = await generateTextToVideo({
  prompt: "Test video",
  async: true
});
// Returns: { taskId: "..." }
```

### Common Parameters

All video generation methods support these common parameters:

- **async**: boolean - Sync (false) or async (true) mode
- **model**: string - Video model (default: "jimeng-video-3.0")
- **resolution**: "720p" | "1080p" - Video resolution
- **videoAspectRatio**: "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16"
- **fps**: number (12-30) - Frame rate
- **duration**: number (3000-15000) - Duration in milliseconds

### Error Handling

Consistent error format across all methods:

```typescript
{
  error: {
    code: "TIMEOUT" | "CONTENT_VIOLATION" | "API_ERROR" | "INVALID_PARAMS" | "PROCESSING_FAILED" | "UNKNOWN",
    message: "Human-readable error message",
    reason: "Detailed explanation",
    taskId?: string,
    timestamp: number
  }
}
```

### Migration from Legacy Methods

Legacy `generateVideo` method is deprecated but still functional:

```typescript
// Legacy method (shows deprecation warning)
generateVideo({...}) // Automatically redirects to appropriate new method

// New recommended methods
generateTextToVideo({...})        // For text-based generation
generateMultiFrameVideo({...})    // For multi-frame generation
generateMainReferenceVideo({...}) // For multi-image composition
```

### Timeout and Polling

Synchronous operations use intelligent polling:
- **Initial Interval**: 2 seconds
- **Max Interval**: 10 seconds
- **Backoff Factor**: 1.5x
- **Total Timeout**: 600 seconds (10 minutes)
- **Network Recovery**: Automatic retry on transient failures

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
