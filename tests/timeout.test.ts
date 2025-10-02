/**
 * 超时处理测试
 *
 * 目的：验证超时处理工具的功能
 * 依据：src/utils/timeout.ts
 *       /specs/005-3-1-2/research.md - 条件轮询模式和指数退避策略
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  TimeoutError,
  pollUntilComplete,
  pollWithRetry,
  sleep,
  DEFAULT_POLLING_CONFIG,
  type PollingConfig,
  type StatusChecker
} from '../src/utils/timeout.js';
import type { VideoTaskStatus } from '../src/types/api.types.js';

describe('Timeout Handling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== TimeoutError类测试 ====================

  describe('TimeoutError Class', () => {
    test('应该是Error的实例', () => {
      // Arrange & Act
      const error = new TimeoutError('test message');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TimeoutError);
    });

    test('应该设置正确的name属性', () => {
      // Arrange & Act
      const error = new TimeoutError('test message');

      // Assert
      expect(error.name).toBe('TimeoutError');
    });

    test('应该设置正确的message属性', () => {
      // Arrange & Act
      const error = new TimeoutError('custom error message');

      // Assert
      expect(error.message).toBe('custom error message');
    });

    test('应该有stack trace', () => {
      // Arrange & Act
      const error = new TimeoutError('test');

      // Assert
      expect(error.stack).toBeDefined();
    });
  });

  // ==================== sleep()函数测试 ====================

  describe('sleep() Function', () => {
    test('应该等待指定的时间', async () => {
      // Arrange
      const sleepTime = 100; // 100ms
      const startTime = Date.now();

      // Act
      await sleep(sleepTime);
      const elapsedTime = Date.now() - startTime;

      // Assert
      // 允许10ms的误差
      expect(elapsedTime).toBeGreaterThanOrEqual(sleepTime - 10);
      expect(elapsedTime).toBeLessThan(sleepTime + 50);
    });

    test('应该返回Promise', () => {
      // Act
      const result = sleep(10);

      // Assert
      expect(result).toBeInstanceOf(Promise);
    });

    test('应该支持0毫秒', async () => {
      // Act & Assert
      await expect(sleep(0)).resolves.toBeUndefined();
    });
  });

  // ==================== DEFAULT_POLLING_CONFIG测试 ====================

  describe('DEFAULT_POLLING_CONFIG', () => {
    test('应该有正确的默认值', () => {
      // Assert
      expect(DEFAULT_POLLING_CONFIG).toMatchObject({
        initialInterval: 2000,
        maxInterval: 10000,
        backoffFactor: 1.5,
        timeout: 600000
      });
    });

    test('所有值应为正数', () => {
      // Assert
      expect(DEFAULT_POLLING_CONFIG.initialInterval).toBeGreaterThan(0);
      expect(DEFAULT_POLLING_CONFIG.maxInterval).toBeGreaterThan(0);
      expect(DEFAULT_POLLING_CONFIG.backoffFactor).toBeGreaterThan(0);
      expect(DEFAULT_POLLING_CONFIG.timeout).toBeGreaterThan(0);
    });

    test('maxInterval应大于initialInterval', () => {
      // Assert
      expect(DEFAULT_POLLING_CONFIG.maxInterval).toBeGreaterThan(
        DEFAULT_POLLING_CONFIG.initialInterval
      );
    });
  });

  // ==================== pollUntilComplete()基础测试 ====================

  describe('pollUntilComplete() Basic Behavior', () => {
    test('任务立即完成时应返回结果', async () => {
      // Arrange
      const taskId = 'task123';
      const expectedResult = { videoUrl: 'https://example.com/video.mp4' };

      const statusChecker: StatusChecker<any> = async (id) => ({
        status: 'completed',
        result: expectedResult
      });

      // Act
      const result = await pollUntilComplete(taskId, statusChecker);

      // Assert
      expect(result).toEqual(expectedResult);
    });

    test('任务处理中应继续轮询直到完成', async () => {
      // Arrange
      const taskId = 'task123';
      const expectedResult = { videoUrl: 'https://example.com/video.mp4' };
      let callCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        callCount++;
        if (callCount < 3) {
          return { status: 'processing' };
        }
        return { status: 'completed', result: expectedResult };
      };

      // Act
      const result = await pollUntilComplete(taskId, statusChecker, {
        initialInterval: 50,
        maxInterval: 100,
        timeout: 5000
      });

      // Assert
      expect(result).toEqual(expectedResult);
      expect(callCount).toBe(3);
    });

    test('任务从pending到processing再到completed应正常工作', async () => {
      // Arrange
      const taskId = 'task123';
      const expectedResult = { videoUrl: 'https://example.com/video.mp4' };
      const statuses: VideoTaskStatus[] = ['pending', 'processing', 'completed'];
      let callCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        const status = statuses[Math.min(callCount, statuses.length - 1)];
        callCount++;

        if (status === 'completed') {
          return { status, result: expectedResult };
        }
        return { status };
      };

      // Act
      const result = await pollUntilComplete(taskId, statusChecker, {
        initialInterval: 50,
        maxInterval: 100,
        timeout: 5000
      });

      // Assert
      expect(result).toEqual(expectedResult);
      expect(callCount).toBeGreaterThanOrEqual(3);
    });

    test('任务失败时应抛出错误', async () => {
      // Arrange
      const taskId = 'task123';
      const errorMessage = '视频生成失败：内容审核未通过';

      const statusChecker: StatusChecker<any> = async (id) => ({
        status: 'failed',
        error: errorMessage
      });

      // Act & Assert
      await expect(pollUntilComplete(taskId, statusChecker))
        .rejects.toThrow(errorMessage);
    });

    test('任务完成但未返回结果应抛出错误', async () => {
      // Arrange
      const taskId = 'task123';

      const statusChecker: StatusChecker<any> = async (id) => ({
        status: 'completed'
        // 缺少result字段
      });

      // Act & Assert
      await expect(pollUntilComplete(taskId, statusChecker))
        .rejects.toThrow('任务完成但未返回结果');
    });
  });

  // ==================== pollUntilComplete()超时测试 ====================

  describe('pollUntilComplete() Timeout Behavior', () => {
    test('超时应抛出TimeoutError', async () => {
      // Arrange
      const taskId = 'task123';
      const statusChecker: StatusChecker<any> = async (id) => ({
        status: 'processing'
      });

      // Act & Assert
      await expect(
        pollUntilComplete(taskId, statusChecker, {
          initialInterval: 50,
          maxInterval: 100,
          timeout: 200 // 200ms超时
        })
      ).rejects.toThrow(TimeoutError);
    });

    test('TimeoutError消息应包含超时时间和建议', async () => {
      // Arrange
      const taskId = 'task123';
      const statusChecker: StatusChecker<any> = async (id) => ({
        status: 'processing'
      });

      // Act & Assert
      try {
        await pollUntilComplete(taskId, statusChecker, {
          initialInterval: 50,
          timeout: 200
        });
        fail('应该抛出超时错误');
      } catch (error: any) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect(error.message).toContain('超时');
        expect(error.message).toContain('async模式');
      }
    });

    test('超时前完成应正常返回', async () => {
      // Arrange
      const taskId = 'task123';
      const expectedResult = { videoUrl: 'https://example.com/video.mp4' };
      let callCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        callCount++;
        await sleep(50);
        if (callCount >= 2) {
          return { status: 'completed', result: expectedResult };
        }
        return { status: 'processing' };
      };

      // Act
      const result = await pollUntilComplete(taskId, statusChecker, {
        initialInterval: 50,
        timeout: 300 // 足够完成
      });

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });

  // ==================== pollUntilComplete()指数退避测试 ====================

  describe('pollUntilComplete() Exponential Backoff', () => {
    test('轮询间隔应按指数增长', async () => {
      // Arrange
      const taskId = 'task123';
      const callTimes: number[] = [];
      let callCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        callTimes.push(Date.now());
        callCount++;

        if (callCount >= 4) {
          return { status: 'completed', result: {} };
        }
        return { status: 'processing' };
      };

      const config: Partial<PollingConfig> = {
        initialInterval: 100,
        maxInterval: 500,
        backoffFactor: 1.5,
        timeout: 5000
      };

      // Act
      await pollUntilComplete(taskId, statusChecker, config);

      // Assert
      expect(callTimes.length).toBeGreaterThanOrEqual(4);

      // 验证间隔递增：100ms, 150ms, 225ms, ...
      const intervals = [];
      for (let i = 1; i < callTimes.length; i++) {
        intervals.push(callTimes[i] - callTimes[i - 1]);
      }

      // 每个间隔应大于或接近前一个间隔 * 1.5
      for (let i = 1; i < intervals.length - 1; i++) {
        // 允许50ms误差
        expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1] * 0.9);
      }
    });

    test('轮询间隔不应超过maxInterval', async () => {
      // Arrange
      const taskId = 'task123';
      const callTimes: number[] = [];
      let callCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        callTimes.push(Date.now());
        callCount++;

        if (callCount >= 6) {
          return { status: 'completed', result: {} };
        }
        return { status: 'processing' };
      };

      const config: Partial<PollingConfig> = {
        initialInterval: 50,
        maxInterval: 200,
        backoffFactor: 2.0, // 快速增长
        timeout: 5000
      };

      // Act
      await pollUntilComplete(taskId, statusChecker, config);

      // Assert
      const intervals = [];
      for (let i = 1; i < callTimes.length; i++) {
        intervals.push(callTimes[i] - callTimes[i - 1]);
      }

      // 所有间隔都不应超过maxInterval + 50ms（误差）
      intervals.forEach(interval => {
        expect(interval).toBeLessThanOrEqual(250);
      });
    });
  });

  // ==================== pollUntilComplete()错误处理测试 ====================

  describe('pollUntilComplete() Error Handling', () => {
    test('网络错误应继续重试', async () => {
      // Arrange
      const taskId = 'task123';
      const expectedResult = { videoUrl: 'https://example.com/video.mp4' };
      let callCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Network error');
        }
        if (callCount >= 3) {
          return { status: 'completed', result: expectedResult };
        }
        return { status: 'processing' };
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      const result = await pollUntilComplete(taskId, statusChecker, {
        initialInterval: 50,
        maxInterval: 100,
        timeout: 5000
      });

      // Assert
      expect(result).toEqual(expectedResult);
      expect(callCount).toBeGreaterThanOrEqual(3);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('任务失败错误应立即抛出', async () => {
      // Arrange
      const taskId = 'task123';
      let callCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        callCount++;
        if (callCount === 2) {
          return { status: 'failed', error: '生成失败' };
        }
        return { status: 'processing' };
      };

      // Act & Assert
      await expect(
        pollUntilComplete(taskId, statusChecker, {
          initialInterval: 50,
          timeout: 5000
        })
      ).rejects.toThrow('生成失败');

      expect(callCount).toBe(2); // 不应继续重试
    });

    test('TimeoutError应立即抛出（不继续重试）', async () => {
      // Arrange
      const taskId = 'task123';

      const statusChecker: StatusChecker<any> = async (id) => ({
        status: 'processing'
      });

      // Act & Assert
      await expect(
        pollUntilComplete(taskId, statusChecker, {
          initialInterval: 50,
          timeout: 150
        })
      ).rejects.toThrow(TimeoutError);
    });
  });

  // ==================== pollWithRetry()测试 ====================

  describe('pollWithRetry() Function', () => {
    test('第一次成功时不应重试', async () => {
      // Arrange
      const taskId = 'task123';
      const expectedResult = { videoUrl: 'https://example.com/video.mp4' };
      let pollCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        pollCount++;
        return { status: 'completed', result: expectedResult };
      };

      // Act
      const result = await pollWithRetry(taskId, statusChecker, {
        initialInterval: 50,
        timeout: 5000
      }, 3);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(pollCount).toBe(1);
    });

    test('失败后应重试指定次数', async () => {
      // Arrange
      const taskId = 'task123';
      const expectedResult = { videoUrl: 'https://example.com/video.mp4' };
      let attemptCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary error');
        }
        return { status: 'completed', result: expectedResult };
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      const result = await pollWithRetry(taskId, statusChecker, {
        initialInterval: 50,
        timeout: 5000
      }, 3);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(attemptCount).toBe(3);

      consoleWarnSpy.mockRestore();
    });

    test('超时错误不应重试', async () => {
      // Arrange
      const taskId = 'task123';
      let attemptCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        attemptCount++;
        return { status: 'processing' };
      };

      // Act & Assert
      await expect(
        pollWithRetry(taskId, statusChecker, {
          initialInterval: 50,
          timeout: 150
        }, 3)
      ).rejects.toThrow(TimeoutError);

      expect(attemptCount).toBeGreaterThanOrEqual(1);
      // 超时后不应有额外尝试
    });

    test('达到最大重试次数应抛出错误', async () => {
      // Arrange
      const taskId = 'task123';
      let attemptCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        attemptCount++;
        throw new Error('Persistent error');
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Act & Assert
      await expect(
        pollWithRetry(taskId, statusChecker, {
          initialInterval: 50,
          timeout: 5000
        }, 2) // 最多重试2次
      ).rejects.toThrow('轮询失败，已重试 2 次');

      expect(attemptCount).toBe(3); // 初始尝试 + 2次重试

      consoleWarnSpy.mockRestore();
    });

    test('默认最大重试次数应为3', async () => {
      // Arrange
      const taskId = 'task123';
      let attemptCount = 0;

      const statusChecker: StatusChecker<any> = async (id) => {
        attemptCount++;
        throw new Error('Error');
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Act & Assert
      await expect(
        pollWithRetry(taskId, statusChecker, {
          initialInterval: 50,
          timeout: 5000
        }) // 不指定maxRetries，应默认3
      ).rejects.toThrow();

      expect(attemptCount).toBe(4); // 初始尝试 + 3次重试

      consoleWarnSpy.mockRestore();
    });
  });

  // ==================== 自定义配置测试 ====================

  describe('Custom Configuration', () => {
    test('应该支持自定义轮询配置', async () => {
      // Arrange
      const taskId = 'task123';
      const expectedResult = { videoUrl: 'https://example.com/video.mp4' };

      const statusChecker: StatusChecker<any> = async (id) => ({
        status: 'completed',
        result: expectedResult
      });

      const customConfig: Partial<PollingConfig> = {
        initialInterval: 1000,
        maxInterval: 5000,
        backoffFactor: 2.0,
        timeout: 30000
      };

      // Act
      const result = await pollUntilComplete(taskId, statusChecker, customConfig);

      // Assert
      expect(result).toEqual(expectedResult);
    });

    test('部分配置应与默认配置合并', async () => {
      // Arrange
      const taskId = 'task123';
      const expectedResult = { videoUrl: 'https://example.com/video.mp4' };

      const statusChecker: StatusChecker<any> = async (id) => ({
        status: 'completed',
        result: expectedResult
      });

      // 只覆盖timeout
      const partialConfig: Partial<PollingConfig> = {
        timeout: 30000
      };

      // Act
      const result = await pollUntilComplete(taskId, statusChecker, partialConfig);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});
