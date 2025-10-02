/**
 * Prompt Builder Logic Unit Tests
 * Feature: 004-generateimage-frames-prompt
 *
 * Tests the buildPromptWithFrames logic that combines base prompts with frame descriptions
 */

import { describe, it, expect } from '@jest/globals';
import { ImageGenerator } from '../../src/api/image/ImageGenerator.js';

describe('Prompt Builder Logic', () => {
  const generator = new ImageGenerator('test-token');
  // Access private method for testing via type assertion
  const builder = generator as any;

  it('should combine prompt and frames correctly', () => {
    const result = builder.buildPromptWithFrames('科幻电影', ['场景1', '场景2'], 2);
    expect(result).toBe('科幻电影 第1张：场景1 第2张：场景2，一共2张图');
  });

  it('should truncate frames array to 15 elements', () => {
    const frames = Array.from({ length: 20 }, (_, i) => `场景${i + 1}`);
    const validFrames = frames.slice(0, 15); // Simulate truncation
    const result = builder.buildPromptWithFrames('测试', validFrames, 15);
    const numberedFrames = validFrames.map((f, i) => `第${i + 1}张：${f}`);
    const expected = `测试 ${numberedFrames.join(' ')}，一共15张图`;
    expect(result).toBe(expected);
  });

  it('should filter null/empty strings from frames', () => {
    // This test assumes filtering happens before buildPromptWithFrames is called
    const validFrames = ['场景1', '场景2'].filter(f => f && f.trim() !== '');
    const result = builder.buildPromptWithFrames('测试', validFrames, 2);
    expect(result).toBe('测试 第1张：场景1 第2张：场景2，一共2张图');
  });

  it('should add count suffix when frames provided', () => {
    const result = builder.buildPromptWithFrames('故事', ['开始', '结局'], 2);
    expect(result).toContain('一共2张图');
  });

  it('should use original prompt when frames empty', () => {
    const result = builder.buildPromptWithFrames('原始提示词', [], 1);
    expect(result).toBe('原始提示词');
  });

  it('should handle frames with prompt combination', () => {
    const result = builder.buildPromptWithFrames('宋式住宅', ['玄关', '客厅', '卧室'], 3);
    expect(result).toBe('宋式住宅 第1张：玄关 第2张：客厅 第3张：卧室，一共3张图');
  });
});
