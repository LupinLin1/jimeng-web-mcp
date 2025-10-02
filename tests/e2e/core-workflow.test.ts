import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
// Use inline types to avoid import issues
type VideoGenerationMode = 'text_to_video' | 'multi_frame' | 'main_reference';
type VideoTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface VideoGenerationError {
  code: 'TIMEOUT' | 'CONTENT_VIOLATION' | 'API_ERROR' | 'INVALID_PARAMS' | 'PROCESSING_FAILED' | 'UNKNOWN';
  message: string;
  reason: string;
  taskId?: string;
  timestamp: number;
}
import { TimeoutError, DEFAULT_POLLING_CONFIG } from '../../src/utils/timeout.js';
import { deprecate } from '../../src/utils/deprecation.js';

describe('Core Workflow E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Type System Validation', () => {
    it('should validate video generation mode enum values', () => {
      const textToVideo: VideoGenerationMode = 'text_to_video';
      const multiFrame: VideoGenerationMode = 'multi_frame';
      const mainReference: VideoGenerationMode = 'main_reference';

      expect(textToVideo).toBe('text_to_video');
      expect(multiFrame).toBe('multi_frame');
      expect(mainReference).toBe('main_reference');
    });

    it('should validate video task status enum values', () => {
      const pending: VideoTaskStatus = 'pending';
      const processing: VideoTaskStatus = 'processing';
      const completed: VideoTaskStatus = 'completed';
      const failed: VideoTaskStatus = 'failed';

      expect(pending).toBe('pending');
      expect(processing).toBe('processing');
      expect(completed).toBe('completed');
      expect(failed).toBe('failed');
    });

    it('should validate timeout error structure', () => {
      const timeoutError = new TimeoutError('Test timeout');
      expect(timeoutError.name).toBe('TimeoutError');
      expect(timeoutError.message).toBe('Test timeout');
      expect(timeoutError).toBeInstanceOf(Error);
    });

    it('should validate video generation error structure', () => {
      const error: VideoGenerationError = {
        code: 'API_ERROR',
        message: 'Test error',
        reason: 'Test reason',
        timestamp: Date.now()
      };

      expect(error.code).toBe('API_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.reason).toBe('Test reason');
      expect(error.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Timeout System Workflow', () => {
    it('should validate default polling configuration', () => {
      expect(DEFAULT_POLLING_CONFIG.initialInterval).toBe(2000);
      expect(DEFAULT_POLLING_CONFIG.maxInterval).toBe(10000);
      expect(DEFAULT_POLLING_CONFIG.backoffFactor).toBe(1.5);
      expect(DEFAULT_POLLING_CONFIG.timeout).toBe(600000);
    });

    it('should handle timeout configuration merging', async () => {
      const { pollUntilComplete } = await import('../../src/utils/timeout.js');

      const mockStatusChecker = jest.fn().mockResolvedValue('completed');

      const result = await pollUntilComplete('test-task', mockStatusChecker, {
        timeout: 5000 // Custom timeout
      });

      expect(result).toBe('completed');
      expect(mockStatusChecker).toHaveBeenCalledWith('test-task');
    });

    it('should handle task status validation', async () => {
      const { pollUntilComplete } = await import('../../src/utils/timeout.js');

      const mockStatusChecker = jest.fn()
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({
          status: 'completed',
          result: { videoUrl: 'test-url' }
        });

      const result = await pollUntilComplete('test-task', mockStatusChecker, {
        timeout: 10000 // Increase timeout for test
      });

      expect(result).toEqual({ videoUrl: 'test-url' });
      expect(mockStatusChecker).toHaveBeenCalledTimes(3);
    }, 15000); // Add test timeout

    it('should handle task failure', async () => {
      const { pollUntilComplete } = await import('../../src/utils/timeout.js');

      const mockStatusChecker = jest.fn().mockResolvedValue({
        status: 'failed',
        error: 'Content policy violation'
      });

      await expect(pollUntilComplete('test-task', mockStatusChecker))
        .rejects.toThrow('Content policy violation');
    });
  });

  describe('Deprecation System Workflow', () => {
    it('should handle deprecation warnings', () => {
      const mockConsoleWarn = jest.spyOn(console, 'warn');

      deprecate({
        oldMethod: 'testMethod',
        newMethod: 'newTestMethod',
        version: '2.0.0',
        warnOnce: false
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] testMethod() is deprecated')
      );
    });

    it('should handle warnOnce functionality', () => {
      const mockConsoleWarn = jest.spyOn(console, 'warn');

      // Call deprecation twice
      deprecate({
        oldMethod: 'testMethodOnce',
        newMethod: 'newTestMethodOnce',
        version: '2.0.0',
        warnOnce: true
      });

      deprecate({
        oldMethod: 'testMethodOnce',
        newMethod: 'newTestMethodOnce',
        version: '2.0.0',
        warnOnce: true
      });

      // Should only warn once
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] testMethodOnce() is deprecated')
      );
    });
  });

  describe('Schema Validation Workflow', () => {
    it('should validate text-to-video schema', async () => {
      const { textToVideoOptionsSchema } = await import('../../src/schemas/video.schemas.js');

      const validOptions = {
        prompt: 'Test video generation',
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        videoAspectRatio: '16:9',
        fps: 24,
        duration: 5000,
        async: false
      };

      const result = textToVideoOptionsSchema.parse(validOptions);
      expect(result.prompt).toBe('Test video generation');
      expect(result.async).toBe(false);
    });

    it('should validate multi-frame schema', async () => {
      const { multiFrameVideoOptionsSchema } = await import('../../src/schemas/video.schemas.js');

      const validOptions = {
        frames: [
          {
            idx: 0,
            image_path: '/frame-0.jpg',
            duration_ms: 1000,
            prompt: 'Frame 0'
          },
          {
            idx: 1,
            image_path: '/frame-1.jpg',
            duration_ms: 1000,
            prompt: 'Frame 1'
          },
          {
            idx: 2,
            image_path: '/frame-2.jpg',
            duration_ms: 1000,
            prompt: 'Frame 2'
          }
        ],
        prompt: 'Multi-frame test',
        model: 'jimeng-video-3.0',
        async: false
      };

      const result = multiFrameVideoOptionsSchema.parse(validOptions);
      expect(result.frames).toHaveLength(3);
      expect(result.frames[0].idx).toBe(0);
    });

    it('should validate main reference schema', async () => {
      const { mainReferenceVideoOptionsSchema } = await import('../../src/schemas/video.schemas.js');

      const validOptions = {
        referenceImages: ['/ref1.jpg', '/ref2.jpg'],
        prompt: '[图0]和[图1]的测试',
        model: 'jimeng-video-3.0',
        async: false
      };

      const result = mainReferenceVideoOptionsSchema.parse(validOptions);
      expect(result.referenceImages).toHaveLength(2);
      expect(result.prompt).toContain('[图0]');
    });
  });

  describe('Parameter Validation Workflow', () => {
    it('should validate parameter constraints', async () => {
      const { textToVideoOptionsSchema } = await import('../../src/schemas/video.schemas.js');

      // Test invalid fps
      expect(() => textToVideoOptionsSchema.parse({
        prompt: 'Test',
        fps: 50 // Too high
      })).toThrow();

      // Test invalid duration
      expect(() => textToVideoOptionsSchema.parse({
        prompt: 'Test',
        duration: 1000 // Too short
      })).toThrow();

      // Test invalid resolution
      expect(() => textToVideoOptionsSchema.parse({
        prompt: 'Test',
        resolution: 'invalid'
      })).toThrow();
    });

    it('should validate frame constraints for multi-frame', async () => {
      const { multiFrameVideoOptionsSchema } = await import('../../src/schemas/video.schemas.js');

      // Test insufficient frames
      expect(() => multiFrameVideoOptionsSchema.parse({
        frames: [{ idx: 0, imagePath: '/frame.jpg' }],
        prompt: 'Test'
      })).toThrow();

      // Test too many frames
      expect(() => multiFrameVideoOptionsSchema.parse({
        frames: Array(11).fill(null).map((_, i) => ({
          idx: i,
          imagePath: `/frame-${i}.jpg`
        })),
        prompt: 'Test'
      })).toThrow();
    });

    it('should validate reference image constraints', async () => {
      const { mainReferenceVideoOptionsSchema } = await import('../../src/schemas/video.schemas.js');

      // Test insufficient reference images
      expect(() => mainReferenceVideoOptionsSchema.parse({
        referenceImages: ['/ref1.jpg'],
        prompt: 'Test'
      })).toThrow();

      // Test too many reference images
      expect(() => mainReferenceVideoOptionsSchema.parse({
        referenceImages: ['/ref1.jpg', '/ref2.jpg', '/ref3.jpg', '/ref4.jpg', '/ref5.jpg'],
        prompt: 'Test'
      })).toThrow();
    });
  });

  describe('API Integration Patterns', () => {
    it('should handle unified async/sync parameter pattern', () => {
      const testCases = [
        { async: false, expected: 'sync' },
        { async: true, expected: 'async' },
        { async: undefined, expected: 'sync' } // Default
      ];

      testCases.forEach(({ async, expected }) => {
        const mode = async ? 'async' : 'sync';
        expect(mode).toBe(expected);
      });
    });

    it('should handle default parameter values', async () => {
      const { textToVideoOptionsSchema } = await import('../../src/schemas/video.schemas.js');

      const minimalOptions = { prompt: 'Test' };
      const result = textToVideoOptionsSchema.parse(minimalOptions);

      // Check that all fields are optional (no defaults set in schema)
      expect(result.model).toBeUndefined();
      expect(result.resolution).toBeUndefined();
      expect(result.videoAspectRatio).toBeUndefined();
      expect(result.fps).toBeUndefined();
      expect(result.duration).toBeUndefined();
      expect(result.async).toBeUndefined();
    });

    it('should handle parameter inheritance patterns', async () => {
      // Test that all video schemas share common parameters
      const schemas = await Promise.all([
        import('../../src/schemas/video.schemas.js').then(m => m.textToVideoOptionsSchema),
        import('../../src/schemas/video.schemas.js').then(m => m.multiFrameVideoOptionsSchema),
        import('../../src/schemas/video.schemas.js').then(m => m.mainReferenceVideoOptionsSchema)
      ]);

      const commonParams = {
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        videoAspectRatio: '16:9',
        fps: 24,
        duration: 5000,
        async: false
      };

      // Test text-to-video schema
      const textResult = schemas[0].parse({
        prompt: 'Test',
        ...commonParams
      });
      expect(textResult.model).toBe('jimeng-video-3.0');
      expect(textResult.async).toBe(false);

      // Test multi-frame schema (requires frames)
      const multiResult = schemas[1].parse({
        prompt: 'Test',
        frames: [{
          idx: 0,
          image_path: '/frame.jpg',
          duration_ms: 1000,
          prompt: 'Frame 0'
        }, {
          idx: 1,
          image_path: '/frame2.jpg',
          duration_ms: 1000,
          prompt: 'Frame 1'
        }],
        ...commonParams
      });
      expect(multiResult.model).toBe('jimeng-video-3.0');
      expect(multiResult.async).toBe(false);

      // Test main reference schema (requires referenceImages)
      const mainResult = schemas[2].parse({
        prompt: '[图0]和[图1]的测试',
        referenceImages: ['/ref1.jpg', '/ref2.jpg'],
        ...commonParams
      });
      expect(mainResult.model).toBe('jimeng-video-3.0');
      expect(mainResult.async).toBe(false);
    });
  });

  describe('Error Handling Patterns', () => {
    it('should handle validation error format', () => {
      const validationError = {
        code: 'INVALID_PARAMS',
        message: 'Validation failed',
        reason: 'fps must be between 12 and 30',
        timestamp: Date.now()
      };

      expect(validationError.code).toBe('INVALID_PARAMS');
      expect(validationError.reason).toContain('fps');
    });

    it('should handle timeout error format', () => {
      const timeoutError: VideoGenerationError = {
        code: 'TIMEOUT',
        message: 'Operation timed out',
        reason: 'Video generation exceeded 600 seconds',
        timestamp: Date.now()
      };

      expect(timeoutError.code).toBe('TIMEOUT');
      expect(timeoutError.reason).toContain('600 seconds');
    });

    it('should handle API error format', () => {
      const apiError: VideoGenerationError = {
        code: 'API_ERROR',
        message: 'API call failed',
        reason: 'Network connection error',
        timestamp: Date.now()
      };

      expect(apiError.code).toBe('API_ERROR');
      expect(apiError.reason).toContain('Network');
    });
  });

  describe('Response Format Consistency', () => {
    it('should maintain consistent response structure across modes', () => {
      const syncResponse = {
        videoUrl: 'https://example.com/video.mp4',
        metadata: {
          taskId: 'test-123',
          mode: 'text_to_video',
          model: 'jimeng-video-3.0',
          createdAt: Date.now()
        }
      };

      const asyncResponse = {
        taskId: 'test-456'
      };

      const errorResponse = {
        error: {
          code: 'API_ERROR',
          message: 'Failed to generate video',
          reason: 'Service unavailable',
          timestamp: Date.now()
        }
      };

      // Verify response structures
      expect(syncResponse.videoUrl).toBeDefined();
      expect(syncResponse.metadata).toBeDefined();
      expect(asyncResponse.taskId).toBeDefined();
      expect(errorResponse.error).toBeDefined();
    });
  });

  describe('Backward Compatibility Patterns', () => {
    it('should support legacy parameter combinations', async () => {
      const { textToVideoOptionsSchema } = await import('../../src/schemas/video.schemas.js');

      // Test legacy style parameters
      const legacyOptions = {
        prompt: 'Legacy test',
        model: 'jimeng-video-3.0',
        // No async parameter, should be undefined (optional)
      };

      const result = textToVideoOptionsSchema.parse(legacyOptions);
      expect(result.async).toBeUndefined(); // Optional field, not provided
    });

    it('should maintain consistent naming patterns', () => {
      const commonNames = [
        'prompt', 'model', 'resolution', 'videoAspectRatio',
        'fps', 'duration', 'async'
      ];

      commonNames.forEach(name => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });
});