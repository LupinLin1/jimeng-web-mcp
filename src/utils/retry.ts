/**
 * 重试工具模块
 * 提供通用的重试逻辑、指数退避算法和错误分类
 */

/**
 * 重试配置选项
 */
export interface RetryOptions {
  maxRetries: number;        // 最大重试次数
  baseDelay: number;         // 基础延迟（毫秒）
  maxDelay: number;          // 最大延迟（毫秒）
  shouldRetry?: (error: any) => boolean;  // 自定义错误判断函数
}

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: isRetryableError
};

/**
 * 判断错误是否可重试（默认实现）
 */
export function isRetryableError(error: any): boolean {
  // 网络超时错误
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
    return true;
  }

  // Axios错误响应
  if (error.response) {
    const status = error.response.status;

    // 5xx服务器错误（临时性）
    if (status >= 500 && status < 600) {
      return true;
    }

    // 429 限流（可重试）
    if (status === 429) {
      return true;
    }

    // 4xx客户端错误（不可重试）
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // 网络请求错误（无响应）
  if (error.request && !error.response) {
    return true;
  }

  // 默认不重试
  return false;
}

/**
 * 计算指数退避延迟（带随机抖动）
 */
export function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  // 指数退避：baseDelay * 2^(attempt-1)
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);

  // 添加随机抖动（0-200ms），避免同时重试导致的雷击效应
  const jitter = Math.random() * 200;

  // 限制最大延迟
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 通用重试函数
 *
 * @param fn 需要重试的异步函数
 * @param options 重试配置选项
 * @param context 上下文描述（用于日志）
 * @returns 函数执行结果
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  context: string = '操作'
): Promise<T> {
  const config: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const { maxRetries, baseDelay, maxDelay, shouldRetry } = config;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // 执行函数
      const result = await fn();

      // 成功则返回
      if (attempt > 1) {
        // console.log(`[SUCCESS] [RETRY-SUCCESS] ${context}重试成功, 尝试次数=${attempt}/${maxRetries + 1}`);
      }
      return result;

    } catch (error) {
      lastError = error;

      // 判断是否应该重试
      const canRetry = shouldRetry ? shouldRetry(error) : isRetryableError(error);

      // 已达最大重试次数
      if (attempt > maxRetries) {
        console.error(`[FATAL] [RETRY-FATAL] ${context}重试失败, 已达最大重试次数=${maxRetries}, 错误=${error}`);
        throw error;
      }

      // 不可重试的错误
      if (!canRetry) {
        console.error(`[FATAL] [RETRY-SKIP] ${context}遇到不可重试错误, 立即失败, 错误=${error}`);
        throw error;
      }

      // 计算退避延迟
      const backoff = calculateBackoff(attempt, baseDelay, maxDelay);

      const err = error as Error;
      console.warn(
        `[RETRY] [RETRY-ATTEMPT] ${context}重试 ${attempt}/${maxRetries}, ` +
        `等待${Math.round(backoff)}ms, 错误=${err.message || err}`
      );

      // 等待后重试
      await sleep(backoff);
    }
  }

  // 理论上不会到达这里
  throw lastError;
}

/**
 * 创建带重试功能的函数装饰器
 *
 * @param options 重试配置
 * @returns 装饰后的函数
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: Partial<RetryOptions> = {},
  context?: string
): T {
  return (async (...args: any[]) => {
    const contextName = context || fn.name || '匿名函数';
    return retryAsync(() => fn(...args), options, contextName);
  }) as T;
}
