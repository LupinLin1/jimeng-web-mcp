/**
 * BaseClient 抽象基类
 * 提供HTTP请求、文件上传、轮询日志等共享功能
 * 为JimengClient和VideoGenerator提供共同基础
 */

import { CreditService } from './CreditService.js';
import { WEB_ID } from '../types/models.js';
import { generateUuid, jsonEncode, toUrlParams, generateMsToken } from '../utils/index.js';
import { generate_a_bogus } from '../utils/a_bogus.js';
import crypto from 'crypto';
import path from 'path';
// @ts-ignore
import crc32 from 'crc32';

/**
 * 基础客户端抽象类
 * 继承自CreditService,提供所有子类需要的共享方法
 */
export abstract class BaseClient extends CreditService {
  protected sessionId?: string;

  /**
   * 生成完整的请求参数
   * @returns 请求参数对象
   */
  protected generateRequestParams(): any {
    const rqParams: any = {
      "aid": parseInt("513695"),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "da_version": "3.3.2",
      "web_component_open_flag": 1,
      "web_version": "6.6.0",
      "aigc_features": "app_lip_sync",
      "msToken": generateMsToken(),
    };

    // 添加a_bogus防篡改参数
    rqParams['a_bogus'] = generate_a_bogus(toUrlParams(rqParams), 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    return rqParams;
  }

  /**
   * 获取上传凭证
   */
  protected async getUploadAuth(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const authRes = await this.request(
          'POST',
          '/mweb/v1/get_upload_token?aid=513695&da_version=3.2.2&aigc_features=app_lip_sync',
          {
            scene: 2
          },
          {},
        );
        if (!authRes.data) {
          reject(authRes.errmsg ?? '获取上传凭证失败,账号可能已掉线!');
          return;
        }
        resolve(authRes.data);
      } catch (err) {
        console.error('获取上传凭证失败:', err);
        reject(err);
      }
    });
  }

  /**
   * 上传文件到指定URL
   */
  protected async uploadFile(
    url: string,
    fileContent: Buffer,
    headers: any,
    method: string = 'PUT',
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const res = await this.request(
        'POST',
        url,
        fileContent,
        {},
        headers
      );
      resolve(res);
    });
  }

  /**
   * 读取文件内容
   */
  public async getFileContent(filePath: string): Promise<Buffer> {
    try {
      if (filePath.includes('https://') || filePath.includes('http://')) {
        // 直接用axios获取图片Buffer
        const axios = (await import('axios')).default;
        const res = await axios.get(filePath, { responseType: 'arraybuffer' });
        return Buffer.from(res.data);
      } else {
        // 确保路径是绝对路径
        const path = (await import('path')).default;
        const fs = await import('fs');
        const absolutePath = path.resolve(filePath);
        // 读取文件内容
        return await fs.promises.readFile(absolutePath);
      }
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error(`读取文件失败: ${filePath}`);
    }
  }

  /**
   * 获取图片元数据
   */
  protected getImageMetadata(buffer: Buffer, filePath: string): {width: number, height: number, format: string} {
    try {
      // 检测文件格式
      const format = this.detectImageFormat(buffer, filePath);

      // 根据格式解析尺寸
      let width = 0;
      let height = 0;

      if (format === 'png') {
        const metadata = this.parsePNG(buffer);
        width = metadata.width;
        height = metadata.height;
      } else if (format === 'jpg' || format === 'jpeg') {
        const metadata = this.parseJPEG(buffer);
        width = metadata.width;
        height = metadata.height;
      } else if (format === 'webp') {
        const metadata = this.parseWebP(buffer);
        width = metadata.width;
        height = metadata.height;
      }

      return { width, height, format };
    } catch (error) {
      console.error('获取图片元数据失败:', error);
      // 返回默认值以保持兼容性
      return { width: 0, height: 0, format: 'png' };
    }
  }

  /**
   * 检测图片格式
   */
  private detectImageFormat(buffer: Buffer, filePath: string): string {
    // 通过文件扩展名检测
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'png';
    if (ext === '.jpg' || ext === '.jpeg') return 'jpeg';
    if (ext === '.webp') return 'webp';

    // 通过文件头检测
    if (buffer.length >= 8) {
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'png';
      }
      // JPEG: FF D8 FF
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'jpeg';
      }
      // WebP: 52 49 46 46 xx xx xx xx 57 45 42 50
      if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
          buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return 'webp';
      }
    }

    return 'png'; // 默认格式
  }

  /**
   * 解析PNG尺寸
   */
  private parsePNG(buffer: Buffer): { width: number; height: number } {
    try {
      // PNG IHDR chunk starts at byte 16
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
    } catch (error) {
      console.error('解析PNG失败:', error);
    }
    return { width: 0, height: 0 };
  }

  /**
   * 解析JPEG尺寸
   */
  private parseJPEG(buffer: Buffer): { width: number; height: number } {
    try {
      let i = 2; // Skip SOI marker
      while (i < buffer.length - 4) {
        // Find SOF marker (Start of Frame)
        if (buffer[i] === 0xFF) {
          const marker = buffer[i + 1];
          // SOF0, SOF1, SOF2, SOF3, SOF5, SOF6, SOF7, SOF9, SOF10, SOF11, SOF13, SOF14, SOF15
          if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
              (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
            const height = buffer.readUInt16BE(i + 5);
            const width = buffer.readUInt16BE(i + 7);
            return { width, height };
          }
          // Skip this segment
          const segmentLength = buffer.readUInt16BE(i + 2);
          i += segmentLength + 2;
        } else {
          i++;
        }
      }
    } catch (error) {
      console.error('解析JPEG失败:', error);
    }
    return { width: 0, height: 0 };
  }

  /**
   * 解析WebP尺寸
   */
  private parseWebP(buffer: Buffer): { width: number; height: number } {
    try {
      if (buffer.length >= 30) {
        // Simple WebP format
        if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
          const width = buffer.readUInt16LE(26) & 0x3FFF;
          const height = buffer.readUInt16LE(28) & 0x3FFF;
          return { width, height };
        }
        // Lossless WebP format
        if (buffer.toString('ascii', 12, 16) === 'VP8L') {
          const bits = buffer.readUInt32LE(21);
          const width = (bits & 0x3FFF) + 1;
          const height = ((bits >> 14) & 0x3FFF) + 1;
          return { width, height };
        }
      }
    } catch (error) {
      console.error('解析WebP失败:', error);
    }
    return { width: 0, height: 0 };
  }

  /**
   * 上传图片文件
   * @param filePath 文件路径
   */
  protected async uploadImage(
    filePath: string,
  ): Promise<{uri: string, width: number, height: number, format: string}> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('开始上传文件:', filePath);
        // 获取上传令牌所需Ak和Tk
        const uploadAuth = await this.getUploadAuth();

        // 获取图片数据
        const imageRes = await this.getFileContent(filePath);
        // 获取图片元数据
        const metadata = this.getImageMetadata(imageRes, filePath);
        // 获取图片Crc32标识
        const imageCrc32 = crc32(imageRes).toString(16);

        // 获取图片上传凭证签名所需参数
        const getUploadImageProofRequestParams = {
          Action: 'ApplyImageUpload',
          FileSize: imageRes.length,
          ServiceId: 'tb4s082cfz',
          Version: '2018-08-01',
          s: this.generateRandomString(11),
        };

        // 获取图片上传请求头
        const requestHeadersInfo = await this.generateAuthorizationAndHeader(
          uploadAuth.access_key_id,
          uploadAuth.secret_access_key,
          uploadAuth.session_token,
          'cn-north-1',
          'imagex',
          'GET',
          getUploadImageProofRequestParams,
        );

        const getUploadImageProofUrl = 'https://imagex.bytedanceapi.com/';

        // 获取图片上传凭证
        const uploadImgRes = await this.request(
          'GET',
          getUploadImageProofUrl + '?' + this.httpBuildQuery(getUploadImageProofRequestParams),
          {},
          {},
          requestHeadersInfo
        );

        if (uploadImgRes?.['Response  ']?.hasOwnProperty('Error')) {
          reject(uploadImgRes['Response ']['Error']['Message']);
          return;
        }

        const UploadAddress = uploadImgRes.Result.UploadAddress;
        // 用凭证拼接上传图片接口
        const uploadImgUrl = `https://${UploadAddress.UploadHosts[0]}/upload/v1/${UploadAddress.StoreInfos[0].StoreUri}`;

        // 上传图片
        const imageUploadRes = await this.uploadFile(
          uploadImgUrl,
          imageRes,
          {
            Authorization: UploadAddress.StoreInfos[0].Auth,
            'Content-Crc32': imageCrc32,
            'Content-Type': 'application/octet-stream',
          },
          'POST',
        );

        if (imageUploadRes.code !== 2000) {
          reject(imageUploadRes.message);
          return;
        }

        const commitImgParams = {
          Action: 'CommitImageUpload',
          FileSize: imageRes.length,
          ServiceId: 'tb4s082cfz',
          Version: '2018-08-01',
        };

        const commitImgContent = {
          SessionKey: UploadAddress.SessionKey,
        };

        const commitImgHead = await this.generateAuthorizationAndHeader(
          uploadAuth.access_key_id,
          uploadAuth.secret_access_key,
          uploadAuth.session_token,
          'cn-north-1',
          'imagex',
          'POST',
          commitImgParams,
          commitImgContent,
        );

        // 提交图片上传
        const commitImg = await this.request(
          'POST',
          getUploadImageProofUrl + '?' + this.httpBuildQuery(commitImgParams),
          commitImgContent,
          {},
          {
            ...commitImgHead,
            'Content-Type': 'application/json',
          }
        );

        if (commitImg['Response ']?.hasOwnProperty('Error')) {
          reject(commitImg['Response  ']['Error']['Message']);
          return;
        }

        resolve({
          uri: commitImg.Result.Results[0].Uri,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        });
      } catch (err: any) {
        console.error('上传文件失败:', err);
        const errorMessage = err?.message || err || '未知';
        reject('上传失败,失败原因:' + errorMessage);
      }
    });
  }

  private generateRandomString(length: number): string {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  private httpBuildQuery(params: any): string {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      if (params?.hasOwnProperty(key)) {
        searchParams.append(key, params[key]);
      }
    }
    return searchParams.toString();
  }

  private async generateAuthorizationAndHeader(
    accessKeyID: string,
    secretAccessKey: string,
    sessionToken: string,
    region: string,
    service: string,
    requestMethod: string,
    requestParams: any,
    requestBody: any = {},
  ): Promise<any> {
    return new Promise((resolve) => {
      // 获取当前ISO时间
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';

      // 生成请求的Header
      const requestHeaders: Record<string, string> = this.addHeaders(
        amzDate,
        sessionToken,
        requestBody,
      )

      if (Object.keys(requestBody).length > 0) {
        requestHeaders['X-Amz-Content-Sha256'] = crypto
          .createHash('sha256')
          .update(JSON.stringify(requestBody))
          .digest('hex')
      }
      // 生成请求的Authorization
      const authorizationParams = [
        'AWS4-HMAC-SHA256 Credential=' + accessKeyID + '/' +
        this.credentialString(amzDate, region, service),
        'SignedHeaders=' + this.signedHeaders(requestHeaders),
        'Signature=' + this.signature(
          secretAccessKey,
          amzDate,
          region,
          service,
          requestMethod,
          requestParams,
          requestHeaders,
          requestBody,
        ),
      ];
      const authorization = authorizationParams.join(', ');

      // 返回Headers
      const headers: any = {};
      for (const key in requestHeaders) {
        headers[key] = requestHeaders[key];
      }
      headers['Authorization'] = authorization;
      resolve(headers);
    });
  }

  private addHeaders(
    amzDate: string,
    sessionToken: string,
    requestBody: any,
  ): any {
    const headers = {
      'X-Amz-Date': amzDate,
      'X-Amz-Security-Token': sessionToken,
    };
    if (Object.keys(requestBody).length > 0) {
      // @ts-ignore
      headers['X-Amz-Content-Sha256'] = crypto
        .createHash('sha256')
        .update(JSON.stringify(requestBody))
        .digest('hex');
    }
    return headers;
  }

  private credentialString(
    amzDate: string,
    region: string,
    service: string,
  ): string {
    const credentialArr = [
      amzDate.substring(0, 8),
      region,
      service,
      'aws4_request',
    ];
    return credentialArr.join('/');
  }

  private signedHeaders(requestHeaders: any): string {
    const headers: string[] = [];
    Object.keys(requestHeaders).forEach(function (r) {
      r = r.toLowerCase();
      headers.push(r);
    });
    return headers.sort().join(';');
  }

  private canonicalString(
    requestMethod: string,
    requestParams: any,
    requestHeaders: any,
    requestBody: any,
  ): string {
    let canonicalHeaders: string[] = [];
    const headerKeys = Object.keys(requestHeaders).sort();
    for (let i = 0; i < headerKeys.length; i++) {
      canonicalHeaders.push(
        headerKeys[i].toLowerCase() + ':' + requestHeaders[headerKeys[i]],
      );
    }
    // @ts-ignore
    canonicalHeaders = canonicalHeaders.join('\n') + '\n';
    let body = '';
    if (Object.keys(requestBody).length > 0) {
      body = JSON.stringify(requestBody);
    }

    const canonicalStringArr = [
      requestMethod.toUpperCase(),
      '/',
      this.httpBuildQuery(requestParams),
      canonicalHeaders,
      this.signedHeaders(requestHeaders),
      crypto.createHash('sha256').update(body).digest('hex'),
    ];
    return canonicalStringArr.join('\n');
  }

  private signature(
    secretAccessKey: string,
    amzDate: string,
    region: string,
    service: string,
    requestMethod: string,
    requestParams: any,
    requestHeaders: any,
    requestBody: any,
  ): string {
    // 生成signingKey
    const amzDay = amzDate.substring(0, 8);
    const kDate = crypto
      .createHmac('sha256', 'AWS4' + secretAccessKey)
      .update(amzDay)
      .digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto
      .createHmac('sha256', kRegion)
      .update(service)
      .digest();
    const signingKey = crypto
      .createHmac('sha256', kService)
      .update('aws4_request')
      .digest();

    // 生成Canonical Request
    const canonical = this.canonicalString(
      requestMethod,
      requestParams,
      requestHeaders,
      requestBody,
    );

    // 生成String To Sign
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      this.credentialString(amzDate, region, service),
      crypto.createHash('sha256').update(canonical).digest('hex'),
    ].join('\n');

    // 计算签名
    return crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');
  }

  // ============== 轮询日志格式化函数 ==============

  /**
   * 格式化轮询开始日志
   */
  protected logPollStart(
    type: 'POLL' | 'DRAFT' | 'VIDEO',
    pollCount: number,
    maxPollCount: number,
    status: number | string,
    waitTime: number,
    elapsedTotal: number,
    networkErrorCount: number,
    maxNetworkErrors: number,
    id: string
  ): void {
    console.log(`[${type}-START] Poll=${pollCount}/${maxPollCount}, Status=${status}, Wait=${waitTime/1000}s, Elapsed=${elapsedTotal}s, NetErr=${networkErrorCount}/${maxNetworkErrors}, ID=${id}`);
  }

  /**
   * 格式化轮询数据日志
   */
  protected logPollData(
    type: 'POLL' | 'DRAFT' | 'VIDEO',
    pollCount: number,
    apiCallDuration: number,
    status: number | string,
    prevStatus?: number | string,
    failCode?: string,
    finishedCount?: number,
    totalCount?: number,
    itemListLength?: number,
    progress?: string,
    errorMessage?: string
  ): void {

    let message = `[DATA] [${type}-DATA] 轮询=${pollCount}, API耗时=${apiCallDuration}ms`;

    if (prevStatus !== undefined) {
      message += `, 状态变化=${prevStatus}→${status}`;
    } else {
      message += `, 状态=${status}`;
    }

    message += `, 失败码=${failCode || 'null'}`;

    if (finishedCount !== undefined && totalCount !== undefined) {
      message += `, 完成度=${finishedCount}/${totalCount}`;
    }

    if (itemListLength !== undefined) {
      message += `, 结果数=${itemListLength}`;
    }

    if (progress !== undefined) {
      message += `, 进度=${progress}`;
    }

    if (errorMessage !== undefined) {
      message += `, 错误=${errorMessage}`;
    }

    console.log(message);
  }

  /**
   * 格式化轮询错误日志
   */
  protected logPollError(
    type: 'POLL' | 'DRAFT' | 'VIDEO',
    pollCount: number,
    networkErrorCount: number,
    maxNetworkErrors: number,
    errorDuration: number,
    error: any
  ): void {
    console.error(`[${type}-ERROR] Poll=${pollCount}, NetErr=${networkErrorCount}/${maxNetworkErrors}, Duration=${errorDuration}ms, Error=${error}`);
  }

  /**
   * 格式化轮询状态检查日志
   */
  protected logPollStatusCheck(
    type: 'POLL' | 'DRAFT' | 'VIDEO',
    pollCount: number,
    isCompletionState: boolean,
    isProcessingState: boolean,
    currentStatus: number | string,
    hasResults?: boolean,
    resultCount?: number
  ): void {

    let message = `[DATA] [${type}-STATUS] 轮询=${pollCount}, 状态检查={完成状态:${isCompletionState}, 处理中:${isProcessingState}, 当前状态:${currentStatus}`;

    if (hasResults !== undefined) {
      message += `, 有结果:${hasResults}`;
    }

    if (resultCount !== undefined) {
      message += `, 结果数:${resultCount}`;
    }

    message += '}';
    console.log(message);
  }

  /**
   * 格式化轮询进度日志
   */
  protected logPollProgress(
    type: 'POLL' | 'DRAFT' | 'VIDEO',
    pollCount: number,
    maxPollCount: number,
    status: number | string,
    elapsedTime: number,
    networkErrorCount: number,
    finishedCount?: number,
    totalCount?: number,
    progress?: string
  ): void {

    let message = `[DATA] [${type}-PROGRESS] 轮询=${pollCount}/${maxPollCount}, 状态=${status}, 已用时=${elapsedTime}s, 网络错误=${networkErrorCount}`;

    if (finishedCount !== undefined && totalCount !== undefined) {
      message += `, 完成度=${finishedCount}/${totalCount}`;
    }

    if (progress !== undefined) {
      message += `, 进度=${progress}`;
    }

    console.log(message);
  }

  /**
   * 格式化轮询结束日志
   */
  protected logPollEnd(
    type: 'POLL' | 'DRAFT' | 'VIDEO',
    pollCount: number,
    maxPollCount: number,
    status: number | string,
    totalElapsedSec: number,
    networkErrorCount: number,
    id: string,
    timeoutReason?: 'MAX_POLLS' | 'OVERALL_TIMEOUT' | 'UNKNOWN'
  ): void {

    console.log(`[END] [${type}-END] 轮询结束, 总轮询=${pollCount}/${maxPollCount}, 最终状态=${status}, 总耗时=${totalElapsedSec}s, 网络错误=${networkErrorCount}, ID=${id}`);

    // 记录超时原因
    if (timeoutReason === 'MAX_POLLS') {
      console.warn(`[TIMEOUT] [${type}-TIMEOUT] 达到最大轮询次数限制, 轮询超时`);
    } else if (timeoutReason === 'OVERALL_TIMEOUT') {
      console.warn(`[TIMEOUT] [${type}-TIMEOUT] 达到总体时间限制, 轮询超时`);
    } else if (timeoutReason === 'UNKNOWN') {
      console.warn(`[UNKNOWN] [${type}-UNKNOWN] 未知原因导致轮询结束`);
    }
  }

  /**
   * 格式化轮询完成日志
   */
  protected logPollComplete(
    type: 'POLL' | 'DRAFT' | 'VIDEO',
    pollCount: number,
    status: number | string,
    resultCount: number,
    completionType?: 'SUCCESS' | 'FAIL'
  ): void {
    if (completionType === 'FAIL') {
      console.error(`[ERROR] [${type}-FAIL] 轮询=${pollCount}, 生成失败, 状态=${status}`);
    } else {
      console.log(`[SUCCESS] [${type}-COMPLETE] 轮询=${pollCount}, 生成完成, 状态=${status}, 返回${resultCount}个结果`);
    }
  }
}