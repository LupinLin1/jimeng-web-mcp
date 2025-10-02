import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MultiFrameVideoGenerator } from '../../src/api/video/MultiFrameVideoGenerator.js';
import { VideoGenerationMode, VideoTaskStatus } from '../../src/types/api.types.js';

// Mock dependencies
jest.mock('../../src/utils/timeout.js', () => ({
  pollUntilComplete: jest.fn()
}));

// Mock the entire inheritance chain
jest.mock('../../src/api/video/MultiFrameVideoGenerator.js', () => {
  return {
    MultiFrameVideoGenerator: jest.fn().mockImplementation(() => ({
      generateMultiFrameVideo: jest.fn(),
      validateMultiFrameOptions: jest.fn(),
      buildApiParams: jest.fn(),
      sortFramesByIndex: jest.fn(),
      uploadImage: jest.fn(),
      request: jest.fn(),
      generateRequestParams: jest.fn(() => ({}))
    }))
  };
});

import { pollUntilComplete } from '../../src/utils/timeout.js';

describe('MultiFrameVideoGenerator', () => {
  let generator: MultiFrameVideoGenerator;
  let mockPollUntilComplete: jest.MockedFunction<typeof pollUntilComplete>;

  beforeEach(() => {
    // 使用mock token初始化generator
    generator = new MultiFrameVideoGenerator('test-token');
    mockPollUntilComplete = pollUntilComplete as jest.MockedFunction<typeof pollUntilComplete>;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMultiFrameVideo', () => {
    const validOptions = {
      frames: [
        { idx: 0, imagePath: '/path/to/frame1.jpg' },
        { idx: 1, imagePath: '/path/to/frame2.jpg' },
        { idx: 2, imagePath: '/path/to/frame3.jpg' }
      ],
      prompt: 'Transform these frames into a smooth video',
      model: 'jimeng-video-3.0',
      resolution: '1080p' as const,
      videoAspectRatio: '16:9' as const,
      fps: 24,
      duration: 5000,
      async: false
    };

    it('should validate required parameters', async () => {
      await expect(generator.generateMultiFrameVideo({} as any))
        .rejects.toThrow('Frames are required');
    });

    it('should validate frames array length', async () => {
      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        frames: []
      })).rejects.toThrow('At least 2 frames are required');

      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        frames: Array(11).fill(null).map((_, i) => ({ idx: i, imagePath: `frame${i}.jpg` }))
      })).rejects.toThrow('Maximum 10 frames allowed');
    });

    it('should validate frame idx values', async () => {
      const invalidFrames = [
        { idx: -1, imagePath: 'frame1.jpg' },
        { idx: 0, imagePath: 'frame2.jpg' }
      ];

      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        frames: invalidFrames
      })).rejects.toThrow('Frame idx must be non-negative');
    });

    it('should validate duplicate frame idx values', async () => {
      const duplicateFrames = [
        { idx: 0, imagePath: 'frame1.jpg' },
        { idx: 0, imagePath: 'frame2.jpg' }
      ];

      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        frames: duplicateFrames
      })).rejects.toThrow('Duplicate frame idx detected: 0');
    });

    it('should validate frame image paths', async () => {
      const invalidFramePaths = [
        { idx: 0, imagePath: '' },
        { idx: 1, imagePath: 'frame2.jpg' }
      ];

      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        frames: invalidFramePaths
      })).rejects.toThrow('Frame image path cannot be empty at index 0');
    });

    it('should validate prompt length', async () => {
      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        prompt: ''
      })).rejects.toThrow('Prompt must be between 1 and 2000 characters');

      const longPrompt = 'a'.repeat(2001);
      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        prompt: longPrompt
      })).rejects.toThrow('Prompt must be between 1 and 2000 characters');
    });

    it('should validate duration range', async () => {
      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        duration: 2999
      })).rejects.toThrow('Duration must be between 3000 and 15000 milliseconds');

      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        duration: 15001
      })).rejects.toThrow('Duration must be between 3000 and 15000 milliseconds');
    });

    it('should validate fps range', async () => {
      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        fps: 11
      })).rejects.toThrow('FPS must be between 12 and 30');

      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        fps: 31
      })).rejects.toThrow('FPS must be between 12 and 30');
    });

    it('should validate resolution', async () => {
      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        resolution: '480p' as any
      })).rejects.toThrow('Invalid resolution: 480p');
    });

    it('should validate aspect ratio', async () => {
      await expect(generator.generateMultiFrameVideo({
        ...validOptions,
        videoAspectRatio: '2:1' as any
      })).rejects.toThrow('Invalid aspect ratio: 2:1');
    });

    it('should handle sync mode successfully', async () => {
      const mockResult = {
        videoUrl: 'https://example.com/multi-frame-video.mp4',
        metadata: {
          taskId: 'multi-frame-task-123',
          mode: VideoGenerationMode.MULTI_FRAME,
          model: 'jimeng-video-3.0',
          resolution: '1080p',
          videoAspectRatio: '16:9',
          fps: 24,
          duration: 5000,
          frameCount: 3,
          createdAt: Date.now()
        }
      };

      mockPollUntilComplete.mockResolvedValue({
        status: 'completed',
        videoUrl: 'https://example.com/multi-frame-video.mp4',
        metadata: mockResult.metadata
      });

      const result = await generator.generateMultiFrameVideo(validOptions);

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
      mockApiCall.mockResolvedValue('async-multi-frame-task-456');

      const result = await generator.generateMultiFrameVideo({
        ...validOptions,
        async: true
      });

      expect(result).toEqual({
        taskId: 'async-multi-frame-task-456'
      });

      expect(mockApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: validOptions.prompt,
          model: validOptions.model,
          video_mode: 1
        })
      );

      expect(mockPollUntilComplete).not.toHaveBeenCalled();
    });

    it('should upload all frame images in order', async () => {
      const mockUpload = jest.spyOn(generator as any, 'uploadImage');
      mockUpload.mockResolvedValue({
        id: 'uploaded-frame',
        url: 'https://example.com/frame.jpg'
      });

      const unsortedFrames = [
        { idx: 2, imagePath: '/path/to/frame3.jpg' },
        { idx: 0, imagePath: '/path/to/frame1.jpg' },
        { idx: 1, imagePath: '/path/to/frame2.jpg' }
      ];

      await generator.generateMultiFrameVideo({
        ...validOptions,
        frames: unsortedFrames
      });

      // 验证图片是按idx排序后上传的
      expect(mockUpload).toHaveBeenCalledTimes(3);
      expect(mockUpload).toHaveBeenNthCalledWith(1, '/path/to/frame1.jpg');
      expect(mockUpload).toHaveBeenNthCalledWith(2, '/path/to/frame2.jpg');
      expect(mockUpload).toHaveBeenNthCalledWith(3, '/path/to/frame3.jpg');
    });

    it('should handle frame upload errors', async () => {
      const mockUpload = jest.spyOn(generator as any, 'uploadImage');
      mockUpload.mockRejectedValue(new Error('Failed to upload frame'));

      await expect(generator.generateMultiFrameVideo(validOptions))
        .rejects.toThrow('Failed to upload frame');
    });

    it('should use default parameters when not provided', async () => {
      const minimalOptions = {
        frames: [
          { idx: 0, imagePath: '/path/to/frame1.jpg' },
          { idx: 1, imagePath: '/path/to/frame2.jpg' }
        ],
        prompt: 'Simple multi-frame video'
      };

      mockPollUntilComplete.mockResolvedValue({
        status: 'completed',
        videoUrl: 'https://example.com/video.mp4',
        metadata: {}
      });

      await generator.generateMultiFrameVideo(minimalOptions);

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

      await expect(generator.generateMultiFrameVideo(validOptions))
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

      const result = await generator.generateMultiFrameVideo(validOptions);

      expect(result).toEqual({
        error: {
          code: 'CONTENT_VIOLATION',
          message: 'Content policy violation',
          reason: 'The generated content violates content policy'
        }
      });
    });

    it('should build API parameters with uploaded frames', async () => {
      const mockUpload = jest.spyOn(generator as any, 'uploadImage');
      mockUpload.mockResolvedValue({
        id: 'frame-id',
        url: 'https://example.com/frame.jpg'
      });

      const mockApiCall = jest.spyOn(generator as any, 'submitVideoGenerationTask');
      mockApiCall.mockResolvedValue('task-123');

      await generator.generateMultiFrameVideo({
        ...validOptions,
        async: true
      });

      expect(mockApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          frames: expect.arrayContaining([
            expect.objectContaining({ frame_id: 'frame-id' })
          ])
        })
      );
    });

    it('should validate frame count before upload', async () => {
      const singleFrameOptions = {
        ...validOptions,
        frames: [{ idx: 0, imagePath: '/path/to/frame1.jpg' }]
      };

      await expect(generator.generateMultiFrameVideo(singleFrameOptions))
        .rejects.toThrow('At least 2 frames are required');
    });
  });

  describe('sortFramesByIndex', () => {
    it('should sort frames by idx correctly', () => {
      const unsortedFrames = [
        { idx: 3, imagePath: 'frame3.jpg' },
        { idx: 1, imagePath: 'frame1.jpg' },
        { idx: 0, imagePath: 'frame0.jpg' },
        { idx: 2, imagePath: 'frame2.jpg' }
      ];

      const sortedFrames = generator['sortFramesByIndex'](unsortedFrames);

      expect(sortedFrames).toEqual([
        { idx: 0, imagePath: 'frame0.jpg' },
        { idx: 1, imagePath: 'frame1.jpg' },
        { idx: 2, imagePath: 'frame2.jpg' },
        { idx: 3, imagePath: 'frame3.jpg' }
      ]);
    });

    it('should handle empty frames array', () => {
      const sortedFrames = generator['sortFramesByIndex']([]);
      expect(sortedFrames).toEqual([]);
    });

    it('should handle already sorted frames', () => {
      const sortedInput = [
        { idx: 0, imagePath: 'frame0.jpg' },
        { idx: 1, imagePath: 'frame1.jpg' },
        { idx: 2, imagePath: 'frame2.jpg' }
      ];

      const sortedFrames = generator['sortFramesByIndex'](sortedInput);
      expect(sortedFrames).toEqual(sortedInput);
    });
  });

  describe('validateMultiFrameOptions', () => {
    it('should validate complete valid options', () => {
      expect(() => generator.validateMultiFrameOptions(validOptions)).not.toThrow();
    });

    it('should throw error for missing frames', () => {
      expect(() => generator.validateMultiFrameOptions({} as any))
        .toThrow('Frames are required');
    });

    it('should throw error for frames without imagePath', () => {
      const invalidFrames = [{ idx: 0 } as any, { idx: 1, imagePath: 'frame2.jpg' }];

      expect(() => generator.validateMultiFrameOptions({
        ...validOptions,
        frames: invalidFrames
      })).toThrow('Each frame must have an imagePath');
    });
  });

  describe('buildApiParams', () => {
    it('should build API parameters correctly with frames', async () => {
      const mockUpload = jest.spyOn(generator as any, 'uploadImage');
      mockUpload.mockResolvedValue({ id: 'uploaded-frame' });

      const params = await generator.buildApiParams(validOptions);

      expect(params).toEqual({
        prompt: validOptions.prompt,
        model: validOptions.model,
        resolution: validOptions.resolution,
        video_aspect_ratio: validOptions.videoAspectRatio,
        fps: validOptions.fps,
        video_duration: validOptions.duration,
        video_mode: 1,
        frames: expect.arrayContaining([
          expect.objectContaining({ frame_id: 'uploaded-frame' })
        ])
      });
    });

    it('should handle frame upload failure', async () => {
      const mockUpload = jest.spyOn(generator as any, 'uploadImage');
      mockUpload.mockRejectedValue(new Error('Upload failed'));

      await expect(generator.buildApiParams(validOptions))
        .rejects.toThrow('Upload failed');
    });
  });
});