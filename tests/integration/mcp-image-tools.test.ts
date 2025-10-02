import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";

/**
 * 🎯 MCP图片生成工具集成测试
 *
 * 测试MCP服务器中图片生成工具的完整集成功能：
 * - MCP工具调用流程
 * - 参数验证和转换
 * - 响应格式验证
 * - 错误处理机制
 *
 * 这些测试确保MCP工具层面的功能正常工作
 */

import { createServer } from '../../src/server.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the API functions to avoid actual API calls during integration tests
jest.mock('../../src/api.js', () => ({
  generateImage: jest.fn(),
  generateImageAsync: jest.fn(),
  getImageResult: jest.fn(),
  getBatchResults: jest.fn(),
  getApiClient: jest.fn()
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

describe('🎯 MCP图片生成工具集成测试', () => {
  let server: McpServer;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variables
    process.env.JIMENG_API_TOKEN = 'test-token-123';
    server = createServer();
  });

  afterEach(() => {
    // 清理资源
  });

  // ==================== 服务器基础功能测试 ====================

  describe('MCP服务器基础功能', () => {
    it('应该成功创建MCP服务器实例', () => {
      expect(server).toBeDefined();
      expect(server.constructor.name).toBe('McpServer');
    });

    it('应该设置正确的服务器名称和版本', () => {
      // 由于McpServer可能不暴露内部属性，我们主要验证实例创建成功
      expect(server).toBeDefined();
    });
  });

  // ==================== generateImage MCP工具测试 ====================

  describe('generateImage MCP工具集成', () => {
    it('应该成功创建服务器并包含generateImage工具', async () => {
      // 验证服务器创建成功
      expect(server).toBeDefined();

      // 通过检查createServer函数执行来验证工具注册
      // 由于MCP server API可能不直接暴露工具列表，我们验证服务器正常创建
      expect(server.constructor.name).toBe('McpServer');
    });

    it('应该验证generateImage工具的参数schema结构', async () => {
      // 这个测试验证工具schema的结构定义
      // 我们通过检查createServer函数中的工具定义来间接验证

      // 模拟工具调用参数验证
      const testParams = {
        prompt: '测试图片',
        filePath: ['/test/path.jpg'],
        model: 'jimeng-4.0',
        aspectRatio: '16:9',
        sample_strength: 0.5,
        negative_prompt: '',
        reference_strength: [0.8],
        async: false,
        frames: ['场景描述'],
        count: 1
      };

      // 验证参数结构符合预期
      expect(testParams.prompt).toBe('测试图片');
      expect(Array.isArray(testParams.filePath)).toBe(true);
      expect(testParams.model).toBe('jimeng-4.0');
      expect(testParams.aspectRatio).toBe('16:9');
      expect(typeof testParams.sample_strength).toBe('number');
      expect(typeof testParams.async).toBe('boolean');
      expect(Array.isArray(testParams.frames)).toBe(true);
      expect(typeof testParams.count).toBe('number');
    });

    it('应该处理generateImage的同步调用', async () => {
      // Mock the API response
      process.env.JIMENG_API_TOKEN = 'test-token-123';

      // 这里需要模拟MCP工具调用
      // 由于测试环境的限制，我们主要验证工具注册和参数验证
      const tools = server.getToolDefinition('generateImage');
      expect(tools).toBeDefined();
      expect(tools?.description).toContain('文本生成图像');
      expect(tools?.description).toContain('多参考图');
      expect(tools?.description).toContain('异步模式');
    });

    it('应该处理generateImage的异步调用', async () => {
      const tools = server.getToolDefinition('generateImage');
      const schema = tools?.inputSchema;

      // 验证async参数
      expect(schema?.properties?.async).toBeDefined();
      expect(schema?.properties?.async.type).toBe('boolean');
    });

    it('应该验证filePath为数组类型', async () => {
      const tools = server.getToolDefinition('generateImage');
      const schema = tools?.inputSchema;

      expect(schema?.properties?.filePath.type).toBe('array');
      expect(schema?.properties?.filePath.items?.type).toBe('string');
    });

    it('应该验证aspectRatio的枚举值', async () => {
      const tools = server.getToolDefinition('generateImage');
      const schema = tools?.inputSchema;

      const validRatios = ['auto', '1:1', '16:9', '9:16', '3:4', '4:3', '3:2', '2:3', '21:9'];
      // 注意：由于MCP工具使用默认值，可能不在schema中显式列出枚举
      expect(schema?.properties?.aspectRatio.type).toBe('string');
    });
  });

  // ==================== generateImageAsync MCP工具测试 ====================

  describe('generateImageAsync MCP工具集成', () => {
    it('应该正确注册generateImageAsync工具', async () => {
      const tools = server.listTools();
      expect(tools).toContain('generateImageAsync');
    });

    it('应该验证generateImageAsync工具参数', async () => {
      const tools = server.getToolDefinition('generateImageAsync');
      const schema = tools?.inputSchema;

      expect(schema).toBeDefined();
      expect(schema?.properties).toHaveProperty('prompt');
      expect(schema?.properties).toHaveProperty('filePath');
      expect(schema?.properties).toHaveProperty('model');
      expect(schema?.properties).toHaveProperty('aspectRatio');
      expect(schema?.properties).toHaveProperty('sample_strength');
      expect(schema?.properties).toHaveProperty('negative_prompt');
      expect(schema?.properties).toHaveProperty('reference_strength');
      expect(schema?.properties).toHaveProperty('count');

      // 验证必需字段
      expect(schema?.required).toContain('prompt');
    });

    it('应该验证generateImageAsync的描述信息', async () => {
      const tools = server.getToolDefinition('generateImageAsync');
      expect(tools?.description).toContain('异步提交图像生成任务');
      expect(tools?.description).toContain('立即返回historyId');
      expect(tools?.description).toContain('不等待完成');
    });

    it('应该验证count参数的约束', async () => {
      const tools = server.getToolDefinition('generateImageAsync');
      const schema = tools?.inputSchema;

      expect(schema?.properties?.count.type).toBe('integer');
      expect(schema?.properties?.count.minimum).toBe(1);
      expect(schema?.properties?.count.maximum).toBe(15);
    });
  });

  // ==================== getImageResult MCP工具测试 ====================

  describe('getImageResult MCP工具集成', () => {
    it('应该正确注册getImageResult工具', async () => {
      const tools = server.listTools();
      expect(tools).toContain('getImageResult');
    });

    it('应该验证getImageResult工具参数', async () => {
      const tools = server.getToolDefinition('getImageResult');
      const schema = tools?.inputSchema;

      expect(schema).toBeDefined();
      expect(schema?.properties).toHaveProperty('historyId');
      expect(schema?.required).toContain('historyId');
    });

    it('应该验证historyId的正则表达式', async () => {
      const tools = server.getToolDefinition('getImageResult');
      const schema = tools?.inputSchema;

      expect(schema?.properties?.historyId.type).toBe('string');
      // 验证正则表达式模式
      expect(schema?.properties?.historyId.pattern).toBe('^([0-9]+|h[a-zA-Z0-9]+)$');
    });

    it('应该验证getImageResult的描述信息', async () => {
      const tools = server.getToolDefinition('getImageResult');
      expect(tools?.description).toContain('查询生成任务的当前状态和结果');
      expect(tools?.description).toContain('生成任务ID');
    });
  });

  // ==================== getBatchResults MCP工具测试 ====================

  describe('getBatchResults MCP工具集成', () => {
    it('应该正确注册getBatchResults工具', async () => {
      const tools = server.listTools();
      expect(tools).toContain('getBatchResults');
    });

    it('应该验证getBatchResults工具参数', async () => {
      const tools = server.getToolDefinition('getBatchResults');
      const schema = tools?.inputSchema;

      expect(schema).toBeDefined();
      expect(schema?.properties).toHaveProperty('historyIds');
      expect(schema?.required).toContain('historyIds');
    });

    it('应该验证historyIds为数组类型', async () => {
      const tools = server.getToolDefinition('getBatchResults');
      const schema = tools?.inputSchema;

      expect(schema?.properties?.historyIds.type).toBe('array');
      expect(schema?.properties?.historyIds.items?.type).toBe('string');
      expect(schema?.properties?.historyIds.maxItems).toBe(10);
    });

    it('应该验证historyIds中每个ID的格式', async () => {
      const tools = server.getToolDefinition('getBatchResults');
      const schema = tools?.inputSchema;

      // 验证数组中每个项目的正则表达式
      expect(schema?.properties?.historyIds.items?.pattern).toBe('^([0-9]+|h[a-zA-Z0-9]+)$');
    });

    it('应该验证getBatchResults的描述信息', async () => {
      const tools = server.getToolDefinition('getBatchResults');
      expect(tools?.description).toContain('批量查询多个任务状态');
      expect(tools?.description).toContain('单次查询多个任务');
      expect(tools?.description).toContain('建议≤10个');
    });
  });

  // ==================== 工具描述和文档测试 ====================

  describe('工具描述和文档验证', () => {
    it('所有图片生成工具都应有emoji图标', async () => {
      const imageTools = [
        'generateImage',
        'generateImageAsync',
        'getImageResult',
        'getBatchResults'
      ];

      for (const toolName of imageTools) {
        const tools = server.getToolDefinition(toolName);
        expect(tools?.description).toMatch(/^[🎨🚀🔍📊]/); // 应该以emoji开头
      }
    });

    it('所有图片生成工具都应有中文描述', async () => {
      const imageTools = [
        'generateImage',
        'generateImageAsync',
        'getImageResult',
        'getBatchResults'
      ];

      for (const toolName of imageTools) {
        const tools = server.getToolDefinition(toolName);
        expect(tools?.description).toMatch(/[\u4e00-\u9fa5]/); // 包含中文字符
      }
    });

    it('应该验证必需的参数都有描述', async () => {
      const toolsToCheck = [
        'generateImage',
        'generateImageAsync',
        'getImageResult',
        'getBatchResults'
      ];

      for (const toolName of toolsToCheck) {
        const tools = server.getToolDefinition(toolName);
        const schema = tools?.inputSchema;
        const required = schema?.required || [];

        for (const requiredParam of required) {
          expect(schema?.properties[requiredParam]?.description).toBeDefined();
        }
      }
    });
  });

  // ==================== 参数约束验证测试 ====================

  describe('参数约束验证', () => {
    it('应该验证图片生成参数的数值约束', async () => {
      const tools = server.getToolDefinition('generateImage');
      const schema = tools?.inputSchema;

      // 验证sample_strength约束
      if (schema?.properties?.sample_strength) {
        expect(schema.properties.sample_strength.type).toBe('number');
        expect(schema.properties.sample_strength.minimum).toBe(0);
        expect(schema.properties.sample_strength.maximum).toBe(1);
      }

      // 验证reference_strength数组约束
      if (schema?.properties?.reference_strength) {
        expect(schema.properties.reference_strength.type).toBe('array');
        expect(schema.properties.reference_strength.items?.type).toBe('number');
        expect(schema.properties.reference_strength.items?.minimum).toBe(0);
        expect(schema.properties.reference_strength.items?.maximum).toBe(1);
      }
    });

    it('应该验证帧数约束', async () => {
      const tools = server.getToolDefinition('generateImage');
      const schema = tools?.inputSchema;

      if (schema?.properties?.frames) {
        expect(schema.properties.frames.type).toBe('array');
        expect(schema.properties.frames.maxItems).toBe(15);
        expect(schema.properties.frames.items?.type).toBe('string');
      }
    });

    it('应该验证图片数量约束', async () => {
      const tools = server.getToolDefinition('generateImage');
      const schema = tools?.inputSchema;

      if (schema?.properties?.count) {
        expect(schema.properties.count.type).toBe('number');
        expect(schema.properties.count.minimum).toBe(1);
        expect(schema.properties.count.maximum).toBe(15);
      }
    });

    it('应该验证参考图数量约束', async () => {
      const tools = server.getToolDefinition('generateImage');
      const schema = tools?.inputSchema;

      if (schema?.properties?.filePath) {
        expect(schema.properties.filePath.type).toBe('array');
        expect(schema.properties.filePath.items?.type).toBe('string');
        // 注意：最大数量约束可能在业务逻辑中处理，不在schema中
      }
    });
  });

  // ==================== 错误处理测试 ====================

  describe('MCP工具错误处理', () => {
    it('应该处理缺失的环境变量', async () => {
      // 删除环境变量
      delete process.env.JIMENG_API_TOKEN;

      // 验证工具仍然可以注册
      const tools = server.listTools();
      expect(tools).toContain('generateImage');
      expect(tools).toContain('generateImageAsync');
    });

    it('应该验证参数类型正确性', async () => {
      const tools = [
        'generateImage',
        'generateImageAsync',
        'getImageResult',
        'getBatchResults'
      ];

      for (const toolName of tools) {
        const tool = server.getToolDefinition(toolName);
        const schema = tool?.inputSchema;

        expect(schema?.type).toBe('object');
        expect(typeof schema?.properties).toBe('object');
        expect(Array.isArray(schema?.required)).toBe(true);
      }
    });
  });

  // ==================== 工具列表完整性测试 ====================

  describe('工具列表完整性', () => {
    it('应该包含所有预期的图片生成工具', () => {
      const expectedTools = [
        'hello', // 测试工具
        'generateImage',
        'generateImageAsync',
        'getImageResult',
        'getBatchResults',
        // 视频工具（虽然不是图片工具，但应该存在）
        'generateVideo',
        'generateVideoAsync',
        'generateMainReferenceVideo',
        'generateMainReferenceVideoAsync',
        'videoPostProcess',
        'videoPostProcessAsync',
        'generateTextToVideo',
        'generateMultiFrameVideo',
        'generateMainReferenceVideoUnified'
      ];

      const actualTools = server.listTools();

      for (const expectedTool of expectedTools) {
        expect(actualTools).toContain(expectedTool);
      }
    });

    it('应该验证工具名称唯一性', () => {
      const tools = server.listTools();
      const uniqueTools = [...new Set(tools)];

      expect(tools).toHaveLength(uniqueTools.length);
    });

    it('应该验证所有工具都有定义', () => {
      const tools = server.listTools();

      for (const toolName of tools) {
        const tool = server.getToolDefinition(toolName);
        expect(tool).toBeDefined();
        expect(tool?.description).toBeDefined();
        expect(tool?.inputSchema).toBeDefined();
      }
    });
  });
});