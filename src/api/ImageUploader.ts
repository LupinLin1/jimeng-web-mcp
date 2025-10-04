/**
 * ImageUploader - 图片上传服务
 * 使用image-size库替代手动解析（删除132行代码）
 * 提供图片上传、格式检测和批量上传功能
 * 支持图片上传步骤的自动重试机制
 */

import sizeOf from 'image-size';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import crc32 from 'crc32';
import { HttpClient } from './HttpClient.js';
import { retryAsync } from '../utils/retry.js';
import { logger } from '../utils/logger.js';

export interface UploadResult {
  uri: string;           // 服务器返回的URL
  originalPath: string;  // 原始本地路径
  width: number;         // 图片宽度
  height: number;        // 图片高度
  format: string;        // 图片格式
}

export interface ImageMetadata {
  format: 'png' | 'jpeg' | 'jpg' | 'webp' | 'gif';
  width: number;
  height: number;
}

/**
 * ImageUploader类
 * 使用组合模式，依赖HttpClient而非继承
 */
export class ImageUploader {
  constructor(private httpClient: HttpClient) {}

  /**
   * 上传单张图片
   */
  async upload(imagePath: string): Promise<UploadResult> {
    let uploadAuth;
    try {
      // 获取上传凭证
      uploadAuth = await this.getUploadAuth();
    } catch (error) {
      throw new Error(`图片上传失败 [${imagePath}] at 步骤1 (获取上传凭证): ${error}`);
    }

    // 读取图片内容
    const imageBuffer = await this.getFileContent(imagePath);

    // 使用image-size库检测格式和尺寸（替代132行手动解析）
    const metadata = this.detectFormat(imageBuffer);

    // 计算CRC32校验
    const imageCrc32 = crc32(imageBuffer).toString(16);

    let uploadImgRes;
    try {
      // 准备上传参数
      const getUploadImageProofRequestParams = {
        Action: 'ApplyImageUpload',
        FileSize: imageBuffer.length,
        ServiceId: 'tb4s082cfz',
        Version: '2018-08-01',
        s: this.httpClient.generateRandomString(11),
      };

      // 获取上传凭证签名
      const requestHeadersInfo = await this.httpClient.generateAuthorizationAndHeader(
        uploadAuth.access_key_id,
        uploadAuth.secret_access_key,
        uploadAuth.session_token,
        'cn-north-1',
        'imagex',
        'GET',
        getUploadImageProofRequestParams
      );

      const getUploadImageProofUrl = 'https://imagex.bytedanceapi.com/';

      // 获取图片上传凭证
      uploadImgRes = await this.httpClient.request({
        method: 'GET',
        url: getUploadImageProofUrl + '?' + this.httpClient.httpBuildQuery(getUploadImageProofRequestParams),
        headers: requestHeadersInfo
      });

      if (uploadImgRes?.['Response']?.hasOwnProperty('Error')) {
        throw new Error(uploadImgRes['Response']['Error']['Message']);
      }
    } catch (error) {
      throw new Error(`图片上传失败 [${imagePath}] at 步骤2 (获取图片上传凭证): ${error}`);
    }

    const UploadAddress = uploadImgRes.Result.UploadAddress;

    try {
      // 上传图片
      const uploadImgUrl = `https://${UploadAddress.UploadHosts[0]}/upload/v1/${UploadAddress.StoreInfos[0].StoreUri}`;

      // 图片上传步骤：带重试机制（仅此步骤重试）
      await this.uploadImageDataWithRetry(
        uploadImgUrl,
        imageBuffer,
        imageCrc32,
        UploadAddress.StoreInfos[0].Auth
      );
    } catch (error) {
      throw new Error(`图片上传失败 [${imagePath}] at 步骤3 (上传图片数据): ${error}`);
    }

    let commitRes;
    try {
      // 提交上传
      const commitImgParams = {
        Action: 'CommitImageUpload',
        FileSize: imageBuffer.length,
        ServiceId: 'tb4s082cfz',
        Version: '2018-08-01',
      };

      const commitImgContent = {
        SessionKey: UploadAddress.SessionKey,
      };

      const commitImgHead = await this.httpClient.generateAuthorizationAndHeader(
        uploadAuth.access_key_id,
        uploadAuth.secret_access_key,
        uploadAuth.session_token,
        'cn-north-1',
        'imagex',
        'POST',
        commitImgParams,
        commitImgContent
      );

      const commitImgUrl = 'https://imagex.bytedanceapi.com/';

      commitRes = await this.httpClient.request({
        method: 'POST',
        url: commitImgUrl + '?' + this.httpClient.httpBuildQuery(commitImgParams),
        data: commitImgContent,
        headers: commitImgHead
      });

      if (commitRes?.['Response']?.hasOwnProperty('Error')) {
        throw new Error(commitRes['Response']['Error']['Message']);
      }
    } catch (error) {
      throw new Error(`图片上传失败 [${imagePath}] at 步骤4 (提交上传): ${error}`);
    }

    const uri = commitRes.Result.PluginResult[0].ImageUri;

    return {
      uri,
      originalPath: imagePath,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    };
  }

