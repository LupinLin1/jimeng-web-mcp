/**
 * 客户端类测试
 * 测试重构后的客户端类结构和继承关系
 */

import { JimengApiClient } from '../api/ApiClient.js';
import { CreditService } from '../api/CreditService.js';
import { JimengClient } from '../api/JimengClient.js';

// Mock axios to avoid real network requests
jest.mock('axios');

describe('客户端类测试', () => {
  
  const testToken = 'test-refresh-token-123';
  
  // 1. JimengApiClient 基础客户端测试
  describe('JimengApiClient 基础客户端', () => {
    let apiClient: JimengApiClient;
    
    beforeEach(() => {
      apiClient = new JimengApiClient(testToken);
    });

    it('应该正确初始化API客户端', () => {
      expect(apiClient).toBeInstanceOf(JimengApiClient);
      expect(apiClient.getRefreshToken()).toBe(testToken);
    });

    it('应该正确设置refresh token', () => {
      const newToken = 'new-token-456';
      apiClient.setRefreshToken(newToken);
      expect(apiClient.getRefreshToken()).toBe(newToken);
    });

    it('应该能正确获取模型映射', () => {
      const model = apiClient.getModel('jimeng-4.0');
      expect(typeof model).toBe('string');
      expect(model).toBeTruthy();
    });

    it('应该处理未知模型名称', () => {
      // 对于未知模型，应该返回原名称或抛出错误
      const unknownModel = 'unknown-model';
      const result = apiClient.getModel(unknownModel);
      expect(typeof result).toBe('string');
    });

    it('应该正确构建请求头', () => {
      const headers = apiClient.buildHeaders();
      expect(headers).toBeDefined();
      expect(typeof headers).toBe('object');
      expect(headers['Content-Type']).toBeDefined();
    });

    it('应该正确构建基础URL', () => {
      const baseUrl = apiClient.getBaseUrl();
      expect(typeof baseUrl).toBe('string');
      expect(baseUrl).toContain('http');
    });
  });

  // 2. CreditService 积分服务测试
  describe('CreditService 积分服务', () => {
    let creditService: CreditService;
    
    beforeEach(() => {
      creditService = new CreditService(testToken);
    });

    it('应该正确继承JimengApiClient', () => {
      expect(creditService).toBeInstanceOf(JimengApiClient);
      expect(creditService).toBeInstanceOf(CreditService);
    });

    it('应该具有积分相关方法', () => {
      expect(typeof creditService.getCredit).toBe('function');
      expect(typeof creditService.receiveCredit).toBe('function');
    });

    it('getCredit方法应该返回Promise', () => {
      const result = creditService.getCredit();
      expect(result).toBeInstanceOf(Promise);
    });

    it('receiveCredit方法应该返回Promise', () => {
      const result = creditService.receiveCredit();
      expect(result).toBeInstanceOf(Promise);
    });

    it('应该正确处理积分查询错误', async () => {
      // Mock网络错误
      jest.spyOn(creditService as any, 'request').mockRejectedValue(new Error('Network error'));
      
      await expect(creditService.getCredit()).rejects.toThrow('Network error');
    });

    it('应该正确处理积分领取错误', async () => {
      // Mock认证错误
      jest.spyOn(creditService as any, 'request').mockRejectedValue(new Error('Authentication failed'));
      
      await expect(creditService.receiveCredit()).rejects.toThrow('Authentication failed');
    });
  });

  // 3. JimengClient 统一客户端测试
  describe('JimengClient 统一客户端', () => {
    let jimengClient: JimengClient;
    
    beforeEach(() => {
      jimengClient = new JimengClient(testToken);
    });

    it('应该正确继承CreditService', () => {
      expect(jimengClient).toBeInstanceOf(JimengApiClient);
      expect(jimengClient).toBeInstanceOf(CreditService);
      expect(jimengClient).toBeInstanceOf(JimengClient);
    });

    it('应该具有图像生成方法', () => {
      expect(typeof jimengClient.generateImage).toBe('function');
    });

    it('应该具有视频生成方法', () => {
      expect(typeof jimengClient.generateVideo).toBe('function');
    });

    it('应该具有文件操作方法', () => {
      expect(typeof jimengClient.getFileContent).toBe('function');
    });

    it('应该正确处理无效的refresh token', () => {
      expect(() => {
        new JimengClient('');
      }).toThrow();
    });

    it('应该正确处理null refresh token', () => {
      expect(() => {
        new JimengClient(null as any);
      }).toThrow();
    });

    it('应该正确处理undefined refresh token', () => {
      expect(() => {
        new JimengClient(undefined as any);
      }).toThrow();
    });
  });

  // 4. 继承关系测试
  describe('继承关系验证', () => {
    let jimengClient: JimengClient;
    
    beforeEach(() => {
      jimengClient = new JimengClient(testToken);
    });

    it('JimengClient应该能访问父类方法', () => {
      // 从 JimengApiClient 继承的方法
      expect(typeof jimengClient.getRefreshToken).toBe('function');
      expect(typeof jimengClient.setRefreshToken).toBe('function');
      expect(typeof jimengClient.getModel).toBe('function');
      
      // 从 CreditService 继承的方法
      expect(typeof jimengClient.getCredit).toBe('function');
      expect(typeof jimengClient.receiveCredit).toBe('function');
    });

    it('应该正确维护原型链', () => {
      expect(Object.getPrototypeOf(jimengClient)).toBe(JimengClient.prototype);
      expect(Object.getPrototypeOf(JimengClient.prototype)).toBe(CreditService.prototype);
      expect(Object.getPrototypeOf(CreditService.prototype)).toBe(JimengApiClient.prototype);
    });

    it('instanceof检查应该正确工作', () => {
      const creditService = new CreditService(testToken);
      const apiClient = new JimengApiClient(testToken);
      
      // JimengClient 检查
      expect(jimengClient instanceof JimengClient).toBe(true);
      expect(jimengClient instanceof CreditService).toBe(true);
      expect(jimengClient instanceof JimengApiClient).toBe(true);
      
      // CreditService 检查
      expect(creditService instanceof CreditService).toBe(true);
      expect(creditService instanceof JimengApiClient).toBe(true);
      expect(creditService instanceof JimengClient).toBe(false);
      
      // JimengApiClient 检查
      expect(apiClient instanceof JimengApiClient).toBe(true);
      expect(apiClient instanceof CreditService).toBe(false);
      expect(apiClient instanceof JimengClient).toBe(false);
    });
  });

  // 5. 方法重写测试
  describe('方法重写和多态性', () => {
    let apiClient: JimengApiClient;
    let creditService: CreditService;
    let jimengClient: JimengClient;
    
    beforeEach(() => {
      apiClient = new JimengApiClient(testToken);
      creditService = new CreditService(testToken);
      jimengClient = new JimengClient(testToken);
    });

    it('所有客户端应该有相同的基础方法', () => {
      const clients = [apiClient, creditService, jimengClient];
      
      clients.forEach(client => {
        expect(typeof client.getRefreshToken).toBe('function');
        expect(typeof client.setRefreshToken).toBe('function');
        expect(typeof client.getModel).toBe('function');
      });
    });

    it('子类应该能重写父类方法', () => {
      // 检查方法是否可以被重写（这里只是结构检查）
      const baseRequest = apiClient.request;
      const creditRequest = (creditService as any).request;
      const jimengRequest = (jimengClient as any).request;
      
      expect(typeof baseRequest).toBe('function');
      expect(typeof creditRequest).toBe('function');
      expect(typeof jimengRequest).toBe('function');
    });
  });

  // 6. 错误处理测试
  describe('错误处理', () => {
    it('应该正确处理构造函数错误', () => {
      // 测试各种无效输入
      const invalidTokens = [null, undefined, '', '   ', 123, {}, []];
      
      invalidTokens.forEach(token => {
        expect(() => {
          new JimengApiClient(token as any);
        }).toThrow();
      });
    });

    it('应该正确处理网络错误', async () => {
      const client = new JimengClient(testToken);
      
      // Mock request method to throw network error
      jest.spyOn(client as any, 'request').mockRejectedValue(new Error('Network timeout'));
      
      await expect(client.getCredit()).rejects.toThrow('Network timeout');
    });

    it('应该正确处理API错误响应', async () => {
      const client = new JimengClient(testToken);
      
      // Mock request method to return error response
      jest.spyOn(client as any, 'request').mockRejectedValue(new Error('API rate limit exceeded'));
      
      await expect(client.getCredit()).rejects.toThrow('API rate limit exceeded');
    });
  });

  // 7. 内存管理测试
  describe('内存管理', () => {
    it('应该正确清理资源', () => {
      let client: JimengClient | null = new JimengClient(testToken);
      
      expect(client.getRefreshToken()).toBe(testToken);
      
      // 模拟清理
      client.setRefreshToken('');
      expect(client.getRefreshToken()).toBe('');
      
      client = null;
      expect(client).toBeNull();
    });

    it('应该能创建多个独立实例', () => {
      const client1 = new JimengClient('token1');
      const client2 = new JimengClient('token2');
      
      expect(client1.getRefreshToken()).toBe('token1');
      expect(client2.getRefreshToken()).toBe('token2');
      
      client1.setRefreshToken('modified1');
      expect(client1.getRefreshToken()).toBe('modified1');
      expect(client2.getRefreshToken()).toBe('token2'); // 不应该被影响
    });
  });

  // 8. 配置和设置测试
  describe('配置和设置', () => {
    it('应该使用正确的默认配置', () => {
      const client = new JimengClient(testToken);
      
      expect(client.getRefreshToken()).toBe(testToken);
      
      // 检查默认配置是否合理
      const baseUrl = client.getBaseUrl();
      expect(baseUrl).toContain('http');
    });

    it('应该允许配置更新', () => {
      const client = new JimengClient(testToken);
      
      const newToken = 'updated-token';
      client.setRefreshToken(newToken);
      expect(client.getRefreshToken()).toBe(newToken);
    });

    it('应该维护配置的一致性', () => {
      const client = new JimengClient(testToken);
      
      // 多次调用应该返回一致的结果
      const baseUrl1 = client.getBaseUrl();
      const baseUrl2 = client.getBaseUrl();
      expect(baseUrl1).toBe(baseUrl2);
      
      const headers1 = client.buildHeaders();
      const headers2 = client.buildHeaders();
      expect(headers1).toEqual(headers2);
    });
  });
});