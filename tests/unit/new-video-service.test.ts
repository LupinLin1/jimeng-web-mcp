/**
 * Unit tests for new VideoService implementation
 * Tests merged generator functionality and inlined polling logic
 */

import { VideoService } from '../../src/api/VideoService.js';
import { HttpClient } from '../../src/api/HttpClient.js';
import { ImageUploader } from '../../src/api/ImageUploader.js';

describe('VideoService (Merged Generators)', () => {
  let videoService: VideoService;
  let httpClient: HttpClient;
  let imageUploader: ImageUploader;
  let mockRequest: jest.SpyInstance;

  beforeAll(() => {
    process.env.JIMENG_API_TOKEN = 'test-token-12345';
    httpClient = new HttpClient();
    imageUploader = new ImageUploader(httpClient);
    videoService = new VideoService(httpClient, imageUploader);
  });

  beforeEach(() => {
    mockRequest = jest.spyOn(httpClient, 'request');
  });

  afterEach(() => {
    mockRequest.mockRestore();
  });

  describe('Architecture', () => {
    it('should use composition (no inheritance)', () => {
      const proto = Object.getPrototypeOf(videoService);
      expect(proto.constructor.name).toBe('VideoService');

      const protoChain: string[] = [];
      let current = videoService;
      while (Object.getPrototypeOf(current) !== null) {
        current = Object.getPrototypeOf(current);
        protoChain.push(current.constructor.name);
      }

      expect(protoChain).toEqual(['VideoService', 'Object']);
      expect(protoChain).not.toContain('VideoGenerator');
      expect(protoChain).not.toContain('BaseClient');
    });

    it('should have injected dependencies', () => {
      expect(videoService['httpClient']).toBe(httpClient);
      expect(videoService['imageUploader']).toBe(imageUploader);
    });
  });

  describe('generateTextToVideo', () => {
    it('should validate duration range', async () => {
      await expect(
        videoService.generateTextToVideo({
          prompt: 'test',
          duration: 2000 // Too short
        })
      ).rejects.toThrow('duration必须在3000-15000毫秒之间');

      await expect(
        videoService.generateTextToVideo({
          prompt: 'test',
          duration: 20000 // Too long
        })
      ).rejects.toThrow('duration必须在3000-15000毫秒之间');
    });

    it('should return taskId in async mode', async () => {
      mockRequest.mockResolvedValueOnce({
        task_id: 'test-task-123'
      });

      const result = await videoService.generateTextToVideo({
        prompt: 'test video',
        async: true
      });

      expect(result.taskId).toBe('test-task-123');
      expect(result.videoUrl).toBeUndefined();
      expect(result.metadata).toBeDefined();
    });

    it('should poll and return videoUrl in sync mode', async () => {
      // Mock task submission
      mockRequest.mockResolvedValueOnce({
        task_id: 'test-task-456'
      });

      // Mock polling responses (first pending, then completed)
      mockRequest
        .mockResolvedValueOnce({
          status: 'processing',
          video_url: null
        })
        .mockResolvedValueOnce({
          status: 'completed',
          video_url: 'https://example.com/video.mp4'
        });

      const result = await videoService.generateTextToVideo({
        prompt: 'test video',
        async: false
      });

      expect(result.videoUrl).toBe('https://example.com/video.mp4');
      expect(result.taskId).toBeUndefined();
      expect(mockRequest).toHaveBeenCalledTimes(3); // submit + 2 polls
    });
  });

  describe('generateMultiFrame', () => {
    it('should validate frame count', async () => {
      await expect(
        videoService.generateMultiFrame({
          frames: [{ idx: 0, imagePath: '/test.jpg', duration_ms: 1000, prompt: 'test' }]
        })
      ).rejects.toThrow('帧数量必须在2-10之间');

      await expect(
        videoService.generateMultiFrame({
          frames: Array(11).fill({ idx: 0, imagePath: '/test.jpg', duration_ms: 1000, prompt: 'test' })
        })
      ).rejects.toThrow('帧数量必须在2-10之间');
    });

    it('should sort frames by index', async () => {
      const mockUpload = jest.spyOn(imageUploader, 'uploadBatch').mockResolvedValue([
        { uri: 'uri1', originalPath: '/test1.jpg', width: 100, height: 100, format: 'jpg' },
        { uri: 'uri2', originalPath: '/test2.jpg', width: 100, height: 100, format: 'jpg' }
      ]);

      mockRequest.mockResolvedValueOnce({ task_id: 'task-1' });

      await videoService.generateMultiFrame({
        frames: [
          { idx: 1, imagePath: '/test2.jpg', duration_ms: 1000, prompt: 'second' },
          { idx: 0, imagePath: '/test1.jpg', duration_ms: 1000, prompt: 'first' }
        ],
        async: true
      });

      // Verify frames were uploaded in correct order
      expect(mockUpload).toHaveBeenCalledWith(['/test1.jpg', '/test2.jpg']);

      mockUpload.mockRestore();
    });
  });

  describe('generateMainReference', () => {
    it('should validate reference image count', async () => {
      await expect(
        videoService.generateMainReference({
          referenceImages: ['/img1.jpg'], // Only 1
          prompt: '[图0]的猫'
        })
      ).rejects.toThrow('参考图片数量必须在2-4之间');

      await expect(
        videoService.generateMainReference({
          referenceImages: ['/1.jpg', '/2.jpg', '/3.jpg', '/4.jpg', '/5.jpg'], // 5 images
          prompt: '[图0]'
        })
      ).rejects.toThrow('参考图片数量必须在2-4之间');
    });

    it('should require at least one image reference in prompt', async () => {
      await expect(
        videoService.generateMainReference({
          referenceImages: ['/img1.jpg', '/img2.jpg'],
          prompt: '没有图片引用' // No [图N]
        })
      ).rejects.toThrow('必须包含至少一个图片引用');
    });

    it('should validate image reference indices', async () => {
      await expect(
        videoService.generateMainReference({
          referenceImages: ['/img1.jpg', '/img2.jpg'],
          prompt: '[图0]和[图5]' // 图5 is out of range
        })
      ).rejects.toThrow('图片引用[图5]超出范围');
    });
  });

  describe('Inlined Polling Logic (replaces timeout.ts)', () => {
    it('should poll with exponential backoff', async () => {
      const sleepSpy = jest.spyOn(videoService as any, 'sleep');

      mockRequest
        .mockResolvedValueOnce({ task_id: 'task-poll-test' })
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({ status: 'completed', video_url: 'https://video.mp4' });

      await videoService.generateTextToVideo({
        prompt: 'test',
        async: false
      });

      // Verify exponential backoff: 2000ms, then 3000ms (2000 * 1.5), then...
      expect(sleepSpy).toHaveBeenCalledWith(2000);
      expect(sleepSpy).toHaveBeenCalledWith(3000);

      sleepSpy.mockRestore();
    });

    it('should throw error on timeout', async () => {
      // Mock the checkTaskStatus to always return processing
      const checkStatusSpy = jest.spyOn(videoService as any, 'checkTaskStatus')
        .mockResolvedValue({ status: 'processing' });

      // Mock Date.now to simulate timeout
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return originalDateNow() + (callCount > 2 ? 700000 : 0); // Simulate timeout after 2 calls
      });

      mockRequest.mockResolvedValueOnce({ task_id: 'timeout-task' });

      await expect(
        videoService.generateTextToVideo({ prompt: 'test', async: false })
      ).rejects.toThrow('视频生成超时');

      Date.now = originalDateNow;
      checkStatusSpy.mockRestore();
    }, 10000);
  });
});
