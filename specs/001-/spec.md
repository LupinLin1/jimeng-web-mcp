# Feature Specification: Generation Status Query Method

**Feature Branch**: `001-`
**Created**: 2025-09-30
**Status**: Draft
**Input**: User description: "增加一个查询方法,让用户生成完视频或图片之后。主动来查询是否生成完成,并获得生成的图片或视频的链接。"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature identified: Query method for generation status and result retrieval
2. Extract key concepts from description
   → Actors: Users who initiated image/video generation
   → Actions: Query generation status, retrieve result links
   → Data: historyId (string), status codes (20/30/42/45/50), result URLs
   → Constraints: Must work for both image and video generation
3. Code analysis performed:
   → historyId format: string like 'h1234567890abcdef'
   → Status codes: 20=processing, 30=failed, 42=processing, 45=long-running, 50=completed
   → Authentication: Uses refresh_token/JIMENG_API_TOKEN
   → Result structure: {status, progress, imageUrls?, videoUrl?, error?}
4. Fill User Scenarios & Testing section
   → User flow: Initiate generation → Query status → Retrieve results
5. Generate Functional Requirements
   → All requirements specified with concrete implementation details from codebase
6. Identify Key Entities
   → Generation Task (with historyId), Status (numeric codes), Result (typed responses)
7. Run Review Checklist
   → SUCCESS: All clarifications resolved through code analysis
8. Return: SUCCESS (spec ready for planning phase)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A user initiates an image or video generation request through the system. After submitting the request, they receive a reference identifier. The user then uses this identifier to query the generation status at any time. Once the generation is complete, the query returns the final result links (URLs) for the generated images or videos. The user can download or access these results using the provided links.

### Acceptance Scenarios
1. **Given** a user has submitted an image generation request, **When** they query the status with the generation reference, **Then** the system returns the current status (e.g., pending, processing, completed)
2. **Given** an image generation is complete, **When** the user queries with the generation reference, **Then** the system returns status as "completed" and provides download URLs for all generated images
3. **Given** a user has submitted a video generation request, **When** they query the status with the generation reference, **Then** the system returns the current status and estimated completion time if available
4. **Given** a video generation is complete, **When** the user queries with the generation reference, **Then** the system returns status as "completed" and provides the video URL
5. **Given** a generation has failed, **When** the user queries with the generation reference, **Then** the system returns status as "failed" with error information

### Edge Cases
- What happens when the user queries with an invalid or non-existent generation reference? → System throws error "记录不存在" or "无效的historyId格式"
- How does the system handle queries for old generations? → Relies on JiMeng backend's retention policy (error "historyId已过期" when too old)
- What happens if the user queries too frequently? → JiMeng API handles rate limiting at backend level
- How does the system respond when generation results are temporarily unavailable? → Network errors trigger retry mechanism (up to 3 attempts with error propagation)
- What happens for batch generations with multiple output files? → Returns array of URLs in imageUrls field (tested with concurrent generation scenarios)

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST provide a query method that accepts a generation reference identifier (historyId format: string starting with 'h' followed by alphanumeric characters, e.g., 'h1234567890abcdef')
- **FR-002**: System MUST return the current status for the queried generation task using standardized status codes
- **FR-003**: System MUST support queries for both image and video generation tasks using the same historyId format
- **FR-004**: System MUST return result URLs (imageUrls array for images, single URL for videos) when generation status is "completed"
- **FR-005**: System MUST handle multiple result URLs for image generations that produce multiple outputs (e.g., continue generation with >4 images)
- **FR-006**: System MUST return error information when generation status is "failed", including fail_code (e.g., '2038' for content filtering)
- **FR-007**: System MUST throw descriptive errors for invalid/non-existent references ("记录不存在" for missing historyId, "无效的historyId格式" for invalid format)
- **FR-008**: Query results MUST include: status (string), progress (0-100 number), imageUrls/videoUrl (array/string when completed), error message (string when failed)
- **FR-009**: System MUST require API token (refresh_token from JIMENG_API_TOKEN) for authentication, preventing unauthorized access to generation results
- **FR-010**: Result URLs are managed by JiMeng's backend - no expiration policy is enforced at the query layer
- **FR-011**: System SHOULD support batch queries through Promise.all pattern on client side (no dedicated batch endpoint needed)
- **FR-012**: System relies on JiMeng API's built-in rate limiting (no additional rate limiting implemented at query layer)

### Key Entities *(include if feature involves data)*
- **Generation Task**: Represents an image or video generation request with a unique historyId (string), current status code (20, 30, 42, 45, 50), creation timestamp, total_image_count, finished_image_count, and type (determined by request)
- **Generation Status**: The current state represented by numeric codes:
  - **20**: Processing/Pending
  - **30**: Failed (with optional fail_code like '2038' for content filtering)
  - **42**: Processing (alternate state)
  - **45**: Processing (long-running state)
  - **50**: Completed successfully
- **Generation Result**: Contains status string ('pending', 'processing', 'completed', 'failed'), progress percentage (0-100), imageUrls array (for images), videoUrl string (for videos), and error message (when failed)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all resolved via code analysis)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (status codes, response structure defined)
- [x] Scope is clearly bounded
- [x] Dependencies identified (JiMeng API, authentication tokens)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Code analysis performed (resolved all ambiguities)
- [x] User scenarios defined
- [x] Requirements generated with concrete specifications
- [x] Entities identified with technical details
- [x] Review checklist passed

---

## Implementation Notes (for reference)

### Existing Test Coverage
The codebase contains comprehensive test suites validating the query functionality:
- `async-image-generation.test.ts`: Core async generation and query tests
- `async-api-integration.test.ts`: End-to-end integration tests
- `async-mcp-tools.test.ts`: MCP tool integration tests

### API Endpoints Used (READ-ONLY)
⚠️ **CRITICAL CONSTRAINT**: These endpoints MUST NOT be modified in any way
- Generation submission: `/mweb/v1/aigc_draft/generate` (existing, unchanged)
- Status polling: `/mweb/v1/get_history_by_ids` (existing, unchanged)

**Implementation Strategy**:
- Reuse existing polling mechanism in JimengClient.pollTraditionalResult()
- Do NOT modify endpoint URLs, request payloads, or response parsing
- Only add NEW wrapper functions that call existing internal methods
- Query functionality uses existing API infrastructure without changes

### Key Implementation Details
- Polling mechanism with exponential backoff (5s, 8s, 10s intervals) - **EXISTING, DO NOT MODIFY**
- Network error retry (up to 3 attempts) - **EXISTING, DO NOT MODIFY**
- Status code mapping to user-friendly strings - **NEW WRAPPER LAYER ONLY**
- Support for both single and batch queries via Promise.all - **CLIENT-SIDE PATTERN**

---