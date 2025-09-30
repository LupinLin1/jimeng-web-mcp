
# Implementation Plan: Generation Status Query Method

**Branch**: `001-` | **Date**: 2025-09-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/lupin/mcp-services/jimeng-mcp/specs/001-/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Add a query method to allow users to actively check generation status and retrieve result URLs after initiating image or video generation. The method accepts a historyId (generation reference), queries the JiMeng backend for current status, and returns structured results including status codes (20/30/42/45/50), progress percentage, and result URLs when completed. Supports both image (multiple URLs) and video (single URL) generations with comprehensive error handling.

## Technical Context
**Language/Version**: TypeScript 5.x with Node.js (existing project stack)
**Primary Dependencies**: Existing - axios (HTTP client), zod (schema validation), uuid (ID generation)
**Storage**: N/A - stateless query, data managed by JiMeng backend
**Testing**: Jest with TypeScript support, comprehensive test coverage (unit, integration, async)
**Target Platform**: Node.js runtime, MCP server protocol, npx zero-install deployment
**Project Type**: Single (MCP server application)
**Performance Goals**: Query response <2s typical, handles concurrent queries via Promise.all
**Constraints**: Relies on JiMeng API polling (5-10s intervals), max 30 poll attempts, 5min timeout, 3 network error retries
**Scale/Scope**: Existing codebase ~400 lines JimengClient, comprehensive test suite validates async patterns

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with constitutional principles from `.specify/memory/constitution.md`:

- [x] **Minimal Code Change**: YES - Feature adds NEW exported functions (generateImageAsync, getImageResult) to api.ts without modifying existing generateImage/generateVideo. Existing code untouched.
- [x] **Modular Extension**: YES - Implements as new methods in JimengClient class, follows existing modular pattern. Query logic isolated from generation logic.
- [x] **Backward Compatibility**: YES - Only adds new optional exports. Existing API surface (generateImage, generateVideo) remains unchanged. No breaking changes.
- [x] **Test-Driven Development**: YES - Comprehensive test suite already exists (async-image-generation.test.ts, async-api-integration.test.ts, async-mcp-tools.test.ts). Will follow TDD for any additional functionality.
- [x] **API Contract Stability**: YES - Uses existing internal API patterns (JimengClient methods, type definitions in src/types/). External JiMeng API calls isolated behind client abstraction.

**Violations**: None

**Mitigation**: N/A - Full constitutional compliance achieved

---

⚠️ **CRITICAL IMPLEMENTATION CONSTRAINT**

**User Requirement**: 保持向前兼容 (Maintain Backward Compatibility)

**Core Principle**:
- ✅ Can add NEW features and functions
- ✅ Can refactor internal implementation (if behavior unchanged)
- ❌ CANNOT break existing API contracts
- ❌ CANNOT change function signatures or return types

**What Must Stay Unchanged**:
1. `generateImage(params): Promise<string[]>` - signature and behavior
2. `generateVideo(params): Promise<string>` - signature and behavior
3. `ImageGenerationParams` interface - all existing fields
4. `VideoGenerationParams` interface - all existing fields
5. Error types and messages - consistent with existing behavior

**Implementation Approach**:
- ✅ Add NEW `generateImageAsync()` - returns historyId immediately
- ✅ Add NEW `getImageResult(historyId)` - queries status
- ✅ Keep existing `generateImage()` - continues to wait for completion
- ✅ Reuse existing polling infrastructure
- ✅ Add NEW types (`QueryResultResponse`, `GenerationStatus`)

**Verification**:
- All existing tests pass without modification
- Both sync and async patterns work simultaneously
- No performance degradation in existing functions

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── api/
│   ├── JimengClient.ts          # Add generateImageAsync(), getImageResult() methods
│   ├── ApiClient.ts              # No changes needed
│   └── CreditService.ts          # No changes needed
├── types/
│   └── api.types.ts              # Add QueryResultResponse interface
├── server.ts                     # Add MCP tool definitions for query methods
└── api.ts                        # Export new async functions

src/__tests__/
├── async-image-generation.test.ts    # Existing - validates async functionality
├── async-api-integration.test.ts     # Existing - end-to-end tests
└── async-mcp-tools.test.ts          # Existing - MCP integration tests
```

**Structure Decision**: Single project (MCP server) - Feature adds methods to existing JimengClient class and exports them through api.ts. Test infrastructure already in place. No new directories required, follows established modular pattern (src/api/, src/types/, src/server.ts).

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (data-model.md, contracts/, quickstart.md)
- Type definitions first (QueryResultResponse, GenerationStatus) [P]
- Contract tests before implementation (TDD red phase) [P]
- Add methods to JimengClient (generateImageAsync, getImageResult)
- Export functions from api.ts
- Add MCP tool definitions to server.ts
- Integration test scenarios from quickstart.md
- Performance validation tasks

**Ordering Strategy**:
- TDD order: Tests before implementation (Red → Green → Refactor)
- Dependency order: Types → Tests → Implementation → Integration → MCP tools
- Mark [P] for parallel execution (independent files/tests)
- Type exports and contract tests can be parallelized

**Estimated Output**: 15-20 numbered, ordered tasks in tasks.md

**Task Breakdown**:
1. Type definitions (2 tasks)
2. Contract test creation (3 tasks)
3. Implementation (3 tasks)
4. Integration tests (4 tasks)
5. MCP tool definitions (2 tasks)
6. Documentation updates (1 task)
7. Performance validation (1 task)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: No violations detected

All constitutional principles satisfied:
- Minimal code changes: Only additive exports, no modifications to existing code
- Modular extension: New methods added to existing JimengClient class
- Backward compatibility: 100% maintained, all existing signatures preserved
- Test-driven development: Comprehensive test infrastructure already in place
- API contract stability: Internal abstractions shield users from backend changes

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (via code analysis in spec phase)
- [x] Complexity deviations documented (N/A - no deviations)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
