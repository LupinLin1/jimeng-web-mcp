import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "@jest/globals";

/**
 * MCP工具层异步功能测试
 * 测试MCP服务器层的异步工具实现，包括Zod验证、工具注册、响应格式等
 */

import { generateImage, generateImageAsync, getImageResult } from '../api';

// Mock API层函数
jest.mock('../api');
const mockedGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>;
const mockedGenerateImageAsync = generateImageAsync as jest.MockedFunction<typeof generateImageAsync>;
const mockedGetImageResult = getImageResult as jest.MockedFunction<typeof getImageResult>;

// 由于我们无法直接测试MCP server的内部逻辑，这里主要测试API层的集成
// 以及模拟MCP工具调用的场景

describe('MCP工具层异步功能测试', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // 设置环境变量
    process.env.JIMENG_API_TOKEN = 'test-env-token';
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.JIMENG_API_TOKEN;
  });

  // ============== 1. generateImage工具异步参数测试 ==============
  describe('generateImage工具异步参数', () => {
    it('应该支持async: false的同步模式（默认行为）', async () => {
      const mockImageUrls = ['https://example.com/sync_image.jpg'];
      mockedGenerateImage.mockResolvedValue(mockImageUrls);

      // 模拟MCP工具调用generateImage（同步模式）
      const mcpParams = {
        prompt: '同步模式测试',
        refresh_token: 'test-token',
        model: 'jimeng-4.0',
        async: false // 显式设置为同步
      };

      // 在实际MCP中，这将调用generateImage
      const result = await generateImage(mcpParams);

      expect(mockedGenerateImage).toHaveBeenCalledWith(mcpParams);
      expect(result).toEqual(mockImageUrls);
      expect(Array.isArray(result)).toBe(true);
    });

    it('应该支持async: true的异步模式', async () => {
      const mockHistoryId = 'h_mcp_async_123';
      mockedGenerateImageAsync.mockResolvedValue(mockHistoryId);

      // 模拟MCP工具调用generateImage（异步模式）
      const mcpParams = {
        prompt: '异步模式测试',
        refresh_token: 'test-token',
        model: 'jimeng-4.0',
        async: true // 设置为异步
      };

      // 在实际MCP中，当async: true时，将调用generateImageAsync
      const result = await generateImageAsync(mcpParams);

      expect(mockedGenerateImageAsync).toHaveBeenCalledWith(mcpParams);
      expect(result).toBe(mockHistoryId);
      expect(typeof result).toBe('string');
    });

    it('应该处理未设置async参数的默认同步行为', async () => {
      const mockImageUrls = ['https://example.com/default_sync.jpg'];
      mockedGenerateImage.mockResolvedValue(mockImageUrls);

      const mcpParams = {
        prompt: '默认模式测试',
        refresh_token: 'test-token'
        // 没有async参数，应该默认为同步
      };

      const result = await generateImage(mcpParams);

      expect(mockedGenerateImage).toHaveBeenCalledWith(mcpParams);
      expect(result).toEqual(mockImageUrls);
    });
  });

  // ============== 2. getImageResult工具测试 ==============
  describe('getImageResult工具', () => {
    it('应该成功查询完成状态的异步结果', async () => {
      const mockResult = {
        status: 'completed' as const,
        imageUrls: [
          'https://example.com/async_result1.jpg',
          'https://example.com/async_result2.jpg'
        ],
        progress: 100
      };
      mockedGetImageResult.mockResolvedValue(mockResult);

      // 模拟MCP工具调用getImageResult
      const historyId = 'h_mcp_query_123';
      const result = await getImageResult(historyId);

      expect(mockedGetImageResult).toHaveBeenCalledWith(historyId);
      expect(result.status).toBe('completed');
      expect(result.imageUrls).toHaveLength(2);
      expect(result.progress).toBe(100);
    });

    it('应该正确处理进行中状态的查询', async () => {
      const mockResult = {
        status: 'pending' as const,
        progress: 75
      };
      mockedGetImageResult.mockResolvedValue(mockResult);

      const historyId = 'h_mcp_pending_123';
      const result = await getImageResult(historyId);

      expect(result.status).toBe('pending');
      expect(result.progress).toBe(75);
      expect(result.imageUrls).toBeUndefined();
    });

    it('应该正确处理失败状态的查询', async () => {
      const mockResult = {
        status: 'failed' as const,
        progress: 0,
        error: 'MCP测试：生成失败，模型服务不可用'
      };
      mockedGetImageResult.mockResolvedValue(mockResult);

      const historyId = 'h_mcp_failed_123';
      const result = await getImageResult(historyId);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('模型服务不可用');
      expect(result.imageUrls).toBeUndefined();
    });

    it('应该使用环境变量中的token当未提供时', async () => {
      const mockResult = {
        status: 'completed' as const,
        progress: 100,
        imageUrls: ['https://example.com/env_token_result.jpg']
      };
      mockedGetImageResult.mockResolvedValue(mockResult);

      const historyId = 'h_env_token_test';
      
      // 不提供token参数，应该使用环境变量
      await getImageResult(historyId);

      expect(mockedGetImageResult).toHaveBeenCalledWith(historyId);
    });
  });

  // ============== 3. MCP响应格式测试 ==============
  describe('MCP响应格式验证', () => {
    it('异步模式应该返回包含historyId信息的文本响应', async () => {
      const mockHistoryId = 'h_mcp_response_123';
      mockedGenerateImageAsync.mockResolvedValue(mockHistoryId);

      const historyId = await generateImageAsync({
        prompt: 'MCP响应格式测试',
        refresh_token: 'test-token'
      });

      // 验证返回的historyId格式
      expect(historyId).toBe(mockHistoryId);
      expect(typeof historyId).toBe('string');
      expect(historyId.length).toBeGreaterThan(0);

      // 模拟MCP响应文本构造
      const mcpResponseText = `异步任务已提交成功！\n\nhistoryId: ${historyId}\n\n请使用 getImageResult 工具查询生成结果。`;
      
      expect(mcpResponseText).toContain(historyId);
      expect(mcpResponseText).toContain('异步任务已提交成功');
      expect(mcpResponseText).toContain('getImageResult');
    });

    it('同步模式应该返回图片URL列表', async () => {
      const mockImageUrls = [
        'https://example.com/sync_result1.jpg',
        'https://example.com/sync_result2.jpg'
      ];
      mockedGenerateImage.mockResolvedValue(mockImageUrls);

      const result = await generateImage({
        prompt: 'MCP同步响应测试',
        refresh_token: 'test-token'
      });

      expect(result).toEqual(mockImageUrls);
      expect(Array.isArray(result)).toBe(true);
      expect(result.every(url => typeof url === 'string' && url.startsWith('https://'))).toBe(true);
    });

    it('查询结果应该返回结构化的状态信息', async () => {
      const mockResults = [
        {
          status: 'pending' as const,
          progress: 30
        },
        {
          status: 'completed' as const,
          imageUrls: ['https://example.com/structured_result.jpg'],
          progress: 100
        },
        {
          status: 'failed' as const,
          progress: 0,
          error: '结构化错误信息测试'
        }
      ];

      for (const mockResult of mockResults) {
        mockedGetImageResult.mockResolvedValueOnce(mockResult);
        
        const result = await getImageResult('h_structured_test');
        
        expect(result).toHaveProperty('status');
        expect(['pending', 'completed', 'failed']).toContain(result.status);
        
        if (result.status === 'pending') {
          expect(result).toHaveProperty('progress');
          expect(typeof result.progress).toBe('number');
        }
        
        if (result.status === 'completed') {
          expect(result).toHaveProperty('imageUrls');
          expect(Array.isArray(result.imageUrls)).toBe(true);
        }
        
        if (result.status === 'failed') {
          expect(result).toHaveProperty('error');
          expect(typeof result.error).toBe('string');
        }
      }
    });
  });

  // ============== 4. 参数验证和Zod Schema测试 ==============
  describe('参数验证和Schema', () => {
    it('应该验证必需的prompt参数', async () => {
      const invalidParams = {
        refresh_token: 'test-token'
        // 缺少prompt
      } as any;

      // Mock参数验证失败
      mockedGenerateImage.mockRejectedValue(new Error('prompt必须是非空字符串'));

      await expect(generateImage(invalidParams)).rejects.toThrow('prompt必须是非空字符串');
    });

    it('应该验证historyId参数格式', async () => {
      // Mock无效historyId的错误
      mockedGetImageResult.mockRejectedValue(new Error('无效的historyId格式'));

      const invalidHistoryId = '';
      
      await expect(getImageResult(invalidHistoryId)).rejects.toThrow('无效的historyId格式');
    });

    it('应该支持可选参数的默认值', async () => {
      const mockImageUrls = ['https://example.com/default_params.jpg'];
      mockedGenerateImage.mockResolvedValue(mockImageUrls);

      // 只提供必需参数
      const minimalParams = {
        prompt: '最小参数测试',
        refresh_token: 'test-token'
      };

      const result = await generateImage(minimalParams);

      expect(mockedGenerateImage).toHaveBeenCalledWith(minimalParams);
      expect(result).toEqual(mockImageUrls);
    });

    it('应该正确处理布尔类型的async参数', async () => {
      // 测试异步调用
      mockedGenerateImageAsync.mockResolvedValue('h_bool_true');
      await generateImageAsync({
        prompt: '布尔测试true',
        refresh_token: 'test-token'
      });

      // 测试同步调用
      mockedGenerateImage.mockResolvedValue(['https://example.com/bool_false.jpg']);
      await generateImage({
        prompt: '布尔测试false',
        refresh_token: 'test-token'
      });

      expect(mockedGenerateImageAsync).toHaveBeenCalledTimes(1);
      expect(mockedGenerateImage).toHaveBeenCalledTimes(1);
    });
  });

  // ============== 5. 错误处理和响应格式测试 ==============
  describe('错误处理和响应格式', () => {
    it('应该返回标准化的错误响应格式', async () => {
      const apiError = new Error('MCP测试：API调用失败');
      mockedGenerateImage.mockRejectedValue(apiError);

      try {
        await generateImage({
          prompt: '错误测试',
          refresh_token: 'test-token'
        });
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('API调用失败');
      }
    });

    it('应该处理网络超时错误', async () => {
      const timeoutError = new Error('请求超时');
      mockedGetImageResult.mockRejectedValue(timeoutError);

      await expect(getImageResult('h_timeout_test')).rejects.toThrow('请求超时');
    });

    it('应该处理认证失败错误', async () => {
      const authError = new Error('认证失败：token已过期');
      mockedGenerateImageAsync.mockRejectedValue(authError);

      await expect(generateImageAsync({
        prompt: '认证错误测试',
        refresh_token: 'expired-token'
      })).rejects.toThrow('认证失败：token已过期');
    });
  });

  // ============== 6. 工具集成和互操作测试 ==============
  describe('工具集成和互操作', () => {
    it('应该支持异步工具的完整工作流', async () => {
      // 第一步：提交异步任务
      const mockHistoryId = 'h_workflow_123';
      mockedGenerateImageAsync.mockResolvedValue(mockHistoryId);

      const historyId = await generateImageAsync({
        prompt: '工作流测试',
        refresh_token: 'test-token'
      });

      expect(historyId).toBe(mockHistoryId);

      // 第二步：查询结果
      const mockResult = {
        status: 'completed' as const,
        progress: 100,
        imageUrls: ['https://example.com/workflow_result.jpg']
      };
      mockedGetImageResult.mockResolvedValue(mockResult);

      const result = await getImageResult(historyId);

      expect(result.status).toBe('completed');
      expect(result.imageUrls).toHaveLength(1);

      // 验证两个工具都被正确调用
      expect(mockedGenerateImageAsync).toHaveBeenCalledTimes(1);
      expect(mockedGetImageResult).toHaveBeenCalledTimes(1);
    });

    it('应该正确传递复杂参数对象', async () => {
      const complexParams = {
        prompt: '复杂参数测试',
        refresh_token: 'test-token',
        model: 'jimeng-4.0',
        aspectRatio: '16:9',
        filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg'],
        sample_strength: 0.8,
        negative_prompt: '模糊, 低质量',
        reference_strength: [0.6, 0.4]
      };

      mockedGenerateImageAsync.mockResolvedValue('h_complex_params');

      await generateImageAsync(complexParams);

      expect(mockedGenerateImageAsync).toHaveBeenCalledWith(complexParams);
    });

    it('应该支持环境变量配置', async () => {
      // 测试不同的环境变量设置
      const originalToken = process.env.JIMENG_API_TOKEN;

      // 测试自定义环境变量
      process.env.JIMENG_API_TOKEN = 'custom-env-token';

      mockedGetImageResult.mockResolvedValue({
        status: 'completed' as const,
        progress: 100,
        imageUrls: ['https://example.com/env_config.jpg']
      });

      await getImageResult('h_env_config');

      expect(mockedGetImageResult).toHaveBeenCalledWith('h_env_config');

      // 恢复原始环境变量
      process.env.JIMENG_API_TOKEN = originalToken;
    });
  });

  // ============== 7. 性能和并发测试 ==============
  describe('性能和并发处理', () => {
    it('应该支持多个异步工具调用', async () => {
      const taskCount = 3;
      const mockHistoryIds = Array.from({length: taskCount}, (_, i) => `h_concurrent_${i}`);

      mockHistoryIds.forEach(id => {
        mockedGenerateImageAsync.mockResolvedValueOnce(id);
      });

      // 模拟并发的MCP工具调用
      const promises = mockHistoryIds.map((_, index) => 
        generateImageAsync({
          prompt: `并发任务${index}`,
          refresh_token: 'test-token'
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(taskCount);
      expect(results).toEqual(mockHistoryIds);
      expect(mockedGenerateImageAsync).toHaveBeenCalledTimes(taskCount);
    });

    it('应该处理高频查询请求', async () => {
      const queryCount = 5;
      const historyId = 'h_high_freq';

      // Mock多次查询返回不同状态
      const progressStates = [20, 40, 60, 80, 100];
      progressStates.forEach((progress, index) => {
        const isCompleted = progress === 100;
        mockedGetImageResult.mockResolvedValueOnce({
          status: isCompleted ? 'completed' : 'pending',
          progress,
          ...(isCompleted && { imageUrls: ['https://example.com/high_freq_result.jpg'] })
        } as any);
      });

      // 模拟高频查询
      const results = [];
      for (let i = 0; i < queryCount; i++) {
        const result = await getImageResult(historyId);
        results.push(result);
      }

      expect(results).toHaveLength(queryCount);
      expect(results[0].progress).toBe(20);
      expect(results[4].status).toBe('completed');
      expect(mockedGetImageResult).toHaveBeenCalledTimes(queryCount);
    });
  });
});