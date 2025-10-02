import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TextToVideoGenerator } from '../../src/api/video/TextToVideoGenerator.js';
import { VideoGenerationMode, VideoTaskStatus } from '../../src/types/api.types.js';

// Mock dependencies
jest.mock('../../src/utils/timeout.js', () => ({
  pollUntilComplete: jest.fn()
}));

jest.mock('../../src/api/BaseClient.js', () => ({
  BaseClient: jest.fn().mockImplementation(() => ({
    uploadImage: jest.fn(),
    makeRequest: jest.fn(),
    log: jest.fn()
  }))
}));

import { pollUntilComplete } from '../../src/utils/timeout.js';

describe('TextToVideoGenerator', () => {
  let generator: TextToVideoGenerator;
  let mockPollUntilComplete: jest.MockedFunction<typeof pollUntilComplete>;

  beforeEach(() => {
    generator = new TextToVideoGenerator();
    mockPollUntilComplete = pollUntilComplete as jest.MockedFunction<typeof pollUntilComplete>;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTextToVideo', () => {
    const validOptions = {
      prompt: 'A beautiful sunset over mountains',
      model: 'jimeng-video-3.0',
      resolution: '1080p' as const,
      videoAspectRatio: '16:9' as const,
      fps: 24,
      duration: 5000,
      async: false
    };

    it('should validate required parameters', async () => {
      await expect(generator.generateTextToVideo({} as any))
        .rejects.toThrow('Prompt is required');
    });

    it('should validate prompt length', async () => {
      await expect(generator.generateTextToVideo({
        ...validOptions,
        prompt: ''
      })).rejects.toThrow('Prompt must be between 1 and 2000 characters');

      const longPrompt = 'a'.repeat(2001);
      await expect(generator.generateTextToVideo({
        ...validOptions,
        prompt: longPrompt
      })).rejects.toThrow('Prompt must be between 1 and 2000 characters');
    });

    it('should validate duration range', async () => {
      await expect(generator.generateTextToVideo({
        ...validOptions,
        duration: 2999
      })).rejects.toThrow('Duration must be between 3000 and 15000 milliseconds');

      await expect(generator.generateTextToVideo({
        ...validOptions,
        duration: 15001
      })).rejects.toThrow('Duration must be between 3000 and 15000 milliseconds');
    });

    it('should validate fps range', async () => {
      await expect(generator.generateTextToVideo({
        ...validOptions,
        fps: 11
      })).rejects.toThrow('FPS must be between 12 and 30');

      await expect(generator.generateTextToVideo({
        ...validOptions,
        fps: 31
      })).rejects.toThrow('FPS must be between 12 and 30');
    });

    it('should validate resolution', async () => {
      await expect(generator.generateTextToVideo({
        ...validOptions,
        resolution: '480p' as any
      })).rejects.toThrow('Invalid resolution: 480p');
    });

    it('should validate aspect ratio', async () => {
      await expect(generator.generateTextToVideo({
        ...validOptions,
        videoAspectRatio: '2:1' as any
      })).rejects.toThrow('Invalid aspect ratio: 2:1');
    });

    it('should handle sync mode successfully', async () => {
      const mockResult = {
        videoUrl: 'https://example.com/video.mp4',
        metadata: {
          taskId: 'task-123',
          mode: VideoGenerationMode.TEXT_TO_VIDEO,
          model: 'jimeng-video-3.0',
          resolution: '1080p',
          videoAspectRatio: '16:9',
          fps: 24,
          duration: 5000,
          createdAt: Date.now()
        }
      };

      mockPollUntilComplete.mockResolvedValue({
        status: 'completed',
        videoUrl: 'https://example.com/video.mp4',
        metadata: mockResult.metadata
      });

      const result = await generator.generateTextToVideo(validOptions);

      expect(result).toEqual(mockResult);
      expect(mockPollUntilComplete).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          timeout: 600000
        })
      );
    });

    it('should handle async mode successfully', async () => {
      const mockApiCall = jest.spyOn(generator as any, 'submitVideoGenerationTask');
      mockApiCall.mockResolvedValue('async-task-456');

      const result = await generator.generateTextToVideo({
        ...validOptions,
        async: true
      });

      expect(result).toEqual({
        taskId: 'async-task-456'
      });

      expect(mockApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: validOptions.prompt,
          model: validOptions.model,
          video_mode: 0
        })
      );

      expect(mockPollUntilComplete).not.toHaveBeenCalled();
    });

    it('should handle first frame image', async () => {
      const mockUpload = jest.spyOn(generator as any, 'uploadImage');
      mockUpload.mockResolvedValue({
        id: 'frame-123',
        url: 'https://example.com/frame.jpg'
      });

      const optionsWithFrame = {
        ...validOptions,
        firstFrameImage: '/path/to/first/frame.jpg'
      };

      await generator.generateTextToVideo(optionsWithFrame);

      expect(mockUpload).toHaveBeenCalledWith('/path/to/first/frame.jpg');
    });

    it('should handle last frame image', async () => {
      const mockUpload = jest.spyOn(generator as any, 'uploadImage');
      mockUpload.mockResolvedValue({
        id: 'frame-456',
        url: 'https://example.com/last-frame.jpg'
      });

      const optionsWithFrame = {
        ...validOptions,
        lastFrameImage: '/path/to/last/frame.jpg'
      };

      await generator.generateTextToVideo(optionsWithFrame);

      expect(mockUpload).toHaveBeenCalledWith('/path/to/last/frame.jpg');
    });

    it('should handle both first and last frame images', async () => {
      const mockUpload = jest.spyOn(generator as any, 'uploadImage')
        .mockResolvedValueOnce({
          id: 'first-frame-123',
          url: 'https://example.com/first.jpg'
        })
        .mockResolvedValueOnce({
          id: 'last-frame-456',
          url: 'https://example.com/last.jpg'
        });

      const optionsWithFrames = {
        ...validOptions,
        firstFrameImage: '/path/to/first.jpg',
        lastFrameImage: '/path/to/last.jpg'
      };

      await generator.generateTextToVideo(optionsWithFrames);

      expect(mockUpload).toHaveBeenCalledTimes(2);
      expect(mockUpload).toHaveBeenNthCalledWith(1, '/path/to/first.jpg');
      expect(mockUpload).toHaveBeenNthCalledWith(2, '/path/to/last.jpg');
    });

    it('should use default parameters when not provided', async () => {
      const minimalOptions = {
        prompt: 'Simple test video'
      };

      mockPollUntilComplete.mockResolvedValue({
        status: 'completed',
        videoUrl: 'https://example.com/video.mp4',
        metadata: {}
      });

      await generator.generateTextToVideo(minimalOptions);

      expect(mockPollUntilComplete).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.objectContaining({
          timeout: 600000
        })
      );
    });

    it('should handle polling timeout error', async () => {
      mockPollUntilComplete.mockRejectedValue(new Error('Polling timed out'));

      await expect(generator.generateTextToVideo(validOptions))
        .rejects.toThrow('Polling timed out');
    });

    it('should handle task failure in sync mode', async () => {
      mockPollUntilComplete.mockResolvedValue({
        status: 'failed',
        error: {
          code: 'CONTENT_VIOLATION',
          message: 'Content policy violation',
          reason: 'The generated content violates content policy'
        }
      });

      const result = await generator.generateTextToVideo(validOptions);

      expect(result).toEqual({
        error: {
          code: 'CONTENT_VIOLATION',
          message: 'Content policy violation',
          reason: 'The generated content violates content policy'
        }
      });
    });
  });

  describe('validateTextToVideoOptions', () => {
    it('should validate complete valid options', () => {
      expect(() => generator.validateTextToVideoOptions(validOptions)).not.toThrow();
    });

    it('should throw error for missing required fields', () => {
      expect(() => generator.validateTextToVideoOptions({} as any))
        .toThrow('Prompt is required');
    });

    it('should throw error for invalid frame image paths', () => {
      expect(() => generator.validateTextToVideoOptions({
        ...validOptions,
        firstFrameImage: ''
      })).toThrow('First frame image path cannot be empty');
    });
  });

  describe('buildApiParams', () => {
    it('should build API parameters correctly', () => {
      const params = generator.buildApiParams(validOptions);

      expect(params).toEqual({
        prompt: validOptions.prompt,
        model: validOptions.model,
        resolution: validOptions.resolution,
        video_aspect_ratio: validOptions.videoAspectRatio,
        fps: validOptions.fps,
        video_duration: validOptions.duration,
        video_mode: 0
      });
    });

    it('should include frame images when provided', async () => {
      const mockUpload = jest.spyOn(generator as any, 'uploadImage')
        .mockResolvedValueOnce({ id: 'first-123' })
        .mockResolvedValueOnce({ id: 'last-456' });

      const params = await generator.buildApiParams({
        ...validOptions,
        firstFrameImage: '/first.jpg',
        lastFrameImage: '/last.jpg'
      });

      expect(params.first_frame).toBe('first-123');
      expect(params.last_frame).toBe('last-456');
    });
  });
});