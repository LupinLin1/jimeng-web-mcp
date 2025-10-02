import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "@jest/globals";

/**
 * 向后兼容性测试
 * 确保新的异步功能不会破坏现有的同步模式，保证所有现有代码继续正常工作
 */

import { generateImage, generateImageAsync, getImageResult } from '../api';
import { JimengClient } from '../api/JimengClient';
import type { ImageGenerationParams } from '../types/api.types';

// Mock JimengClient以避免实际API调用
jest.mock('../api/JimengClient');
const MockedJimengClient = JimengClient as jest.MockedClass<typeof JimengClient>;

describe('向后兼容性测试', () => {
  
  let mockClient: jest.Mocked<JimengClient>;
  
  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    
    // 创建mock客户端实例
    mockClient = {
      generateImage: jest.fn(),
      generateImageAsync: jest.fn(),
      getImageResult: jest.fn(),
      getRefreshToken: jest.fn(),
    } as any;
    
    // Mock构造函数返回mock实例
    MockedJimengClient.mockImplementation(() => mockClient);
  });

  // ============== 1. 现有同步API完全兼容性 ==============
  describe('现有同步API完全兼容性', () => {
    it('原有generateImage调用应该完全不受影响', async () => {
      const mockImageUrls = [
        'https://example.com/legacy_image1.jpg',
        'https://example.com/legacy_image2.jpg'
      ];
      mockClient.generateImage.mockResolvedValue(mockImageUrls);

      // 使用完全相同的原有调用方式
      const legacyParams: ImageGenerationParams = {
        prompt: '传统API调用测试',
        refresh_token: 'legacy-token-123',
        model: 'jimeng-4.0'
      };

      const result = await generateImage(legacyParams);

      // 验证行为完全一致
      expect(MockedJimengClient).toHaveBeenCalledWith('legacy-token-123');
      expect(mockClient.generateImage).toHaveBeenCalledWith(legacyParams);
      expect(result).toEqual(mockImageUrls);
      expect(Array.isArray(result)).toBe(true);
      expect(result.every(url => typeof url === 'string')).toBe(true);

      // 确保没有调用新的异步方法
      expect(mockClient.generateImageAsync).not.toHaveBeenCalled();
    });

    it('所有原有参数组合应该继续正常工作', async () => {
      const legacyParamCombinations = [
        // 基础参数
        {
          prompt: '基础测试',
          refresh_token: 'test-token'
        },
        // 完整参数（旧格式）
        {
          prompt: '完整参数测试',
          refresh_token: 'test-token',
          model: 'jimeng-3.0',
          aspectRatio: '16:9',
          negative_prompt: '模糊, 低质量'
        },
        // 带参考图参数
        {
          prompt: '参考图测试',
          refresh_token: 'test-token',
          filePath: ['/path/to/reference.jpg'],
          sample_strength: 0.7
        },
        // 多参考图参数
        {
          prompt: '多参考图测试',
          refresh_token: 'test-token',
          filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg'],
          reference_strength: [0.6, 0.4]
        },
        // 兼容性参数
        {
          prompt: '兼容性测试',
          refresh_token: 'test-token',
          req_key: 'legacy-req-key-123'
        }
      ];

      for (const [index, params] of legacyParamCombinations.entries()) {
        const mockResult = [`https://example.com/legacy_${index}.jpg`];
        mockClient.generateImage.mockResolvedValueOnce(mockResult);

        const result = await generateImage(params);

        expect(mockClient.generateImage).toHaveBeenCalledWith(params);
        expect(result).toEqual(mockResult);
      }

      expect(mockClient.generateImage).toHaveBeenCalledTimes(legacyParamCombinations.length);
    });

    it('原有错误处理机制应该保持不变', async () => {
      const legacyErrors = [
        new Error('prompt必须是非空字符串'),
        new Error('认证失败'),
        new Error('网络连接失败'),
        new Error('积分不足'),
        new Error('文件上传失败')
      ];

      for (const error of legacyErrors) {
        mockClient.generateImage.mockRejectedValueOnce(error);

        await expect(generateImage({
          prompt: '错误测试',
          refresh_token: 'test-token'
        })).rejects.toThrow(error.message);
      }
    });
  });

  // ============== 2. 客户端实例管理兼容性 ==============
  describe('客户端实例管理兼容性', () => {
    it('现有代码的客户端实例创建逻辑应该不变', async () => {
      const token = 'consistency-test-token';
      mockClient.generateImage.mockResolvedValue(['https://example.com/consistency.jpg']);

      // 第一次调用
      await generateImage({
        prompt: '一致性测试1',
        refresh_token: token
      });

      // 第二次调用（应该复用同一个客户端实例）
      await generateImage({
        prompt: '一致性测试2',
        refresh_token: token
      });

      // 验证客户端实例只创建一次
      expect(MockedJimengClient).toHaveBeenCalledTimes(1);
      expect(MockedJimengClient).toHaveBeenCalledWith(token);
      expect(mockClient.generateImage).toHaveBeenCalledTimes(2);
    });

    it('不同token应该创建不同的客户端实例（保持原逻辑）', async () => {
      mockClient.generateImage.mockResolvedValue(['https://example.com/token_isolation.jpg']);

      // 使用第一个token
      await generateImage({
        prompt: '隔离测试1',
        refresh_token: 'token1'
      });

      // 使用第二个token
      await generateImage({
        prompt: '隔离测试2',
        refresh_token: 'token2'
      });

      // 验证创建了两个不同的客户端实例
      expect(MockedJimengClient).toHaveBeenCalledTimes(2);
      expect(MockedJimengClient).toHaveBeenNthCalledWith(1, 'token1');
      expect(MockedJimengClient).toHaveBeenNthCalledWith(2, 'token2');
    });
  });

  // ============== 3. 新功能不影响现有功能 ==============
  describe('新功能不影响现有功能', () => {
    it('添加异步方法后，同步方法的性能和行为应该不变', async () => {
      const startTime = Date.now();
      
      mockClient.generateImage.mockResolvedValue(['https://example.com/performance.jpg']);

      await generateImage({
        prompt: '性能一致性测试',
        refresh_token: 'performance-token'
      });

      const elapsed = Date.now() - startTime;
      
      // 确保同步调用的性能没有退化（Mock调用应该很快）
      expect(elapsed).toBeLessThan(100);
      expect(mockClient.generateImage).toHaveBeenCalledTimes(1);
      
      // 确保没有意外调用异步方法
      expect(mockClient.generateImageAsync).not.toHaveBeenCalled();
      expect(mockClient.getImageResult).not.toHaveBeenCalled();
    });

    it('新的async参数不应该影响不使用它的调用', async () => {
      mockClient.generateImage.mockResolvedValue(['https://example.com/no_async_param.jpg']);

      const paramsWithoutAsync = {
        prompt: '不使用async参数',
        refresh_token: 'test-token',
        model: 'jimeng-4.0'
      };

      const result = await generateImage(paramsWithoutAsync);

      expect(result).toEqual(['https://example.com/no_async_param.jpg']);
      expect(mockClient.generateImage).toHaveBeenCalledWith(paramsWithoutAsync);
      
      // 验证传递的参数中没有async字段
      const calledParams = mockClient.generateImage.mock.calls[0][0];
      expect(calledParams).not.toHaveProperty('async');
    });

    it('现有的TypeScript类型定义应该保持兼容', () => {
      // 验证现有的参数接口仍然有效
      const validLegacyParams: ImageGenerationParams = {
        prompt: 'TypeScript兼容性测试',
        refresh_token: 'type-test-token',
        model: 'jimeng-4.0',
        aspectRatio: '1:1',
        filePath: ['/path/to/image.jpg'],
        sample_strength: 0.5,
        negative_prompt: '模糊',
        req_key: 'legacy-key'
      };

      // 这些类型检查在编译时进行，运行时只验证值存在
      expect(validLegacyParams.prompt).toBeDefined();
      expect(validLegacyParams.refresh_token).toBeDefined();
      expect(typeof validLegacyParams.sample_strength).toBe('number');
      expect(typeof validLegacyParams.aspectRatio).toBe('string');
    });
  });

  // ============== 4. 混合使用场景测试 ==============
  describe('混合使用场景', () => {
    it('应该支持在同一应用中混合使用同步和异步调用', async () => {
      // 第一步：传统同步调用
      mockClient.generateImage.mockResolvedValueOnce(['https://example.com/sync_result.jpg']);
      
      const syncResult = await generateImage({
        prompt: '同步调用',
        refresh_token: 'mixed-token'
      });

      expect(syncResult).toEqual(['https://example.com/sync_result.jpg']);

      // 第二步：新的异步调用
      mockClient.generateImageAsync.mockResolvedValueOnce('h_mixed_async_123');
      
      const asyncHistoryId = await generateImageAsync({
        prompt: '异步调用',
        refresh_token: 'mixed-token'
      });

      expect(asyncHistoryId).toBe('h_mixed_async_123');

      // 第三步：查询异步结果
      mockClient.getImageResult.mockResolvedValueOnce({
        status: 'completed' as const,
        progress: 100,
        imageUrls: ['https://example.com/async_result.jpg']
      });

      const asyncResult = await getImageResult(asyncHistoryId, 'mixed-token');

      expect(asyncResult.status).toBe('completed');

      // 验证所有方法都被正确调用
      expect(mockClient.generateImage).toHaveBeenCalledTimes(1);
      expect(mockClient.generateImageAsync).toHaveBeenCalledTimes(1);
      expect(mockClient.getImageResult).toHaveBeenCalledTimes(1);
    });

    it('现有代码升级到异步模式应该是渐进式的', async () => {
      const baseParams = {
        prompt: '渐进式升级测试',
        refresh_token: 'upgrade-token',
        model: 'jimeng-4.0'
      };

      // 阶段1：现有同步代码
      mockClient.generateImage.mockResolvedValueOnce(['https://example.com/phase1.jpg']);
      const phase1Result = await generateImage(baseParams);
      expect(Array.isArray(phase1Result)).toBe(true);

      // 阶段2：逐步迁移到异步（添加async参数）
      const asyncParams = { ...baseParams, async: true };
      mockClient.generateImageAsync.mockResolvedValueOnce('h_phase2_123');
      const phase2Result = await generateImageAsync(asyncParams);
      expect(typeof phase2Result).toBe('string');

      // 阶段3：查询异步结果
      mockClient.getImageResult.mockResolvedValueOnce({
        status: 'completed' as const,
        progress: 100,
        imageUrls: ['https://example.com/phase3.jpg']
      });
      const phase3Result = await getImageResult(phase2Result, 'upgrade-token');
      expect(phase3Result.status).toBe('completed');

      // 验证迁移过程中没有破坏现有功能
      expect(mockClient.generateImage).toHaveBeenCalledWith(baseParams);
      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(asyncParams);
    });
  });

  // ============== 5. 错误处理向后兼容性 ==============
  describe('错误处理向后兼容性', () => {
    it('现有错误类型和消息格式应该保持一致', async () => {
      const legacyErrorScenarios = [
        {
          params: { prompt: '', refresh_token: 'test-token' },
          expectedError: 'prompt必须是非空字符串',
          mockError: new Error('prompt必须是非空字符串')
        },
        {
          params: { prompt: '测试' } as any, // 缺少refresh_token
          expectedError: 'refresh_token is required',
          mockError: null // 这个错误在API层抛出，不需要mock
        },
        {
          params: { prompt: '测试', refresh_token: 'invalid-token' },
          expectedError: '认证失败',
          mockError: new Error('认证失败')
        }
      ];

      for (const scenario of legacyErrorScenarios) {
        if (scenario.mockError) {
          mockClient.generateImage.mockRejectedValueOnce(scenario.mockError);
        }

        try {
          await generateImage(scenario.params);
          // 如果没有抛出错误，测试失败
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error.message).toContain(scenario.expectedError);
        }
      }
    });

    it('错误堆栈信息应该保持清晰和有用', async () => {
      const networkError = new Error('网络连接失败');
      networkError.stack = 'Error: 网络连接失败\n    at generateImage (api.js:123:45)';
      
      mockClient.generateImage.mockRejectedValue(networkError);

      try {
        await generateImage({
          prompt: '网络错误测试',
          refresh_token: 'test-token'
        });
      } catch (error: any) {
        expect(error.message).toBe('网络连接失败');
        expect(error.stack).toContain('generateImage');
      }
    });
  });

  // ============== 6. 环境变量和配置兼容性 ==============
  describe('环境变量和配置兼容性', () => {
    it('现有的环境变量配置应该继续工作', async () => {
      const originalEnv = process.env.JIMENG_API_TOKEN;
      process.env.JIMENG_API_TOKEN = 'env-compatibility-token';

      // 对于同步调用，环境变量不直接使用（需要在参数中指定）
      mockClient.generateImage.mockResolvedValue(['https://example.com/env_compat.jpg']);
      
      const result = await generateImage({
        prompt: '环境变量兼容性',
        refresh_token: process.env.JIMENG_API_TOKEN
      });

      expect(result).toEqual(['https://example.com/env_compat.jpg']);
      expect(MockedJimengClient).toHaveBeenCalledWith('env-compatibility-token');

      // 恢复环境变量
      process.env.JIMENG_API_TOKEN = originalEnv;
    });

    it('配置优先级应该保持一致', async () => {
      const explicitToken = 'explicit-priority-token';
      const envToken = 'env-priority-token';
      
      const originalEnv = process.env.JIMENG_API_TOKEN;
      process.env.JIMENG_API_TOKEN = envToken;

      mockClient.generateImage.mockResolvedValue(['https://example.com/priority.jpg']);

      // 显式提供的token应该优先于环境变量
      await generateImage({
        prompt: '优先级测试',
        refresh_token: explicitToken
      });

      expect(MockedJimengClient).toHaveBeenCalledWith(explicitToken);

      // 恢复环境变量
      process.env.JIMENG_API_TOKEN = originalEnv;
    });
  });

  // ============== 7. 文档和示例代码兼容性 ==============
  describe('文档和示例代码兼容性', () => {
    it('README中的基础示例应该继续工作', async () => {
      mockClient.generateImage.mockResolvedValue(['https://example.com/readme_example.jpg']);

      // 模拟README中的基础示例
      const result = await generateImage({
        prompt: '一只可爱的小猫咪',
        refresh_token: 'your-refresh-token-here'
      });

      expect(result).toEqual(['https://example.com/readme_example.jpg']);
      expect(result[0]).toMatch(/^https:\/\//);
    });

    it('高级用法示例应该保持有效', async () => {
      mockClient.generateImage.mockResolvedValue(['https://example.com/advanced_example.jpg']);

      // 模拟高级用法示例
      const advancedParams: ImageGenerationParams = {
        prompt: '夕阳下的海边，电影级画质',
        negative_prompt: '模糊, 低质量, 变形',
        refresh_token: 'your-token',
        model: 'jimeng-4.0',
        aspectRatio: '16:9',
        filePath: ['/path/to/reference.jpg'],
        sample_strength: 0.7
      };

      const result = await generateImage(advancedParams);

      expect(result).toEqual(['https://example.com/advanced_example.jpg']);
      expect(mockClient.generateImage).toHaveBeenCalledWith(advancedParams);
    });

    it('TypeScript用法示例应该保持类型安全', async () => {
      mockClient.generateImage.mockResolvedValue(['https://example.com/typescript_example.jpg']);

      // 模拟TypeScript示例
      const params: ImageGenerationParams = {
        prompt: 'TypeScript示例',
        refresh_token: 'typed-token'
      };

      const result: string[] = await generateImage(params);

      expect(Array.isArray(result)).toBe(true);
      expect(result.every(url => typeof url === 'string')).toBe(true);
    });
  });
});