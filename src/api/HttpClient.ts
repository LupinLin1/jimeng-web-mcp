/**
 * HttpClient - HTTP请求客户端
 * 整合auth.ts和a_bogus.ts中的认证逻辑
 * 提供统一的HTTP请求接口
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { generateCookie } from '../utils/auth.js';
import { DEFAULT_ASSISTANT_ID, UA } from '../types/models.js';
import { generateUuid, jsonEncode, toUrlParams, generateMsToken, unixTimestamp } from '../utils/index.js';
import { generate_a_bogus } from '../utils/a_bogus.js';
import crypto from 'crypto';

export interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}

export interface AuthParams {
  timestamp: number;
  nonce: string;
  path: string;
}

/**
 * HttpClient类
 * 使用组合模式，独立于继承体系
 */
export class HttpClient {
  private refreshToken: string;

  constructor(token?: string) {
    this.refreshToken = token || process.env.JIMENG_API_TOKEN || '';
    if (!this.refreshToken) {
      throw new Error('JIMENG_API_TOKEN 环境变量未设置');
    }
  }

  /**
   * 执行HTTP请求
   */
  async request<T = any>(options: RequestOptions): Promise<T> {
    const {
      url,
      method = 'POST',
      data = {},
      headers = {},
      params = {},
      timeout = 60000
    } = options;

    const baseUrl = 'https://jimeng.jianying.com';
    const fullUrl = url.includes('https://') ? url : `${baseUrl}${url}`;

    const FAKE_HEADERS = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-language": "zh-CN,zh;q=0.9",
      "Cache-control": "no-cache",
      "Last-event-id": "undefined",
      Appid: DEFAULT_ASSISTANT_ID,
      Appvr: "5.8.0",
      Origin: "https://jimeng.jianying.com",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: "https://jimeng.jianying.com",
      Pf: "7",
      "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": UA
    };

    const requestHeaders = {
      ...FAKE_HEADERS,
      'Cookie': generateCookie(this.refreshToken),
      ...headers
    };

    try {
      const response: AxiosResponse<T> = await axios({
        method: method.toLowerCase(),
        url: fullUrl,
        data: method.toUpperCase() !== 'GET' ? data : undefined,
        params: method.toUpperCase() === 'GET' ? { ...data, ...params } : params,
        headers: requestHeaders,
        timeout
      });

      return response.data;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  /**
   * 生成请求认证参数（用于图片上传等）
   */
  generateRequestParams(): any {
    const rqParams: any = {
      "aid": parseInt("513695"),
      "device_platform": "web",
      "region": "cn",
      "webId": "7398608394939885067",
      "da_version": "3.3.2",
      "web_component_open_flag": 1,
      "web_version": "6.6.0",
      "aigc_features": "app_lip_sync",
      "msToken": generateMsToken(),
    };

    // 添加a_bogus防篡改参数
    rqParams['a_bogus'] = generate_a_bogus(
      toUrlParams(rqParams),
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    return rqParams;
  }

  /**
   * 生成认证头和签名（用于ImageX API）
   */
  async generateAuthorizationAndHeader(
    accessKeyId: string,
    secretAccessKey: string,
    sessionToken: string,
    region: string,
    service: string,
    method: string,
    params?: Record<string, any>,
    data?: Record<string, any>
  ): Promise<Record<string, string>> {
    // 生成ISO 8601格式的时间戳
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const uri = '/';

    // 计算请求签名
    const authorization = await this.generateAuthorization(
      accessKeyId,
      secretAccessKey,
      sessionToken,
      region,
      service,
      method,
      uri,
      params,
      data,
      timestamp
    );

    return {
      'Host': 'imagex.bytedanceapi.com',
      'Authorization': authorization,
      'X-Date': timestamp,
      'X-Security-Token': sessionToken,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 生成Authorization签名
   */
  private async generateAuthorization(
    accessKeyId: string,
    secretAccessKey: string,
    sessionToken: string,
    region: string,
    service: string,
    method: string,
    uri: string,
    params?: Record<string, any>,
    data?: Record<string, any>,
    timestamp?: string
  ): Promise<string> {
    const date = timestamp || String(unixTimestamp());
    const shortDate = date.slice(0, 8);

    // 1. 创建规范请求
    const canonicalQueryString = params ? this.httpBuildQuery(params) : '';
    const canonicalHeaders = `host:imagex.bytedanceapi.com\nx-date:${date}\n`;
    const signedHeaders = 'host;x-date';

    const bodyHash = data ?
      crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex') :
      crypto.createHash('sha256').update('').digest('hex');

    const canonicalRequest = `${method}\n${uri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;

    // 2. 创建待签名字符串
    const algorithm = 'HMAC-SHA256';
    const credentialScope = `${shortDate}/${region}/${service}/request`;
    const requestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const stringToSign = `${algorithm}\n${date}\n${credentialScope}\n${requestHash}`;

    // 3. 计算签名
    const kDate = crypto.createHmac('sha256', `${secretAccessKey}`).update(shortDate).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    // 4. 构建Authorization header
    return `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  /**
   * HTTP查询字符串构建
   */
  httpBuildQuery(params: Record<string, any>): string {
    return Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  /**
   * 生成随机字符串
   */
  generateRandomString(length: number): string {
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * 获取refresh token
   */
  getRefreshToken(): string {
    return this.refreshToken;
  }

  /**
   * 统一错误处理
   */
  private handleError(error: AxiosError): never {
    if (error.response) {
      throw new Error(`即梦API请求错误: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error(`即梦API请求失败: 无响应`);
    } else {
      throw new Error(`即梦API请求失败: ${error.message}`);
    }
  }
}
