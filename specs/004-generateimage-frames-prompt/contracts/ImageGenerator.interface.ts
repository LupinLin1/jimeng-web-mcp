/**
 * Image Generator Contract Interface
 * Feature: 004-generateimage-frames-prompt
 *
 * This interface defines the contract for the unified image generation method
 * that supports both synchronous and asynchronous execution modes.
 */

import { ImageGenerationParams, QueryResultResponse } from '../../../src/types/api.types';

/**
 * Unified Image Generator Interface
 *
 * Provides a single `generateImage` method that can operate in both
 * synchronous (wait for completion) and asynchronous (return task ID) modes.
 */
export interface IImageGeneratorUnified {
  /**
   * Unified image generation method with conditional return types
   *
   * @param params - Generation parameters with optional `async` and `frames` fields
   *
   * @returns
   * - When `async: true`: Returns Promise<string> (historyId for later querying)
   * - When `async: false` or undefined: Returns Promise<string[]> (image URLs)
   *
   * @example Synchronous mode (default)
   * ```typescript
   * const images = await generator.generateImage({
   *   prompt: "a cat",
   *   count: 2
   * });
   * // images: string[]
   * ```
   *
   * @example Asynchronous mode
   * ```typescript
   * const historyId = await generator.generateImage({
   *   prompt: "a cat",
   *   async: true
   * });
   * // historyId: string
   * ```
   *
   * @example With frames array
   * ```typescript
   * const images = await generator.generateImage({
   *   prompt: "movie storyboard",
   *   frames: ["scene 1", "scene 2", "scene 3"],
   *   count: 3
   * });
   * // Final prompt: "movie storyboard scene 1 scene 2 scene 3，一共3张图"
   * ```
   */
  generateImage(params: ImageGenerationParams & { async: true }): Promise<string>;
  generateImage(params: ImageGenerationParams & { async?: false }): Promise<string[]>;
  generateImage(params: ImageGenerationParams): Promise<string[] | string>;

  /**
   * Existing async method (kept for internal use or direct invocation)
   *
   * @deprecated Use `generateImage` with `async: true` instead
   */
  generateImageAsync(params: ImageGenerationParams): Promise<string>;

  /**
   * Query result of asynchronous generation task
   *
   * @param historyId - Task ID returned by async generation
   * @returns Current status and results if completed
   */
  getImageResult(historyId: string): Promise<QueryResultResponse>;

  /**
   * Batch query multiple task results
   *
   * @param historyIds - Array of task IDs
   * @returns Map of historyId to result or error
   */
  getBatchResults(historyIds: string[]): Promise<{
    [historyId: string]: QueryResultResponse | { error: string };
  }>;
}

/**
 * Frames Validation Contract
 *
 * Defines the expected behavior for frames parameter processing.
 */
export interface IFramesValidator {
  /**
   * Validate and filter frames array
   *
   * Rules:
   * 1. Remove null, undefined, empty strings
   * 2. Trim whitespace from each frame
   * 3. Limit to max 15 elements
   * 4. Log warning if truncation occurs
   *
   * @param frames - Raw frames array from user input
   * @returns Filtered and validated frames array
   *
   * @example
   * ```typescript
   * validateFrames(["scene1", null, "", "  scene2  ", ...Array(20).fill("x")])
   * // Returns: ["scene1", "scene2", ...] (max 15 elements)
   * // Logs: "Warning: Frames array truncated from 20 to 15"
   * ```
   */
  validateAndFilterFrames(frames?: string[]): string[];
}

/**
 * Prompt Builder Contract
 *
 * Defines the expected behavior for prompt construction with frames.
 */
export interface IPromptBuilder {
  /**
   * Build final prompt combining base prompt and frames
   *
   * Rules:
   * 1. If frames empty: return base prompt unchanged
   * 2. If frames present: append frames joined by spaces
   * 3. Always add "，一共N张图" suffix where N = count
   *
   * @param basePrompt - Original user prompt
   * @param frames - Validated frames array
   * @param count - Number of images to generate
   * @returns Final combined prompt
   *
   * @example No frames
   * ```typescript
   * buildPrompt("a cat", [], 2)
   * // Returns: "a cat"
   * ```
   *
   * @example With frames
   * ```typescript
   * buildPrompt("movie", ["scene1", "scene2"], 2)
   * // Returns: "movie scene1 scene2，一共2张图"
   * ```
   */
  buildPromptWithFrames(
    basePrompt: string,
    frames: string[],
    count: number
  ): string;
}

/**
 * Request/Response Schemas (Zod-compatible)
 */
export const ImageGenerationRequestSchema = {
  // Existing fields
  prompt: { type: 'string', required: true },
  count: { type: 'number', min: 1, max: 15, required: false },
  model: { type: 'string', required: false },
  aspectRatio: { type: 'string', required: false },
  filePath: { type: 'array', items: 'string', maxLength: 4, required: false },
  negative_prompt: { type: 'string', required: false },
  sample_strength: { type: 'number', min: 0, max: 1, required: false },
  reference_strength: { type: 'array', items: 'number', required: false },

  // New fields
  async: { type: 'boolean', default: false, required: false },
  frames: {
    type: 'array',
    items: 'string',
    maxLength: 15,
    required: false,
    description: 'Array of scene descriptions for multi-frame generation'
  }
};

/**
 * Response Types
 */
export type SyncGenerationResponse = string[]; // Array of image URLs
export type AsyncGenerationResponse = string;  // History ID for querying

/**
 * Test Assertions (for contract tests)
 */
export const ContractAssertions = {
  // Sync mode returns array
  syncModeReturnsArray: (result: unknown): result is string[] =>
    Array.isArray(result) && result.every(item => typeof item === 'string'),

  // Async mode returns string
  asyncModeReturnsString: (result: unknown): result is string =>
    typeof result === 'string' && result.length > 0,

  // Frames validation removes invalid entries
  framesFilteredCorrectly: (input: unknown[], output: string[]): boolean =>
    output.every(item => typeof item === 'string' && item.trim().length > 0) &&
    output.length <= 15,

  // Prompt combination follows rules
  promptCombinedCorrectly: (
    base: string,
    frames: string[],
    count: number,
    result: string
  ): boolean => {
    if (frames.length === 0) {
      return result === base;
    }
    const expected = `${base} ${frames.join(' ')}，一共${count}张图`;
    return result === expected;
  }
};
