# Repository Context Analysis - JiMeng Web MCP

## Project Overview

**Project Type:** MCP (Model Context Protocol) Server for AI Image/Video Generation  
**Primary Purpose:** Provides a bridge between Claude Code/MCP clients and JiMeng AI API for image and video generation  
**Language:** TypeScript with Node.js runtime  
**Architecture:** Modular, service-oriented design with recent refactoring from monolithic structure  

## Technology Stack Summary

### Core Technologies
- **Runtime:** Node.js 16+ (target: ES2020)
- **Language:** TypeScript with strict mode enabled
- **Module System:** ESM (NodeNext) with CommonJS compatibility
- **Build Tool:** tsup (TypeScript Universal Packager)
- **Package Manager:** npm (with package-lock.json)

### Key Dependencies
- **MCP Framework:** `@modelcontextprotocol/sdk` v1.10.2 - Core MCP server implementation
- **HTTP Client:** `axios` v1.9.0 - API communication
- **Validation:** `zod` v3.24.3 - Runtime type validation and schema definition
- **Utilities:** 
  - `uuid` v11.1.0 - Unique identifier generation
  - `crypto-js` v4.2.0 - Cryptographic operations
  - `dotenv` v16.5.0 - Environment variable management

### Development Tools
- **Testing:** Jest v29.7.0 with ts-jest for TypeScript support
- **Type Checking:** TypeScript v5.8.3 with strict mode
- **Development Server:** nodemon v3.1.10 for auto-restart
- **Build:** tsup v8.4.0 for dual ESM/CJS output
- **Runtime Execution:** tsx v4.20.3 for direct TypeScript execution

## Project Structure & Organization

### Directory Layout
```
/Users/lupin/mcp-services/jimeng-mcp/
├── src/                          # Source code (TypeScript)
│   ├── api/                      # API client modules (refactored)
│   │   ├── JimengClient.ts       # Main unified client
│   │   ├── ApiClient.ts          # Base API client
│   │   ├── CreditService.ts      # Credit management
│   │   └── index.ts              # API exports
│   ├── types/                    # Type definitions
│   │   ├── api.types.ts          # API interface types
│   │   ├── models.ts             # Model mappings
│   │   ├── params.types.ts       # Parameter types
│   │   └── constants.ts          # Constants
│   ├── utils/                    # Utility modules
│   │   ├── auth.ts               # Authentication utilities
│   │   ├── validation.ts         # Input validation
│   │   ├── dimensions.ts         # Image dimension calculations
│   │   ├── logger.ts             # Logging utilities
│   │   └── a_bogus.ts            # Anti-bot signature generation
│   ├── __tests__/                # Test files
│   ├── api.ts                    # Main API facade (post-refactor)
│   ├── server.ts                 # MCP server implementation
│   └── index.ts                  # Entry point
├── lib/                          # Compiled output (ESM + CJS)
├── script/                       # Utility scripts
├── .github/workflows/            # CI/CD pipelines
├── .claude/                      # Claude Code configuration
├── .taskmaster/                  # Task Master AI integration
└── Configuration files...
```

### Key Configuration Files
- **`package.json`:** Project metadata, dependencies, and npm scripts
- **`tsconfig.json`:** TypeScript compilation settings (ES2020, NodeNext)
- **`tsup.config.ts`:** Build configuration for dual format output
- **`.mcp.json`:** Local MCP server configuration
- **`.env.example`:** Environment variable template

## Code Patterns & Conventions

### Architecture Patterns
1. **MCP Tool Pattern:** Each tool (generateImage, generateVideo, etc.) follows:
   - Zod schema validation for parameters
   - Async function implementation
   - Consistent error handling and logging
   - Structured response format

2. **Service Layer Pattern:** Recent refactoring separated concerns:
   - `JimengClient` - High-level API operations
   - `ApiClient` - Low-level HTTP operations
   - `CreditService` - Account management
   - Type-safe interfaces throughout

3. **Utility-First Design:**
   - Modular utility functions
   - Reusable validation schemas
   - Centralized logging
   - Dimension calculation helpers

### Coding Standards
- **Strict TypeScript:** All code uses strict mode with comprehensive typing
- **ESM Modules:** Uses import/export with `.js` extensions for compiled references
- **Error Handling:** Consistent try-catch blocks with detailed error logging
- **Documentation:** Extensive JSDoc comments and inline documentation
- **Validation:** Runtime validation using Zod schemas for all API inputs

### Naming Conventions
- **Files:** kebab-case for directories, PascalCase for classes, camelCase for utilities
- **Functions:** camelCase with descriptive names
- **Types:** PascalCase interfaces/types with descriptive suffixes
- **Constants:** UPPER_SNAKE_CASE for configuration values

