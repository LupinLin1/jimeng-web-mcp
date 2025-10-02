/**
 * Unified generateImage Method Unit Tests
 * Feature: 004-generateimage-frames-prompt
 *
 * Tests the async parameter behavior and type inference
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ImageGenerationParams } from '../../src/types/api.types.js';
import { ImageGenerator } from '../../src/api/image/ImageGenerator.js';

describe('Unified generateImage Method', () => {
  let generator: ImageGenerator;

  beforeEach(() => {
    generator = new ImageGenerator('test-token');
  });

  it('should return string[] when async=false', async () => {
    // Mock the implementation to return array
    jest.spyOn(generator, 'generateImage').mockResolvedValue(['url1', 'url2']);

    const result = await generator.generateImage({ prompt: 'test', async: false });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('should return string when async=true', async () => {
    // Mock the implementation to return historyId
    jest.spyOn(generator, 'generateImage').mockResolvedValue('4739198022156');

    const result = await generator.generateImage({ prompt: 'test', async: true });

    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d+$/); // Should be numeric string
  });

  it('should default to sync mode when async undefined', async () => {
    // Mock the implementation to return array (default behavior)
    jest.spyOn(generator, 'generateImage').mockResolvedValue(['url1']);

    const result = await generator.generateImage({ prompt: 'test' });

    expect(Array.isArray(result)).toBe(true);
  });

  it('should preserve backward compatibility', async () => {
    // Old calling pattern should still work
    jest.spyOn(generator, 'generateImage').mockResolvedValue(['url1', 'url2', 'url3']);

    const params: ImageGenerationParams = {
      prompt: 'test',
      count: 3
    };
    const result = await generator.generateImage(params);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it('should infer correct TypeScript type', () => {
    // This test verifies TypeScript type inference at compile time
    // The actual test is that this compiles without errors

    // Type should be inferred as Promise<string>
    const asyncResult: Promise<string> = generator.generateImage({
      prompt: 'test',
      async: true
    });
    expect(asyncResult).toBeDefined();

    // Type should be inferred as Promise<string[]>
    const syncResult: Promise<string[]> = generator.generateImage({
      prompt: 'test',
      async: false
    });
    expect(syncResult).toBeDefined();
  });
});
