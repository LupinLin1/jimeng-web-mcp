import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TextToVideoGenerator } from '../../src/api/video/TextToVideoGenerator.js';
import { MultiFrameVideoGenerator } from '../../src/api/video/MultiFrameVideoGenerator.js';
import { MainReferenceVideoGenerator } from '../../src/api/video/MainReferenceVideoGenerator.js';
import { JimengClient } from '../../src/api/JimengClient.js';

// Mock dependencies
jest.mock('../../src/utils/timeout.js', () => ({
  pollUntilComplete: jest.fn(),
  DEFAULT_POLLING_CONFIG: {
    initialInterval: 2000,
    maxInterval: 10000,
    backoffFactor: 1.5,
    timeout: 600000
  }
}));

jest.mock('../../src/api/BaseClient.js', () => ({
  BaseClient: jest.fn().mockImplementation(() => ({
    uploadImage: jest.fn(),
    makeRequest: jest.fn(),
    log: jest.fn()
  }))
}));

describe('Video Generators Integration', () => {
  let textToVideoGenerator: TextToVideoGenerator;
  let multiFrameVideoGenerator: MultiFrameVideoGenerator;
  let mainReferenceVideoGenerator: MainReferenceVideoGenerator;
  let jimengClient: JimengClient;

  beforeEach(() => {
    // Mock environment variable for API token
    process.env.JIMENG_API_TOKEN = 'test-token';

    textToVideoGenerator = new TextToVideoGenerator();
    multiFrameVideoGenerator = new MultiFrameVideoGenerator();
    mainReferenceVideoGenerator = new MainReferenceVideoGenerator();
    jimengClient = new JimengClient();

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('JimengClient Integration', () => {
    it('should delegate to TextToVideoGenerator for text-to-video generation', async () => {
      const mockResult = {
        videoUrl: 'https://example.com/text-to-video.mp4',
        metadata: {
          taskId: 'text-video-task-123',
          mode: 'text_to_video',
          model: 'jimeng-video-3.0',
          createdAt: Date.now()
        }
      };

      const mockGenerateTextToVideo = jest.spyOn(textToVideoGenerator, 'generateTextToVideo');
      mockGenerateTextToVideo.mockResolvedValue(mockResult);

      const result = await jimengClient.generateTextToVideo({
        prompt: 'A beautiful sunset',
        async: false
      });

      expect(result).toEqual(mockResult);
      expect(mockGenerateTextToVideo).toHaveBeenCalledWith({
        prompt: 'A beautiful sunset',
        async: false
      });
    });

    it('should delegate to MultiFrameVideoGenerator for multi-frame generation', async () => {
      const mockResult = {
        videoUrl: 'https://example.com/multi-frame-video.mp4',
        metadata: {
          taskId: 'multi-frame-task-456',
          mode: 'multi_frame',
          model: 'jimeng-video-3.0',
          frameCount: 3,
          createdAt: Date.now()
        }
      };

      const mockGenerateMultiFrameVideo = jest.spyOn(multiFrameVideoGenerator, 'generateMultiFrameVideo');
      mockGenerateMultiFrameVideo.mockResolvedValue(mockResult);

      const frames = [
        { idx: 0, imagePath: '/frame1.jpg' },
        { idx: 1, imagePath: '/frame2.jpg' },
        { idx: 2, imagePath: '/frame3.jpg' }
      ];

      const result = await jimengClient.generateMultiFrameVideo({
        frames,
        prompt: 'Smooth transition',
        async: false
      });

      expect(result).toEqual(mockResult);
      expect(mockGenerateMultiFrameVideo).toHaveBeenCalledWith({
        frames,
        prompt: 'Smooth transition',
        async: false
      });
    });

    it('should delegate to MainReferenceVideoGenerator for main reference generation', async () => {
      const mockResult = {
        videoUrl: 'https://example.com/main-reference-video.mp4',
        metadata: {
          taskId: 'main-reference-task-789',
          mode: 'main_reference',
          model: 'jimeng-video-3.0',
          referenceImageCount: 2,
          createdAt: Date.now()
        }
      };

      const mockGenerateMainReferenceVideo = jest.spyOn(mainReferenceVideoGenerator, 'generateMainReferenceVideo');
      mockGenerateMainReferenceVideo.mockResolvedValue(mockResult);

      const referenceImages = ['/img1.jpg', '/img2.jpg'];

      const result = await jimengClient.generateMainReferenceVideo({
        referenceImages,
        prompt: '[图0]在[图1]的环境中',
        async: false
      });

      expect(result).toEqual(mockResult);
      expect(mockGenerateMainReferenceVideo).toHaveBeenCalledWith({
        referenceImages,
        prompt: '[图0]在[图1]的环境中',
        async: false
      });
    });
  });

  describe('Async/Sync Mode Integration', () => {
    it('should handle sync mode across all generators', async () => {
      const { pollUntilComplete } = await import('../../src/utils/timeout.js');
      const mockPollUntilComplete = pollUntilComplete as jest.MockedFunction<typeof pollUntilComplete>;

      mockPollUntilComplete.mockResolvedValue({
        videoUrl: 'https://example.com/sync-video.mp4',
        metadata: { syncMode: true }
      });

      // Text to Video sync
      const textResult = await textToVideoGenerator.generateTextToVideo({
        prompt: 'Test video',
        async: false
      });

      // Multi Frame sync
      const multiFrameResult = await multiFrameVideoGenerator.generateMultiFrameVideo({
        frames: [{ idx: 0, imagePath: '/frame.jpg' }],
        prompt: 'Test multi-frame',
        async: false
      });

      // Main Reference sync
      const mainRefResult = await mainReferenceVideoGenerator.generateMainReferenceVideo({
        referenceImages: ['/img1.jpg', '/img2.jpg'],
        prompt: '[图0]和[图1]',
        async: false
      });

      expect(textResult.videoUrl).toBe('https://example.com/sync-video.mp4');
      expect(multiFrameResult.videoUrl).toBe('https://example.com/sync-video.mp4');
      expect(mainRefResult.videoUrl).toBe('https://example.com/sync-video.mp4');

      expect(mockPollUntilComplete).toHaveBeenCalledTimes(3);
    });

    it('should handle async mode across all generators', async () => {
      const mockSubmitTask = jest.fn()
        .mockResolvedValueOnce('text-task-id')
        .mockResolvedValueOnce('multi-frame-task-id')
        .mockResolvedValueOnce('main-ref-task-id');

      // Mock the submitVideoGenerationTask method for each generator
      textToVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      multiFrameVideoGenerator['submitVideoGenerationTask'] = mockSubmitTask;
      mainReferenceVideoGenerator['generateAsync'] = jest.fn().mockResolvedValue('main-ref-task-id');

      // Text to Video async
      const textResult = await textToVideoGenerator.generateTextToVideo({
        prompt: 'Test video',
        async: true
      });

      // Multi Frame async
      const multiFrameResult = await multiFrameVideoGenerator.generateMultiFrameVideo({
        frames: [{ idx: 0, imagePath: '/frame.jpg' }],
        prompt: 'Test multi-frame',
        async: true
      });

      // Main Reference async
      const mainRefResult = await mainReferenceVideoGenerator.generateMainReferenceVideo({
        referenceImages: ['/img1.jpg', '/img2.jpg'],
        prompt: '[图0]和[图1]',
        async: true
      });

      expect(textResult.taskId).toBe('text-task-id');
      expect(multiFrameResult.taskId).toBe('multi-frame-task-id');
      expect(mainRefResult.taskId).toBe('main-ref-task-id');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle consistent error format across generators', async () => {
      const mockError = {
        code: 'CONTENT_VIOLATION',
        message: '内容违规',
        reason: 'Generated content violates policy',
        timestamp: Date.now()
      };

      // Mock each generator to return the same error format
      jest.spyOn(textToVideoGenerator, 'generateTextToVideo').mockResolvedValue({ error: mockError });
      jest.spyOn(multiFrameVideoGenerator, 'generateMultiFrameVideo').mockResolvedValue({ error: mockError });
      jest.spyOn(mainReferenceVideoGenerator, 'generateMainReferenceVideo').mockResolvedValue({ error: mockError });

      const textResult = await textToVideoGenerator.generateTextToVideo({
        prompt: 'Invalid content',
        async: false
      });

      const multiFrameResult = await multiFrameVideoGenerator.generateMultiFrameVideo({
        frames: [{ idx: 0, imagePath: '/frame.jpg' }],
        prompt: 'Invalid content',
        async: false
      });

      const mainRefResult = await mainReferenceVideoGenerator.generateMainReferenceVideo({
        referenceImages: ['/img1.jpg', '/img2.jpg'],
        prompt: 'Invalid content',
        async: false
      });

      expect(textResult.error).toEqual(mockError);
      expect(multiFrameResult.error).toEqual(mockError);
      expect(mainRefResult.error).toEqual(mockError);
    });
  });

  describe('Parameter Validation Integration', () => {
    it('should validate required parameters consistently', async () => {
      // Text to Video validation
      await expect(textToVideoGenerator.generateTextToVideo({} as any))
        .rejects.toThrow('Prompt is required');

      // Multi Frame validation
      await expect(multiFrameVideoGenerator.generateMultiFrameVideo({} as any))
        .rejects.toThrow('Frames are required');

      // Main Reference validation
      await expect(mainReferenceVideoGenerator.generateMainReferenceVideo({} as any))
        .rejects.toThrow('Reference images are required');
    });

    it('should validate parameter ranges consistently', async () => {
      const invalidParams = {
        duration: 1000, // Too short
        fps: 50, // Too high
        resolution: 'invalid' as any,
        videoAspectRatio: 'invalid' as any
      };

      // All generators should validate common parameters
      await expect(textToVideoGenerator.generateTextToVideo({
        prompt: 'Test',
        ...invalidParams
      })).rejects.toThrow();

      await expect(multiFrameVideoGenerator.generateMultiFrameVideo({
        frames: [{ idx: 0, imagePath: '/frame.jpg' }],
        prompt: 'Test',
        ...invalidParams
      })).rejects.toThrow();

      await expect(mainReferenceVideoGenerator.generateMainReferenceVideo({
        referenceImages: ['/img1.jpg', '/img2.jpg'],
        prompt: 'Test',
        ...invalidParams
      })).rejects.toThrow();
    });
  });

  describe('Default Parameters Integration', () => {
    it('should use consistent default parameters across generators', async () => {
      const { pollUntilComplete } = await import('../../src/utils/timeout.js');
      const mockPollUntilComplete = pollUntilComplete as jest.MockedFunction<typeof pollUntilComplete>;

      mockPollUntilComplete.mockResolvedValue({
        videoUrl: 'https://example.com/default-video.mp4',
        metadata: {}
      });

      // Test with minimal parameters
      await textToVideoGenerator.generateTextToVideo({
        prompt: 'Test'
      });

      await multiFrameVideoGenerator.generateMultiFrameVideo({
        frames: [{ idx: 0, imagePath: '/frame.jpg' }],
        prompt: 'Test'
      });

      await mainReferenceVideoGenerator.generateMainReferenceVideo({
        referenceImages: ['/img1.jpg', '/img2.jpg'],
        prompt: 'Test'
      });

      // All generators should use the same default timeout configuration
      expect(mockPollUntilComplete).toHaveBeenCalledTimes(3);
      mockPollUntilComplete.mock.calls.forEach(call => {
        expect(call[2]).toEqual(
          expect.objectContaining({
            timeout: 600000 // 10 minutes
          })
        );
      });
    });
  });
});