/**
 * JiMeng API 客户端基础类
 * 提供核心的请求功能和基础配置
 */

import axios from 'axios';
import { generateCookie } from '../utils/auth.js';
import { getModel, DEFAULT_ASSISTANT_ID, UA } from '../types/models.js';

export class JimengApiClient {
  protected refreshToken: string;
  protected getUploadImageProofUrl = 'https://imagex.bytedanceapi.com/';

  constructor(token?: string) {
    this.refreshToken = token || process.env.JIMENG_API_TOKEN || '';
    if (!this.refreshToken) {
      throw new Error('JIMENG_API_TOKEN 环境变量未设置');
    }
  }

  /**
   * 获取模型映射
   * @param model 模型名称
   * @returns 映射后的模型名称
   */
  protected getModel(model: string): string {
    const mappedModel = getModel(model);
    return mappedModel;
  }

  /**
   * 发送请求到即梦API
   * @param method 请求方法
   * @param path 请求路径
   * @param data 请求数据
   * @param params 请求参数
   * @param headers 请求头
   * @returns 响应结果
   */
  protected async request(
    method: string,
    path: string,
    data: any = {},
    params: any = {},
    headers: any = {}
  ): Promise<any> {
    const baseUrl = 'https://jimeng.jianying.com';
    const url = path.includes('https://') ? path : `${baseUrl}${path}`;
    
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
      const response = await axios({
        method: method.toLowerCase(),
        url,
        data: method.toUpperCase() !== 'GET' ? data : undefined,
        params: method.toUpperCase() === 'GET' ? { ...data, ...params } : params,
        headers: requestHeaders,
        timeout: 60000
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`即梦API请求错误: ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error(`即梦API请求失败: ${error}`);
      }
    }
  }

  /**
   * 获取refresh token
   */
  public getRefreshToken(): string {
    return this.refreshToken;
  }
}