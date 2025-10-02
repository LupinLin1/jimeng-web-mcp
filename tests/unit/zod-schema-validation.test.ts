import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import {
  textToVideoOptionsSchema,
  multiFrameVideoOptionsSchema,
  mainReferenceVideoOptionsSchema
} from '../../src/schemas/video.schemas.js';

describe('Schema Validation Integration', () => {
  describe('Text to Video Schema', () => {
    it('should validate valid text-to-video options', () => {
      const validOptions = {
        prompt: 'A beautiful sunset over mountains',
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        videoAspectRatio: '16:9',
        fps: 24,
        duration: 5000,
        async: false
      };

      expect(() => textToVideoOptionsSchema.parse(validOptions)).not.toThrow();
    });

    it('should validate options with first and last frame', () => {
      const optionsWithFrames = {
        prompt: 'Transition from day to night',
        firstFrameImage: '/path/to/day.jpg',
        lastFrameImage: '/path/to/night.jpg',
        model: 'jimeng-video-3.0',
        async: false
      };

      expect(() => textToVideoOptionsSchema.parse(optionsWithFrames)).not.toThrow();
    });

    it('should reject invalid prompt', () => {
      const invalidOptions = {
        prompt: '',
        model: 'jimeng-video-3.0'
      };

      expect(() => textToVideoOptionsSchema.parse(invalidOptions)).toThrow();
    });

    it('should reject invalid duration', () => {
      const invalidOptions = {
        prompt: 'Test video',
        duration: 1000 // Too short
      };

      expect(() => textToVideoOptionsSchema.parse(invalidOptions)).toThrow();
    });

    it('should reject invalid fps', () => {
      const invalidOptions = {
        prompt: 'Test video',
        fps: 50 // Too high
      };

      expect(() => textToVideoOptionsSchema.parse(invalidOptions)).toThrow();
    });
  });

  describe('Multi Frame Video Schema', () => {
    it('should validate valid multi-frame options', () => {
      const validOptions = {
        frames: [
          { idx: 0, imagePath: '/frame1.jpg' },
          { idx: 1, imagePath: '/frame2.jpg' },
          { idx: 2, imagePath: '/frame3.jpg' }
        ],
        prompt: 'Smooth video transition',
        model: 'jimeng-video-3.0',
        resolution: '720p',
        videoAspectRatio: '16:9',
        fps: 24,
        duration: 5000,
        async: false
      };

      expect(() => multiFrameVideoOptionsSchema.parse(validOptions)).not.toThrow();
    });

    it('should reject insufficient frames', () => {
      const invalidOptions = {
        frames: [
          { idx: 0, imagePath: '/frame1.jpg' }
        ],
        prompt: 'Not enough frames'
      };

      expect(() => multiFrameVideoOptionsSchema.parse(invalidOptions)).toThrow();
    });

    it('should reject too many frames', () => {
      const invalidOptions = {
        frames: Array(11).fill(null).map((_, i) => ({
          idx: i,
          imagePath: `/frame${i}.jpg`
        })),
        prompt: 'Too many frames'
      };

      expect(() => multiFrameVideoOptionsSchema.parse(invalidOptions)).toThrow();
    });

    it('should reject duplicate frame indices', () => {
      const invalidOptions = {
        frames: [
          { idx: 0, imagePath: '/frame1.jpg' },
          { idx: 0, imagePath: '/frame2.jpg' } // Duplicate idx
        ],
        prompt: 'Duplicate indices'
      };

      expect(() => multiFrameVideoOptionsSchema.parse(invalidOptions)).toThrow();
    });

    it('should reject negative frame indices', () => {
      const invalidOptions = {
        frames: [
          { idx: -1, imagePath: '/frame1.jpg' },
          { idx: 0, imagePath: '/frame2.jpg' }
        ],
        prompt: 'Negative index'
      };

      expect(() => multiFrameVideoOptionsSchema.parse(invalidOptions)).toThrow();
    });
  });

  describe('Main Reference Video Schema', () => {
    it('should validate valid main reference options', () => {
      const validOptions = {
        referenceImages: ['/img1.jpg', '/img2.jpg'],
        prompt: '[图0]中的人在[图1]的海滩上散步',
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        videoAspectRatio: '16:9',
        fps: 24,
        duration: 5000,
        async: false
      };

      expect(() => mainReferenceVideoOptionsSchema.parse(validOptions)).not.toThrow();
    });

    it('should reject insufficient reference images', () => {
      const invalidOptions = {
        referenceImages: ['/img1.jpg'], // Only one image
        prompt: '[图0]单独的图片'
      };

      expect(() => mainReferenceVideoOptionsSchema.parse(invalidOptions)).toThrow();
    });

    it('should reject too many reference images', () => {
      const invalidOptions = {
        referenceImages: ['/img1.jpg', '/img2.jpg', '/img3.jpg', '/img4.jpg', '/img5.jpg'], // 5 images
        prompt: 'Too many images'
      };

      expect(() => mainReferenceVideoOptionsSchema.parse(invalidOptions)).toThrow();
    });

    it('should reject prompt without image references', () => {
      const invalidOptions = {
        referenceImages: ['/img1.jpg', '/img2.jpg'],
        prompt: '没有图片引用的提示词' // No [图N] references
      };

      expect(() => mainReferenceVideoOptionsSchema.parse(invalidOptions)).toThrow();
    });

    it('should validate prompt with valid image references', () => {
      const validOptions = {
        referenceImages: ['/img1.jpg', '/img2.jpg', '/img3.jpg'],
        prompt: '[图0]和[图1]在[图2]的背景下互动'
      };

      expect(() => mainReferenceVideoOptionsSchema.parse(validOptions)).not.toThrow();
    });
  });

  describe('Cross-Schema Consistency', () => {
    it('should use consistent parameter names across schemas', () => {
      const commonParams = {
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        videoAspectRatio: '16:9',
        fps: 24,
        duration: 5000,
        async: false
      };

      // All schemas should accept the same common parameters
      expect(() => textToVideoOptionsSchema.parse({
        prompt: 'Test',
        ...commonParams
      })).not.toThrow();

      expect(() => multiFrameVideoOptionsSchema.parse({
        frames: [{ idx: 0, imagePath: '/frame.jpg' }],
        prompt: 'Test',
        ...commonParams
      })).not.toThrow();

      expect(() => mainReferenceVideoOptionsSchema.parse({
        referenceImages: ['/img1.jpg', '/img2.jpg'],
        prompt: '[图0]和[图1]',
        ...commonParams
      })).not.toThrow();
    });

    it('should use consistent enum values across schemas', () => {
      const textToVideoResult = textToVideoOptionsSchema.safeParse({
        prompt: 'Test',
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        videoAspectRatio: '16:9'
      });

      const multiFrameResult = multiFrameVideoOptionsSchema.safeParse({
        frames: [{ idx: 0, imagePath: '/frame.jpg' }],
        prompt: 'Test',
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        videoAspectRatio: '16:9'
      });

      const mainReferenceResult = mainReferenceVideoOptionsSchema.safeParse({
        referenceImages: ['/img1.jpg', '/img2.jpg'],
        prompt: '[图0]和[图1]',
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        videoAspectRatio: '16:9'
      });

      expect(textToVideoResult.success).toBe(true);
      expect(multiFrameResult.success).toBe(true);
      expect(mainReferenceResult.success).toBe(true);
    });

    it('should have consistent async parameter handling', () => {
      const baseOptions = {
        prompt: 'Test',
        model: 'jimeng-video-3.0'
      };

      // All schemas should handle async parameter consistently
      expect(() => textToVideoOptionsSchema.parse({
        ...baseOptions,
        async: false
      })).not.toThrow();

      expect(() => textToVideoOptionsSchema.parse({
        ...baseOptions,
        async: true
      })).not.toThrow();

      expect(() => multiFrameVideoOptionsSchema.parse({
        frames: [{ idx: 0, imagePath: '/frame.jpg' }],
        ...baseOptions,
        async: false
      })).not.toThrow();

      expect(() => mainReferenceVideoOptionsSchema.parse({
        referenceImages: ['/img1.jpg', '/img2.jpg'],
        prompt: '[图0]和[图1]',
        ...baseOptions,
        async: false
      })).not.toThrow();
    });
  });
});