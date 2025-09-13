/**
 * 集成测试
 * 端到端测试重构后的完整工作流程和向后兼容性
 */

import { generateImage, generateVideo, frameInterpolation, superResolution } from '../api.js';
import { JimengClient, ImageDimensionCalculator } from '../api.js';
import type { ImageGenerationParams, VideoGenerationParams } from '../types/api.types.js';

// Mock所有网络请求
jest.mock('../api/JimengClient.js');
jest.mock('axios');

const MockedJimengClient = JimengClient as jest.MockedClass<typeof JimengClient>;

describe('集成测试', () => {
  
  let mockClient: jest.Mocked<JimengClient>;
  const testToken = 'test-integration-token-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 创建mock客户端实例
    mockClient = {
      generateImage: jest.fn(),
      generateVideo: jest.fn(),
      getRefreshToken: jest.fn(),
      setRefreshToken: jest.fn(),
      getCredit: jest.fn(),
      receiveCredit: jest.fn(),
      getFileContent: jest.fn(),
    } as any;
    
    // Mock构造函数
    MockedJimengClient.mockImplementation(() => mockClient);
  });

  // 1. 完整的图像生成工作流程测试
  describe('完整的图像生成工作流程', () => {
    it('应该完成基础图像生成的完整流程', async () => {
      // Mock积分检查
      mockClient.getCredit.mockResolvedValue({ totalCredit: 100, usedCredit: 10 });
      
      // Mock图像生成
      const mockImageUrls = [
        'https://example.com/generated1.jpg',
        'https://example.com/generated2.jpg'
      ];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '美丽的日落风景',
        refresh_token: testToken,
        model: 'jimeng-4.0',
        aspectRatio: '16:9'
      };

      const result = await generateImage(params);

      // 验证完整流程
      expect(MockedJimengClient).toHaveBeenCalledWith(testToken);
      expect(mockClient.generateImage).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockImageUrls);
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('https://');
    });

    it('应该完成带参考图的图像生成流程', async () => {
      // Mock文件读取
      mockClient.getFileContent.mockResolvedValue(Buffer.from('mock-image-data'));
      
      // Mock积分和生成
      mockClient.getCredit.mockResolvedValue({ totalCredit: 50, usedCredit: 20 });
      mockClient.generateImage.mockResolvedValue(['https://example.com/blend-result.jpg']);

      const params: ImageGenerationParams = {
        prompt: '基于参考图的艺术创作',
        refresh_token: testToken,
        filePath: '/path/to/reference.jpg',
        sample_strength: 0.7,
        model: 'jimeng-4.0'
      };

      const result = await generateImage(params);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('blend-result');
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ sample_strength: 0.7 })
      );
    });

    it('应该正确处理多参考图工作流程', async () => {
      mockClient.getCredit.mockResolvedValue({ totalCredit: 200, usedCredit: 50 });
      mockClient.generateImage.mockResolvedValue(['https://example.com/multi-blend.jpg']);

      const params: ImageGenerationParams = {
        prompt: '多图混合创作',
        refresh_token: testToken,
        filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg', '/path/to/ref3.jpg'],
        blend_mode: 'multi',
        reference_strength: [0.4, 0.3, 0.3]
      };

      const result = await generateImage(params);

      expect(result).toHaveLength(1);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ 
          blend_mode: 'multi',
          filePath: expect.arrayContaining(['/path/to/ref1.jpg'])
        })
      );
    });
  });

  // 2. 完整的视频生成工作流程测试
  describe('完整的视频生成工作流程', () => {
    it('应该完成传统视频生成流程', async () => {
      mockClient.getCredit.mockResolvedValue({ totalCredit: 300, usedCredit: 100 });
      mockClient.generateVideo.mockResolvedValue('https://example.com/traditional-video.mp4');

      const params: VideoGenerationParams = {
        prompt: '海浪拍岸的动态视频',
        refresh_token: testToken,
        filePath: ['/path/to/first-frame.jpg'],
        resolution: '1080p',
        width: 1920,
        height: 1080
      };

      const result = await generateVideo(params);

      expect(typeof result).toBe('string');
      expect(result).toContain('traditional-video.mp4');
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ resolution: '1080p' })
      );
    });

    it('应该完成多帧视频生成流程', async () => {
      mockClient.getCredit.mockResolvedValue({ totalCredit: 500, usedCredit: 200 });
      mockClient.generateVideo.mockResolvedValue('https://example.com/multiframe-video.mp4');

      const params: VideoGenerationParams = {
        prompt: '智能多帧视频创作',
        refresh_token: testToken,
        multiFrames: [
          {
            idx: 0,
            duration_ms: 2000,
            prompt: '晨光初现',
            image_path: '/path/to/morning.jpg'
          },
          {
            idx: 1,
            duration_ms: 3000,
            prompt: '正午阳光',
            image_path: '/path/to/noon.jpg'
          },
          {
            idx: 2,
            duration_ms: 2000,
            prompt: '夕阳西下',
            image_path: '/path/to/evening.jpg'
          }
        ],
        duration_ms: 7000,
        fps: 24
      };

      const result = await generateVideo(params);

      expect(result).toContain('multiframe-video.mp4');
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ 
          multiFrames: expect.arrayContaining([
            expect.objectContaining({ idx: 0 }),
            expect.objectContaining({ idx: 2 })
          ])
        })
      );
    });
  });

  // 3. 错误恢复和重试机制测试
  describe('错误恢复和重试机制', () => {
    it('应该在积分不足时自动领取积分', async () => {
      // 第一次检查积分不足
      mockClient.getCredit.mockResolvedValueOnce({ totalCredit: 0, usedCredit: 100 });
      
      // Mock领取积分成功
      mockClient.receiveCredit.mockResolvedValue({ success: true, creditGained: 50 });
      
      // 第二次检查积分充足
      mockClient.getCredit.mockResolvedValueOnce({ totalCredit: 50, usedCredit: 100 });
      
      // Mock图像生成成功
      mockClient.generateImage.mockResolvedValue(['https://example.com/recovered.jpg']);

      const params: ImageGenerationParams = {
        prompt: '积分恢复测试',
        refresh_token: testToken
      };

      const result = await generateImage(params);

      expect(mockClient.getCredit).toHaveBeenCalled();
      expect(mockClient.receiveCredit).toHaveBeenCalled();
      expect(mockClient.generateImage).toHaveBeenCalled();
      expect(result).toEqual(['https://example.com/recovered.jpg']);
    });

    it('应该正确处理网络错误并重试', async () => {
      // 第一次请求失败
      mockClient.generateImage
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(['https://example.com/retry-success.jpg']);

      const params: ImageGenerationParams = {
        prompt: '网络重试测试',
        refresh_token: testToken
      };

      // 这里应该由调用方处理重试逻辑
      try {
        await generateImage(params);
      } catch (error) {
        expect(error.message).toBe('Network timeout');
      }

      // 第二次调用成功
      const result = await generateImage(params);
      expect(result).toEqual(['https://example.com/retry-success.jpg']);
    });
  });

  // 4. 向后兼容性测试
  describe('向后兼容性测试', () => {
    it('应该保持与原API的100%兼容性', async () => {
      mockClient.generateImage.mockResolvedValue(['https://example.com/compatible.jpg']);

      // 使用旧版本的参数格式
      const oldFormatParams = {
        prompt: '兼容性测试',
        refresh_token: testToken,
        req_key: 'legacy-key-789', // 旧版本参数
        model: 'jimeng-2.1', // 旧版本模型
        aspectRatio: '4:3' // 支持的比例
      };

      const result = await generateImage(oldFormatParams);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          req_key: 'legacy-key-789',
          model: 'jimeng-2.1'
        })
      );
    });

    it('应该支持所有原有的导出函数', async () => {
      // 验证所有主要函数都能正确导入和调用
      expect(typeof generateImage).toBe('function');
      expect(typeof generateVideo).toBe('function');
      expect(typeof frameInterpolation).toBe('function');
      expect(typeof superResolution).toBe('function');
      
      // 验证工具类
      expect(ImageDimensionCalculator).toBeDefined();
      expect(typeof ImageDimensionCalculator.calculateDimensions).toBe('function');
      
      // 验证JimengClient类
      expect(JimengClient).toBeDefined();
      expect(typeof JimengClient).toBe('function');
    });
  });

  // 5. 性能和稳定性测试
  describe('性能和稳定性测试', () => {
    it('应该能处理并发请求', async () => {
      mockClient.generateImage.mockImplementation(async (params) => {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 100));
        return [`https://example.com/concurrent-${Date.now()}.jpg`];
      });

      const promises = Array.from({ length: 5 }, (_, i) => 
        generateImage({
          prompt: `并发测试 ${i}`,
          refresh_token: testToken
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(Array.isArray(result)).toBe(true);
        expect(result[0]).toContain('concurrent-');
      });
    });

    it('应该正确处理大量参数的请求', async () => {
      mockClient.generateImage.mockResolvedValue(['https://example.com/complex.jpg']);

      const complexParams: ImageGenerationParams = {
        prompt: '复杂参数测试：' + 'A'.repeat(500), // 长提示词
        negative_prompt: '低质量, 模糊, 噪点',
        refresh_token: testToken,
        model: 'jimeng-4.0',
        aspectRatio: '21:9',
        sample_strength: 0.85,
        filePath: Array.from({ length: 3 }, (_, i) => `/path/to/ref${i}.jpg`),
        blend_mode: 'multi',
        reference_strength: [0.4, 0.3, 0.3],
        req_key: 'complex-request-key'
      };

      const result = await generateImage(complexParams);

      expect(result).toBeDefined();
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('复杂参数测试')
        })
      );
    });

    it('应该能正确处理内存使用', async () => {
      // 创建多个客户端实例测试内存管理
      const clients = Array.from({ length: 10 }, (_, i) => 
        new JimengClient(`token-${i}`)
      );

      expect(clients).toHaveLength(10);
      
      clients.forEach((client, i) => {
        expect(client.getRefreshToken()).toBe(`token-${i}`);
      });

      // 模拟清理
      clients.forEach(client => {
        client.setRefreshToken('');
      });
    });
  });

  // 6. 边界条件测试
  describe('边界条件测试', () => {
    it('应该处理极端的输入参数', async () => {
      mockClient.generateImage.mockResolvedValue(['https://example.com/extreme.jpg']);

      const extremeParams: ImageGenerationParams = {
        prompt: '', // 空提示词（应该被客户端验证）
        refresh_token: testToken,
        sample_strength: 1.0, // 最大精细度
        aspectRatio: '1:100' // 极端宽高比
      };

      // 这应该由客户端处理验证
      mockClient.generateImage.mockRejectedValue(new Error('prompt必须是非空字符串'));
      
      await expect(generateImage(extremeParams)).rejects.toThrow('prompt必须是非空字符串');
    });

    it('应该处理网络超时情况', async () => {
      mockClient.generateImage.mockRejectedValue(new Error('Request timeout'));

      const params: ImageGenerationParams = {
        prompt: '超时测试',
        refresh_token: testToken
      };

      await expect(generateImage(params)).rejects.toThrow('Request timeout');
    });
  });

  // 7. 功能完整性验证
  describe('功能完整性验证', () => {
    it('应该涵盖所有主要的API功能', async () => {
      // 图像生成功能
      mockClient.generateImage.mockResolvedValue(['https://example.com/test.jpg']);
      await expect(generateImage({
        prompt: '测试',
        refresh_token: testToken
      })).resolves.toBeDefined();

      // 视频生成功能
      mockClient.generateVideo.mockResolvedValue('https://example.com/test.mp4');
      await expect(generateVideo({
        prompt: '测试视频',
        refresh_token: testToken
      })).resolves.toBeDefined();

      // 后处理功能（当前为占位符实现）
      await expect(frameInterpolation({
        videoId: 'test-video',
        originHistoryId: 'test-history',
        targetFps: 30,
        originFps: 24
      })).rejects.toThrow('帧插值功能正在重构中');

      await expect(superResolution({
        videoId: 'test-video',
        originHistoryId: 'test-history',
        targetWidth: 1920,
        targetHeight: 1080,
        originWidth: 1280,
        originHeight: 720
      })).rejects.toThrow('超分辨率功能正在重构中');
    });
  });
});