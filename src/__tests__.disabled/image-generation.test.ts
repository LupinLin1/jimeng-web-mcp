import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "@jest/globals";

/**
 * 图像生成功能测试
 * 测试重构后的图像生成API功能，使用Mock避免实际网络请求
 */

import { generateImage, ImageDimensionCalculator } from '../api.js';
import { JimengClient } from '../api/JimengClient.js';
import type { ImageGenerationParams } from '../types/api.types.js';

// Mock JimengClient以避免实际API调用
jest.mock('../api/JimengClient.js');
const MockedJimengClient = JimengClient as jest.MockedClass<typeof JimengClient>;

describe('图像生成功能测试', () => {
  
  let mockClient: jest.Mocked<JimengClient>;
  
  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    
    // 创建mock客户端实例
    mockClient = {
      generateImage: jest.fn(),
      getRefreshToken: jest.fn(),
    } as any;
    
    // Mock构造函数返回mock实例
    MockedJimengClient.mockImplementation(() => mockClient);
  });

  // 1. 基础图像生成测试
  describe('基础图像生成', () => {
    it('应该成功生成基础图像', async () => {
      const mockImageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '美丽的风景画',
        refresh_token: 'test-token-123',
        model: 'jimeng-4.0'
      };

      const result = await generateImage(params);

      expect(MockedJimengClient).toHaveBeenCalledWith('test-token-123');
      expect(mockClient.generateImage).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockImageUrls);
    });

    it('应该在缺少refresh_token时抛出错误', async () => {
      const params: ImageGenerationParams = {
        prompt: '美丽的风景画'
      } as any; // 故意缺少refresh_token

      await expect(generateImage(params)).rejects.toThrow('refresh_token is required');
      expect(MockedJimengClient).not.toHaveBeenCalled();
    });

    it('应该在缺少prompt时由客户端处理错误', async () => {
      mockClient.generateImage.mockRejectedValue(new Error('prompt必须是非空字符串'));

      const params: ImageGenerationParams = {
        prompt: '',
        refresh_token: 'test-token-123'
      };

      await expect(generateImage(params)).rejects.toThrow('prompt必须是非空字符串');
    });
  });

  // 2. 不同模型测试
  describe('不同模型支持', () => {
    it('应该支持jimeng-4.0模型', async () => {
      const mockImageUrls = ['https://example.com/image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '测试图像',
        refresh_token: 'test-token',
        model: 'jimeng-4.0'
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'jimeng-4.0' })
      );
    });

    it('应该支持jimeng-3.0模型', async () => {
      const mockImageUrls = ['https://example.com/image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '测试图像',
        refresh_token: 'test-token',
        model: 'jimeng-3.0'
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'jimeng-3.0' })
      );
    });

    it('应该支持未指定模型时使用默认模型', async () => {
      const mockImageUrls = ['https://example.com/image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '测试图像',
        refresh_token: 'test-token'
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(params);
    });
  });

  // 3. 宽高比和尺寸测试
  describe('宽高比和尺寸设置', () => {
    it('应该支持16:9宽高比', async () => {
      const mockImageUrls = ['https://example.com/image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '16:9的图像',
        refresh_token: 'test-token',
        aspectRatio: '16:9'
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ aspectRatio: '16:9' })
      );
    });

    it('应该支持1:1正方形宽高比', async () => {
      const mockImageUrls = ['https://example.com/image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '正方形图像',
        refresh_token: 'test-token',
        aspectRatio: '1:1'
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ aspectRatio: '1:1' })
      );
    });
  });

  // 4. 参考图像功能测试
  describe('参考图像功能', () => {
    it('应该支持单个参考图像', async () => {
      const mockImageUrls = ['https://example.com/generated.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '基于参考图的生成',
        refresh_token: 'test-token',
        filePath: ['/path/to/reference.jpg'],
        sample_strength: 0.7
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: ['/path/to/reference.jpg'],
          sample_strength: 0.7
        })
      );
    });

    it('应该支持多个参考图像', async () => {
      const mockImageUrls = ['https://example.com/generated.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '基于多个参考图的生成',
        refresh_token: 'test-token',
        filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg'],
        sample_strength: 0.6
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ 
          filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg'],
          sample_strength: 0.6
        })
      );
    });
  });

  // 5. 高级参数测试
  describe('高级参数设置', () => {
    it('应该支持负向提示词', async () => {
      const mockImageUrls = ['https://example.com/image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '漂亮的风景',
        negative_prompt: '模糊, 低质量',
        refresh_token: 'test-token'
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ negative_prompt: '模糊, 低质量' })
      );
    });

    it('应该支持自定义精细度', async () => {
      const mockImageUrls = ['https://example.com/image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '高精细度图像',
        refresh_token: 'test-token',
        sample_strength: 0.8
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ sample_strength: 0.8 })
      );
    });

    it('应该支持blend模式参数', async () => {
      const mockImageUrls = ['https://example.com/blended.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '混合模式图像',
        refresh_token: 'test-token',
        filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg'],
        blend_mode: 'multi',
        reference_strength: [0.6, 0.4]
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ 
          blend_mode: 'multi',
          reference_strength: [0.6, 0.4]
        })
      );
    });
  });

  // 6. 错误处理测试
  describe('错误处理', () => {
    it('应该正确处理客户端生成错误', async () => {
      const errorMessage = '生成图像时发生错误';
      mockClient.generateImage.mockRejectedValue(new Error(errorMessage));

      const params: ImageGenerationParams = {
        prompt: '测试图像',
        refresh_token: 'test-token'
      };

      await expect(generateImage(params)).rejects.toThrow(errorMessage);
    });

    it('应该正确处理网络错误', async () => {
      mockClient.generateImage.mockRejectedValue(new Error('网络连接失败'));

      const params: ImageGenerationParams = {
        prompt: '测试图像',
        refresh_token: 'test-token'
      };

      await expect(generateImage(params)).rejects.toThrow('网络连接失败');
    });

    it('应该正确处理认证错误', async () => {
      mockClient.generateImage.mockRejectedValue(new Error('认证失败'));

      const params: ImageGenerationParams = {
        prompt: '测试图像',
        refresh_token: 'invalid-token'
      };

      await expect(generateImage(params)).rejects.toThrow('认证失败');
    });
  });

  // 7. 兼容性测试
  describe('向后兼容性', () => {
    it('应该支持旧版本的req_key参数', async () => {
      const mockImageUrls = ['https://example.com/image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      const params: ImageGenerationParams = {
        prompt: '兼容性测试',
        refresh_token: 'test-token',
        req_key: 'legacy-key-123'
      };

      await generateImage(params);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ req_key: 'legacy-key-123' })
      );
    });
  });
});