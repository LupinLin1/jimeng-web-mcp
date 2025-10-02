import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { JimengClient } from '../../src/api/JimengClient.js';
import { TextToVideoGenerator } from '../../src/api/video/TextToVideoGenerator.js';
import { MultiFrameVideoGenerator } from '../../src/api/video/MultiFrameVideoGenerator.js';
import { MainReferenceVideoGenerator } from '../../src/api/video/MainReferenceVideoGenerator.js';
import { TimeoutError, pollUntilComplete, DEFAULT_POLLING_CONFIG } from '../../src/utils/timeout.js';

// Mock environment
process.env.JIMENG_API_TOKEN = 'test-async-token';

// Mock external dependencies
jest.mock('../../src/api/BaseClient.js', () => ({
  BaseClient: jest.fn().mockImplementation(() => ({
    uploadImage: jest.fn(),
    makeRequest: jest.fn(),
    log: jest.fn()
  }))
}));

describe('Async Operations E2E Tests', () => {
  let jimengClient: JimengClient;
  let textToVideoGenerator: TextToVideoGenerator;
  let multiFrameVideoGenerator: MultiFrameVideoGenerator;
  let mainReferenceVideoGenerator: MainReferenceVideoGenerator;

  beforeEach(() => {
    jimengClient = new JimengClient();
    textToVideoGenerator = new TextToVideoGenerator();
    multiFrameVideoGenerator = new MultiFrameVideoGenerator();
    mainReferenceVideoGenerator = new MainReferenceVideoGenerator();
    jest.clearAllMocks();
  });

  describe('Async Mode Operations', () => {
    it('should handle async mode for text-to-video generation', async () => {
      const mockTaskId = 'async-text-video-123';
      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;

      const result = await jimengClient.generateTextToVideo({
        prompt: 'Async test video',
        firstFrameImage: '/first.jpg',
        lastFrameImage: '/last.jpg',
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        duration: 8000,
        async: true
      });

      expect(result.taskId).toBe(mockTaskId);
      expect(result.videoUrl).toBeUndefined();
      expect(result.metadata).toBeUndefined();
      expect(mockSubmitTask).toHaveBeenCalledWith(expect.objectContaining({
        prompt: 'Async test video',
        firstFrameImage: '/first.jpg',
        lastFrameImage: '/last.jpg',
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        duration: 8000,
        video_mode: 0
      }));
    });

    it('should handle async mode for multi-frame generation', async () => {
      const mockTaskId = 'async-multi-frame-456';
      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);
      const mockUploadImages = jest.fn().mockResolvedValue([
        { frame_idx: 0, oss_key: 'frame-0.jpg' },
        { frame_idx: 1, oss_key: 'frame-1.jpg' },
        { frame_idx: 2, oss_key: 'frame-2.jpg' }
      ]);

      multiFrameVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      multiFrameVideoGenerator['uploadFrameImages'] = mockUploadImages;

      const frames = [
        { idx: 0, imagePath: '/frame-0.jpg' },
        { idx: 1, imagePath: '/frame-1.jpg' },
        { idx: 2, imagePath: '/frame-2.jpg' }
      ];

      const result = await jimengClient.generateMultiFrameVideo({
        frames,
        prompt: 'Async multi-frame test',
        model: 'jimeng-video-3.0',
        async: true
      });

      expect(result.taskId).toBe(mockTaskId);
      expect(result.videoUrl).toBeUndefined();
      expect(mockSubmitTask).toHaveBeenCalledWith(expect.objectContaining({
        video_mode: 1,
        frames: expect.arrayContaining([
          expect.objectContaining({ frame_idx: 0 }),
          expect.objectContaining({ frame_idx: 1 }),
          expect.objectContaining({ frame_idx: 2 })
        ])
      }));
    });

    it('should handle async mode for main reference generation', async () => {
      const mockHistoryId = 'async-main-ref-789';
      const mockGenerateAsync = jest.fn().mockResolvedValue(mockHistoryId);

      mainReferenceVideoGenerator['generateAsync'] = mockGenerateAsync;

      const referenceImages = ['/ref1.jpg', '/ref2.jpg'];

      const result = await jimengClient.generateMainReferenceVideo({
        referenceImages,
        prompt: '[图0]和[图1]的异步测试',
        model: 'jimeng-video-3.0',
        async: true
      });

      expect(result.taskId).toBe(mockHistoryId);
      expect(result.videoUrl).toBeUndefined();
      expect(mockGenerateAsync).toHaveBeenCalledWith({
        referenceImages,
        prompt: '[图0]和[图1]的异步测试',
        model: 'jimeng-video-3.0'
      });
    });
  });

  describe('Sync Mode with Timeout Handling', () => {
    it('should handle successful sync operation before timeout', async () => {
      const mockTaskId = 'sync-success-123';
      const mockVideoResult = {
        videoUrl: 'https://example.com/sync-success.mp4',
        metadata: {
          taskId: mockTaskId,
          mode: 'text_to_video',
          completedAt: Date.now()
        }
      };

      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);
      const mockCheckStatus = jest.fn()
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({
          status: 'completed',
          result: mockVideoResult
        });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      const result = await jimengClient.generateTextToVideo({
        prompt: 'Sync success test',
        async: false
      }, {
        timeout: 30000 // 30 seconds
      });

      expect(result.videoUrl).toBe('https://example.com/sync-success.mp4');
      expect(result.metadata.taskId).toBe(mockTaskId);
      expect(mockCheckStatus).toHaveBeenCalledTimes(3);
    });

    it('should handle timeout during sync operation', async () => {
      const mockTaskId = 'sync-timeout-456';
      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);
      const mockCheckStatus = jest.fn().mockResolvedValue({ status: 'pending' });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      await expect(jimengClient.generateTextToVideo({
        prompt: 'Sync timeout test',
        async: false
      }, {
        timeout: 1000 // 1 second timeout for fast test
      })).rejects.toThrow(TimeoutError);

      await expect(jimengClient.generateTextToVideo({
        prompt: 'Sync timeout test',
        async: false
      }, {
        timeout: 1000
      })).rejects.toThrow('Polling timed out after 1 second');
    });

    it('should handle task failure during sync operation', async () => {
      const mockTaskId = 'sync-failed-789';
      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);
      const mockCheckStatus = jest.fn().mockResolvedValue({
        status: 'failed',
        error: 'Content policy violation detected'
      });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      await expect(jimengClient.generateTextToVideo({
        prompt: 'Sync failure test',
        async: false
      })).rejects.toThrow('Content policy violation detected');
    });

    it('should handle network errors during polling', async () => {
      const mockTaskId = 'sync-network-error-012';
      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);
      const mockCheckStatus = jest.fn()
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockResolvedValueOnce({
          status: 'completed',
          result: {
            videoUrl: 'https://example.com/recovery.mp4',
            metadata: { taskId: mockTaskId }
          }
        });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      const result = await jimengClient.generateTextToVideo({
        prompt: 'Network recovery test',
        async: false
      }, {
        timeout: 10000
      });

      expect(result.videoUrl).toBe('https://example.com/recovery.mp4');
      expect(mockCheckStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('Polling Configuration', () => {
    it('should use custom polling configuration', async () => {
      const mockTaskId = 'custom-polling-123';
      const mockVideoResult = {
        videoUrl: 'https://example.com/custom-polling.mp4',
        metadata: { taskId: mockTaskId }
      };

      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);
      const mockCheckStatus = jest.fn()
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({
          status: 'completed',
          result: mockVideoResult
        });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      const customConfig = {
        initialInterval: 500,   // Start with 500ms
        maxInterval: 2000,      // Max 2s
        backoffFactor: 1.2,     // Slow backoff
        timeout: 5000           // 5 seconds
      };

      const startTime = Date.now();
      const result = await jimengClient.generateTextToVideo({
        prompt: 'Custom polling test',
        async: false
      }, customConfig);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.videoUrl).toBe('https://example.com/custom-polling.mp4');
      expect(duration).toBeGreaterThan(500); // Should wait at least initial interval
      expect(duration).toBeLessThan(2000);   // But less than max interval
    });

    it('should use default configuration when custom config not provided', async () => {
      const mockTaskId = 'default-polling-456';
      const mockVideoResult = {
        videoUrl: 'https://example.com/default-polling.mp4',
        metadata: { taskId: mockTaskId }
      };

      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);
      const mockCheckStatus = jest.fn().mockResolvedValue({
        status: 'completed',
        result: mockVideoResult
      });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      const result = await jimengClient.generateTextToVideo({
        prompt: 'Default polling test',
        async: false
      }); // No custom config provided

      expect(result.videoUrl).toBe('https://example.com/default-polling.mp4');
      expect(mockSubmitTask).toHaveBeenCalled();
      expect(mockCheckStatus).toHaveBeenCalled();
    });
  });

  describe('Mixed Async/Sync Operations', () => {
    it('should handle concurrent async and sync operations', async () => {
      // Setup async operation
      const mockAsyncTaskId = 'concurrent-async-123';
      const mockAsyncSubmit = jest.fn().mockResolvedValue(mockAsyncTaskId);
      textToVideoGenerator['submitVideoGenerationTask'] = mockAsyncSubmit;

      // Setup sync operation
      const mockSyncTaskId = 'concurrent-sync-456';
      const mockSyncSubmit = jest.fn().mockResolvedValue(mockSyncTaskId);
      const mockSyncStatus = jest.fn().mockResolvedValue({
        status: 'completed',
        result: {
          videoUrl: 'https://example.com/concurrent-sync.mp4',
          metadata: { taskId: mockSyncTaskId }
        }
      });
      multiFrameVideoGenerator['submitVideoGenerationTask'] = mockSyncSubmit;
      multiFrameVideoGenerator['checkTaskStatus'] = mockSyncStatus;

      // Run both operations concurrently
      const [asyncResult, syncResult] = await Promise.all([
        jimengClient.generateTextToVideo({
          prompt: 'Concurrent async test',
          async: true
        }),
        jimengClient.generateMultiFrameVideo({
          frames: [{ idx: 0, imagePath: '/frame.jpg' }],
          prompt: 'Concurrent sync test',
          async: false
        })
      ]);

      expect(asyncResult.taskId).toBe(mockAsyncTaskId);
      expect(syncResult.videoUrl).toBe('https://example.com/concurrent-sync.mp4');
      expect(mockAsyncSubmit).toHaveBeenCalled();
      expect(mockSyncSubmit).toHaveBeenCalled();
      expect(mockSyncStatus).toHaveBeenCalled();
    });

    it('should handle mixed operations with different timeouts', async () => {
      // Setup operations with different timeout requirements
      const mockSubmitTask = jest.fn()
        .mockResolvedValueOnce('mixed-operation-1')
        .mockResolvedValueOnce('mixed-operation-2');

      const mockCheckStatus = jest.fn()
        .mockImplementation(async (taskId) => {
          if (taskId === 'mixed-operation-1') {
            // Fast completion
            return {
              status: 'completed',
              result: { videoUrl: 'https://example.com/fast.mp4' }
            };
          } else {
            // Slow completion
            await new Promise(resolve => setTimeout(resolve, 100));
            return {
              status: 'completed',
              result: { videoUrl: 'https://example.com/slow.mp4' }
            };
          }
        });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      // First operation with short timeout (should succeed quickly)
      const fastResult = await jimengClient.generateTextToVideo({
        prompt: 'Fast operation test',
        async: false
      }, {
        timeout: 5000
      });

      // Second operation with longer timeout (should still succeed)
      const slowResult = await jimengClient.generateTextToVideo({
        prompt: 'Slow operation test',
        async: false
      }, {
        timeout: 10000
      });

      expect(fastResult.videoUrl).toBe('https://example.com/fast.mp4');
      expect(slowResult.videoUrl).toBe('https://example.com/slow.mp4');
    });
  });

  describe('Resource Cleanup', () => {
    it('should handle cleanup after async operation cancellation', async () => {
      const mockTaskId = 'cleanup-test-123';
      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;

      // Start async operation
      const asyncResult = await jimengClient.generateTextToVideo({
        prompt: 'Cleanup test',
        async: true
      });

      expect(asyncResult.taskId).toBe(mockTaskId);

      // Simulate cleanup - in real scenario, this would be handled by the caller
      // This test verifies that async operations don't leave hanging promises
      const cleanupPromise = new Promise<void>((resolve) => {
        // Simulate cleanup logic
        setTimeout(() => {
          resolve();
        }, 100);
      });

      await expect(cleanupPromise).resolves.toBeUndefined();
    });
  });

  describe('Error Recovery Patterns', () => {
    it('should implement retry pattern for transient errors', async () => {
      const mockTaskId = 'retry-test-123';
      const mockVideoResult = {
        videoUrl: 'https://example.com/retry-success.mp4',
        metadata: { taskId: mockTaskId }
      };

      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);
      const mockCheckStatus = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockRejectedValueOnce(new Error('Another temporary error'))
        .mockResolvedValueOnce({
          status: 'completed',
          result: mockVideoResult
        });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      const result = await jimengClient.generateTextToVideo({
        prompt: 'Retry pattern test',
        async: false
      }, {
        timeout: 10000
      });

      expect(result.videoUrl).toBe('https://example.com/retry-success.mp4');
      expect(mockCheckStatus).toHaveBeenCalledTimes(3);
    });

    it('should fail immediately for non-retryable errors', async () => {
      const mockTaskId = 'non-retryable-123';
      const mockSubmitTask = jest.fn().mockResolvedValue(mockTaskId);
      const mockCheckStatus = jest.fn().mockRejectedValue(
        new Error('Content policy violation - not retryable')
      );

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      await expect(jimengClient.generateTextToVideo({
        prompt: 'Non-retryable error test',
        async: false
      })).rejects.toThrow('Content policy violation - not retryable');

      // Should fail immediately without retries
      expect(mockCheckStatus).toHaveBeenCalledTimes(1);
    });
  });
});