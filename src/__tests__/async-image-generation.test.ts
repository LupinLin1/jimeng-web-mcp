import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "@jest/globals";

/**
 * 异步图像生成核心功能测试
 * 测试异步图像生成的基础功能、参数验证、错误处理和边界条件
 */

import { generateImageAsync, getImageResult } from '../api';
import { JimengClient } from '../api/JimengClient';
import type { ImageGenerationParams } from '../types/api.types';

// Mock JimengClient以避免实际API调用
jest.mock('../api/JimengClient');
const MockedJimengClient = JimengClient as jest.MockedClass<typeof JimengClient>;

describe('异步图像生成核心功能测试', () => {
  
  let mockClient: jest.Mocked<JimengClient>;
  
  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    
    // 创建mock客户端实例
    mockClient = {
      generateImageAsync: jest.fn(),
      getImageResult: jest.fn(),
      getRefreshToken: jest.fn(),
    } as any;
    
    // Mock构造函数返回mock实例
    MockedJimengClient.mockImplementation(() => mockClient);
  });

  // ============== 1. 基础异步图像生成测试 ==============
  describe('基础异步图像生成', () => {
    it('应该成功发起异步图像生成并返回historyId', async () => {
      const mockHistoryId = 'h1234567890abcdef';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '美丽的风景画',
        refresh_token: 'test-token-123',
        model: 'jimeng-4.0'
      };

      const result = await generateImageAsync(params);

      expect(MockedJimengClient).toHaveBeenCalledWith('test-token-123');
      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(params);
      expect(result).toBe(mockHistoryId);
      expect(typeof result).toBe('string');
    });

    it('应该在缺少refresh_token时抛出错误', async () => {
      const params: ImageGenerationParams = {
        prompt: '美丽的风景画'
      } as any; // 故意缺少refresh_token

      await expect(generateImageAsync(params)).rejects.toThrow('refresh_token is required');
      expect(MockedJimengClient).not.toHaveBeenCalled();
      expect(mockClient.generateImageAsync).not.toHaveBeenCalled();
    });

    it('应该在prompt为空时抛出错误', async () => {
      const params: ImageGenerationParams = {
        prompt: '',
        refresh_token: 'test-token-123'
      };

      mockClient.generateImageAsync.mockRejectedValue(new Error('prompt必须是非空字符串'));
      await expect(generateImageAsync(params)).rejects.toThrow('prompt必须是非空字符串');
    });

    it('应该支持带参考图像的异步生成', async () => {
      const mockHistoryId = 'h_with_ref_img_123';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '基于参考图的生成',
        refresh_token: 'test-token-123',
        filePath: ['/path/to/reference.jpg'],
        sample_strength: 0.7
      };

      const result = await generateImageAsync(params);

      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(
        expect.objectContaining({ 
          filePath: ['/path/to/reference.jpg'],
          sample_strength: 0.7
        })
      );
      expect(result).toBe(mockHistoryId);
    });
  });

  // ============== 2. 查询异步结果测试 ==============
  describe('查询异步生成结果', () => {
    it('应该成功查询完成状态的结果', async () => {
      const mockResult = {
        status: 'completed' as const,
        imageUrls: [
          'https://example.com/generated1.jpg',
          'https://example.com/generated2.jpg'
        ],
        progress: 100
      };
      mockClient.getImageResult.mockResolvedValue(mockResult);

      const historyId = 'h1234567890abcdef';
      const result = await getImageResult(historyId, 'test-token');

      expect(MockedJimengClient).toHaveBeenCalledWith('test-token');
      expect(mockClient.getImageResult).toHaveBeenCalledWith(historyId);
      expect(result).toEqual(mockResult);
      expect(result.status).toBe('completed');
      expect(result.imageUrls).toHaveLength(2);
    });

    it('应该成功查询进行中状态的结果', async () => {
      const mockResult = {
        status: 'pending' as const,
        progress: 65
      };
      mockClient.getImageResult.mockResolvedValue(mockResult);

      const historyId = 'h_pending_123';
      const result = await getImageResult(historyId, 'test-token');

      expect(result.status).toBe('pending');
      expect(result.progress).toBe(65);
      expect(result.imageUrls).toBeUndefined();
    });

    it('应该成功查询失败状态的结果', async () => {
      const mockResult = {
        status: 'failed' as const,
        progress: 0,
        error: '生成过程中发生错误：模型服务暂时不可用'
      };
      mockClient.getImageResult.mockResolvedValue(mockResult);

      const historyId = 'h_failed_123';
      const result = await getImageResult(historyId, 'test-token');

      expect(result.status).toBe('failed');
      expect(result.error).toContain('模型服务暂时不可用');
      expect(result.imageUrls).toBeUndefined();
    });

    it('应该从环境变量获取token当参数未提供时', async () => {
      const originalEnv = process.env.JIMENG_API_TOKEN;
      process.env.JIMENG_API_TOKEN = 'env-token-123';

      const mockResult = {
        status: 'completed' as const,
        progress: 100,
        imageUrls: ['https://example.com/generated.jpg']
      };
      mockClient.getImageResult.mockResolvedValue(mockResult);
      mockClient.getRefreshToken.mockReturnValue('env-token-123');

      const historyId = 'h_env_token_123';
      const result = await getImageResult(historyId);

      expect(MockedJimengClient).toHaveBeenCalledWith('env-token-123');
      expect(result.status).toBe('completed');

      // 恢复环境变量
      process.env.JIMENG_API_TOKEN = originalEnv;
    });

    it('应该在没有token时抛出错误', async () => {
      const originalEnv = process.env.JIMENG_API_TOKEN;
      delete process.env.JIMENG_API_TOKEN;

      const historyId = 'h_no_token_123';
      
      await expect(getImageResult(historyId)).rejects.toThrow(
        'Token is required. Provide token parameter or set JIMENG_API_TOKEN environment variable.'
      );

      expect(MockedJimengClient).not.toHaveBeenCalled();
      expect(mockClient.getImageResult).not.toHaveBeenCalled();

      // 恢复环境变量
      process.env.JIMENG_API_TOKEN = originalEnv;
    });
  });

  // ============== 3. 不同模型和参数测试 ==============
  describe('不同模型和参数支持', () => {
    it('应该支持不同AI模型的异步生成', async () => {
      const models = ['jimeng-4.0', 'jimeng-3.0', 'jimeng-2.1'];
      
      for (const model of models) {
        const mockHistoryId = `h_${model.replace('.', '_')}_123`;
        mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

        const params: ImageGenerationParams = {
          prompt: `测试${model}模型`,
          refresh_token: 'test-token',
          model: model
        };

        const result = await generateImageAsync(params);
        
        expect(mockClient.generateImageAsync).toHaveBeenCalledWith(
          expect.objectContaining({ model })
        );
        expect(result).toBe(mockHistoryId);
      }
    });

    it('应该支持不同宽高比的异步生成', async () => {
      const aspectRatios = ['1:1', '16:9', '9:16', '3:4', '4:3'];
      
      for (const aspectRatio of aspectRatios) {
        const mockHistoryId = `h_${aspectRatio.replace(':', '_')}_123`;
        mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

        const params: ImageGenerationParams = {
          prompt: `${aspectRatio}宽高比图像`,
          refresh_token: 'test-token',
          aspectRatio: aspectRatio
        };

        const result = await generateImageAsync(params);
        
        expect(mockClient.generateImageAsync).toHaveBeenCalledWith(
          expect.objectContaining({ aspectRatio })
        );
        expect(result).toBe(mockHistoryId);
      }
    });

    it('应该支持多参考图像的异步生成', async () => {
      const mockHistoryId = 'h_multi_ref_123';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '多参考图混合生成',
        refresh_token: 'test-token',
        filePath: [
          '/path/to/ref1.jpg',
          '/path/to/ref2.jpg', 
          '/path/to/ref3.jpg'
        ],
        reference_strength: [0.5, 0.3, 0.2]
      };

      const result = await generateImageAsync(params);

      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(
        expect.objectContaining({ 
          filePath: expect.arrayContaining(['/path/to/ref1.jpg', '/path/to/ref2.jpg', '/path/to/ref3.jpg']),
          reference_strength: [0.5, 0.3, 0.2]
        })
      );
      expect(result).toBe(mockHistoryId);
    });
  });

  // ============== 4. 错误处理和边界条件 ==============
  describe('错误处理和边界条件', () => {
    it('应该正确处理异步生成API错误', async () => {
      const apiError = new Error('API调用失败：服务器暂时不可用');
      mockClient.generateImageAsync.mockRejectedValue(apiError);

      const params: ImageGenerationParams = {
        prompt: '测试错误处理',
        refresh_token: 'test-token'
      };

      await expect(generateImageAsync(params)).rejects.toThrow('API调用失败：服务器暂时不可用');
    });

    it('应该正确处理查询结果API错误', async () => {
      const apiError = new Error('查询失败：historyId不存在');
      mockClient.getImageResult.mockRejectedValue(apiError);

      const historyId = 'invalid_history_id';
      
      await expect(getImageResult(historyId, 'test-token')).rejects.toThrow('查询失败：historyId不存在');
    });

    it('应该正确处理网络超时错误', async () => {
      const timeoutError = new Error('网络请求超时');
      mockClient.generateImageAsync.mockRejectedValue(timeoutError);

      const params: ImageGenerationParams = {
        prompt: '网络超时测试',
        refresh_token: 'test-token'
      };

      await expect(generateImageAsync(params)).rejects.toThrow('网络请求超时');
    });

    it('应该正确处理无效historyId', async () => {
      const invalidIdError = new Error('无效的historyId格式');
      mockClient.getImageResult.mockRejectedValue(invalidIdError);

      const invalidHistoryId = '';
      
      await expect(getImageResult(invalidHistoryId, 'test-token')).rejects.toThrow('无效的historyId格式');
    });

    it('应该正确处理认证失败', async () => {
      const authError = new Error('认证失败：refresh_token已过期');
      mockClient.generateImageAsync.mockRejectedValue(authError);

      const params: ImageGenerationParams = {
        prompt: '认证测试',
        refresh_token: 'expired-token'
      };

      await expect(generateImageAsync(params)).rejects.toThrow('认证失败：refresh_token已过期');
    });
  });

  // ============== 5. 高级功能测试 ==============
  describe('高级功能测试', () => {
    it('应该支持负向提示词的异步生成', async () => {
      const mockHistoryId = 'h_negative_prompt_123';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '美丽的风景',
        negative_prompt: '模糊, 低质量, 变形',
        refresh_token: 'test-token'
      };

      const result = await generateImageAsync(params);

      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(
        expect.objectContaining({ negative_prompt: '模糊, 低质量, 变形' })
      );
      expect(result).toBe(mockHistoryId);
    });

    it('应该支持自定义采样强度', async () => {
      const mockHistoryId = 'h_custom_strength_123';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '精细控制测试',
        refresh_token: 'test-token',
        filePath: ['/path/to/reference.jpg'],
        sample_strength: 0.8
      };

      const result = await generateImageAsync(params);

      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sample_strength: 0.8 })
      );
      expect(result).toBe(mockHistoryId);
    });

    it('应该支持兼容性参数req_key', async () => {
      const mockHistoryId = 'h_legacy_123';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '兼容性测试',
        refresh_token: 'test-token',
        req_key: 'legacy-key-123'
      };

      const result = await generateImageAsync(params);

      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(
        expect.objectContaining({ req_key: 'legacy-key-123' })
      );
      expect(result).toBe(mockHistoryId);
    });
  });

  // ============== 6. 类型安全测试 ==============
  describe('类型安全验证', () => {
    it('generateImageAsync应该返回string类型', async () => {
      const mockHistoryId = 'h_type_test_123';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '类型测试',
        refresh_token: 'test-token'
      };

      const result = await generateImageAsync(params);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('getImageResult应该返回正确的结果类型', async () => {
      const mockResult = {
        status: 'completed' as const,
        imageUrls: ['https://example.com/image.jpg'],
        progress: 100
      };
      mockClient.getImageResult.mockResolvedValue(mockResult);

      const result = await getImageResult('h123', 'test-token');
      
      expect(result).toHaveProperty('status');
      expect(['pending', 'completed', 'failed']).toContain(result.status);
      
      if (result.status === 'completed') {
        expect(result.imageUrls).toBeDefined();
        expect(Array.isArray(result.imageUrls)).toBe(true);
      }
      
      if (result.status === 'failed') {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });
  });
});