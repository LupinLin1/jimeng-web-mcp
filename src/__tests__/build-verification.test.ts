/**
 * 构建产物验证测试
 * 直接测试构建后的JavaScript模块以验证功能可用性
 */

describe('构建产物验证测试', () => {

  // 1. 验证构建产物存在
  describe('构建产物文件存在性', () => {
    it('lib/index.js应该存在', () => {
      const fs = require('fs');
      const path = require('path');
      
      const indexPath = path.join(__dirname, '../../lib/index.js');
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('lib/index.d.ts应该存在', () => {
      const fs = require('fs');
      const path = require('path');
      
      const dtsPath = path.join(__dirname, '../../lib/index.d.ts');
      expect(fs.existsSync(dtsPath)).toBe(true);
    });

    it('package.json应该包含正确的main字段', () => {
      const packageJson = require('../../package.json');
      expect(packageJson.main).toBe('lib/index.js');
      expect(packageJson.types).toBe('lib/index.d.ts');
    });
  });

  // 2. 基础模块导入测试
  describe('模块导入验证', () => {
    it('应该能够导入核心功能', async () => {
      // 使用CommonJS版本进行测试
      const builtModule = require('../../lib/index.cjs');
      
      expect(builtModule).toBeDefined();
      expect(typeof builtModule.generateImage).toBe('function');
      expect(typeof builtModule.generateVideo).toBe('function');
      expect(builtModule.ImageDimensionCalculator).toBeDefined();
    });

    it('ImageDimensionCalculator应该具有必要的方法', async () => {
      const builtModule = require('../../lib/index.cjs');
      const { ImageDimensionCalculator } = builtModule;
      
      expect(typeof ImageDimensionCalculator.calculateDimensions).toBe('function');
    });

    it('ASPECT_RATIO_PRESETS应该存在', async () => {
      const builtModule = require('../../lib/index.cjs');
      const { ASPECT_RATIO_PRESETS } = builtModule;
      
      expect(ASPECT_RATIO_PRESETS).toBeDefined();
      expect(Array.isArray(ASPECT_RATIO_PRESETS)).toBe(true);
    });
  });

  // 3. 基础功能验证
  describe('基础功能验证', () => {
    it('ImageDimensionCalculator应该能计算尺寸', async () => {
      const builtModule = require('../../lib/index.cjs');
      const { ImageDimensionCalculator } = builtModule;
      
      const result = ImageDimensionCalculator.calculateDimensions('16:9');
      
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(typeof result.width).toBe('number');
      expect(typeof result.height).toBe('number');
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('generateImage应该验证必需参数', async () => {
      const builtModule = require('../../lib/index.cjs');
      const { generateImage } = builtModule;
      
      // 测试缺少refresh_token
      await expect(generateImage({
        prompt: '测试图像'
      } as any)).rejects.toThrow('refresh_token is required');
    });

    it('generateVideo应该验证必需参数', async () => {
      const builtModule = require('../../lib/index.cjs');
      const { generateVideo } = builtModule;
      
      // 测试缺少refresh_token
      await expect(generateVideo({
        prompt: '测试视频'
      } as any)).rejects.toThrow('refresh_token is required');
    });
  });

  // 4. 类型定义验证
  describe('TypeScript类型定义验证', () => {
    it('应该存在类型定义文件', () => {
      const fs = require('fs');
      const path = require('path');
      
      const dtsPath = path.join(__dirname, '../../lib/index.d.ts');
      expect(fs.existsSync(dtsPath)).toBe(true);
      
      const dtsContent = fs.readFileSync(dtsPath, 'utf8');
      expect(dtsContent).toContain('generateImage');
      expect(dtsContent).toContain('generateVideo');
      expect(dtsContent).toContain('ImageDimensionCalculator');
    });

    it('类型定义应该导出主要接口', () => {
      const fs = require('fs');
      const path = require('path');
      
      const dtsPath = path.join(__dirname, '../../lib/index.d.ts');
      const dtsContent = fs.readFileSync(dtsPath, 'utf8');
      
      // 检查主要类型导出
      expect(dtsContent).toContain('export');
    });
  });

  // 5. 向后兼容性验证
  describe('向后兼容性验证', () => {
    it('主要API函数应该都可用', async () => {
      const builtModule = require('../../lib/index.cjs');
      
      // 核心API函数
      expect(typeof builtModule.generateImage).toBe('function');
      expect(typeof builtModule.generateVideo).toBe('function');
      
      // 工具类和常量
      expect(builtModule.ImageDimensionCalculator).toBeDefined();
      expect(builtModule.ASPECT_RATIO_PRESETS).toBeDefined();
    });

    it('应该能处理不同的参数格式', async () => {
      const builtModule = require('../../lib/index.cjs');
      const { ImageDimensionCalculator } = builtModule;
      
      // 测试不同的宽高比格式
      const testRatios = ['16:9', '1:1', '9:16', 'auto'];
      
      testRatios.forEach(ratio => {
        const result = ImageDimensionCalculator.calculateDimensions(ratio);
        expect(result).toHaveProperty('width');
        expect(result).toHaveProperty('height');
        expect(typeof result.width).toBe('number');
        expect(typeof result.height).toBe('number');
      });
    });
  });

  // 6. 错误处理验证
  describe('错误处理验证', () => {
    it('应该正确抛出缺少参数的错误', async () => {
      const builtModule = require('../../lib/index.cjs');
      const { generateImage, generateVideo } = builtModule;
      
      // 测试generateImage缺少参数
      await expect(generateImage(null as any)).rejects.toThrow();
      await expect(generateImage({} as any)).rejects.toThrow('refresh_token is required');
      
      // 测试generateVideo缺少参数
      await expect(generateVideo(null as any)).rejects.toThrow();
      await expect(generateVideo({} as any)).rejects.toThrow('refresh_token is required');
    });
  });
});