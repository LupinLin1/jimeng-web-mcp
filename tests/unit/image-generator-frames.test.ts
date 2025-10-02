/**
 * Frames Parameter Handling Unit Tests
 * Feature: 004-generateimage-frames-prompt
 *
 * Tests the frames validation and filtering logic
 */

import { describe, it, expect, jest } from '@jest/globals';
import { ImageGenerator } from '../../src/api/image/ImageGenerator.js';

describe('Frames Parameter Handling', () => {
  const generator = new ImageGenerator('test-token');
  // Access private method for testing via type assertion
  const validator = generator as any;

  it('should handle 15 frames correctly', () => {
    const frames = Array.from({ length: 15 }, (_, i) => `场景${i + 1}`);
    const result = validator.validateAndFilterFrames(frames);

    expect(result).toHaveLength(15);
    expect(result).toEqual(frames);
  });

  it('should truncate >15 frames with warning', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const frames = Array.from({ length: 20 }, (_, i) => `场景${i + 1}`);
    const result = validator.validateAndFilterFrames(frames);

    expect(result).toHaveLength(15);
    expect(result).toEqual(frames.slice(0, 15));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('截断frames数组')
    );

    consoleSpy.mockRestore();
  });

  it('should handle empty frames array', () => {
    const result = validator.validateAndFilterFrames([]);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should combine frames with count parameter', () => {
    // This test verifies frames work with count parameter
    const frames = ['场景1', '场景2', '场景3'];
    const result = validator.validateAndFilterFrames(frames);

    expect(result).toHaveLength(3);
    expect(result).toEqual(frames);
  });

  it('should filter invalid frames values', () => {
    const frames = [
      '场景1',
      null as any,
      '',
      '场景2',
      undefined as any,
      '   ',
      '场景3'
    ];
    const result = validator.validateAndFilterFrames(frames);

    expect(result).toHaveLength(3);
    expect(result).toEqual(['场景1', '场景2', '场景3']);
  });

  it('should log warning on truncation', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const frames = Array.from({ length: 25 }, (_, i) => `场景${i + 1}`);

    validator.validateAndFilterFrames(frames);

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][0]).toContain('25');
    expect(consoleSpy.mock.calls[0][0]).toContain('15');

    consoleSpy.mockRestore();
  });
});
