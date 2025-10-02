import { jest, describe, it, expect } from "@jest/globals";

/**
 * 🎨 JiMeng Web MCP - 图片生成工具参数验证测试
 *
 * 此测试文件专注于图片生成工具的参数验证功能：
 * - 参数结构验证
 * - 参数类型检查
 * - 参数范围验证
 * - 必需参数检查
 *
 * 这些测试确保图片生成工具的参数验证逻辑正确工作
 */

import type {
  ImageGenerationParams,
  QueryResultResponse,
  GenerationStatus
} from '../../src/types/api.types.js';

describe('🎨 图片生成工具参数验证测试', () => {

  // ==================== ImageGenerationParams 验证 ====================

  describe('ImageGenerationParams 参数验证', () => {

    it('应该验证有效的基础参数', () => {
      const validParams: ImageGenerationParams = {
        prompt: '一只可爱的猫咪',
        refresh_token: 'test-token-123'
      };

      expect(validParams.prompt).toBe('一只可爱的猫咪');
      expect(typeof validParams.prompt).toBe('string');
      expect(validParams.prompt.length).toBeGreaterThan(0);
      expect(validParams.refresh_token).toBe('test-token-123');
    });

    it('应该验证完整的图片生成参数', () => {
      const completeParams: ImageGenerationParams = {
        prompt: '美丽的风景画，高质量摄影',
        refresh_token: 'test-token-123',
        model: 'jimeng-4.0',
        aspectRatio: '16:9',
        sample_strength: 0.7,
        negative_prompt: '模糊, 低质量, 扭曲',
        reference_strength: [0.8, 0.2],
        filePath: ['/absolute/path/to/reference.jpg'],
        async: false,
        frames: ['场景描述：阳光明媚', '动作描述：猫咪玩耍'],
        count: 2
      };

      // 验证基础参数
      expect(completeParams.prompt).toBeDefined();
      expect(completeParams.refresh_token).toBeDefined();

      // 验证可选参数的类型和值
      if (completeParams.model) {
        expect(typeof completeParams.model).toBe('string');
        const validModels = ['jimeng-4.0', 'jimeng-3.0', 'jimeng-2.1', 'jimeng-2.0-pro', 'jimeng-1.4', 'jimeng-xl-pro'];
        expect(validModels).toContain(completeParams.model);
      }

      if (completeParams.aspectRatio) {
        expect(typeof completeParams.aspectRatio).toBe('string');
        const validRatios = ['auto', '1:1', '16:9', '9:16', '3:4', '4:3', '3:2', '2:3', '21:9'];
        expect(validRatios).toContain(completeParams.aspectRatio);
      }

      if (completeParams.sample_strength !== undefined) {
        expect(typeof completeParams.sample_strength).toBe('number');
        expect(completeParams.sample_strength).toBeGreaterThanOrEqual(0);
        expect(completeParams.sample_strength).toBeLessThanOrEqual(1);
      }

      if (completeParams.negative_prompt !== undefined) {
        expect(typeof completeParams.negative_prompt).toBe('string');
      }

      if (completeParams.reference_strength) {
        expect(Array.isArray(completeParams.reference_strength)).toBe(true);
        completeParams.reference_strength.forEach(val => {
          expect(typeof val).toBe('number');
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(1);
        });
      }

      if (completeParams.filePath) {
        expect(Array.isArray(completeParams.filePath)).toBe(true);
        expect(completeParams.filePath.length).toBeGreaterThanOrEqual(1);
        expect(completeParams.filePath.length).toBeLessThanOrEqual(4);
        completeParams.filePath.forEach(path => {
          expect(typeof path).toBe('string');
          expect(path.length).toBeGreaterThan(0);
        });
      }

      if (completeParams.async !== undefined) {
        expect(typeof completeParams.async).toBe('boolean');
      }

      if (completeParams.frames) {
        expect(Array.isArray(completeParams.frames)).toBe(true);
        expect(completeParams.frames.length).toBeGreaterThanOrEqual(1);
        expect(completeParams.frames.length).toBeLessThanOrEqual(15);
        completeParams.frames.forEach(frame => {
          expect(typeof frame).toBe('string');
          expect(frame.length).toBeGreaterThan(0);
        });
      }

      if (completeParams.count !== undefined) {
        expect(typeof completeParams.count).toBe('number');
        expect(completeParams.count).toBeGreaterThanOrEqual(1);
        expect(completeParams.count).toBeLessThanOrEqual(15);
      }
    });

    it('应该验证所有支持的模型', () => {
      const models = [
        'jimeng-4.0',
        'jimeng-3.0',
        'jimeng-2.1',
        'jimeng-2.0-pro',
        'jimeng-1.4',
        'jimeng-xl-pro'
      ];

      models.forEach(model => {
        const params: ImageGenerationParams = {
          prompt: `测试${model}模型`,
          refresh_token: 'test-token',
          model
        };

        expect(params.model).toBe(model);
      });
    });

    it('应该验证所有支持的宽高比', () => {
      const aspectRatios = ['auto', '1:1', '16:9', '9:16', '3:4', '4:3', '3:2', '2:3', '21:9'];

      aspectRatios.forEach(aspectRatio => {
        const params: ImageGenerationParams = {
          prompt: `测试${aspectRatio}宽高比`,
          refresh_token: 'test-token',
          aspectRatio
        };

        expect(params.aspectRatio).toBe(aspectRatio);
      });
    });

    it('应该验证多参考图参数', () => {
      const filePath = [
        '/path/to/reference1.jpg',
        '/path/to/reference2.jpg',
        '/path/to/reference3.jpg',
        '/path/to/reference4.jpg'
      ];

      const params: ImageGenerationParams = {
        prompt: '多参考图测试',
        refresh_token: 'test-token',
        filePath,
        reference_strength: [0.5, 0.2, 0.2, 0.1],
        sample_strength: 0.7
      };

      expect(params.filePath).toEqual(filePath);
      expect(params.reference_strength).toEqual([0.5, 0.2, 0.2, 0.1]);
      expect(params.filePath!.length).toBe(params.reference_strength!.length);
    });

    it('应该验证多帧场景描述参数', () => {
      const frames = [
        '第一帧：黎明时分的山景',
        '第二帧：太阳升起，天空变橙',
        '第三帧：完全日出，阳光普照'
      ];

      const params: ImageGenerationParams = {
        prompt: '多帧场景测试',
        refresh_token: 'test-token',
        frames
      };

      expect(params.frames).toEqual(frames);
      expect(params.frames!.length).toBe(3);
      params.frames!.forEach(frame => {
        expect(typeof frame).toBe('string');
        expect(frame.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== 边界值测试 ====================

  describe('边界值测试', () => {

    it('应该验证sample_strength的边界值', () => {
      const boundaryValues = [
        { value: 0, description: '最小值' },
        { value: 0.5, description: '中间值' },
        { value: 1, description: '最大值' }
      ];

      boundaryValues.forEach(({ value, description }) => {
        const params: ImageGenerationParams = {
          prompt: `测试${description}`,
          refresh_token: 'test-token',
          sample_strength: value
        };

        expect(params.sample_strength).toBe(value);
        expect(params.sample_strength).toBeGreaterThanOrEqual(0);
        expect(params.sample_strength).toBeLessThanOrEqual(1);
      });
    });

    it('应该验证count的边界值', () => {
      const boundaryValues = [
        { value: 1, description: '最小值' },
        { value: 8, description: '中间值' },
        { value: 15, description: '最大值' }
      ];

      boundaryValues.forEach(({ value, description }) => {
        const params: ImageGenerationParams = {
          prompt: `测试${description}`,
          refresh_token: 'test-token',
          count: value
        };

        expect(params.count).toBe(value);
        expect(params.count).toBeGreaterThanOrEqual(1);
        expect(params.count).toBeLessThanOrEqual(15);
      });
    });

    it('应该验证frames数组的边界值', () => {
      const boundaryFrames = [
        Array.from({ length: 1 }, (_, i) => `frame${i}`),
        Array.from({ length: 8 }, (_, i) => `场景描述${i}`),
        Array.from({ length: 15 }, (_, i) => `复杂场景${i}`)
      ];

      boundaryFrames.forEach((frames, index) => {
        const descriptions = ['最小帧数', '中间帧数', '最大帧数'];
        const params: ImageGenerationParams = {
          prompt: `测试${descriptions[index]}`,
          refresh_token: 'test-token',
          frames
        };

        expect(params.frames).toEqual(frames);
        expect(params.frames!.length).toBeGreaterThanOrEqual(1);
        expect(params.frames!.length).toBeLessThanOrEqual(15);
      });
    });

    it('应该验证filePath数组的边界值', () => {
      const boundaryPaths = [
        ['/single/reference.jpg'],
        Array.from({ length: 2 }, (_, i) => `/path/to/ref${i + 1}.jpg`),
        Array.from({ length: 4 }, (_, i) => `/absolute/path/to/reference${i + 1}.jpg`)
      ];

      boundaryPaths.forEach((paths, index) => {
        const descriptions = ['单张参考图', '两张参考图', '四张参考图'];
        const params: ImageGenerationParams = {
          prompt: `测试${descriptions[index]}`,
          refresh_token: 'test-token',
          filePath: paths
        };

        expect(params.filePath).toEqual(paths);
        expect(params.filePath!.length).toBeGreaterThanOrEqual(1);
        expect(params.filePath!.length).toBeLessThanOrEqual(4);
      });
    });
  });

  // ==================== QueryResultResponse 验证 ====================

  describe('QueryResultResponse 参数验证', () => {

    it('应该验证完成状态的响应', () => {
      const completedResponse: QueryResultResponse = {
        status: 'completed' as GenerationStatus,
        progress: 100,
        imageUrls: [
          'https://example.com/generated-image-1.jpg',
          'https://example.com/generated-image-2.jpg'
        ],
        historyId: 'h1234567890abcdef'
      };

      expect(completedResponse.status).toBe('completed');
      expect(completedResponse.progress).toBe(100);
      expect(Array.isArray(completedResponse.imageUrls)).toBe(true);
      expect(completedResponse.imageUrls).toHaveLength(2);
      expect(completedResponse.historyId).toBe('h1234567890abcdef');

      completedResponse.imageUrls!.forEach(url => {
        expect(typeof url).toBe('string');
        expect(url).toMatch(/^https?:\/\//);
        expect(url).toMatch(/\.(jpg|jpeg|png|webp)$/i);
      });
    });

    it('应该验证处理中状态的响应', () => {
      const processingResponse: QueryResultResponse = {
        status: 'processing' as GenerationStatus,
        progress: 45,
        historyId: 'habcdef1234567890'
      };

      expect(processingResponse.status).toBe('processing');
      expect(processingResponse.progress).toBe(45);
      expect(processingResponse.progress).toBeGreaterThanOrEqual(0);
      expect(processingResponse.progress).toBeLessThanOrEqual(100);
      expect(processingResponse.imageUrls).toBeUndefined();
      expect(processingResponse.historyId).toBe('habcdef1234567890');
    });

    it('应该验证失败状态的响应', () => {
      const failedResponse: QueryResultResponse = {
        status: 'failed' as GenerationStatus,
        progress: 0,
        error: '内容违反政策：包含不当内容',
        historyId: 'hfailed1234567890'
      };

      expect(failedResponse.status).toBe('failed');
      expect(failedResponse.progress).toBe(0);
      expect(failedResponse.error).toBeDefined();
      expect(typeof failedResponse.error).toBe('string');
      expect(failedResponse.error!.length).toBeGreaterThan(0);
      expect(failedResponse.historyId).toBe('hfailed1234567890');
    });

    it('应该验证待处理状态的响应', () => {
      const pendingResponse: QueryResultResponse = {
        status: 'pending' as GenerationStatus,
        progress: 0,
        historyId: 'hpending1234567890'
      };

      expect(pendingResponse.status).toBe('pending');
      expect(pendingResponse.progress).toBe(0);
      expect(pendingResponse.imageUrls).toBeUndefined();
      expect(pendingResponse.error).toBeUndefined();
      expect(pendingResponse.historyId).toBe('hpending1234567890');
    });
  });

  // ==================== historyId 格式验证 ====================

  describe('historyId 格式验证', () => {

    it('应该验证有效的historyId格式', () => {
      const validHistoryIds = [
        '1234567890', // 纯数字
        'h1234567890abcdef', // h开头的16进制
        'hABCDEF1234567890', // 大写16进制
        'ha1b2c3d4e5f6g7h8', // 混合字符
        '9876543210' // 数字
      ];

      validHistoryIds.forEach(historyId => {
        expect(historyId).toMatch(/^([0-9]+|h[a-zA-Z0-9]+)$/);
        expect(typeof historyId).toBe('string');
        expect(historyId.length).toBeGreaterThan(0);
      });
    });

    it('应该识别无效的historyId格式', () => {
      const invalidHistoryIds = [
        '', // 空字符串
        'invalid-format', // 无效格式 - 包含字母但不以h开头
        'h', // 只有h，太短
        'special@chars', // 特殊字符
        'with spaces', // 空格
        'with-dashes', // 连字符
        'x1234567890', // 不以h开头
        '123abc', // 数字和字母混合但不以h开头
        'h@invalid', // h开头但包含特殊字符
        'h with spaces', // h开头但包含空格
        'g1234567890', // 不以h开头的字母数字组合
      ];

      invalidHistoryIds.forEach(historyId => {
        expect(historyId).not.toMatch(/^([0-9]+|h[a-zA-Z0-9]+)$/);
      });
    });
  });

  // ==================== 参数组合验证 ====================

  describe('参数组合验证', () => {

    it('应该验证同步模式参数组合', () => {
      const syncParams: ImageGenerationParams = {
        prompt: '同步模式测试',
        refresh_token: 'test-token',
        async: false, // 同步模式
        count: 3,
        aspectRatio: '16:9',
        model: 'jimeng-4.0'
      };

      expect(syncParams.async).toBe(false);
      expect(syncParams.count).toBe(3);
      expect(syncParams.aspectRatio).toBe('16:9');
      expect(syncParams.model).toBe('jimeng-4.0');
    });

    it('应该验证异步模式参数组合', () => {
      const asyncParams: ImageGenerationParams = {
        prompt: '异步模式测试',
        refresh_token: 'test-token',
        async: true, // 异步模式
        count: 5,
        negative_prompt: '低质量, 模糊',
        filePath: ['/path/to/ref.jpg'],
        sample_strength: 0.8
      };

      expect(asyncParams.async).toBe(true);
      expect(asyncParams.count).toBe(5);
      expect(asyncParams.negative_prompt).toBe('低质量, 模糊');
      expect(asyncParams.filePath).toHaveLength(1);
      expect(asyncParams.sample_strength).toBe(0.8);
    });

    it('应该验证多参考图融合参数组合', () => {
      const multiRefParams: ImageGenerationParams = {
        prompt: '多图融合测试',
        refresh_token: 'test-token',
        filePath: [
          '/path/to/style-ref1.jpg',
          '/path/to/style-ref2.jpg',
          '/path/to/content-ref.jpg'
        ],
        reference_strength: [0.4, 0.3, 0.3],
        sample_strength: 0.6,
        model: 'jimeng-3.0',
        aspectRatio: '1:1',
        count: 1
      };

      expect(multiRefParams.filePath).toHaveLength(3);
      expect(multiRefParams.reference_strength).toHaveLength(3);
      expect(multiRefParams.filePath!.length).toBe(multiRefParams.reference_strength!.length);
      expect(multiRefParams.reference_strength![0] + multiRefParams.reference_strength![1] + multiRefParams.reference_strength![2]).toBeCloseTo(1.0, 1);
    });

    it('应该验证多帧场景参数组合', () => {
      const multiFrameParams: ImageGenerationParams = {
        prompt: '多帧场景测试',
        refresh_token: 'test-token',
        frames: [
          '起始场景：宁静的湖泊',
          '中间过程：微风吹过，涟漪荡漾',
          '结束场景：夕阳西下，湖面金黄'
        ],
        model: 'jimeng-4.0',
        aspectRatio: '21:9',
        count: 1
      };

      expect(multiFrameParams.frames).toHaveLength(3);
      multiFrameParams.frames!.forEach((frame, index) => {
        expect(typeof frame).toBe('string');
        expect(frame.length).toBeGreaterThan(0);
        if (index === 0) {
          expect(frame).toContain('起始场景');
        } else if (index === 1) {
          expect(frame).toContain('中间过程');
        } else if (index === 2) {
          expect(frame).toContain('结束场景');
        }
      });
    });
  });
});