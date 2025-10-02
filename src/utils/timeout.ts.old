/**
 * 超时处理工具
 * 用于视频生成的轮询和超时管理
 */

import type { VideoTaskStatus } from '../types/api.types.js';

/**
 * 超时错误类
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * 轮询配置接口
 */
export interface PollingConfig {
  /** 初始轮询间隔（毫秒） */
  initialInterval: number;
  /** 最大轮询间隔（毫秒） */
  maxInterval: number;
  /** 指数退避因子 */
  backoffFactor: number;
  /** 超时时间（毫秒） */
  timeout: number;
}

/**
 * 任务状态查询函数类型
 */
export type StatusChecker<T> = (taskId: string) => Promise<{
  status: VideoTaskStatus;
  result?: T;
  error?: string;
}>;

/**
 * 默认轮询配置
 */
export const DEFAULT_POLLING_CONFIG: PollingConfig = {
  initialInterval: 2000,   // 2秒
  maxInterval: 10000,      // 10秒
  backoffFactor: 1.5,      // 1.5倍递增
  timeout: 600000          // 600秒 (10分钟)
};

/**
 * 辅助函数：睡眠指定时间
 *
 * @param ms - 睡眠时间（毫秒）
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化持续时间
 *
 * @param ms - 持续时间（毫秒）
 * @returns 格式化的时间字符串
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) {
    return '0 seconds';
  }

  if (ms < 1000) {
    return `${(ms / 1000).toFixed(1)} seconds`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return seconds === 1 ? '1 second' : `${seconds} seconds`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  // 更精确的小数分钟格式
  const decimalMinutes = minutes + (remainingSeconds / 60);
  return `${decimalMinutes.toFixed(1)} minutes`;
}

/**
 * 轮询直到任务完成或超时
 *
 * @template T - 结果类型
 * @param taskId - 任务ID
 * @param statusChecker - 状态查询函数
 * @param config - 轮询配置（可选）
 * @returns Promise<T> - 完成的结果
 * @throws TimeoutError - 超时时抛出
 * @throws Error - 任务失败时抛出
 *
 * @example
 * ```typescript
 * const result = await pollUntilComplete(
 *   'task123',
 *   async (id) => await checkVideoStatus(id)
 * );
 * ```
 */
export async function pollUntilComplete<T>(
  taskId: string,
  statusChecker: StatusChecker<T>,
  config: Partial<PollingConfig> = {}
): Promise<T> {
  // 参数验证
  if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
    throw new Error('Task ID is required');
  }

  if (!statusChecker || typeof statusChecker !== 'function') {
    throw new Error('Status checker function is required');
  }

  const {
    initialInterval,
    maxInterval,
    backoffFactor,
    timeout
  } = { ...DEFAULT_POLLING_CONFIG, ...config };

  const startTime = Date.now();
  let currentInterval = initialInterval;

  while (true) {
    // 检查是否超时
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime >= timeout) {
      throw new TimeoutError(
        `Polling timed out after ${formatDuration(timeout)}`
      );
    }

    // 查询任务状态
    try {
      const response = await statusChecker(taskId);

      // 处理不同类型的响应
      if (typeof response === 'object' && response !== null) {
        const { status, result, error } = response;

        // 任务完成
        if (status === 'completed') {
          if (!result) {
            throw new Error('任务完成但未返回结果');
          }
          return result;
        }

        // 任务失败
        if (status === 'failed') {
          throw new Error(error || '视频生成失败');
        }

        // 任务仍在处理中（pending 或 processing），继续轮询
        await sleep(currentInterval);
      } else {
        // 直接返回结果（兼容旧版本）
        return response as T;
      }

      // 计算下一次轮询间隔（指数退避）
      currentInterval = Math.min(
        currentInterval * backoffFactor,
        maxInterval
      );
    } catch (error) {
      // 如果是TimeoutError或任务失败错误，直接抛出
      if (error instanceof TimeoutError ||
          (error instanceof Error && error.message.includes('失败')) ||
          (error instanceof Error && error.message.includes('required'))) {
        throw error;
      }

      // 检查是否是statusChecker抛出的错误（应该直接抛出，不重试）
      if (error instanceof Error && (
        error.message.includes('Content policy violation') ||
        error.message.includes('Network connection failed') ||
        error.message.includes('Validation failed')
      )) {
        throw error;
      }

      // 其他错误（如网络错误）可能是暂时的，记录但继续重试
      console.warn(`轮询时发生错误: ${error}, 继续重试...`);
      await sleep(currentInterval);
      currentInterval = Math.min(
        currentInterval * backoffFactor,
        maxInterval
      );
    }
  }
}

/**
 * 带重试的轮询
 *
 * @template T - 结果类型
 * @param taskId - 任务ID
 * @param statusChecker - 状态查询函数
 * @param config - 轮询配置（可选）
 * @param maxRetries - 最大重试次数（默认3次）
 * @returns Promise<T> - 完成的结果
 * @throws TimeoutError - 超时时抛出
 * @throws Error - 重试次数用尽后抛出
 */
export async function pollWithRetry<T>(
  taskId: string,
  statusChecker: StatusChecker<T>,
  config: Partial<PollingConfig> = {},
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await pollUntilComplete(taskId, statusChecker, config);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 超时错误不重试
      if (lastError instanceof TimeoutError) {
        throw lastError;
      }

      // 如果还有重试机会，等待后继续
      if (attempt < maxRetries) {
        const retryDelay = 1000 * (attempt + 1); // 递增延迟
        console.warn(`轮询失败 (尝试 ${attempt + 1}/${maxRetries}), ${retryDelay}ms 后重试: ${lastError.message}`);
        await sleep(retryDelay);
      }
    }
  }

  // 所有重试都失败
  throw new Error(`轮询失败，已重试 ${maxRetries} 次: ${lastError?.message}`);
}
