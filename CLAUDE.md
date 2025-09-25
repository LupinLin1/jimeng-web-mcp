# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **JiMeng Web MCP Server** - a TypeScript-based Model Context Protocol (MCP) server that integrates JiMeng AI's image and video generation services. The project directly calls JiMeng's official APIs through reverse engineering, bypassing third-party services.

### Key Features
- **Continue Generation**: Automatically triggers when requesting >4 images, returns all images in a single response
- **Multi-reference Image Generation**: Supports up to 4 reference images for style mixing and fusion
- **Video Generation**: Both traditional first/last frame mode and intelligent multi-frame mode
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
- **`src/api/JimengClient.ts`** - Unified API client (400 lines)
- **`src/api/ApiClient.ts`** - Base HTTP client for JiMeng API
- **`src/api/CreditService.ts`** - Credit/point management service
- **`src/types/api.types.ts`** - Complete API type definitions (200 lines)
- **`src/types/models.ts`** - Model mappings and constants (80 lines)
- **`src/utils/`** - Authentication, dimension calculation, logging utilities

### Key Architectural Patterns

**Singleton Pattern**: The `getApiClient()` function maintains a global client instance for backward compatibility.

**Inheritance Hierarchy**: `JimengClient` extends `CreditService` which provides point management capabilities.

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
- **`generateVideo`**: Video generation with traditional and multi-frame modes
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

### Adding New MCP Tools
1. Define tool in `src/server.ts` using Zod schemas
2. Add corresponding function in `src/api/JimengClient.ts`
3. Update type definitions in `src/types/api.types.ts`
4. Add tests in appropriate test file

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
- **Zero-install**: The npx deployment method is preferred over manual installation
- **Security**: Never commit API tokens or sensitive information
- **Performance**: The singleton pattern prevents duplicate client instances
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
