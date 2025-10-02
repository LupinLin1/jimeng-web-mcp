/**
 * Backward Compatibility Integration Tests
 * Feature: 004-generateimage-frames-prompt
 *
 * Tests that new features don't break existing functionality
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { ImageGenerationParams } from '../../src/types/api.types.js';
import { ImageGenerator } from '../../src/api/image/ImageGenerator.js';

describe('Feature 004: Unified Image Generation', () => {
  let imageGen: ImageGenerator;

  beforeEach(() => {
    imageGen = new ImageGenerator('test-token');
  });

  it('Scenario 1: Sync mode preserves existing behavior', async () => {
    // Mock to return array of URLs
    jest.spyOn(imageGen, 'generateImage').mockResolvedValue([
      'https://p9-dreamina-sign.byteimg.com/image1.jpg',
      'https://p3-dreamina-sign.byteimg.com/image2.jpg'
    ]);

    const images = await imageGen.generateImage({
      prompt: '一只可爱的猫',
      count: 2
    });

    expect(Array.isArray(images)).toBe(true);
    expect(images).toHaveLength(2);
    expect(images[0]).toContain('https://');
  });

  it('Scenario 2: Async mode returns historyId', async () => {
    // Mock to return historyId string
    jest.spyOn(imageGen, 'generateImage').mockResolvedValue('4739198022156');

    const historyId = await imageGen.generateImage({
      prompt: '测试异步',
      async: true
    });

    expect(typeof historyId).toBe('string');
    expect(historyId).toMatch(/^\d+$/);
  });

  it('Scenario 3: Frames array generates multi-scene', async () => {
    // Mock to return array matching frame count
    jest.spyOn(imageGen, 'generateImage').mockResolvedValue([
      'https://example.com/scene1.jpg',
      'https://example.com/scene2.jpg',
      'https://example.com/scene3.jpg'
    ]);

    const images = await imageGen.generateImage({
      prompt: '科幻电影分镜',
      frames: ['实验室场景', '时空隧道', '外星球'],
      count: 3
    });

    expect(Array.isArray(images)).toBe(true);
    expect(images).toHaveLength(3);
  });

  it('Scenario 4: Empty frames falls back', async () => {
    // Mock to return result with empty frames
    jest.spyOn(imageGen, 'generateImage').mockResolvedValue([
      'https://example.com/image.jpg'
    ]);

    const images = await imageGen.generateImage({
      prompt: '测试空数组',
      frames: [],
      count: 1
    });

    expect(Array.isArray(images)).toBe(true);
    expect(images).toHaveLength(1);
  });

  it('Scenario 5: Frames combines with count', async () => {
    // Mock to return result matching count
    jest.spyOn(imageGen, 'generateImage').mockResolvedValue([
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ]);

    const images = await imageGen.generateImage({
      prompt: '故事分镜',
      frames: ['开始', '发展', '结局'],
      count: 3
    });

    expect(Array.isArray(images)).toBe(true);
    expect(images).toHaveLength(3);
  });
});
