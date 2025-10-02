import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { JimengClient } from '../../src/api/JimengClient.js';
import { TextToVideoGenerator } from '../../src/api/video/TextToVideoGenerator.js';
import { MultiFrameVideoGenerator } from '../../src/api/video/MultiFrameVideoGenerator.js';
import { MainReferenceVideoGenerator } from '../../src/api/video/MainReferenceVideoGenerator.js';
import { TimeoutError } from '../../src/utils/timeout.js';

// Mock the environment
process.env.JIMENG_API_TOKEN = 'test-e2e-token';

// Mock external dependencies
jest.mock('../../src/api/BaseClient.js', () => ({
  BaseClient: jest.fn().mockImplementation(() => ({
    uploadImage: jest.fn(),
    makeRequest: jest.fn(),
    log: jest.fn()
  }))
}));

describe('Video Generation Workflow E2E Tests', () => {
  let jimengClient: JimengClient;
  let textToVideoGenerator: TextToVideoGenerator;
  let multiFrameVideoGenerator: MultiFrameVideoGenerator;
  let mainReferenceVideoGenerator: MainReferenceVideoGenerator;

  beforeAll(() => {
    jimengClient = new JimengClient();
    textToVideoGenerator = new TextToVideoGenerator();
    multiFrameVideoGenerator = new MultiFrameVideoGenerator();
    mainReferenceVideoGenerator = new MainReferenceVideoGenerator();
  });

  describe('Complete Workflow Integration', () => {
    it('should handle complete text-to-video workflow in sync mode', async () => {
      // Mock successful video generation
      const mockVideoResult = {
        videoUrl: 'https://example.com/text-to-video-sync.mp4',
        metadata: {
          taskId: 'text-video-sync-123',
          mode: 'text_to_video',
          model: 'jimeng-video-3.0',
          resolution: '1080p',
          duration: 5000,
          createdAt: Date.now()
        }
      };

      // Mock the complete workflow
      const mockSubmitTask = jest.fn().mockResolvedValue('text-video-sync-123');
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
        prompt: 'A beautiful sunset over mountains',
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        duration: 5000,
        async: false
      });

      expect(result.videoUrl).toBe('https://example.com/text-to-video-sync.mp4');
      expect(result.metadata.taskId).toBe('text-video-sync-123');
      expect(result.metadata.mode).toBe('text_to_video');
      expect(mockSubmitTask).toHaveBeenCalledTimes(1);
      expect(mockCheckStatus).toHaveBeenCalledTimes(3);
    });

    it('should handle complete text-to-video workflow in async mode', async () => {
      const mockSubmitTask = jest.fn().mockResolvedValue('text-video-async-456');
      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;

      const result = await jimengClient.generateTextToVideo({
        prompt: 'A flowing river through forest',
        firstFrameImage: '/path/to/first-frame.jpg',
        lastFrameImage: '/path/to/last-frame.jpg',
        model: 'jimeng-video-3.0',
        async: true
      });

      expect(result.taskId).toBe('text-video-async-456');
      expect(result.videoUrl).toBeUndefined();
      expect(mockSubmitTask).toHaveBeenCalledWith(expect.objectContaining({
        prompt: 'A flowing river through forest',
        firstFrameImage: '/path/to/first-frame.jpg',
        lastFrameImage: '/path/to/last-frame.jpg',
        video_mode: 0, // text_to_video mode
        model: 'jimeng-video-3.0'
      }));
    });

    it('should handle complete multi-frame workflow', async () => {
      const mockMultiFrameResult = {
        videoUrl: 'https://example.com/multi-frame-sync.mp4',
        metadata: {
          taskId: 'multi-frame-sync-789',
          mode: 'multi_frame',
          model: 'jimeng-video-3.0',
          frameCount: 5,
          createdAt: Date.now()
        }
      };

      const mockSubmitTask = jest.fn().mockResolvedValue('multi-frame-sync-789');
      const mockCheckStatus = jest.fn()
        .mockResolvedValueOnce({ status: 'pending' })
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({
          status: 'completed',
          result: mockMultiFrameResult
        });

      const mockUploadImages = jest.fn().mockResolvedValue([
        { frame_idx: 0, oss_key: 'frame-0.jpg' },
        { frame_idx: 1, oss_key: 'frame-1.jpg' },
        { frame_idx: 2, oss_key: 'frame-2.jpg' },
        { frame_idx: 3, oss_key: 'frame-3.jpg' },
        { frame_idx: 4, oss_key: 'frame-4.jpg' }
      ]);

      multiFrameVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      multiFrameVideoGenerator['checkTaskStatus'] = mockCheckStatus;
      multiFrameVideoGenerator['uploadFrameImages'] = mockUploadImages;

      const frames = [
        { idx: 0, imagePath: '/frame-0.jpg' },
        { idx: 1, imagePath: '/frame-1.jpg' },
        { idx: 2, imagePath: '/frame-2.jpg' },
        { idx: 3, imagePath: '/frame-3.jpg' },
        { idx: 4, imagePath: '/frame-4.jpg' }
      ];

      const result = await jimengClient.generateMultiFrameVideo({
        frames,
        prompt: 'Smooth transition between frames',
        model: 'jimeng-video-3.0',
        resolution: '720p',
        duration: 8000,
        async: false
      });

      expect(result.videoUrl).toBe('https://example.com/multi-frame-sync.mp4');
      expect(result.metadata.frameCount).toBe(5);
      expect(mockUploadImages).toHaveBeenCalledWith(frames);
    });

    it('should handle complete main reference workflow', async () => {
      const mockMainRefResult = {
        videoUrl: 'https://example.com/main-reference-sync.mp4',
        metadata: {
          taskId: 'main-ref-sync-012',
          mode: 'main_reference',
          model: 'jimeng-video-3.0',
          referenceImageCount: 3,
          createdAt: Date.now()
        }
      };

      const mockGenerate = jest.fn().mockResolvedValue('https://example.com/main-reference-sync.mp4');
      mainReferenceVideoGenerator['generate'] = mockGenerate;
      mainReferenceVideoGenerator['parsePromptWithImageReferences'] = jest.fn().mockReturnValue([
        { type: 'image', index: 0 },
        { type: 'text', content: '中的猫在' },
        { type: 'image', index: 1 },
        { type: 'text', content: '的地板上' }
      ]);

      const referenceImages = ['/cat.jpg', '/floor.jpg'];

      const result = await jimengClient.generateMainReferenceVideo({
        referenceImages,
        prompt: '[图0]中的猫在[图1]的地板上',
        model: 'jimeng-video-3.0',
        resolution: '1080p',
        async: false
      });

      expect(result.videoUrl).toBe('https://example.com/main-reference-sync.mp4');
      expect(result.metadata.referenceImageCount).toBe(3);
      expect(mockGenerate).toHaveBeenCalledWith({
        referenceImages,
        prompt: '[图0]中的猫在[图1]的地板上',
        model: 'jimeng-video-3.0',
        resolution: '1080p'
      });
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle timeout error gracefully', async () => {
      const mockSubmitTask = jest.fn().mockResolvedValue('timeout-task-id');
      const mockCheckStatus = jest.fn().mockResolvedValue({ status: 'pending' });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      // Mock timeout configuration for faster test
      const { pollUntilComplete } = await import('../../src/utils/timeout.js');

      await expect(jimengClient.generateTextToVideo({
        prompt: 'This will timeout',
        async: false
      }, {
        timeout: 100 // 100ms timeout for fast test
      })).rejects.toThrow(TimeoutError);
    });

    it('should handle content policy violation', async () => {
      const mockSubmitTask = jest.fn().mockResolvedValue('violation-task-id');
      const mockCheckStatus = jest.fn().mockResolvedValue({
        status: 'failed',
        error: 'Content policy violation'
      });

      textToVideoGenerator['submitVideoGeneration'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      await expect(jimengClient.generateTextToVideo({
        prompt: 'Invalid content',
        async: false
      })).rejects.toThrow('Content policy violation');
    });

    it('should handle parameter validation errors', async () => {
      await expect(jimengClient.generateTextToVideo({
        prompt: '', // Empty prompt
        async: false
      })).rejects.toThrow('Prompt is required');

      await expect(jimengClient.generateMultiFrameVideo({
        frames: [], // No frames
        prompt: 'Test',
        async: false
      })).rejects.toThrow('Frames are required');

      await expect(jimengClient.generateMainReferenceVideo({
        referenceImages: [], // No reference images
        prompt: 'Test',
        async: false
      })).rejects.toThrow('Reference images are required');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockSubmitTask = jest.fn().mockImplementation(async () => {
        // Simulate async task submission
        return `task-${Math.random().toString(36).substr(2, 9)}`;
      });

      const mockCheckStatus = jest.fn().mockImplementation(async (taskId) => {
        // Simulate quick completion for load testing
        return {
          status: 'completed',
          result: {
            videoUrl: `https://example.com/${taskId}.mp4`,
            metadata: { taskId, completedAt: Date.now() }
          }
        };
      });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      // Run 5 concurrent requests
      const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
        jimengClient.generateTextToVideo({
          prompt: `Concurrent test video ${i + 1}`,
          async: false
        }, {
          timeout: 1000 // Short timeout for load testing
        })
      );

      const results = await Promise.all(concurrentRequests);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.videoUrl).toContain(`https://example.com/task-`);
        expect(result.metadata).toBeDefined();
      });
    });

    it('should handle large parameter sets efficiently', async () => {
      const largeFrames = Array.from({ length: 10 }, (_, i) => ({
        idx: i,
        imagePath: `/large-frame-${i}.jpg`
      }));

      const mockUploadImages = jest.fn().mockResolvedValue(
        largeFrames.map((frame, i) => ({
          frame_idx: frame.idx,
          oss_key: `large-frame-${i}.jpg`
        }))
      );

      const mockSubmitTask = jest.fn().mockResolvedValue('large-frames-task');
      const mockCheckStatus = jest.fn().mockResolvedValue({
        status: 'completed',
        result: {
          videoUrl: 'https://example.com/large-frames.mp4',
          metadata: { frameCount: 10 }
        }
      });

      multiFrameVideoGenerator['uploadFrameImages'] = mockUploadImages;
      multiFrameVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      multiFrameVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      const result = await jimengClient.generateMultiFrameVideo({
        frames: largeFrames,
        prompt: 'Large frames test',
        async: false
      });

      expect(result.videoUrl).toBe('https://example.com/large-frames.mp4');
      expect(mockUploadImages).toHaveBeenCalledWith(largeFrames);
      expect(result.metadata.frameCount).toBe(10);
    });
  });

  describe('Backward Compatibility Workflow', () => {
    it('should maintain compatibility with existing video generation patterns', async () => {
      // Test that old-style parameters still work
      const mockVideoResult = {
        videoUrl: 'https://example.com/compatibility-test.mp4',
        metadata: {
          taskId: 'compatibility-123',
          mode: 'text_to_video',
          createdAt: Date.now()
        }
      };

      const mockSubmitTask = jest.fn().mockResolvedValue('compatibility-123');
      const mockCheckStatus = jest.fn().mockResolvedValue({
        status: 'completed',
        result: mockVideoResult
      });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      // Test with minimal parameters (old style)
      const result = await jimengClient.generateTextToVideo({
        prompt: 'Minimal parameters test'
        // async defaults to false
      });

      expect(result.videoUrl).toBe('https://example.com/compatibility-test.mp4');
      expect(mockSubmitTask).toHaveBeenCalledWith(expect.objectContaining({
        prompt: 'Minimal parameters test',
        model: 'jimeng-video-3.0', // Should use default
        resolution: '720p', // Should use default
        video_mode: 0
      }));
    });
  });

  describe('Integration with Server Tools', () => {
    it('should work with MCP server tool integration', async () => {
      // This test simulates how the tools would be called through MCP server
      const mockToolCall = async (toolName: string, params: any) => {
        switch (toolName) {
          case 'generateTextToVideo':
            return await jimengClient.generateTextToVideo(params);
          case 'generateMultiFrameVideo':
            return await jimengClient.generateMultiFrameVideo(params);
          case 'generateMainReferenceVideo':
            return await jimengClient.generateMainReferenceVideo(params);
          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }
      };

      // Mock successful generation for all tools
      const mockSubmitTask = jest.fn().mockResolvedValue('mcp-test-task');
      const mockCheckStatus = jest.fn().mockResolvedValue({
        status: 'completed',
        result: {
          videoUrl: 'https://example.com/mcp-test.mp4',
          metadata: { tool: 'mcp-integration' }
        }
      });

      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      textToVideoGenerator['checkTaskStatus'] = mockCheckStatus;

      const result = await mockToolCall('generateTextToVideo', {
        prompt: 'MCP integration test',
        async: false
      });

      expect(result.videoUrl).toBe('https://example.com/mcp-test.mp4');
      expect(result.metadata.tool).toBe('mcp-integration');
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
});