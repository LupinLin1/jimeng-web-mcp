/**
 * 废弃警告测试
 *
 * 目的：验证废弃警告工具的功能和旧方法的废弃提示
 * 依据：/specs/005-3-1-2/spec.md - FR-016, FR-017
 *       src/utils/deprecation.ts
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  deprecate,
  clearWarnings,
  hasWarned,
  wrapDeprecated,
  DEPRECATION_CONFIGS,
  type DeprecationConfig
} from '../src/utils/deprecation.js';

describe('Deprecation Warning Tests', () => {
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    // Mock console.warn
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // 清除所有警告记录
    clearWarnings();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    clearWarnings();
  });

  // ==================== deprecate()函数测试 ====================

  describe('deprecate() Function', () => {
    test('应该显示废弃警告消息', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'generateVideo',
        newMethod: 'generateTextToVideo'
      };

      // Act
      deprecate(config);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED]')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('generateVideo()')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('generateTextToVideo()')
      );
    });

    test('应该在警告中包含迁移指南URL（如果提供）', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'generateVideo',
        newMethod: 'generateTextToVideo',
        migrationGuideUrl: 'https://example.com/migration'
      };

      // Act
      deprecate(config);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Migration guide:.*https:\/\/example\.com\/migration/)
      );
    });

    test('warnOnce=false时应每次都显示警告', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'testMethod',
        newMethod: 'newMethod',
        warnOnce: false
      };

      // Act
      deprecate(config);
      deprecate(config);
      deprecate(config);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledTimes(3);
    });

    test('warnOnce=true时应只显示一次警告', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'testMethod',
        newMethod: 'newMethod',
        warnOnce: true
      };

      // Act
      deprecate(config);
      deprecate(config);
      deprecate(config);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    test('默认warnOnce应为false', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'testMethod',
        newMethod: 'newMethod'
        // warnOnce未指定，默认false
      };

      // Act
      deprecate(config);
      deprecate(config);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== hasWarned()函数测试 ====================

  describe('hasWarned() Function', () => {
    test('初始状态应返回false', () => {
      // Act & Assert
      expect(hasWarned('anyMethod')).toBe(false);
    });

    test('warnOnce警告后应返回true', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'testMethod',
        newMethod: 'newMethod',
        warnOnce: true
      };

      // Act
      deprecate(config);

      // Assert
      expect(hasWarned('testMethod')).toBe(true);
    });

    test('非warnOnce警告后应返回false', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'testMethod',
        newMethod: 'newMethod',
        warnOnce: false
      };

      // Act
      deprecate(config);

      // Assert
      expect(hasWarned('testMethod')).toBe(false);
    });
  });

  // ==================== clearWarnings()函数测试 ====================

  describe('clearWarnings() Function', () => {
    test('应该清除特定方法的警告记录', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'testMethod',
        newMethod: 'newMethod',
        warnOnce: true
      };

      deprecate(config);
      expect(hasWarned('testMethod')).toBe(true);

      // Act
      clearWarnings('testMethod');

      // Assert
      expect(hasWarned('testMethod')).toBe(false);
    });

    test('应该清除所有警告记录（不传参数时）', () => {
      // Arrange
      deprecate({
        oldMethod: 'method1',
        newMethod: 'new1',
        warnOnce: true
      });
      deprecate({
        oldMethod: 'method2',
        newMethod: 'new2',
        warnOnce: true
      });

      expect(hasWarned('method1')).toBe(true);
      expect(hasWarned('method2')).toBe(true);

      // Act
      clearWarnings();

      // Assert
      expect(hasWarned('method1')).toBe(false);
      expect(hasWarned('method2')).toBe(false);
    });
  });

  // ==================== wrapDeprecated()函数测试 ====================

  describe('wrapDeprecated() Function', () => {
    test('应该返回包装后的函数', () => {
      // Arrange
      const originalFn = (x: number) => x * 2;
      const config: DeprecationConfig = {
        oldMethod: 'oldFunc',
        newMethod: 'newFunc'
      };

      // Act
      const wrappedFn = wrapDeprecated(config, originalFn);

      // Assert
      expect(typeof wrappedFn).toBe('function');
    });

    test('包装函数应显示警告并调用原函数', () => {
      // Arrange
      const originalFn = jest.fn((x: number) => x * 2);
      const config: DeprecationConfig = {
        oldMethod: 'oldFunc',
        newMethod: 'newFunc'
      };

      // Act
      const wrappedFn = wrapDeprecated(config, originalFn);
      const result = wrappedFn(5);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(originalFn).toHaveBeenCalledWith(5);
      expect(result).toBe(10);
    });

    test('包装函数应正确传递参数和返回值', () => {
      // Arrange
      const originalFn = (a: number, b: string, c: boolean) => `${a}-${b}-${c}`;
      const config: DeprecationConfig = {
        oldMethod: 'oldFunc',
        newMethod: 'newFunc'
      };

      // Act
      const wrappedFn = wrapDeprecated(config, originalFn);
      const result = wrappedFn(42, 'test', true);

      // Assert
      expect(result).toBe('42-test-true');
    });

    test('包装异步函数应正常工作', async () => {
      // Arrange
      const originalFn = async (x: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x * 2;
      };
      const config: DeprecationConfig = {
        oldMethod: 'oldAsyncFunc',
        newMethod: 'newAsyncFunc'
      };

      // Act
      const wrappedFn = wrapDeprecated(config, originalFn);
      const result = await wrappedFn(5);

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(result).toBe(10);
    });
  });

  // ==================== 预设配置测试 ====================

  describe('DEPRECATION_CONFIGS Presets', () => {
    test('应该包含GENERATE_VIDEO_TO_TEXT_TO_VIDEO配置', () => {
      // Assert
      expect(DEPRECATION_CONFIGS.GENERATE_VIDEO_TO_TEXT_TO_VIDEO).toBeDefined();
      expect(DEPRECATION_CONFIGS.GENERATE_VIDEO_TO_TEXT_TO_VIDEO).toMatchObject({
        oldMethod: 'generateVideo',
        newMethod: 'generateTextToVideo',
        warnOnce: true
      });
      expect(DEPRECATION_CONFIGS.GENERATE_VIDEO_TO_TEXT_TO_VIDEO.migrationGuideUrl).toBeDefined();
    });

    test('应该包含GENERATE_VIDEO_ASYNC_TO_ASYNC_PARAM配置', () => {
      // Assert
      expect(DEPRECATION_CONFIGS.GENERATE_VIDEO_ASYNC_TO_ASYNC_PARAM).toBeDefined();
      expect(DEPRECATION_CONFIGS.GENERATE_VIDEO_ASYNC_TO_ASYNC_PARAM).toMatchObject({
        oldMethod: 'generateVideoAsync',
        newMethod: expect.stringContaining('async'),
        warnOnce: true
      });
    });

    test('应该包含GENERATE_VIDEO_MULTI_FRAME配置', () => {
      // Assert
      expect(DEPRECATION_CONFIGS.GENERATE_VIDEO_MULTI_FRAME).toBeDefined();
      expect(DEPRECATION_CONFIGS.GENERATE_VIDEO_MULTI_FRAME).toMatchObject({
        oldMethod: expect.stringContaining('multiFrames'),
        newMethod: 'generateMultiFrameVideo',
        warnOnce: true
      });
    });

    test('所有预设配置都应默认warnOnce=true', () => {
      // Assert
      const configs = Object.values(DEPRECATION_CONFIGS);
      configs.forEach(config => {
        expect(config.warnOnce).toBe(true);
      });
    });

    test('所有预设配置都应包含迁移指南URL', () => {
      // Assert
      const configs = Object.values(DEPRECATION_CONFIGS);
      configs.forEach(config => {
        expect(config.migrationGuideUrl).toBeDefined();
        expect(config.migrationGuideUrl).toMatch(/^https?:\/\//);
      });
    });
  });

  // ==================== 消息格式测试 ====================

  describe('Warning Message Format', () => {
    test('警告消息应包含[DEPRECATED]标签', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'oldMethod',
        newMethod: 'newMethod'
      };

      // Act
      deprecate(config);

      // Assert
      expect(consoleWarnSpy.mock.calls[0][0]).toMatch(/^\[DEPRECATED\]/);
    });

    test('警告消息应包含旧方法名和新方法名', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'generateVideo',
        newMethod: 'generateTextToVideo'
      };

      // Act
      deprecate(config);

      // Assert
      const message = consoleWarnSpy.mock.calls[0][0];
      expect(message).toContain('generateVideo()');
      expect(message).toContain('generateTextToVideo()');
    });

    test('警告消息应包含"is deprecated"和"Use ... instead"', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'oldMethod',
        newMethod: 'newMethod'
      };

      // Act
      deprecate(config);

      // Assert
      const message = consoleWarnSpy.mock.calls[0][0];
      expect(message).toMatch(/is deprecated/i);
      expect(message).toMatch(/Use .* instead/i);
    });

    test('有迁移指南时应在新行显示', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'oldMethod',
        newMethod: 'newMethod',
        migrationGuideUrl: 'https://example.com/guide'
      };

      // Act
      deprecate(config);

      // Assert
      const message = consoleWarnSpy.mock.calls[0][0];
      expect(message).toMatch(/\n.*Migration guide:/);
    });
  });

  // ==================== 边界情况测试 ====================

  describe('Edge Cases', () => {
    test('应该处理空字符串方法名', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: '',
        newMethod: 'newMethod'
      };

      // Act & Assert
      expect(() => deprecate(config)).not.toThrow();
    });

    test('应该处理极长的方法名', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'a'.repeat(1000),
        newMethod: 'b'.repeat(1000)
      };

      // Act & Assert
      expect(() => deprecate(config)).not.toThrow();
    });

    test('应该处理特殊字符的方法名', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'method<T>()',
        newMethod: 'new_method$123'
      };

      // Act & Assert
      expect(() => deprecate(config)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('clearWarnings()不存在的方法不应抛出错误', () => {
      // Act & Assert
      expect(() => clearWarnings('nonExistentMethod')).not.toThrow();
    });

    test('多次clearWarnings()同一方法不应抛出错误', () => {
      // Act & Assert
      expect(() => {
        clearWarnings('testMethod');
        clearWarnings('testMethod');
        clearWarnings('testMethod');
      }).not.toThrow();
    });
  });

  // ==================== 并发测试 ====================

  describe('Concurrency', () => {
    test('多个方法的warnOnce应独立工作', () => {
      // Arrange
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

      // Act
      deprecate(config1);
      deprecate(config2);
      deprecate(config1); // 不应显示
      deprecate(config2); // 不应显示

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
      expect(hasWarned('method1')).toBe(true);
      expect(hasWarned('method2')).toBe(true);
    });

    test('wrapDeprecated应与deprecate共享警告状态', () => {
      // Arrange
      const config: DeprecationConfig = {
        oldMethod: 'testMethod',
        newMethod: 'newMethod',
        warnOnce: true
      };

      const originalFn = () => 'result';
      const wrappedFn = wrapDeprecated(config, originalFn);

      // Act
      deprecate(config); // 第一次警告
      wrappedFn();        // 不应警告（已记录）

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
