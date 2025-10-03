/**
 * Logger Test Suite
 *
 * TDD Red Phase: These tests MUST FAIL initially
 * Expected to pass after implementing src/utils/logger.ts (T011)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { logger } from '../../src/utils/logger.js';
import { LogLevel } from '../../src/types/constants.js';

describe('Logger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleOutput: string[] = [];
  let originalStdoutWrite: any;
  let originalStderrWrite: any;

  beforeEach(() => {
    originalEnv = { ...process.env };
    consoleOutput = [];

    // Capture console output
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;

    process.stdout.write = ((chunk: any) => {
      consoleOutput.push(chunk.toString());
      return true;
    }) as any;

    process.stderr.write = ((chunk: any) => {
      consoleOutput.push(chunk.toString());
      return true;
    }) as any;
  });

  afterEach(() => {
    process.env = originalEnv;
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  describe('Level-based Filtering', () => {
    it('should suppress DEBUG logs when DEBUG=false', () => {
      process.env.DEBUG = 'false';

      logger.debug('This should be suppressed');

      const hasDebugLog = consoleOutput.some(line => line.includes('[DEBUG]'));
      expect(hasDebugLog).toBe(false);
    });

    it('should show DEBUG logs when DEBUG=true', () => {
      process.env.DEBUG = 'true';

      logger.debug('This should be visible');

      const hasDebugLog = consoleOutput.some(line =>
        line.includes('[DEBUG]') && line.includes('This should be visible')
      );
      expect(hasDebugLog).toBe(true);
    });

    it('should always show INFO logs', () => {
      process.env.DEBUG = 'false';

      logger.info('Info message');

      const hasInfoLog = consoleOutput.some(line =>
        line.includes('[INFO]') && line.includes('Info message')
      );
      expect(hasInfoLog).toBe(true);
    });

    it('should always show WARN logs', () => {
      process.env.DEBUG = 'false';

      logger.warn('Warning message');

      const hasWarnLog = consoleOutput.some(line =>
        line.includes('[WARN]') && line.includes('Warning message')
      );
      expect(hasWarnLog).toBe(true);
    });

    it('should always show ERROR logs', () => {
      process.env.DEBUG = 'false';

      logger.error('Error message');

      const hasErrorLog = consoleOutput.some(line =>
        line.includes('[ERROR]') && line.includes('Error message')
      );
      expect(hasErrorLog).toBe(true);
    });
  });

  describe('Structured Context', () => {
    it('should include context in log output', () => {
      process.env.DEBUG = 'true';

      logger.info('User action', { userId: '123', action: 'login' });

      const hasContext = consoleOutput.some(line =>
        line.includes('userId') && line.includes('123')
      );
      expect(hasContext).toBe(true);
    });

    it('should handle logs without context', () => {
      process.env.DEBUG = 'true';

      logger.info('Simple message');

      const hasMessage = consoleOutput.some(line =>
        line.includes('[INFO]') && line.includes('Simple message')
      );
      expect(hasMessage).toBe(true);
    });
  });

  describe('PII Redaction', () => {
    it('should redact token from context', () => {
      process.env.DEBUG = 'true';

      logger.info('API request', { token: 'secret123', userId: '456' });

      const hasRedactedToken = consoleOutput.some(line =>
        line.includes('[REDACTED]') && !line.includes('secret123')
      );
      expect(hasRedactedToken).toBe(true);
    });

    it('should redact sessionid from context', () => {
      process.env.DEBUG = 'true';

      logger.debug('Session data', { sessionid: 'abc123', user: 'test' });

      const hasRedactedSession = consoleOutput.some(line =>
        line.includes('[REDACTED]') && !line.includes('abc123')
      );
      expect(hasRedactedSession).toBe(true);
    });

    it('should redact password from context', () => {
      process.env.DEBUG = 'true';

      logger.warn('Login attempt', { password: 'hunter2', username: 'admin' });

      const hasRedactedPassword = consoleOutput.some(line =>
        line.includes('[REDACTED]') && !line.includes('hunter2')
      );
      expect(hasRedactedPassword).toBe(true);
    });

    it('should preserve non-sensitive fields', () => {
      process.env.DEBUG = 'true';

      logger.info('Request', {
        token: 'secret',
        model: 'jimeng-4.0',
        count: 6
      });

      const hasModel = consoleOutput.some(line =>
        line.includes('jimeng-4.0')
      );
      expect(hasModel).toBe(true);
    });
  });

  describe('Level Check', () => {
    it('should return true for enabled levels', () => {
      process.env.DEBUG = 'true';

      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(true);
      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(true);
    });

    it('should return false for DEBUG when DEBUG=false', () => {
      process.env.DEBUG = 'false';

      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(false);
      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(true);
    });
  });
});
