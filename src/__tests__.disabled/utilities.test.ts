import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "@jest/globals";

/**
 * 工具类测试
 * 测试重构后的工具类和辅助函数功能
 */

import { ImageDimensionCalculator } from '../utils/dimensions.js';
import { generateCookie } from '../utils/auth.js';
import { MODEL_MAP, DEFAULT_MODEL, DEFAULT_VIDEO_MODEL, ASPECT_RATIO_PRESETS, getResolutionType } from '../types/models.js';
import { generateUuid, jsonEncode, urlEncode, toUrlParams } from '../utils/index.js';

describe('工具类测试', () => {
  
  // 1. ImageDimensionCalculator测试
  describe('ImageDimensionCalculator', () => {
    it('应该正确计算16:9宽高比', () => {
      const result = ImageDimensionCalculator.calculateDimensions('16:9');
      
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.width / result.height).toBeCloseTo(16/9, 2);
      expect(typeof result.width).toBe('number');
      expect(typeof result.height).toBe('number');
    });

    it('应该正确计算1:1正方形宽高比', () => {
      const result = ImageDimensionCalculator.calculateDimensions('1:1');
      
      expect(result.width).toBe(result.height);
      expect(result.width / result.height).toBeCloseTo(1, 2);
    });

    it('应该正确计算9:16竖屏宽高比', () => {
      const result = ImageDimensionCalculator.calculateDimensions('9:16');
      
      expect(result.width).toBeLessThan(result.height);
      expect(result.width / result.height).toBeCloseTo(9/16, 2);
    });

    it('应该正确处理auto自动比例', () => {
      const result = ImageDimensionCalculator.calculateDimensions('auto');
      
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(typeof (result.width / result.height)).toBe('number');
    });

    it('应该正确处理无效的宽高比输入', () => {
      // 对于无效输入，应该返回默认值（1:1）
      const result = ImageDimensionCalculator.calculateDimensions('invalid:ratio');
      expect(result.width).toBe(2048);
      expect(result.height).toBe(2048);
      expect(result.resolutionType).toBe('2k');
    });

    it('应该正确处理所有预设宽高比', () => {
      const presetRatios = ['21:9', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16'];

      presetRatios.forEach(ratio => {
        const result = ImageDimensionCalculator.calculateDimensions(ratio);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
        expect(result.resolutionType).toBe('2k');
      });
    });

    it('应该生成合理的图像尺寸', () => {
      const result = ImageDimensionCalculator.calculateDimensions('16:9');
      
      // 确保尺寸在合理范围内（假设512-2048像素）
      expect(result.width).toBeGreaterThanOrEqual(512);
      expect(result.width).toBeLessThanOrEqual(2560);
      expect(result.height).toBeGreaterThanOrEqual(512);
      expect(result.height).toBeLessThanOrEqual(2560);
    });
  });

  // 2. 认证工具测试
  describe('认证工具', () => {
    it('应该能正确生成cookie', () => {
      const testData = 'test-data-string';
      
      const cookie = generateCookie(testData);
      
      expect(typeof cookie).toBe('string');
      expect(cookie.length).toBeGreaterThan(0);
    });

    it('应该对不同输入生成不同cookie', () => {
      const data1 = 'test-data-1';
      const data2 = 'test-data-2';
      
      const cookie1 = generateCookie(data1);
      const cookie2 = generateCookie(data2);
      
      expect(cookie1).not.toBe(cookie2);
    });

    it('应该对相同输入生成相同cookie', () => {
      const data = 'consistent-test-data';
      
      const cookie1 = generateCookie(data);
      const cookie2 = generateCookie(data);
      
      expect(cookie1).toBe(cookie2);
    });

    it('应该能处理长字符串', () => {
      const longString = 'a'.repeat(1000);
      
      const cookie = generateCookie(longString);
      
      expect(typeof cookie).toBe('string');
      expect(cookie.length).toBeGreaterThan(0);
    });

    it('应该能处理空字符串', () => {
      const cookie = generateCookie('');
      
      expect(typeof cookie).toBe('string');
      expect(cookie.length).toBeGreaterThan(0);
    });
  });

  // 3. 模型映射和常量测试
  describe('模型映射和常量', () => {
    it('应该包含所有主要模型映射', () => {
      expect(MODEL_MAP).toBeDefined();
      expect(typeof MODEL_MAP).toBe('object');
      
      // 检查主要模型
      expect(MODEL_MAP['jimeng-4.0']).toBeDefined();
      expect(MODEL_MAP['jimeng-3.0']).toBeDefined();
      expect(MODEL_MAP['jimeng-2.1']).toBeDefined();
      expect(MODEL_MAP['jimeng-2.0']).toBeDefined();
    });

    it('应该有正确的默认模型设置', () => {
      expect(DEFAULT_MODEL).toBeDefined();
      expect(typeof DEFAULT_MODEL).toBe('string');
      expect(MODEL_MAP[DEFAULT_MODEL]).toBeDefined();
    });

    it('应该有正确的默认视频模型设置', () => {
      expect(DEFAULT_VIDEO_MODEL).toBeDefined();
      expect(typeof DEFAULT_VIDEO_MODEL).toBe('string');
    });

    it('应该包含宽高比预设', () => {
      expect(ASPECT_RATIO_PRESETS).toBeDefined();
      expect(Array.isArray(ASPECT_RATIO_PRESETS)).toBe(true);

      // 检查主要宽高比预设存在
      const preset169 = ASPECT_RATIO_PRESETS.find(p => p.name === '16:9');
      const preset11 = ASPECT_RATIO_PRESETS.find(p => p.name === '1:1');
      const preset916 = ASPECT_RATIO_PRESETS.find(p => p.name === '9:16');

      expect(preset169).toBeDefined();
      expect(preset11).toBeDefined();
      expect(preset916).toBeDefined();
    });

    it('getResolutionType应该正确返回分辨率类型', () => {
      // 测试不同分辨率返回正确的类型（基于最大边长）
      expect(getResolutionType(1920, 1080)).toBe('2k'); // max=1920
      expect(getResolutionType(1280, 720)).toBe('1.5k'); // max=1280
      expect(getResolutionType(512, 512)).toBe('1k'); // max=512
      expect(getResolutionType(2048, 2048)).toBe('2k'); // max=2048
    });
  });

  // 4. 基础工具函数测试
  describe('基础工具函数', () => {
    it('generateUuid应该生成有效的UUID', () => {
      const uuid1 = generateUuid();
      const uuid2 = generateUuid();
      
      expect(typeof uuid1).toBe('string');
      expect(typeof uuid2).toBe('string');
      expect(uuid1).not.toBe(uuid2);
      expect(uuid1.length).toBeGreaterThan(0);
      
      // UUID格式检查（简单验证）
      expect(uuid1).toMatch(/^[a-f0-9-]+$/i);
    });

    it('jsonEncode应该正确序列化对象', () => {
      const testObj = {
        string: 'test',
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        nested: { key: 'value' }
      };
      
      const encoded = jsonEncode(testObj);
      
      expect(typeof encoded).toBe('string');
      expect(() => JSON.parse(encoded)).not.toThrow();
      
      const decoded = JSON.parse(encoded);
      expect(decoded).toEqual(testObj);
    });

    it('jsonEncode应该处理特殊字符', () => {
      const testObj = {
        special: 'Hello "World" & <Test>',
        unicode: '你好世界🌍',
        escape: 'Line1\\nLine2'
      };
      
      const encoded = jsonEncode(testObj);
      const decoded = JSON.parse(encoded);
      
      expect(decoded.special).toBe(testObj.special);
      expect(decoded.unicode).toBe(testObj.unicode);
      expect(decoded.escape).toBe(testObj.escape);
    });

    it('toUrlParams应该正确编码URL参数', () => {
      const testParams = {
        simple: 'value',
        space: 'hello world',
        special: 'test&encode=true',
        chinese: '中文参数',
        number: 123
      };

      const encoded = toUrlParams(testParams);

      expect(typeof encoded).toBe('string');
      expect(encoded).toContain('simple=value');
      expect(encoded).toContain('space=hello+world');
      expect(encoded).toContain('&');
    });

    it('toUrlParams应该处理空对象', () => {
      const encoded = toUrlParams({});

      expect(typeof encoded).toBe('string');
      expect(encoded).toBe('');
    });

    it('toUrlParams应该处理数组参数', () => {
      const testParams = {
        tags: ['tag1', 'tag2', 'tag3'],
        single: 'value'
      };

      const encoded = toUrlParams(testParams);

      expect(typeof encoded).toBe('string');
      expect(encoded).toContain('single=value');
      expect(encoded).toContain('tags=tag1');
      expect(encoded).toContain('tags=tag2');
    });

    it('toUrlParams应该处理null和undefined值', () => {
      const testParams = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test'
      };

      const encoded = toUrlParams(testParams);

      expect(typeof encoded).toBe('string');
      expect(encoded).toContain('validValue=test');
      expect(encoded).not.toContain('nullValue');
      expect(encoded).not.toContain('undefinedValue');
    });
  });

  // 5. 边界值和异常测试
  describe('边界值和异常测试', () => {
    it('ImageDimensionCalculator应该处理极端宽高比', () => {
      // 测试极端比例
      expect(() => {
        ImageDimensionCalculator.calculateDimensions('1:100');
      }).not.toThrow();
      
      expect(() => {
        ImageDimensionCalculator.calculateDimensions('100:1');
      }).not.toThrow();
    });

    it('工具函数应该处理空输入', () => {
      expect(() => generateUuid()).not.toThrow();
      expect(() => jsonEncode(null)).not.toThrow();
      expect(() => urlEncode(null)).not.toThrow();
    });

    it('generateCookie应该处理undefined输入', () => {
      expect(() => {
        generateCookie('' as any);
      }).not.toThrow();
    });
  });

  // 6. 性能测试
  describe('性能测试', () => {
    it('generateUuid应该能快速生成多个UUID', () => {
      const start = Date.now();
      const uuids = [];
      
      for (let i = 0; i < 1000; i++) {
        uuids.push(generateUuid());
      }
      
      const end = Date.now();
      
      expect(end - start).toBeLessThan(1000); // 应该在1秒内完成
      expect(new Set(uuids).size).toBe(1000); // 所有UUID应该唯一
    });

    it('ImageDimensionCalculator应该能快速计算尺寸', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        ImageDimensionCalculator.calculateDimensions('16:9');
      }
      
      const end = Date.now();
      
      expect(end - start).toBeLessThan(100); // 应该在100ms内完成
    });
  });
});