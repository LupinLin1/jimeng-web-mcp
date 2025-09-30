<!--
Sync Impact Report
==================
Version: 1.0.0 (Initial Constitution)
Date: 2025-09-30

Principles Defined:
- I. Minimal Code Change Policy
- II. Modular Extension Architecture
- III. Backward Compatibility
- IV. Test-Driven Development
- V. API Contract Stability

Sections Added:
- Core Principles (5 principles)
- Development Standards
- Quality Assurance
- Governance

Templates Requiring Updates:
- ✅ plan-template.md - Constitution Check section will reference these principles
- ✅ spec-template.md - Requirements alignment with backward compatibility
- ✅ tasks-template.md - Task categorization reflects extension-based approach
- ⚠ Command templates - No command files currently exist in .specify/templates/commands/

Follow-up TODOs:
- None - All placeholders filled with concrete values
-->

# JiMeng Web MCP Constitution

## Core Principles

### I. Minimal Code Change Policy

**When implementing new features or fixing bugs, MUST minimize modifications to existing code.**

Rationale: The project has a stable, working codebase with established patterns (modular architecture post-refactoring from 2800+ line monolithic file). Preserving existing code reduces regression risk, maintains backward compatibility, and allows faster feature delivery.

Rules:
- Prefer creating NEW modules/files over modifying EXISTING ones
- When modifying existing code IS necessary, changes MUST be localized to single functions/methods
- Document all modifications to existing code with clear justification
- Changes to core modules (ApiClient, JimengClient, CreditService) require explicit approval gates

### II. Modular Extension Architecture

**New features MUST be implemented as self-contained modules that integrate via well-defined interfaces.**

Rationale: The project successfully refactored from monolithic to modular design (src/api/JimengClient.ts, src/api/ApiClient.ts, src/types/). This architectural pattern enables extension without modification (Open/Closed Principle).

Rules:
- Each new feature lives in its own file/directory under appropriate namespace
- Integration points MUST use existing interfaces (e.g., extending JimengClient)
- Shared functionality goes into src/utils/ or src/types/
- Module dependencies MUST be explicit and unidirectional

### III. Backward Compatibility

**All changes MUST maintain 100% backward compatibility with existing API surface.**

Rationale: Zero-install deployment (npx) and user integrations depend on stable API contracts. Breaking changes force downstream updates across all users.

Rules:
- Public API signatures (exported functions, interfaces) MUST NOT change
- New parameters MUST be optional with sensible defaults
- Deprecate before removal (minimum 2 minor versions)
- Maintain singleton pattern compatibility (getApiClient() function)

### IV. Test-Driven Development

**Tests MUST be written before implementation for all new features.**

Rationale: Project has comprehensive test coverage (unit, integration, async, build verification). TDD ensures features work as designed and prevents regressions.

Rules:
- Write failing tests FIRST (Red phase)
- Implement ONLY enough code to pass tests (Green phase)
- Refactor with tests as safety net (Refactor phase)
- Test categories: Unit (components), Integration (full flow), Async (non-blocking)

### V. API Contract Stability

**External integrations (JiMeng API, MCP protocol) MUST be isolated behind stable internal contracts.**

Rationale: Reverse-engineered APIs and protocol specifications may change. Internal stability shields users from external volatility.

Rules:
- API client abstractions (ApiClient, JimengClient) MUST NOT leak implementation details
- Type definitions (src/types/) serve as stable contracts
- External API changes trigger updates ONLY to client implementation, NOT user-facing interfaces
- MCP tool schemas (Zod definitions) change only for genuine feature additions

## Development Standards

### Code Organization

**File Structure**:
- `src/api/` - API client implementations and services
- `src/types/` - Type definitions and model mappings
- `src/utils/` - Shared utilities (auth, logging, dimensions)
- `src/server.ts` - MCP server and tool definitions
- `tests/` - All test files organized by category

**Naming Conventions**:
- Classes: PascalCase (e.g., JimengClient, CreditService)
- Functions/methods: camelCase (e.g., generateImage, uploadImage)
- Files: kebab-case for utilities, PascalCase for classes
- Types: PascalCase with descriptive suffixes (e.g., ImageGenerationParams)

### Dependency Management

**MUST minimize external dependencies**:
- Current dependencies are minimal and well-justified (axios, uuid, zod, dotenv)
- New dependencies require explicit justification
- Prefer built-in Node.js capabilities over external libraries
- Zero-install deployment (npx) constrains bundle size

## Quality Assurance

### Testing Requirements

**Test Coverage**:
- All new features require tests in at least 2 categories (unit + integration)
- Async operations MUST have dedicated async tests
- Build verification tests ensure production bundle works
- Run `yarn test` before every commit

**Test Patterns**:
- Mock network requests for unit testing
- Use existing async test patterns for API-dependent tests
- Verify backward compatibility with integration tests
- Coverage collection excludes types and test files

### Code Review Gates

**Pre-merge Requirements**:
- All tests passing (yarn test)
- Type checking clean (yarn type-check)
- Build succeeds (yarn build)
- Backward compatibility verified
- Constitution principles compliance documented

## Governance

### Amendment Procedure

This constitution governs all development in the JiMeng Web MCP project. Changes to constitutional principles require:

1. **Proposal**: Document proposed change with rationale
2. **Impact Analysis**: Assess impact on existing codebase and users
3. **Migration Plan**: Define path for existing code to comply
4. **Approval**: Explicit approval from maintainers
5. **Version Update**: Increment version per semantic rules below

### Versioning Policy

Constitution versions follow semantic versioning:

- **MAJOR (X.0.0)**: Backward incompatible principle removal or redefinition
- **MINOR (x.Y.0)**: New principle added or materially expanded guidance
- **PATCH (x.y.Z)**: Clarifications, wording improvements, non-semantic refinements

### Compliance Review

All PRs and feature development MUST verify compliance with constitutional principles:

- Specification phase: Check requirements against principles
- Planning phase: Document any principle violations in "Constitution Check" section
- Implementation phase: Verify minimal code changes, modular extension
- Review phase: Explicit sign-off on backward compatibility

**Reference**: See `.specify/templates/plan-template.md` for Constitution Check format

---

**Version**: 1.0.0 | **Ratified**: 2025-09-30 | **Last Amended**: 2025-09-30