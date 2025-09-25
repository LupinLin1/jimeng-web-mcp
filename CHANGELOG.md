# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.11.0] - 2025-01-25

### 🔧 Major Fixes
- **Fixed MCP Connection Issues**: Resolved emoji characters causing JSON parsing errors in MCP protocol communication
- **Fixed Server Entry Point**: Fixed CommonJS module main entry detection logic ensuring proper server startup
- **Fixed Polling Result Extraction**: Fixed critical result extraction logic bug that caused "图像生成失败：未能获取图像URL" errors
- **Enhanced Continue Generation**: Optimized continue generation logic for better success rate with 7+ image generation

### 📚 Project Improvements
- **Enhanced Documentation**: Comprehensive CLAUDE.md with detailed architecture documentation and development guidelines
- **Task Master Integration**: Added Task Master AI integration support for better project workflow
- **Updated MCP Configuration**: Support for both local development and global deployment scenarios
- **Code Cleanup**: Removed temporary files and debug code, maintaining clean project structure

### ✅ Testing & Verification
- **Batch Image Generation**: Successfully tested generating 7 weekly motivational posters
- **MCP Server Health**: Verified MCP server connection status shows ✓ Connected
- **Global Installation**: Confirmed global installation and registration functionality works correctly

### 🏗️ Technical Changes
- Enhanced polling mechanisms with better error handling and timeout management
- Improved logging system with structured log formats for better debugging
- Added comprehensive async test suite for API integration testing
- Updated build configuration for dual CJS/ESM output support

## [1.10.0] - 2025-01-21

### Added
- **Continue Generation Feature**: Automatically triggers when generating more than 4 images
  - Detects when `total_image_count > 4` and sends continuation request
  - Single execution to avoid duplicate requests
  - Waits for all images to complete before returning results
  - Seamless user experience with no additional configuration
- **MCPHub Support**: Added comprehensive MCPHub configuration
  - Complete tool definitions with input schemas
  - Resource descriptions and environment setup
  - Feature highlights and installation instructions
- **Enhanced Documentation**: 
  - Added MCPHub installation as recommended method
  - Detailed continue generation examples and usage
  - Updated feature list with new capabilities
  - Improved API parameter descriptions

### Changed
- Updated `generateImage` API to support continue generation workflow
- Enhanced `pollTraditionalResult` method with continuation logic
- Improved error handling and status checking
- Updated default model to `jimeng-4.0` with better performance

### Fixed
- Resolved TypeScript compilation issues in continuation logic
- Fixed module import paths in test files
- Improved request data construction for continuation requests

### Technical
- Added `shouldContinueGeneration()` method for smart detection
- Added `performContinuationGeneration()` method for execution
- Integrated continuation logic into existing polling workflow
- Maintained 100% backward compatibility with existing API

## [1.9.0](https://github.com/c-rick/jimeng-mcp/compare/v1.8.0...v1.9.0) (2025-07-16)


### Features

* support generate video ([b79865b](https://github.com/c-rick/jimeng-mcp/commit/b79865bee78f83e8f3585cdaa645085fb53090c5))

## [1.8.0](https://github.com/c-rick/jimeng-mcp/compare/v1.7.1...v1.8.0) (2025-07-15)


### Features

* add script to start api server ([e5ad5f2](https://github.com/c-rick/jimeng-mcp/commit/e5ad5f2652598e29491b9dce6c803b568440d899))

### [1.7.1](https://github.com/c-rick/jimeng-mcp/compare/v1.7.0...v1.7.1) (2025-07-11)

## [1.7.0](https://github.com/c-rick/jimeng-mcp/compare/v1.6.1...v1.7.0) (2025-07-08)


### Features

* 支持使用3.1模型（默认），混合生图默认使用3.0模型 ([2f52a6f](https://github.com/c-rick/jimeng-mcp/commit/2f52a6fc009509ec5db2fc402db800aa934a7b31))

### [1.6.1](https://github.com/c-rick/jimeng-mcp/compare/v1.6.0...v1.6.1) (2025-06-10)

## [1.6.0](https://github.com/c-rick/jimeng-mcp/compare/v1.5.1...v1.6.0) (2025-05-26)


### Features

* update response type ([624dbfe](https://github.com/c-rick/jimeng-mcp/commit/624dbfe4658c975f13c145d739f72e5e28bca049))

### [1.5.1](https://github.com/c-rick/jimeng-mcp/compare/v1.5.0...v1.5.1) (2025-05-26)


### Bug Fixes

* read remote filepath as buffer ([23fdaf1](https://github.com/c-rick/jimeng-mcp/commit/23fdaf14877b58c534be2918243ea9958ab201f1))

## [1.5.0](https://github.com/c-rick/jimeng-mcp/compare/v1.4.0...v1.5.0) (2025-05-26)


### Features

* update server ([f3de05c](https://github.com/c-rick/jimeng-mcp/commit/f3de05c439d833d642a1e71d604227bbc3aa725a))

## [1.4.0](https://github.com/c-rick/jimeng-mcp/compare/v1.3.0...v1.4.0) (2025-05-26)


### Features

* support blend ([0e59e3d](https://github.com/c-rick/jimeng-mcp/commit/0e59e3db543bdcceb91d6f80769d3ad6c6d54433))
* update readme ([e9a1b31](https://github.com/c-rick/jimeng-mcp/commit/e9a1b31a478bae812c9316c2f7e70363f6d30b4b))

## [1.3.0](https://github.com/c-rick/jimeng-mcp/compare/v1.2.1...v1.3.0) (2025-05-07)


### Features

* update configuration ([525e369](https://github.com/c-rick/jimeng-mcp/commit/525e369d1b10b2c67155771d7064041b70cd5df6))

### [1.2.1](https://github.com/c-rick/jimeng-mcp/compare/v1.2.0...v1.2.1) (2025-05-07)

## [1.2.0](https://github.com/c-rick/jimeng-mcp/compare/v1.1.0...v1.2.0) (2025-05-07)


### Features

* update api with session ([54127a3](https://github.com/c-rick/jimeng-mcp/commit/54127a3290d8908f3e2edbd570411bc48594c760))

## 1.1.0 (2025-04-28)


### Features

* add workflows ([1170406](https://github.com/c-rick/jimeng-mcp/commit/117040652848600be10e68bd72da333ff89c8b2e))
* init ([604956c](https://github.com/c-rick/jimeng-mcp/commit/604956c8a6b0bc4aef0ba612bbdb9c60f620073f))
* update workflow ([79968a5](https://github.com/c-rick/jimeng-mcp/commit/79968a5d9cbb765f39217be23fb1e08f0e67400e))
