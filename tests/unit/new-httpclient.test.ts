/**
 * Unit tests for new HttpClient implementation
 */

import { HttpClient } from '../../src/api/HttpClient.js';

describe('HttpClient (New Implementation)', () => {
  let httpClient: HttpClient;

  beforeAll(() => {
    // Use test token or mock
    process.env.JIMENG_API_TOKEN = 'test-token-12345';
    httpClient = new HttpClient();
  });

  describe('Constructor', () => {
    it('should initialize with token from environment', () => {
      expect(httpClient).toBeDefined();
      expect(httpClient.getRefreshToken()).toBe('test-token-12345');
    });

    it('should throw error if no token provided', () => {
      delete process.env.JIMENG_API_TOKEN;
      expect(() => new HttpClient()).toThrow('JIMENG_API_TOKEN 环境变量未设置');
      process.env.JIMENG_API_TOKEN = 'test-token-12345'; // Restore
    });

    it('should accept token parameter', () => {
      const client = new HttpClient('custom-token');
      expect(client.getRefreshToken()).toBe('custom-token');
    });
  });

  describe('Request Parameter Generation', () => {
    it('should generate request params with a_bogus', () => {
      const params = httpClient.generateRequestParams();

      expect(params).toHaveProperty('aid');
      expect(params).toHaveProperty('device_platform', 'web');
      expect(params).toHaveProperty('webId');
      expect(params).toHaveProperty('msToken');
      expect(params).toHaveProperty('a_bogus');
      expect(typeof params.a_bogus).toBe('string');
    });
  });

  describe('Utility Methods', () => {
    it('should generate random string of correct length', () => {
      const str5 = httpClient.generateRandomString(5);
      const str11 = httpClient.generateRandomString(11);

      expect(str5).toHaveLength(5);
      expect(str11).toHaveLength(11);
      expect(/^[0-9A-Za-z]+$/.test(str5)).toBe(true);
    });

    it('should build HTTP query string correctly', () => {
      const query = httpClient.httpBuildQuery({
        name: 'test',
        value: '123',
        special: 'a&b=c'
      });

      expect(query).toContain('name=test');
      expect(query).toContain('value=123');
      expect(query).toContain('special=');
    });
  });

  describe('Authorization Generation', () => {
    it('should generate authorization headers for ImageX API', async () => {
      const headers = await httpClient.generateAuthorizationAndHeader(
        'test-access-key',
        'test-secret-key',
        'test-session-token',
        'cn-north-1',
        'imagex',
        'GET',
        { Action: 'ApplyImageUpload' }
      );

      // Check for authorization headers (AWS4 format uses different property names)
      expect(headers).toHaveProperty('Authorization');
      expect(headers.Authorization).toContain('AWS4-HMAC-SHA256');
      expect(headers).toHaveProperty('X-Amz-Security-Token', 'test-session-token');
      expect(headers.Authorization).toContain('HMAC-SHA256');
    });
  });
});
