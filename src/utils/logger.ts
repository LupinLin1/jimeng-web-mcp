/**
 * Structured Logger Implementation
 *
 * Replaces ad-hoc console.log statements with level-based logging.
 * Supports DEBUG suppression and PII redaction.
 */

import { LogLevel } from '../types/constants.js';

interface LoggerConfig {
  minLevel: LogLevel;
  redactKeys: string[];
  enableTimestamps: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.DEBUG === 'true' ? LogLevel.DEBUG : LogLevel.INFO,
  redactKeys: [
    'token',
    'sessionid',
    'password',
    'api_key',
    'secret',
    'credential',
    'auth'
  ],
  enableTimestamps: true
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled(LogLevel.DEBUG)) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled(LogLevel.INFO)) {
      this.log(LogLevel.INFO, message, context);
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled(LogLevel.WARN)) {
      this.log(LogLevel.WARN, message, context);
    }
  }

  error(message: string, context?: Record<string, any>): void {
    if (this.isLevelEnabled(LogLevel.ERROR)) {
      this.log(LogLevel.ERROR, message, context, true);
    }
  }

  isLevelEnabled(level: LogLevel): boolean {
    // Check environment variable dynamically to support runtime changes (mainly for testing)
    const currentMinLevel = process.env.DEBUG === 'true' ? LogLevel.DEBUG : LogLevel.INFO;
    return level >= currentMinLevel;
  }

  /**
   * Reconfigure logger (mainly for testing)
   */
  reconfigure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    useStderr: boolean = false
  ): void {
    const levelName = LogLevel[level];
    const timestamp = this.config.enableTimestamps ? new Date().toISOString() : '';
    const sanitizedContext = context ? this.sanitizeContext(context) : undefined;

    let output = `[${levelName}]`;
    if (timestamp) {
      output = `${timestamp} ${output}`;
    }
    output += ` ${message}`;

    if (sanitizedContext) {
      output += ` ${JSON.stringify(sanitizedContext)}`;
    }

    // 🔇 MCP服务器：所有日志输出到stderr，避免破坏stdio的JSON-RPC通信
    // MCP协议使用stdout进行JSON-RPC通信，任何非JSON-RPC的stdout输出都会导致连接失败
    process.stderr.write(output + '\n');
  }

  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      // Check if key should be redacted
      const shouldRedact = this.config.redactKeys.some(
        redactKey => key.toLowerCase().includes(redactKey.toLowerCase())
      );

      sanitized[key] = shouldRedact ? '[REDACTED]' : value;
    }

    return sanitized;
  }
}

// Export singleton instance
export const logger = new Logger();
