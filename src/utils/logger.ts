/**
 * 简单的日志工具，支持环境变量控制
 */

const DEBUG_MODE = process.env.JIMENG_DEBUG === 'true' || process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: any[]) => {
    if (DEBUG_MODE) {
      console.error('🚀 [DEBUG]', ...args);
    }
  },
  
  info: (...args: any[]) => {
    console.log('ℹ️ [INFO]', ...args);
  },
  
  warn: (...args: any[]) => {
    console.warn('⚠️ [WARN]', ...args);
  },
  
  error: (...args: any[]) => {
    console.error('❌ [ERROR]', ...args);
  }
};