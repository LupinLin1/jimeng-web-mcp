/**
 * 重试机制单元测试
 * 验证retry.ts中的重试逻辑、指数退避和错误分类
 */

import {
  retryAsync,
  isRetryableError,
  calculateBackoff,
  sleep
} from '../../src/utils/retry.js';

describe('Retry Utility', () => {
  describe('isRetryableError()', () => {
    it('应该识别网络超时错误为可重试', () => {
      const timeoutError = { code: 'ETIMEDOUT' };
      expect(isRetryableError(timeoutError)).toBe(true);
    });

    it('应该识别连接重置错误为可重试', () => {
      const resetError = { code: 'ECONNRESET' };
      expect(isRetryableError(resetError)).toBe(true);
    });

    it('应该识别5xx服务器错误为可重试', () => {
      const serverError = { response: { status: 500 } };
      expect(isRetryableError(serverError)).toBe(true);

      const badGatewayError = { response: { status: 502 } };
      expect(isRetryableError(badGatewayError)).toBe(true);
    });

    it('应该识别429限流错误为可重试', () => {
      const rateLimitError = { response: { status: 429 } };
      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it('应该识别401认证错误为不可重试', () => {
      const authError = { response: { status: 401 } };
      expect(isRetryableError(authError)).toBe(false);
    });

    it('应该识别400参数错误为不可重试', () => {
      const badRequestError = { response: { status: 400 } };
      expect(isRetryableError(badRequestError)).toBe(false);
    });

    it('应该识别403权限错误为不可重试', () => {
      const forbiddenError = { response: { status: 403 } };
      expect(isRetryableError(forbiddenError)).toBe(false);
    });

    it('应该识别无响应的网络错误为可重试', () => {
      const networkError = { request: {}, response: undefined };
      expect(isRetryableError(networkError)).toBe(true);
    });

    it('应该默认不重试未知错误', () => {
      const unknownError = new Error('Unknown error');
      expect(isRetryableError(unknownError)).toBe(false);
    });
  });

  describe('calculateBackoff()', () => {
    it('应该计算正确的指数退避延迟', () => {
      const baseDelay = 1000;
      const maxDelay = 10000;

      // 第1次重试：1000 * 2^0 = 1000ms (+ jitter)
      const backoff1 = calculateBackoff(1, baseDelay, maxDelay);
      expect(backoff1).toBeGreaterThanOrEqual(1000);
      expect(backoff1).toBeLessThanOrEqual(1200); // 1000 + 200 jitter

      // 第2次重试：1000 * 2^1 = 2000ms (+ jitter)
      const backoff2 = calculateBackoff(2, baseDelay, maxDelay);
      expect(backoff2).toBeGreaterThanOrEqual(2000);
      expect(backoff2).toBeLessThanOrEqual(2200);

      // 第3次重试：1000 * 2^2 = 4000ms (+ jitter)
      const backoff3 = calculateBackoff(3, baseDelay, maxDelay);
      expect(backoff3).toBeGreaterThanOrEqual(4000);
      expect(backoff3).toBeLessThanOrEqual(4200);
    });

    it('应该限制最大延迟', () => {
      const baseDelay = 1000;
      const maxDelay = 5000;

      // 第10次重试：1000 * 2^9 = 512000ms，但应该被限制为5000ms
      const backoff = calculateBackoff(10, baseDelay, maxDelay);
      expect(backoff).toBeLessThanOrEqual(maxDelay);
    });
  });

  describe('retryAsync()', () => {
    it('应该在第一次成功时不重试', async () => {
      let callCount = 0;
      const successFn = async () => {
        callCount++;
        return 'success';
      };

      const result = await retryAsync(successFn, { maxRetries: 3 }, '测试操作');

      expect(result).toBe('success');
      expect(callCount).toBe(1);
    });

    it('应该在遇到可重试错误时重试', async () => {
      let callCount = 0;
      const retryableFn = async () => {
        callCount++;
        if (callCount < 3) {
          const error: any = new Error('Network timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'success after retry';
      };

      const result = await retryAsync(
        retryableFn,
        { maxRetries: 3, baseDelay: 10, maxDelay: 100 },
        '测试重试'
      );

      expect(result).toBe('success after retry');
      expect(callCount).toBe(3);
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      let callCount = 0;
      const alwaysFailFn = async () => {
        callCount++;
        const error: any = new Error('Always timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      };

      await expect(
        retryAsync(alwaysFailFn, { maxRetries: 2, baseDelay: 10 }, '测试最大重试')
      ).rejects.toThrow('Always timeout');

      expect(callCount).toBe(3); // 1次初始 + 2次重试
    });

    it('应该在遇到不可重试错误时立即失败', async () => {
      let callCount = 0;
      const nonRetryableFn = async () => {
        callCount++;
        const error: any = new Error('Unauthorized');
        error.response = { status: 401 };
        throw error;
      };

      await expect(
        retryAsync(nonRetryableFn, { maxRetries: 3, baseDelay: 10 }, '测试不可重试')
      ).rejects.toThrow('Unauthorized');

      expect(callCount).toBe(1); // 只尝试一次，不重试
    });

    it('应该使用自定义错误判断函数', async () => {
      let callCount = 0;
      const customFn = async () => {
        callCount++;
        throw new Error('Custom error');
      };

      // 自定义判断：所有错误都可重试
      const customShouldRetry = () => true;

      await expect(
        retryAsync(
          customFn,
          { maxRetries: 2, baseDelay: 10, shouldRetry: customShouldRetry },
          '自定义重试'
        )
      ).rejects.toThrow('Custom error');

      expect(callCount).toBe(3); // 1次初始 + 2次重试
    });

    it('应该正确计算退避延迟', async () => {
      const startTime = Date.now();
      let callCount = 0;

      const timingFn = async () => {
        callCount++;
        if (callCount < 3) {
          const error: any = new Error('Timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'done';
      };

      await retryAsync(
        timingFn,
        { maxRetries: 3, baseDelay: 100, maxDelay: 1000 },
        '测试延迟'
      );

      const elapsed = Date.now() - startTime;

      // 第1次重试：~100ms，第2次重试：~200ms
      // 总延迟应该 >= 300ms
      expect(elapsed).toBeGreaterThanOrEqual(250);
    });
  });

  describe('sleep()', () => {
    it('应该正确延迟指定时间', async () => {
      const startTime = Date.now();
      await sleep(100);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(95); // 允许5ms误差
      expect(elapsed).toBeLessThan(150);
    });
  });
});
