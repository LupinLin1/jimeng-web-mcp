/**
 * 废弃警告工具
 * 用于管理废弃方法的警告消息
 */

/**
 * 废弃警告配置
 */
export interface DeprecationConfig {
  /** 旧方法名 */
  oldMethod: string;
  /** 新方法名 */
  newMethod: string;
  /** 迁移指南URL */
  migrationGuideUrl?: string;
  /** 是否仅警告一次 */
  warnOnce?: boolean;
}

/**
 * 已警告过的方法集合（用于warnOnce功能）
 */
const warnedMethods = new Set<string>();

/**
 * 生成废弃警告消息
 *
 * @param config - 废弃配置
 * @returns 格式化的警告消息
 */
function formatWarningMessage(config: DeprecationConfig): string {
  const { oldMethod, newMethod, migrationGuideUrl } = config;

  let message = `[DEPRECATED] ${oldMethod}() is deprecated. Use ${newMethod}() instead.`;

  if (migrationGuideUrl) {
    message += `\nMigration guide: ${migrationGuideUrl}`;
  }

  return message;
}

/**
 * 显示废弃警告
 *
 * @param config - 废弃配置
 *
 * @example
 * ```typescript
 * deprecate({
 *   oldMethod: 'generateVideo',
 *   newMethod: 'generateTextToVideo',
 *   migrationGuideUrl: 'https://docs.example.com/migration',
 *   warnOnce: true
 * });
 * ```
 */
export function deprecate(config: DeprecationConfig): void {
  const { oldMethod, warnOnce = false } = config;

  // 如果设置了warnOnce且已经警告过，跳过
  if (warnOnce && warnedMethods.has(oldMethod)) {
    return;
  }

  // 显示警告
  console.warn(formatWarningMessage(config));

  // 如果设置了warnOnce，记录已警告
  if (warnOnce) {
    warnedMethods.add(oldMethod);
  }
}

/**
 * 清除警告记录（主要用于测试）
 *
 * @param method - 要清除的方法名，如果不提供则清除所有
 */
export function clearWarnings(method?: string): void {
  if (method) {
    warnedMethods.delete(method);
  } else {
    warnedMethods.clear();
  }
}

/**
 * 检查方法是否已经警告过
 *
 * @param method - 方法名
 * @returns 是否已警告
 */
export function hasWarned(method: string): boolean {
  return warnedMethods.has(method);
}

/**
 * 创建废弃包装函数
 *
 * @template T - 函数类型
 * @param config - 废弃配置
 * @param fn - 原始函数
 * @returns 包装后的函数（带废弃警告）
 *
 * @example
 * ```typescript
 * const oldFunction = wrapDeprecated(
 *   {
 *     oldMethod: 'oldFunc',
 *     newMethod: 'newFunc',
 *     warnOnce: true
 *   },
 *   originalFunction
 * );
 * ```
 */
export function wrapDeprecated<T extends (...args: any[]) => any>(
  config: DeprecationConfig,
  fn: T
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    deprecate(config);
    return fn(...args);
  }) as T;
}

/**
 * 常用废弃配置预设
 */
export const DEPRECATION_CONFIGS = {
  GENERATE_VIDEO_TO_TEXT_TO_VIDEO: {
    oldMethod: 'generateVideo',
    newMethod: 'generateTextToVideo',
    migrationGuideUrl: 'https://github.com/your-repo/docs/migration-guide.md#generatevideo',
    warnOnce: true
  },
  GENERATE_VIDEO_ASYNC_TO_ASYNC_PARAM: {
    oldMethod: 'generateVideoAsync',
    newMethod: 'generateTextToVideo (with async: true)',
    migrationGuideUrl: 'https://github.com/your-repo/docs/migration-guide.md#async',
    warnOnce: true
  },
  GENERATE_VIDEO_MULTI_FRAME: {
    oldMethod: 'generateVideo (with multiFrames)',
    newMethod: 'generateMultiFrameVideo',
    migrationGuideUrl: 'https://github.com/your-repo/docs/migration-guide.md#multiframes',
    warnOnce: true
  }
} as const;
