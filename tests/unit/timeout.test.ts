import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TimeoutError, pollUntilComplete, DEFAULT_POLLING_CONFIG, formatDuration } from '../../src/utils/timeout.js';

describe('Timeout Utils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('TimeoutError', () => {
    it('should create TimeoutError with correct name and message', () => {
      const error = new TimeoutError('Operation timed out');
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('Operation timed out');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('pollUntilComplete', () => {
    const mockStatusChecker = jest.fn();

    beforeEach(() => {
      mockStatusChecker.mockClear();
    });

    it('should resolve immediately when task is already completed', async () => {
      mockStatusChecker.mockResolvedValue({ status: 'completed', result: 'done' });

      const result = await pollUntilComplete('task-1', mockStatusChecker);

      expect(result).toEqual({ status: 'completed', result: 'done' });
      expect(mockStatusChecker).toHaveBeenCalledTimes(1);
      expect(mockStatusChecker).toHaveBeenCalledWith('task-1');
    });

    it('should poll with exponential backoff until completion', async () => {
      const responses = [
        { status: 'pending' },
        { status: 'processing' },
        { status: 'completed', result: 'final-result' }
      ];
      mockStatusChecker.mockImplementation((taskId) =>
        Promise.resolve(responses.shift()!)
      );

      const promise = pollUntilComplete('task-2', mockStatusChecker, {
        initialInterval: 1000,
        backoffFactor: 2,
        maxInterval: 5000,
        timeout: 10000
      });

      // 第一轮轮询
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // 让微任务执行

      // 第二轮轮询 (2000ms)
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      // 第三轮轮询 (4000ms)
      jest.advanceTimersByTime(4000);
      await Promise.resolve();

      const result = await promise;
      expect(result).toEqual({ status: 'completed', result: 'final-result' });
      expect(mockStatusChecker).toHaveBeenCalledTimes(3);
    });

    it('should respect maxInterval limit during exponential backoff', async () => {
      const responses = [
        { status: 'pending' },
        { status: 'pending' },
        { status: 'pending' },
        { status: 'completed', result: 'done' }
      ];
      mockStatusChecker.mockImplementation((taskId) =>
        Promise.resolve(responses.shift()!)
      );

      const promise = pollUntilComplete('task-3', mockStatusChecker, {
        initialInterval: 1000,
        backoffFactor: 3,
        maxInterval: 2000,
        timeout: 15000
      });

      // 轮询序列: 1000ms -> 2000ms (max) -> 2000ms (max)
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      const result = await promise;
      expect(result).toEqual({ status: 'completed', result: 'done' });
      expect(mockStatusChecker).toHaveBeenCalledTimes(4);
    });

    it('should throw TimeoutError when timeout is reached', async () => {
      mockStatusChecker.mockResolvedValue({ status: 'pending' });

      const promise = pollUntilComplete('task-timeout', mockStatusChecker, {
        initialInterval: 1000,
        timeout: 5000
      });

      // 快进到超时时间
      jest.advanceTimersByTime(5000);

      await expect(promise).rejects.toThrow(TimeoutError);
      await expect(promise).rejects.toThrow('Polling timed out after 5 seconds');
    });

    it('should handle task failure correctly', async () => {
      const errorResponse = {
        status: 'failed',
        error: {
          code: 'CONTENT_VIOLATION',
          message: 'Invalid content detected',
          reason: 'Content policy violation'
        }
      };
      mockStatusChecker.mockResolvedValue(errorResponse);

      const result = await pollUntilComplete('task-failed', mockStatusChecker);

      expect(result).toEqual(errorResponse);
      expect(mockStatusChecker).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors in status checker', async () => {
      const networkError = new Error('Network connection failed');
      mockStatusChecker.mockRejectedValue(networkError);

      await expect(pollUntilComplete('task-network-error', mockStatusChecker))
        .rejects.toThrow('Network connection failed');
    });

    it('should use default config when no config provided', async () => {
      mockStatusChecker.mockResolvedValue({ status: 'completed' });

      const result = await pollUntilComplete('task-default', mockStatusChecker);

      expect(result).toEqual({ status: 'completed' });
      expect(mockStatusChecker).toHaveBeenCalledTimes(1);
    });

    it('should validate taskId parameter', async () => {
      mockStatusChecker.mockResolvedValue({ status: 'completed' });

      await expect(pollUntilComplete('', mockStatusChecker))
        .rejects.toThrow('Task ID is required');

      await expect(pollUntilComplete('   ', mockStatusChecker))
        .rejects.toThrow('Task ID is required');
    });

    it('should validate statusChecker parameter', async () => {
      await expect(pollUntilComplete('task-1', null as any))
        .rejects.toThrow('Status checker function is required');

      await expect(pollUntilComplete('task-1', undefined as any))
        .rejects.toThrow('Status checker function is required');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly in seconds', () => {
      expect(formatDuration(1000)).toBe('1 second');
      expect(formatDuration(500)).toBe('0.5 seconds');
    });

    it('should format duration correctly in minutes', () => {
      expect(formatDuration(60000)).toBe('1 minute');
      expect(formatDuration(90000)).toBe('1.5 minutes');
      expect(formatDuration(120000)).toBe('2 minutes');
    });

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('0 seconds');
      expect(formatDuration(100)).toBe('0.1 seconds');
    });
  });

  describe('DEFAULT_POLLING_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_POLLING_CONFIG.initialInterval).toBe(2000);
      expect(DEFAULT_POLLING_CONFIG.maxInterval).toBe(10000);
      expect(DEFAULT_POLLING_CONFIG.backoffFactor).toBe(1.5);
      expect(DEFAULT_POLLING_CONFIG.timeout).toBe(600000); // 10 minutes
    });
  });
});