## API Structure & Endpoints

### Core MCP Tools
1. **`hello`** - Connection testing and health check
2. **`generateImage`** - AI image generation with multiple modes:
   - Text-to-image generation
   - Single reference image style transfer
   - Multi-reference image fusion (up to 4 images)
   - Support for various aspect ratios and models
3. **`generateVideo`** - AI video generation supporting:
   - Traditional first/last frame mode
   - Intelligent multi-frame mode (up to 10 keyframes)
   - Multiple resolutions and aspect ratios
4. **`videoPostProcess`** - Video enhancement operations:
   - Frame interpolation (24fps → 30fps/60fps)
   - Super resolution (quality enhancement)
   - Audio effect generation

### Resource Endpoints
- **`greeting://{name}`** - Personalized greeting resource
- **`info://server`** - Server status and information
- **`jimeng-ai://info`** - Detailed usage documentation

## Integration Points

### MCP Integration
- **Transport:** stdio-based communication
- **Client Compatibility:** Claude Desktop, Claude Code, other MCP clients
- **Distribution:** npm package with npx auto-installation support

### External APIs
- **JiMeng AI API:** Direct integration via reverse-engineered endpoints
- **Authentication:** Session-based using JIMENG_API_TOKEN
- **Rate Limiting:** Built-in request management and error handling

### Environment Integration
- **Installation Methods:**
  1. npx auto-installation (recommended)
  2. MCPHub platform integration
  3. Manual installation and configuration
- **Configuration:** Environment variables with .env support

## Development Workflow

### Build System
- **Compilation:** TypeScript → ESM + CommonJS dual output
- **Source Maps:** Generated for debugging
- **Type Declarations:** Auto-generated .d.ts files
- **Tree Shaking:** Optimized bundle output via tsup

### Testing Strategy
- **Framework:** Jest with TypeScript support
- **Test Types:**
  - Unit tests for utilities and services
  - Integration tests for API functionality
  - Build verification tests
  - Module import/export tests
- **Coverage:** Comprehensive test coverage for core functionality

### CI/CD Pipeline
1. **Continuous Integration:**
   - Multi-Node.js version testing (18.x, 20.x)
   - Type checking and compilation
   - Test execution (with failure tolerance)
   - Package creation verification

2. **Publishing Pipeline:**
   - Tag-based release triggers
   - Automated npm publishing
   - GitHub release creation with installation instructions
   - Version management

### Git Workflow
- **Branching:** Main branch development
- **Commit Conventions:** Clear, descriptive commit messages
- **Release Process:** Tag-based versioning (v1.10.4 current)

## Development Constraints & Considerations

### Technical Constraints
1. **Node.js Compatibility:** Minimum Node.js 16+ required
2. **ESM Requirements:** Must maintain dual ESM/CJS compatibility
3. **MCP Protocol:** Strict adherence to MCP specifications
4. **Type Safety:** Comprehensive TypeScript coverage required

### API Limitations
1. **Authentication:** Requires valid JiMeng session token
2. **Rate Limiting:** Subject to JiMeng API rate limits
3. **File Size:** Image/video file size limitations
4. **Format Support:** Limited to supported image/video formats

### Deployment Considerations
1. **Environment Variables:** JIMENG_API_TOKEN required for operation
2. **Network Access:** Requires internet connectivity for API calls
3. **File System:** Local file access needed for reference image processing
4. **Memory Usage:** Processing large images/videos requires adequate memory

## Recent Architecture Changes

### Major Refactoring (Post-2800 lines)
- **Monolithic → Modular:** Split large api.ts into focused modules
- **Backward Compatibility:** Maintained 100% API compatibility
- **Type Safety:** Enhanced type definitions and validation
- **Error Handling:** Improved error reporting and logging
- **Performance:** Optimized for better resource usage

### Current State
- **Stable API:** Well-tested and documented interface
- **Modular Design:** Easy to extend and maintain
- **Production Ready:** Deployed and actively used
- **Continuous Improvement:** Active development and updates

## Integration Recommendations

### For New Features
1. Follow existing MCP tool patterns
2. Use Zod for parameter validation
3. Implement comprehensive error handling
4. Add corresponding tests
5. Update documentation

### For Async Operations
1. Leverage existing async/await patterns
2. Use proper error propagation
3. Implement timeout handling
4. Consider memory management for large operations
5. Follow existing logging patterns

### For External Integrations
1. Use established HTTP client patterns
2. Implement proper authentication flow
3. Handle rate limiting gracefully
4. Provide clear error messages
5. Maintain type safety throughout