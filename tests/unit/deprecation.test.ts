import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { deprecate, resetWarnings, getWarnedMethods, DeprecationConfig } from '../../src/utils/deprecation.js';

describe('Deprecation Utils', () => {
  let consoleSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    resetWarnings();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    resetWarnings();
  });

  describe('deprecate', () => {
    it('should show warning for deprecated method', () => {
      const config: DeprecationConfig = {
        oldMethod: 'oldGenerateVideo',
        newMethod: 'generateTextToVideo',
        version: '2.0.0',
        removalVersion: '3.0.0'
      };

      deprecate(config);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] oldGenerateVideo is deprecated')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Use generateTextToVideo instead')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deprecated in: 2.0.0')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removal planned for: 3.0.0')
      );
    });

    it('should not show warning when warnOnce is true and method already warned', () => {
      const config: DeprecationConfig = {
        oldMethod: 'alreadyWarnedMethod',
        newMethod: 'newMethod',
        warnOnce: true
      };

      // 第一次调用应该显示警告
      deprecate(config);
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      // 第二次调用不应该显示警告
      deprecate(config);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should show warning every time when warnOnce is false', () => {
      const config: DeprecationConfig = {
        oldMethod: 'repeatedWarnMethod',
        newMethod: 'newMethod',
        warnOnce: false
      };

      deprecate(config);
      deprecate(config);
      deprecate(config);

      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle deprecation without new method', () => {
      const config: DeprecationConfig = {
        oldMethod: 'removedMethod',
        version: '2.0.0',
        removalVersion: '3.0.0'
      };

      deprecate(config);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] removedMethod is deprecated')
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Use')
      );
    });

    it('should handle deprecation without version info', () => {
      const config: DeprecationConfig = {
        oldMethod: 'noVersionMethod',
        newMethod: 'newMethod'
      };

      deprecate(config);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] noVersionMethod is deprecated')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Use newMethod instead')
      );
    });

    it('should handle additional notes', () => {
      const config: DeprecationConfig = {
        oldMethod: 'methodWithNotes',
        newMethod: 'newMethod',
        notes: 'This method will be completely removed in next major release'
      };

      deprecate(config);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Note: This method will be completely removed in next major release')
      );
    });

    it('should validate required oldMethod parameter', () => {
      expect(() => deprecate({} as DeprecationConfig)).toThrow('oldMethod is required');
      expect(() => deprecate({ oldMethod: '' } as DeprecationConfig)).toThrow('oldMethod is required');
    });
  });

  describe('resetWarnings', () => {
    it('should clear all warned methods', () => {
      const config1: DeprecationConfig = {
        oldMethod: 'method1',
        newMethod: 'new1',
        warnOnce: true
      };

      const config2: DeprecationConfig = {
        oldMethod: 'method2',
        newMethod: 'new2',
        warnOnce: true
      };

      // 触发警告
      deprecate(config1);
      deprecate(config2);
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      // 重置警告
      resetWarnings();

      // 再次调用应该显示警告
      deprecate(config1);
      deprecate(config2);
      expect(consoleSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('getWarnedMethods', () => {
    it('should return list of warned methods', () => {
      const config1: DeprecationConfig = {
        oldMethod: 'warnedMethod1',
        newMethod: 'new1',
        warnOnce: true
      };

      const config2: DeprecationConfig = {
        oldMethod: 'warnedMethod2',
        newMethod: 'new2',
        warnOnce: true
      };

      // 初始状态应该为空
      expect(getWarnedMethods()).toEqual(new Set());

      // 触发警告
      deprecate(config1);
      expect(getWarnedMethods()).toEqual(new Set(['warnedMethod1']));

      deprecate(config2);
      expect(getWarnedMethods()).toEqual(new Set(['warnedMethod1', 'warnedMethod2']));
    });

    it('should not include methods when warnOnce is false', () => {
      const config: DeprecationConfig = {
        oldMethod: 'noWarnOnceMethod',
        newMethod: 'new',
        warnOnce: false
      };

      deprecate(config);
      deprecate(config);

      // warnOnce为false的方法不应该被记录
      expect(getWarnedMethods()).toEqual(new Set());
    });
  });

  describe('Warning Message Format', () => {
    it('should format complete warning message correctly', () => {
      const config: DeprecationConfig = {
        oldMethod: 'generateVideoLegacy',
        newMethod: 'generateTextToVideo',
        version: '2.1.0',
        removalVersion: '3.0.0',
        notes: 'The new method provides better async support and error handling'
      };

      deprecate(config);

      const warningMessage = consoleSpy.mock.calls[0][0];

      expect(warningMessage).toContain('[DEPRECATED] generateVideoLegacy is deprecated');
      expect(warningMessage).toContain('Use generateTextToVideo instead');
      expect(warningMessage).toContain('Deprecated in: 2.1.0');
      expect(warningMessage).toContain('Removal planned for: 3.0.0');
      expect(warningMessage).toContain('Note: The new method provides better async support and error handling');
    });

    it('should handle minimal configuration', () => {
      const config: DeprecationConfig = {
        oldMethod: 'minimalMethod'
      };

      deprecate(config);

      const warningMessage = consoleSpy.mock.calls[0][0];
      expect(warningMessage).toContain('[DEPRECATED] minimalMethod is deprecated');
      expect(warningMessage).toContain('This method will be removed in a future version');
    });
  });
});