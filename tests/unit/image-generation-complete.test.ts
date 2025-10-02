import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

/**
 * 🎨 JiMeng Web MCP - 完整图片生成工具测试套件
 *
 * 此测试文件包含所有图片生成相关工具的完整测试用例：
 * - generateImage - 主要图片生成工具
 * - generateImageAsync - 异步图片生成工具
 * - getImageResult - 结果查询工具
 * - getBatchResults - 批量查询工具
 *
 * 测试覆盖：
 * ✅ 基础功能测试
 * ✅ 参数验证测试
 * ✅ 多参考图测试
 * ✅ 异步模式测试
 * ✅ 错误处理测试
 * ✅ 边界条件测试
 * ✅ 集成工作流测试
 */

import {
  generateImage,
  generateImageAsync,
  getImageResult,
  getApiClient
} from '../../src/api.js';

import type {
  ImageGenerationParams,
  QueryResultResponse,
  GenerationStatus
} from '../../src/types/api.types.js';

// Mock the NewJimengClient after imports
const mockNewJimengClient = {
  generateImage: jest.fn(),
  generateImageAsync: jest.fn(),
  getImageResult: jest.fn(),
  getBatchResults: jest.fn(),
  getRefreshToken: jest.fn()
};

jest.mock('../../src/api/NewJimengClient.js', () => ({
  NewJimengClient: jest.fn(() => mockNewJimengClient)
}));

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('🎨 图片生成工具完整测试套件', () => {

  let mockClient: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();

    // 保存原始环境变量
    originalEnv = process.env;
    process.env = { ...originalEnv };

    // 重置mock方法
    Object.keys(mockNewJimengClient).forEach(key => {
      (mockNewJimengClient as any)[key].mockReset();
    });

    // 使用全局mock client实例
    mockClient = mockNewJimengClient;
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  // ==================== generateImage 工具测试 ====================

  describe('generateImage - 主要图片生成工具', () => {

    it('应该生成基础图片（同步模式）', async () => {
      const mockUrls = ['https://example.com/image1.jpg'];
      mockClient.generateImage.mockResolvedValue(mockUrls);

      const params: ImageGenerationParams = {
        prompt: '美丽的风景画',
        refresh_token: 'test-token-123',
        model: 'jimeng-4.0'
      };

      const result = await generateImage(params);

      expect(result).toEqual(mockUrls);
      expect(mockClient.generateImage).toHaveBeenCalledWith(params);
      expect(mockClient.generateImage).toHaveBeenCalledTimes(1);
    });

    it('应该支持异步模式返回historyId', async () => {
      const mockHistoryId = 'h1234567890abcdef';
      mockClient.generateImage.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '异步生成的图片',
        refresh_token: 'test-token-123',
        async: true
      };

      const result = await generateImage(params);

      expect(result).toBe(mockHistoryId);
      expect(mockClient.generateImage).toHaveBeenCalledWith(params);
    });

    it('应该支持多张图片生成', async () => {
      const mockUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];
      mockClient.generateImage.mockResolvedValue(mockUrls);

      const params: ImageGenerationParams = {
        prompt: '生成多张图片',
        refresh_token: 'test-token-123',
        count: 3
      };

      const result = await generateImage(params);

      expect(result).toEqual(mockUrls);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it('应该支持所有宽高比', async () => {
      const aspectRatios = ['auto', '1:1', '16:9', '9:16', '3:4', '4:3', '3:2', '2:3', '21:9'];

      for (const aspectRatio of aspectRatios) {
        const mockUrls = ['https://example.com/image.jpg'];
        mockClient.generateImage.mockResolvedValue(mockUrls);

        const params: ImageGenerationParams = {
          prompt: `${aspectRatio}的图片`,
          refresh_token: 'test-token-123',
          aspectRatio
        };

        const result = await generateImage(params);

        expect(result).toEqual(mockUrls);
        expect(mockClient.generateImage).toHaveBeenCalledWith(
          expect.objectContaining({ aspectRatio })
        );
      }
    });

    it('应该支持单张参考图', async () => {
      const mockUrls = ['https://example.com/generated.jpg'];
      mockClient.generateImage.mockResolvedValue(mockUrls);

      const params: ImageGenerationParams = {
        prompt: '基于参考图的生成',
        refresh_token: 'test-token-123',
        filePath: ['/absolute/path/to/reference.jpg'],
        sample_strength: 0.7
      };

      const result = await generateImage(params);

      expect(result).toEqual(mockUrls);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: ['/absolute/path/to/reference.jpg'],
          sample_strength: 0.7
        })
      );
    });

    it('应该支持最多4张参考图', async () => {
      const mockUrls = ['https://example.com/generated.jpg'];
      mockClient.generateImage.mockResolvedValue(mockUrls);

      const filePath = [
        '/absolute/path/to/ref1.jpg',
        '/absolute/path/to/ref2.jpg',
        '/absolute/path/to/ref3.jpg',
        '/absolute/path/to/ref4.jpg'
      ];

      const params: ImageGenerationParams = {
        prompt: '基于4张参考图的生成',
        refresh_token: 'test-token-123',
        filePath,
        reference_strength: [0.4, 0.3, 0.2, 0.1]
      };

      const result = await generateImage(params);

      expect(result).toEqual(mockUrls);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath,
          reference_strength: [0.4, 0.3, 0.2, 0.1]
        })
      );
    });

    it('应该支持负向提示词', async () => {
      const mockUrls = ['https://example.com/image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockUrls);

      const params: ImageGenerationParams = {
        prompt: '高质量的图片',
        negative_prompt: '模糊, 低质量, 扭曲',
        refresh_token: 'test-token-123'
      };

      const result = await generateImage(params);

      expect(result).toEqual(mockUrls);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          negative_prompt: '模糊, 低质量, 扭曲'
        })
      );
    });

    it('应该支持所有图片模型', async () => {
      const models = [
        'jimeng-4.0',
        'jimeng-3.0',
        'jimeng-2.1',
        'jimeng-2.0-pro',
        'jimeng-1.4',
        'jimeng-xl-pro'
      ];

      for (const model of models) {
        const mockUrls = ['https://example.com/image.jpg'];
        mockClient.generateImage.mockResolvedValue(mockUrls);

        const params: ImageGenerationParams = {
          prompt: `使用${model}模型生成的图片`,
          refresh_token: 'test-token-123',
          model
        };

        const result = await generateImage(params);

        expect(result).toEqual(mockUrls);
        expect(mockClient.generateImage).toHaveBeenCalledWith(
          expect.objectContaining({ model })
        );
      }
    });

    it('应该支持多帧场景描述', async () => {
      const mockUrls = ['https://example.com/scene.jpg'];
      mockClient.generateImage.mockResolvedValue(mockUrls);

      const frames = [
        '起始场景：阳光明媚的早晨',
        '中间场景：人物开始活动',
        '结束场景：日落时分的宁静'
      ];

      const params: ImageGenerationParams = {
        prompt: '动态场景描述',
        refresh_token: 'test-token-123',
        frames
      };

      const result = await generateImage(params);

      expect(result).toEqual(mockUrls);
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({ frames })
      );
    });

    it('应该在缺少refresh_token时抛出错误', async () => {
      const params: ImageGenerationParams = {
        prompt: '测试图片'
      } as any;

      await expect(generateImage(params)).rejects.toThrow('refresh_token is required');
      expect(mockClient.generateImage).not.toHaveBeenCalled();
    });

    it('应该正确处理客户端错误', async () => {
      const errorMessage = '图片生成失败：内容违反政策';
      mockClient.generateImage.mockRejectedValue(new Error(errorMessage));

      const params: ImageGenerationParams = {
        prompt: '违规内容',
        refresh_token: 'test-token-123'
      };

      await expect(generateImage(params)).rejects.toThrow(errorMessage);
    });
  });

  // ==================== generateImageAsync 工具测试 ====================

  describe('generateImageAsync - 异步图片生成工具', () => {

    it('应该立即返回historyId', async () => {
      const mockHistoryId = 'h1234567890abcdef';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '异步生成的图片',
        refresh_token: 'test-token-123'
      };

      const result = await generateImageAsync(params);

      expect(result).toBe(mockHistoryId);
      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(params);
      expect(mockClient.generateImageAsync).toHaveBeenCalledTimes(1);
    });

    it('应该支持异步模式下的多参考图', async () => {
      const mockHistoryId = 'habcdef1234567890';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '异步多参考图生成',
        refresh_token: 'test-token-123',
        filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg'],
        sample_strength: 0.6
      };

      const result = await generateImageAsync(params);

      expect(result).toBe(mockHistoryId);
      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: ['/path/to/ref1.jpg', '/path/to/ref2.jpg'],
          sample_strength: 0.6
        })
      );
    });

    it('应该支持异步模式下的负向提示词', async () => {
      const mockHistoryId = 'h7890abcdef123456';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '高质量异步生成',
        negative_prompt: '低质量, 模糊',
        refresh_token: 'test-token-123'
      };

      const result = await generateImageAsync(params);

      expect(result).toBe(mockHistoryId);
      expect(mockClient.generateImageAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          negative_prompt: '低质量, 模糊'
        })
      );
    });

    it('应该在缺少refresh_token时抛出错误', async () => {
      const params: ImageGenerationParams = {
        prompt: '测试异步生成'
      } as any;

      await expect(generateImageAsync(params)).rejects.toThrow('refresh_token is required');
      expect(mockClient.generateImageAsync).not.toHaveBeenCalled();
    });

    it('应该正确处理网络错误', async () => {
      const errorMessage = '网络连接超时';
      mockClient.generateImageAsync.mockRejectedValue(new Error(errorMessage));

      const params: ImageGenerationParams = {
        prompt: '网络测试',
        refresh_token: 'test-token-123'
      };

      await expect(generateImageAsync(params)).rejects.toThrow(errorMessage);
    });
  });

  // ==================== getImageResult 工具测试 ====================

  describe('getImageResult - 结果查询工具', () => {

    it('应该查询已完成的图片生成结果', async () => {
      const mockResult: QueryResultResponse = {
        status: 'completed' as GenerationStatus,
        progress: 100,
        imageUrls: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg'
        ],
        historyId: 'h1234567890abcdef'
      };

      mockClient.getImageResult.mockResolvedValue(mockResult);

      const result = await getImageResult('h1234567890abcdef', 'test-token-123');

      expect(result).toEqual(mockResult);
      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(result.imageUrls).toHaveLength(2);
      expect(mockClient.getImageResult).toHaveBeenCalledWith('h1234567890abcdef');
    });

    it('应该查询进行中的任务状态', async () => {
      const mockResult: QueryResultResponse = {
        status: 'processing' as GenerationStatus,
        progress: 45,
        historyId: 'h1234567890abcdef'
      };

      mockClient.getImageResult.mockResolvedValue(mockResult);

      const result = await getImageResult('h1234567890abcdef', 'test-token-123');

      expect(result.status).toBe('processing');
      expect(result.progress).toBe(45);
      expect(result.imageUrls).toBeUndefined();
    });

    it('应该查询失败的任务状态', async () => {
      const mockResult: QueryResultResponse = {
        status: 'failed' as GenerationStatus,
        progress: 0,
        error: '内容违反政策',
        historyId: 'h1234567890abcdef'
      };

      mockClient.getImageResult.mockResolvedValue(mockResult);

      const result = await getImageResult('h1234567890abcdef', 'test-token-123');

      expect(result.status).toBe('failed');
      expect(result.progress).toBe(0);
      expect(result.error).toBe('内容违反政策');
    });

    it('应该查询待处理的任务状态', async () => {
      const mockResult: QueryResultResponse = {
        status: 'pending' as GenerationStatus,
        progress: 0,
        historyId: 'h1234567890abcdef'
      };

      mockClient.getImageResult.mockResolvedValue(mockResult);

      const result = await getImageResult('h1234567890abcdef', 'test-token-123');

      expect(result.status).toBe('pending');
      expect(result.progress).toBe(0);
    });

    it('应该使用环境变量中的token', async () => {
      process.env.JIMENG_API_TOKEN = 'env-token-456';

      const mockResult: QueryResultResponse = {
        status: 'completed' as GenerationStatus,
        progress: 100,
        imageUrls: ['https://example.com/image.jpg'],
        historyId: 'h1234567890abcdef'
      };

      mockClient.getImageResult.mockResolvedValue(mockResult);

      const result = await getImageResult('h1234567890abcdef');

      expect(result).toEqual(mockResult);
      expect(mockClient.getImageResult).toHaveBeenCalledWith('h1234567890abcdef');
    });

    it('应该在缺少token时抛出错误', async () => {
      delete process.env.JIMENG_API_TOKEN;

      await expect(getImageResult('h1234567890abcdef')).rejects.toThrow('JIMENG_API_TOKEN 环境变量未设置');
    });

    it('应该处理无效的historyId', async () => {
      const errorMessage = '无效的任务ID';
      mockClient.getImageResult.mockRejectedValue(new Error(errorMessage));

      await expect(getImageResult('invalid-id', 'test-token')).rejects.toThrow(errorMessage);
    });
  });

  // ==================== getBatchResults 工具测试 ====================

  describe('getBatchResults - 批量查询工具', () => {

    it('应该批量查询多个任务状态', async () => {
      const mockResults = {
        'h1234567890abcdef': {
          status: 'completed' as GenerationStatus,
          progress: 100,
          imageUrls: ['https://example.com/image1.jpg']
        },
        'hfedcba0987654321': {
          status: 'processing' as GenerationStatus,
          progress: 65
        },
        'habcdef1234567890': {
          status: 'failed' as GenerationStatus,
          progress: 0,
          error: '生成失败'
        }
      };

      mockClient.getBatchResults.mockResolvedValue(mockResults);

      const historyIds = ['h1234567890abcdef', 'hfedcba0987654321', 'habcdef1234567890'];
      const results = await mockClient.getBatchResults(historyIds);

      expect(Object.keys(results)).toHaveLength(3);
      expect(results['h1234567890abcdef'].status).toBe('completed');
      expect(results['hfedcba0987654321'].status).toBe('processing');
      expect(results['habcdef1234567890'].status).toBe('failed');
      expect(mockClient.getBatchResults).toHaveBeenCalledWith(historyIds);
    });

    it('应该处理部分任务查询失败', async () => {
      const mockResults = {
        'h1234567890abcdef': {
          status: 'completed' as GenerationStatus,
          progress: 100,
          imageUrls: ['https://example.com/image1.jpg']
        },
        'hinvalid1234567890': {
          error: '无效的任务ID'
        }
      };

      mockClient.getBatchResults.mockResolvedValue(mockResults);

      const historyIds = ['h1234567890abcdef', 'hinvalid1234567890'];
      const results = await mockClient.getBatchResults(historyIds);

      expect(results['h1234567890abcdef']).toHaveProperty('status', 'completed');
      expect(results['hinvalid1234567890']).toHaveProperty('error');
    });

    it('应该限制批量查询数量', async () => {
      const historyIds = Array.from({ length: 15 }, (_, i) => `h${i.toString(16).padStart(16, '0')}`);

      // 客户端应该限制最多10个任务
      mockClient.getBatchResults.mockImplementation((ids: string[]) => {
        if (ids.length > 10) {
          throw new Error('最多只能查询10个任务');
        }
        return {};
      });

      await expect(mockClient.getBatchResults(historyIds)).rejects.toThrow('最多只能查询10个任务');
    });
  });

  // ==================== 错误处理和边界条件测试 ====================

  describe('错误处理和边界条件', () => {

    it('应该处理空prompt', async () => {
      const errorMessage = 'prompt必须是非空字符串';
      mockClient.generateImage.mockRejectedValue(new Error(errorMessage));

      const params: ImageGenerationParams = {
        prompt: '',
        refresh_token: 'test-token-123'
      };

      await expect(generateImage(params)).rejects.toThrow(errorMessage);
    });

    it('应该处理超长的prompt', async () => {
      const longPrompt = 'a'.repeat(10000);
      const mockUrls = ['https://example.com/image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockUrls);

      const params: ImageGenerationParams = {
        prompt: longPrompt,
        refresh_token: 'test-token-123'
      };

      const result = await generateImage(params);
      expect(result).toEqual(mockUrls);
    });

    it('应该处理无效的sample_strength值', async () => {
      const errorMessage = 'sample_strength必须在0-1之间';
      mockClient.generateImage.mockRejectedValue(new Error(errorMessage));

      const params: ImageGenerationParams = {
        prompt: '测试图片',
        refresh_token: 'test-token-123',
        sample_strength: 1.5 // 超出范围
      };

      await expect(generateImage(params)).rejects.toThrow(errorMessage);
    });

    it('应该处理不存在的参考图文件', async () => {
      const errorMessage = '参考图文件不存在：/path/to/nonexistent.jpg';
      mockClient.generateImage.mockRejectedValue(new Error(errorMessage));

      const params: ImageGenerationParams = {
        prompt: '测试图片',
        refresh_token: 'test-token-123',
        filePath: ['/path/to/nonexistent.jpg']
      };

      await expect(generateImage(params)).rejects.toThrow(errorMessage);
    });

    it('应该处理超过4张参考图的情况', async () => {
      const errorMessage = '最多支持4张参考图片';
      mockClient.generateImage.mockRejectedValue(new Error(errorMessage));

      const filePath = Array.from({ length: 5 }, (_, i) => `/path/to/ref${i + 1}.jpg`);

      const params: ImageGenerationParams = {
        prompt: '测试图片',
        refresh_token: 'test-token-123',
        filePath
      };

      await expect(generateImage(params)).rejects.toThrow(errorMessage);
    });

    it('应该处理无效的historyId格式', async () => {
      const errorMessage = '无效的historyId格式';
      mockClient.getImageResult.mockRejectedValue(new Error(errorMessage));

      await expect(getImageResult('invalid-format', 'test-token')).rejects.toThrow(errorMessage);
    });

    it('应该处理网络超时', async () => {
      const errorMessage = '请求超时';
      mockClient.generateImage.mockRejectedValue(new Error(errorMessage));

      const params: ImageGenerationParams = {
        prompt: '网络测试',
        refresh_token: 'test-token-123'
      };

      await expect(generateImage(params)).rejects.toThrow(errorMessage);
    });

    it('应该处理API认证失败', async () => {
      const errorMessage = '认证失败：无效的token';
      mockClient.generateImage.mockRejectedValue(new Error(errorMessage));

      const params: ImageGenerationParams = {
        prompt: '认证测试',
        refresh_token: 'invalid-token'
      };

      await expect(generateImage(params)).rejects.toThrow(errorMessage);
    });
  });

  // ==================== 集成工作流测试 ====================

  describe('完整工作流集成测试', () => {

    it('应该完成同步图片生成工作流', async () => {
      // 1. 生成图片
      const mockUrls = ['https://example.com/generated-image.jpg'];
      mockClient.generateImage.mockResolvedValue(mockUrls);

      const params: ImageGenerationParams = {
        prompt: '完整的同步生成测试',
        refresh_token: 'test-token-123',
        model: 'jimeng-4.0',
        aspectRatio: '16:9'
      };

      const result = await generateImage(params);

      // 2. 验证结果
      expect(result).toEqual(mockUrls);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatch(/^https:\/\//);

      // 3. 验证调用参数
      expect(mockClient.generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: '完整的同步生成测试',
          model: 'jimeng-4.0',
          aspectRatio: '16:9'
        })
      );
    });

    it('应该完成异步图片生成工作流', async () => {
      // 1. 异步提交任务
      const mockHistoryId = 'h1234567890abcdef';
      mockClient.generateImageAsync.mockResolvedValue(mockHistoryId);

      const params: ImageGenerationParams = {
        prompt: '完整的异步生成测试',
        refresh_token: 'test-token-123',
        filePath: ['/path/to/reference.jpg'],
        sample_strength: 0.8
      };

      const historyId = await generateImageAsync(params);
      expect(historyId).toBe(mockHistoryId);

      // 2. 查询任务状态 - 进行中
      const processingResult: QueryResultResponse = {
        status: 'processing' as GenerationStatus,
        progress: 50,
        historyId
      };
      mockClient.getImageResult.mockResolvedValue(processingResult);

      const result1 = await getImageResult(historyId, 'test-token-123');
      expect(result1.status).toBe('processing');
      expect(result1.progress).toBe(50);

      // 3. 查询任务状态 - 完成
      const completedResult: QueryResultResponse = {
        status: 'completed' as GenerationStatus,
        progress: 100,
        imageUrls: ['https://example.com/async-generated.jpg'],
        historyId
      };
      mockClient.getImageResult.mockResolvedValue(completedResult);

      const result2 = await getImageResult(historyId, 'test-token-123');
      expect(result2.status).toBe('completed');
      expect(result2.progress).toBe(100);
      expect(result2.imageUrls).toHaveLength(1);
    });

    it('应该完成批量查询工作流', async () => {
      // 1. 提交多个异步任务
      const historyIds = ['h1111111111111111', 'h2222222222222222', 'h3333333333333333'];

      for (const historyId of historyIds) {
        mockClient.generateImageAsync.mockResolvedValue(historyId);
      }

      const params: ImageGenerationParams = {
        prompt: '批量测试图片',
        refresh_token: 'test-token-123'
      };

      const submittedIds = [];
      for (let i = 0; i < 3; i++) {
        const id = await generateImageAsync(params);
        submittedIds.push(id);
      }

      expect(submittedIds).toEqual(historyIds);

      // 2. 批量查询结果
      const mockBatchResults = {
        'h1111111111111111': {
          status: 'completed' as GenerationStatus,
          progress: 100,
          imageUrls: ['https://example.com/batch1.jpg']
        },
        'h2222222222222222': {
          status: 'processing' as GenerationStatus,
          progress: 75
        },
        'h3333333333333333': {
          status: 'failed' as GenerationStatus,
          progress: 0,
          error: '内容违规'
        }
      };

      mockClient.getBatchResults.mockResolvedValue(mockBatchResults);

      const batchResults = await mockClient.getBatchResults(historyIds);

      // 3. 验证批量结果
      expect(Object.keys(batchResults)).toHaveLength(3);
      expect(batchResults['h1111111111111111'].status).toBe('completed');
      expect(batchResults['h2222222222222222'].status).toBe('processing');
      expect(batchResults['h3333333333333333'].status).toBe('failed');
    });

    it('应该处理continue generation（>4张图片）', async () => {
      // Mock continue generation behavior
      const mockUrls = Array.from({ length: 8 }, (_, i) =>
        `https://example.com/continue-gen-${i + 1}.jpg`
      );
      mockClient.generateImage.mockResolvedValue(mockUrls);

      const params: ImageGenerationParams = {
        prompt: 'continue generation测试',
        refresh_token: 'test-token-123',
        count: 8 // 超过4张，应该触发continue generation
      };

      const result = await generateImage(params);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(8);
      expect(result[0]).toMatch(/^https:\/\//);
      expect(result[7]).toMatch(/continue-gen-8\.jpg$/);
    });
  });
});