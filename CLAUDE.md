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
The project follows a modular architecture after refactoring from a 2800+ line monolithic file:

- **`src/api.ts`** - Main entry point with backward-compatible exports
- **`src/server.ts`** - MCP server implementation with tool definitions
- **`src/api/BaseClient.ts`** - Base client class with shared HTTP and upload methods (582 lines)
- **`src/api/JimengClient.ts`** - Image generation client with video delegation (1644 lines)
- **`src/api/video/VideoGenerator.ts`** - Dedicated video generation module (1121 lines)
- **`src/api/video/TextToVideoGenerator.ts`** - **NEW!** Text-to-video generation with first/last frame support
- **`src/api/video/MultiFrameVideoGenerator.ts`** - **NEW!** Multi-frame video generation (2-10 frames)
- **`src/api/video/MainReferenceVideoGenerator.ts`** - Main reference video generation with [图N] syntax
- **`src/api/ApiClient.ts`** - Legacy HTTP client for JiMeng API
- **`src/api/CreditService.ts`** - Credit/point management service
- **`src/types/api.types.ts`** - Complete API type definitions (200 lines)
- **`src/types/models.ts`** - Model mappings and constants (80 lines)
- **`src/utils/`** - Authentication, dimension calculation, logging utilities
- **`src/utils/timeout.ts`** - **NEW!** Timeout handling and polling logic (600s timeout, exponential backoff)
- **`src/utils/deprecation.ts`** - **NEW!** Deprecation warning system with warnOnce support
- **`src/schemas/video.schemas.ts`** - **NEW!** Zod validation schemas for video generation tools

### Key Architectural Patterns

**Singleton Pattern**: The `getApiClient()` function maintains a global client instance for backward compatibility.

**Inheritance Hierarchy**: `CreditService` → `BaseClient` → `JimengClient` / `VideoGenerator`
- **CreditService**: Handles point management
- **BaseClient**: Provides shared HTTP requests, image upload, and logging methods
- **JimengClient**: Manages image generation, delegates video operations to specialized generators
- **VideoGenerator**: Base class for video generation with shared polling logic

**Modular Generator Pattern**: Specialized generators for each video generation mode
- **TextToVideoGenerator**: Handles text-to-video and first/last frame generation
- **MultiFrameVideoGenerator**: Manages multi-frame video generation (2-10 frames)
- **MainReferenceVideoGenerator**: Handles main reference video generation with [图N] syntax

**Delegation Pattern**: JimengClient delegates video operations to appropriate specialized generators, maintaining clean separation of concerns and enabling independent development of each mode.

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

## MCP Tools Available

### Image Generation Tools
- **`generateImage`**: Main image generation with continue generation support
- **`hello`**: Connection testing and server health check

### Video Generation Tools
- **`generateTextToVideo`**: **NEW!** Text-to-video generation with optional first/last frame support (unified async parameter)
- **`generateMultiFrameVideo`**: **NEW!** Multi-frame video generation (2-10 frames) with precise control
- **`generateMainReferenceVideo`**: **NEW!** Main reference video generation - combines subjects from multiple images using [图N] syntax
- **`generateVideo`**: Legacy video generation (deprecated, redirects to new methods)
- **`videoPostProcess`**: Unified video post-processing (frame interpolation, super-resolution, audio effects)

### Resource Tools
- **Greeting**: Personalized server responses
- **Server Info**: Server status and capabilities

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
