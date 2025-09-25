/**
 * 异步API集成测试
 * 测试完整的异步流程：提交生成任务 → 查询状态 → 获取结果
 * 包括端到端集成、并发处理、轮询机制等测试
 */

import { generateImageAsync, getImageResult } from '../api';
import { JimengClient } from '../api/JimengClient';
import type { ImageGenerationParams } from '../types/api.types';

// Mock JimengClient以避免实际API调用
jest.mock('../api/JimengClient');
const MockedJimengClient = JimengClient as jest.MockedClass<typeof JimengClient>;

describe('异步API集成测试', () => {
  
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

  // ============== 1. 端到端异步流程测试 ==============
  describe('端到端异步流程', () => {
    it('应该完成完整的异步生成流程：提交 → 查询 → 获取结果', async () => {
      // 第一步：提交异步任务
      const mockHistoryId = 'h_e2e_test_123456';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '端到端测试图像',
        refresh_token: 'test-token-123',
        model: 'jimeng-4.0'
      };

      const historyId = await generateImageAsync(params);
      expect(historyId).toBe(mockHistoryId);

      // 第二步：查询任务状态（模拟进行中）
      const pendingResult = {
        status: 'pending' as const,
        progress: 50
      };
      mockClient.getImageResult.mockResolvedValueOnce(pendingResult);

      const pendingStatus = await getImageResult(historyId, 'test-token-123');
      expect(pendingStatus.status).toBe('pending');
      expect(pendingStatus.progress).toBe(50);

      // 第三步：再次查询（模拟完成）
      const completedResult = {
        status: 'completed' as const,
        imageUrls: [
          'https://example.com/generated1.jpg',
          'https://example.com/generated2.jpg'
        ],
        progress: 100
      };
      mockClient.getImageResult.mockResolvedValueOnce(completedResult);

      const completedStatus = await getImageResult(historyId, 'test-token-123');
      expect(completedStatus.status).toBe('completed');
      expect(completedStatus.imageUrls).toHaveLength(2);
      expect(completedStatus.progress).toBe(100);

      // 验证调用次数
      expect(mockClient.generateImageAsync).toHaveBeenCalledTimes(1);
      expect(mockClient.getImageResult).toHaveBeenCalledTimes(2);
    });

    it('应该处理异步生成失败的完整流程', async () => {
      // 第一步：提交异步任务
      const mockHistoryId = 'h_failed_test_123';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '失败测试图像',
        refresh_token: 'test-token-123'
      };

      const historyId = await generateImageAsync(params);
      expect(historyId).toBe(mockHistoryId);

      // 第二步：查询任务状态（模拟失败）
      const failedResult = {
        status: 'failed' as const,
        error: '生成过程中发生错误：积分不足'
      };
      mockClient.getImageResult.mockResolvedValue(failedResult);

      const failedStatus = await getImageResult(historyId, 'test-token-123');
      expect(failedStatus.status).toBe('failed');
      expect(failedStatus.error).toContain('积分不足');
      expect(failedStatus.imageUrls).toBeUndefined();
    });

    it('应该支持带参考图像的完整异步流程', async () => {
      // 提交带参考图的异步任务
      const mockHistoryId = 'h_ref_image_123';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '基于参考图的异步生成',
        refresh_token: 'test-token-123',
        filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg'],
        sample_strength: 0.7
      };

      const historyId = await generateImageAsync(params);
      expect(historyId).toBe(mockHistoryId);

      // 查询完成结果
      const completedResult = {
        status: 'completed' as const,
        imageUrls: ['https://example.com/ref_generated.jpg']
      };
      mockClient.getImageResult.mockResolvedValue(completedResult);

      const result = await getImageResult(historyId, 'test-token-123');
      expect(result.status).toBe('completed');
      expect(result.imageUrls).toHaveLength(1);

      // 验证参考图参数传递
      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg'],
          sample_strength: 0.7
        })
      );
    });
  });

  // ============== 2. 并发处理测试 ==============
  describe('并发处理能力', () => {
    it('应该支持多个异步任务并发提交', async () => {
      const taskCount = 5;
      const mockHistoryIds = Array.from({length: taskCount}, (_, i) => `h_concurrent_${i}`);
      
      // Mock每次调用返回不同的historyId
      mockHistoryIds.forEach((id, index) => {
        mockClient.generateImageAsync.mockResolvedValueOnce(id);
      });

      const params: ImageGenerationParams = {
        prompt: '并发测试图像',
        refresh_token: 'test-token-123'
      };

      // 并发提交多个任务
      const promises = Array.from({length: taskCount}, () => generateImageAsync(params));
      const historyIds = await Promise.all(promises);

      expect(historyIds).toHaveLength(taskCount);
      expect(new Set(historyIds).size).toBe(taskCount); // 确保每个ID都是唯一的
      expect(mockClient.generateImageAsync).toHaveBeenCalledTimes(taskCount);
    });

    it('应该支持多个查询请求并发执行', async () => {
      const historyIds = ['h_query1', 'h_query2', 'h_query3'];
      const mockResults = historyIds.map((id, index) => ({
        status: 'completed' as const,
        imageUrls: [`https://example.com/${id}.jpg`],
        progress: 100
      }));

      // Mock每次调用返回对应的结果
      mockResults.forEach(result => {
        mockClient.getImageResult.mockResolvedValueOnce(result);
      });

      // 并发查询多个结果
      const promises = historyIds.map(id => getImageResult(id, 'test-token-123'));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(historyIds.length);
      results.forEach((result, index) => {
        expect(result.status).toBe('completed');
        expect(result.imageUrls?.[0]).toContain(historyIds[index]);
      });
      expect(mockClient.getImageResult).toHaveBeenCalledTimes(historyIds.length);
    });
  });

  // ============== 3. 状态轮询机制测试 ==============
  describe('状态轮询机制', () => {
    it('应该正确模拟状态变化：pending → completed', async () => {
      const historyId = 'h_polling_test';
      
      // 模拟状态变化序列
      const statusSequence = [
        { status: 'pending' as const, progress: 20 },
        { status: 'pending' as const, progress: 50 },
        { status: 'pending' as const, progress: 80 },
        { 
          status: 'completed' as const, 
          imageUrls: ['https://example.com/final.jpg'],
          progress: 100 
        }
      ];

      statusSequence.forEach(status => {
        mockClient.getImageResult.mockResolvedValueOnce(status);
      });

      // 模拟轮询过程
      const results = [];
      for (let i = 0; i < statusSequence.length; i++) {
        const result = await getImageResult(historyId, 'test-token');
        results.push(result);
      }

      // 验证状态变化
      expect(results[0].status).toBe('pending');
      expect(results[0].progress).toBe(20);
      
      expect(results[1].status).toBe('pending');
      expect(results[1].progress).toBe(50);
      
      expect(results[2].status).toBe('pending');
      expect(results[2].progress).toBe(80);
      
      expect(results[3].status).toBe('completed');
      expect(results[3].progress).toBe(100);
      expect(results[3].imageUrls).toHaveLength(1);
    });

    it('应该处理轮询过程中的错误恢复', async () => {
      const historyId = 'h_error_recovery';
      
      // 第一次查询：网络错误
      mockClient.getImageResult.mockRejectedValueOnce(new Error('网络连接失败'));
      
      // 第二次查询：成功
      const successResult = {
        status: 'completed' as const,
        imageUrls: ['https://example.com/recovered.jpg']
      };
      mockClient.getImageResult.mockResolvedValueOnce(successResult);

      // 第一次查询失败
      await expect(getImageResult(historyId, 'test-token')).rejects.toThrow('网络连接失败');
      
      // 第二次查询成功
      const result = await getImageResult(historyId, 'test-token');
      expect(result.status).toBe('completed');
      expect(result.imageUrls).toHaveLength(1);
    });
  });

  // ============== 4. 客户端实例复用测试 ==============
  describe('客户端实例复用', () => {
    it('应该为相同token复用客户端实例', async () => {
      const token = 'reuse-test-token';
      
      // 设置mock返回相同的token
      mockClient.getRefreshToken.mockReturnValue(token);
      
      // 第一次调用
      mockClient.generateImageAsync.mockResolvedValueOnce('h1');
      await generateImageAsync({
        prompt: '第一次调用',
        refresh_token: token
      });

      // 第二次调用（相同token）
      mockClient.generateImageAsync.mockResolvedValueOnce('h2');
      await generateImageAsync({
        prompt: '第二次调用',
        refresh_token: token
      });

      // 应该只创建一次客户端实例
      expect(MockedJimengClient).toHaveBeenCalledTimes(1);
      expect(MockedJimengClient).toHaveBeenCalledWith(token);
    });

    it('应该为不同token创建新的客户端实例', async () => {
      // 第一次调用
      mockClient.generateImageAsync.mockResolvedValueOnce('h1');
      await generateImageAsync({
        prompt: '第一个token',
        refresh_token: 'token1'
      });

      // 第二次调用（不同token）
      mockClient.generateImageAsync.mockResolvedValueOnce('h2');
      await generateImageAsync({
        prompt: '第二个token',
        refresh_token: 'token2'
      });

      // 应该创建两次客户端实例
      expect(MockedJimengClient).toHaveBeenCalledTimes(2);
      expect(MockedJimengClient).toHaveBeenNthCalledWith(1, 'token1');
      expect(MockedJimengClient).toHaveBeenNthCalledWith(2, 'token2');
    });
  });

  // ============== 5. 错误传播和恢复测试 ==============
  describe('错误传播和恢复', () => {
    it('应该正确传播异步提交阶段的错误', async () => {
      const submitError = new Error('提交失败：参数验证错误');
      mockClient.generateImageAsync.mockRejectedValue(submitError);

      const params: ImageGenerationParams = {
        prompt: '错误测试',
        refresh_token: 'test-token'
      };

      await expect(generateImageAsync(params)).rejects.toThrow('提交失败：参数验证错误');
    });

    it('应该正确传播查询阶段的错误', async () => {
      const queryError = new Error('查询失败：historyId已过期');
      mockClient.getImageResult.mockRejectedValue(queryError);

      await expect(getImageResult('expired_id', 'test-token')).rejects.toThrow('查询失败：historyId已过期');
    });

    it('应该处理部分成功的批量操作', async () => {
      const historyIds = ['h_success1', 'h_fail', 'h_success2'];
      const token = 'batch-test-token';

      // 第一个成功
      mockClient.getImageResult.mockResolvedValueOnce({
        status: 'completed' as const,
        imageUrls: ['https://example.com/success1.jpg']
      });

      // 第二个失败
      mockClient.getImageResult.mockRejectedValueOnce(new Error('任务不存在'));

      // 第三个成功
      mockClient.getImageResult.mockResolvedValueOnce({
        status: 'completed' as const,
        imageUrls: ['https://example.com/success2.jpg']
      });

      // 批量查询（允许部分失败）
      const results = await Promise.allSettled(
        historyIds.map(id => getImageResult(id, token))
      );

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      if (results[0].status === 'fulfilled') {
        expect(results[0].value.status).toBe('completed');
      }
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toContain('任务不存在');
      }
      if (results[2].status === 'fulfilled') {
        expect(results[2].value.status).toBe('completed');
      }
    });
  });

  // ============== 6. 性能和超时测试 ==============
  describe('性能和超时处理', () => {
    it('应该在合理时间内完成异步提交', async () => {
      const startTime = Date.now();
      
      mockClient.generateImageAsync.mockResolvedValue('h_performance_test');

      await generateImageAsync({
        prompt: '性能测试',
        refresh_token: 'test-token'
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // 应该在1秒内完成Mock调用
    });

    it('应该在合理时间内完成状态查询', async () => {
      const startTime = Date.now();
      
      mockClient.getImageResult.mockResolvedValue({
        status: 'completed' as const,
        imageUrls: ['https://example.com/quick.jpg']
      });

      await getImageResult('h_quick_test', 'test-token');

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(500); // 应该在0.5秒内完成Mock调用
    });

    it('应该正确处理长时间运行的任务', async () => {
      // 模拟长时间运行的任务
      const longRunningStates = [
        { status: 'pending' as const, progress: 10 },
        { status: 'pending' as const, progress: 30 },
        { status: 'pending' as const, progress: 60 },
        { status: 'pending' as const, progress: 90 },
        { 
          status: 'completed' as const, 
          imageUrls: ['https://example.com/long_task.jpg'],
          progress: 100 
        }
      ];

      longRunningStates.forEach(state => {
        mockClient.getImageResult.mockResolvedValueOnce(state);
      });

      const historyId = 'h_long_running';
      
      // 模拟多次轮询
      let finalResult;
      for (let i = 0; i < longRunningStates.length; i++) {
        const result = await getImageResult(historyId, 'test-token');
        if (result.status === 'completed') {
          finalResult = result;
          break;
        }
        // 在实际应用中，这里会有延迟等待
      }

      expect(finalResult?.status).toBe('completed');
      expect(finalResult?.imageUrls).toHaveLength(1);
      expect(mockClient.getImageResult).toHaveBeenCalledTimes(5);
    });
  });
});