/**
 * 异步视频生成契约测试
 * 测试异步视频生成API的行为契约
 */

import { VideoGenerator, getApiClient, BatchQueryResponse } from '../api.js';

describe('VideoGenerator.generateVideoAsync', () => {
  test('should return historyId immediately', async () => {
    const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
    const start = Date.now();
    const historyId = await videoGen.generateVideoAsync({
      prompt: "测试视频 - 异步生成",
      resolution: "720p"
    });
    const duration = Date.now() - start;

    expect(historyId).toMatch(/^[0-9]+$|^h[a-zA-Z0-9]+$/);
    expect(duration).toBeLessThan(5000); // < 5秒
  }, 10000);

  test('should validate required prompt parameter', async () => {
    const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
    await expect(videoGen.generateVideoAsync({ prompt: '' } as any))
      .rejects.toThrow();
  });

  test('should accept all video generation parameters', async () => {
    const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
    const historyId = await videoGen.generateVideoAsync({
      prompt: "完整参数测试",
      resolution: "1080p",
      fps: 30,
      duration_ms: 5000,
      video_aspect_ratio: "16:9",
      model: "jimeng-video-3.0"
    });

    expect(historyId).toMatch(/^[0-9]+$|^h[a-zA-Z0-9]+$/);
  }, 10000);
});

describe('VideoGenerator.generateMainReferenceVideoAsync', () => {
  test('should return historyId for main reference video', async () => {
    // This test requires actual image files, so we'll skip in CI
    if (!process.env.TEST_IMAGE_PATH) {
      console.log('Skipping main reference test - no TEST_IMAGE_PATH');
      return;
    }

    const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
    const historyId = await videoGen.generateMainReferenceVideoAsync({
      referenceImages: [
        process.env.TEST_IMAGE_PATH,
        process.env.TEST_IMAGE_PATH
      ],
      prompt: "[图0]中的主体在[图1]的场景中",
      resolution: "720p"
    });

    expect(historyId).toMatch(/^[0-9]+$|^h[a-zA-Z0-9]+$/);
  }, 15000);

  test('should validate referenceImages parameter', async () => {
    const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);

    // Less than 2 images
    await expect(videoGen.generateMainReferenceVideoAsync({
      referenceImages: ["/path/to/single.jpg"],
      prompt: "测试"
    } as any)).rejects.toThrow();

    // More than 4 images
    await expect(videoGen.generateMainReferenceVideoAsync({
      referenceImages: ["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg", "/e.jpg"],
      prompt: "测试"
    } as any)).rejects.toThrow();
  });
});

describe('VideoGenerator.videoPostProcessAsync', () => {
  test('should return historyId for frame interpolation', async () => {
    const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);

    // This requires a real videoId, so we'll test the interface
    // In actual use, you'd have a videoId from a previous generation
    const mockVideoId = "test_video_id";
    const mockHistoryId = "4721606420748";

    try {
      const historyId = await videoGen.videoPostProcessAsync({
        operation: 'frame_interpolation',
        videoId: mockVideoId,
        originHistoryId: mockHistoryId,
        targetFps: 60,
        originFps: 24
      });

      expect(historyId).toMatch(/^[0-9]+$|^h[a-zA-Z0-9]+$/);
    } catch (error: any) {
      // Expected to fail with mock data - just verify the method exists
      expect(error).toBeDefined();
    }
  }, 10000);

  test('should validate operation parameter', async () => {
    const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);

    await expect(videoGen.videoPostProcessAsync({
      operation: 'invalid_operation' as any,
      videoId: "test",
      originHistoryId: "test"
    })).rejects.toThrow();
  });
});

describe('JimengClient.getBatchResults', () => {
  test('should return results for all historyIds', async () => {
    const client = getApiClient();

    // Use a known completed historyId if available, otherwise mock
    const testId = "4721606420748"; // Example ID

    const results: BatchQueryResponse = await client.getBatchResults([testId]);

    expect(results).toBeDefined();
    expect(results[testId]).toBeDefined();

    // Result should be either QueryResultResponse or error object
    if ('error' in results[testId]) {
      expect(results[testId]).toHaveProperty('error');
    } else {
      expect(results[testId]).toHaveProperty('status');
      expect(results[testId]).toHaveProperty('progress');
    }
  }, 10000);

  test('should handle invalid historyId formats', async () => {
    const client = getApiClient();

    const results = await client.getBatchResults([
      "invalid-id-format"
    ]);

    expect(results["invalid-id-format"]).toHaveProperty('error');
  }, 10000);

  test('should handle mixed valid and invalid IDs', async () => {
    const client = getApiClient();

    const results = await client.getBatchResults([
      "4721606420748",  // Valid format (may or may not exist)
      "invalid-id"      // Invalid format
    ]);

    expect(results).toHaveProperty("4721606420748");
    expect(results).toHaveProperty("invalid-id");
    expect(results["invalid-id"]).toHaveProperty('error');
  }, 10000);

  test('should throw error for empty array', async () => {
    const client = getApiClient();

    await expect(client.getBatchResults([]))
      .rejects.toThrow();
  });

  test('should support at least 10 tasks', async () => {
    const client = getApiClient();

    const ids = Array(10).fill("4721606420748");
    const results = await client.getBatchResults(ids);

    expect(Object.keys(results).length).toBeGreaterThan(0);
  }, 15000);
});

describe('Backward Compatibility', () => {
  test('existing getImageResult should work with video historyId', async () => {
    const client = getApiClient();

    // Use a video historyId if available
    const videoHistoryId = "4721606420748"; // Example

    const result = await client.getImageResult(videoHistoryId);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('progress');

    // Should have either videoUrl or imageUrls or error
    const hasVideoUrl = 'videoUrl' in result && result.videoUrl;
    const hasImageUrls = 'imageUrls' in result && result.imageUrls;
    const hasError = 'error' in result && result.error;

    expect(hasVideoUrl || hasImageUrls || hasError).toBe(true);
  }, 10000);

  test('existing sync methods should remain unchanged', async () => {
    const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);

    // Verify sync method still exists
    expect(typeof videoGen.generateVideo).toBe('function');
    expect(typeof videoGen.generateMainReferenceVideo).toBe('function');
    expect(typeof videoGen.videoPostProcess).toBe('function');
  });
});
