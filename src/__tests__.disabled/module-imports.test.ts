import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "@jest/globals";

/**
 * 模块导入兼容性测试
 * 验证重构后的模块能够正确导入且保持100%向后兼容性
 */

describe('模块导入兼容性测试', () => {
  
  // 1. 测试主入口API函数导入
  describe('主入口API函数导入', () => {
    it('应该能正确导入generateImage函数', async () => {
      const { generateImage } = await import('../api.js');
      expect(typeof generateImage).toBe('function');
    });

    it('应该能正确导入generateVideo函数', async () => {
      const { generateVideo } = await import('../api.js');
      expect(typeof generateVideo).toBe('function');
    });

    it('应该能正确导入frameInterpolation函数', async () => {
      const { frameInterpolation } = await import('../api.js');
      expect(typeof frameInterpolation).toBe('function');
    });

    it('应该能正确导入superResolution函数', async () => {
      const { superResolution } = await import('../api.js');
      expect(typeof superResolution).toBe('function');
    });
  });

  // 2. 测试工具类导入
  describe('工具类导入', () => {
    it('应该能正确导入ImageDimensionCalculator', async () => {
      const { ImageDimensionCalculator } = await import('../api.js');
      expect(ImageDimensionCalculator).toBeDefined();
      expect(typeof ImageDimensionCalculator.calculateDimensions).toBe('function');
    });

    it('应该能正确导入generateCookie函数', async () => {
      const { generateCookie } = await import('../api.js');
      expect(typeof generateCookie).toBe('function');
    });
  });

  // 3. 测试类型定义导入
  describe('类型定义导入', () => {
    it('应该能正确导入JimengClient类', async () => {
      const { JimengClient } = await import('../api.js');
      expect(JimengClient).toBeDefined();
      expect(typeof JimengClient).toBe('function'); // 构造函数
    });
  });

  // 4. 测试常量导入
  describe('常量导入', () => {
    it('应该能从types/models导入MODEL_MAP', async () => {
      const { MODEL_MAP } = await import('../types/models.js');
      expect(MODEL_MAP).toBeDefined();
      expect(typeof MODEL_MAP).toBe('object');
      expect(MODEL_MAP['jimeng-4.0']).toBeDefined();
    });

    it('应该能从types/models导入ASPECT_RATIO_PRESETS', async () => {
      const { ASPECT_RATIO_PRESETS } = await import('../types/models.js');
      expect(ASPECT_RATIO_PRESETS).toBeDefined();
      expect(typeof ASPECT_RATIO_PRESETS).toBe('object');
    });
  });

  // 5. 测试分模块导入
  describe('分模块导入测试', () => {
    it('应该能从api/ApiClient导入基础API客户端', async () => {
      const { JimengApiClient } = await import('../api/ApiClient.js');
      expect(JimengApiClient).toBeDefined();
      expect(typeof JimengApiClient).toBe('function');
    });

    it('应该能从api/CreditService导入积分服务', async () => {
      const { CreditService } = await import('../api/CreditService.js');
      expect(CreditService).toBeDefined();
      expect(typeof CreditService).toBe('function');
    });

    it('应该能从api/JimengClient导入统一客户端', async () => {
      const { JimengClient } = await import('../api/JimengClient.js');
      expect(JimengClient).toBeDefined();
      expect(typeof JimengClient).toBe('function');
    });

    it('应该能从utils/dimensions导入尺寸计算器', async () => {
      const { ImageDimensionCalculator } = await import('../utils/dimensions.js');
      expect(ImageDimensionCalculator).toBeDefined();
      expect(typeof ImageDimensionCalculator.calculateDimensions).toBe('function');
    });

    it('应该能从utils/auth导入认证工具', async () => {
      const { generateCookie } = await import('../utils/auth.js');
      expect(typeof generateCookie).toBe('function');
    });
  });

  // 6. 测试类型定义模块导入
  describe('类型定义模块导入', () => {
    it('应该能从types/api.types导入接口定义', async () => {
      // 由于TypeScript类型在运行时不存在，我们测试模块能否正常导入
      const typesModule = await import('../types/api.types.js');
      expect(typesModule).toBeDefined();
    });

    it('应该能从types/models导入模型相关类型', async () => {
      const modelsModule = await import('../types/models.js');
      expect(modelsModule).toBeDefined();
      expect(modelsModule.MODEL_MAP).toBeDefined();
    });
  });

  // 7. 测试向后兼容性
  describe('向后兼容性验证', () => {
    it('主入口应该暴露所有原API函数', async () => {
      const apiModule = await import('../api.js');
      
      // 核心API函数
      expect(apiModule.generateImage).toBeDefined();
      expect(apiModule.generateVideo).toBeDefined();
      expect(apiModule.frameInterpolation).toBeDefined();
      expect(apiModule.superResolution).toBeDefined();
      
      // 工具类和函数
      expect(apiModule.ImageDimensionCalculator).toBeDefined();
      expect(apiModule.generateCookie).toBeDefined();
      expect(apiModule.JimengClient).toBeDefined();
    });

    it('index.ts应该能正确从api.js导入主要函数', async () => {
      const indexModule = await import('../index.js');
      
      expect(indexModule.generateImage).toBeDefined();
      expect(indexModule.generateVideo).toBeDefined();
      expect(indexModule.ImageDimensionCalculator).toBeDefined();
    });
  });
});