  /**
   * 批量上传图片（并行处理）
   */
  async uploadBatch(imagePaths: string[]): Promise<UploadResult[]> {
    return Promise.all(imagePaths.map(path => this.upload(path)));
  }

  /**
   * 检测图片格式和尺寸（使用image-size库，替代132行手动解析）
   */
  detectFormat(pathOrBuffer: string | Buffer): ImageMetadata {
    try {
      const dimensions = (sizeOf as any)(pathOrBuffer);

      if (!dimensions.width || !dimensions.height || !dimensions.type) {
        throw new Error('无法解析图片尺寸');
      }

      return {
        format: dimensions.type as any,
        width: dimensions.width,
        height: dimensions.height
      };
    } catch (error) {
      logger.debug(`检测图片格式失败: ${error}`);
      // 返回默认值以保持兼容性
      return { width: 0, height: 0, format: 'png' };
    }
  }

  /**
   * 读取文件内容（支持本地文件和HTTP URL）
   */
  private async getFileContent(filePath: string): Promise<Buffer> {
    try {
      if (filePath.includes('https://') || filePath.includes('http://')) {
        // 从URL获取图片
        const res = await axios.get(filePath, { responseType: 'arraybuffer' });
        return Buffer.from(res.data);
      } else {
        // 从本地文件读取
        const absolutePath = path.resolve(filePath);

        // 检查文件是否存在
        if (!fs.existsSync(absolutePath)) {
          throw new Error(`文件不存在: ${absolutePath}`);
        }

        // 检查是否是文件（而非目录）
        const stats = await fs.promises.stat(absolutePath);
        if (!stats.isFile()) {
          throw new Error(`路径不是文件: ${absolutePath}`);
        }

        return await fs.promises.readFile(absolutePath);
      }
    } catch (error: any) {
      // 保留原始错误信息
      const errorMsg = error.message || String(error);
      const errorCode = error.code || 'UNKNOWN';
      throw new Error(`读取文件失败 [${filePath}]: ${errorMsg} (错误代码: ${errorCode})`);
    }
  }

  /**
   * 上传图片数据（带重试机制）
   * 这是唯一需要重试的步骤，因为网络传输最容易失败
   */
  private async uploadImageDataWithRetry(
    url: string,
    imageBuffer: Buffer,
    crc32Hash: string,
    authToken: string
  ): Promise<any> {
    return retryAsync(
      async () => {
        const response = await this.httpClient.request({
          method: 'POST',
          url: url,
          data: imageBuffer,
          headers: {
            Authorization: authToken,
            'Content-Crc32': crc32Hash,
            'Content-Type': 'application/octet-stream',
          }
        });

        if (response.code !== 2000) {
          throw new Error(response.message || '图片上传失败');
        }

        return response;
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
      },
      '图片上传'
    );
  }

  /**
   * 获取上传凭证
   */
  private async getUploadAuth(): Promise<any> {
    try {
      logger.debug('[ImageUploader] 开始获取上传凭证...');

      const authRes = await this.httpClient.request({
        method: 'POST',
        url: '/mweb/v1/get_upload_token?aid=513695&da_version=3.2.2&aigc_features=app_lip_sync',
        data: { scene: 2 },
        timeout: 30000 // 明确设置30秒超时
      });

      logger.debug(`[ImageUploader] 上传凭证响应: ${JSON.stringify(authRes).substring(0, 200)}`);

      if (!authRes.data) {
        throw new Error(authRes.errmsg ?? '获取上传凭证失败,账号可能已掉线!');
      }

      logger.debug('[ImageUploader] 上传凭证获取成功');
      return authRes.data;
    } catch (error: any) {
      logger.debug(`[ImageUploader] 获取上传凭证失败: ${error.message}`);
      logger.debug(`[ImageUploader] 错误详情: ${JSON.stringify({
        message: error.message,
        code: error.code,
        hasResponse: !!error.response,
        hasRequest: !!error.request
      })}`);
      throw error;
    }
  }
}
