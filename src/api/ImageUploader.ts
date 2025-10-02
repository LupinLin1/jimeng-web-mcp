/**
 * ImageUploader - 图片上传服务
 * 使用image-size库替代手动解析（删除132行代码）
 * 提供图片上传、格式检测和批量上传功能
 */

import sizeOf from 'image-size';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import crc32 from 'crc32';
import { HttpClient } from './HttpClient.js';

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
    try {
      // 获取上传凭证
      const uploadAuth = await this.getUploadAuth();

      // 读取图片内容
      const imageBuffer = await this.getFileContent(imagePath);

      // 使用image-size库检测格式和尺寸（替代132行手动解析）
      const metadata = this.detectFormat(imageBuffer);

      // 计算CRC32校验
      const imageCrc32 = crc32(imageBuffer).toString(16);

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
      const uploadImgRes = await this.httpClient.request({
        method: 'GET',
        url: getUploadImageProofUrl + '?' + this.httpClient.httpBuildQuery(getUploadImageProofRequestParams),
        headers: requestHeadersInfo
      });

      if (uploadImgRes?.['Response']?.hasOwnProperty('Error')) {
        throw new Error(uploadImgRes['Response']['Error']['Message']);
      }

      const UploadAddress = uploadImgRes.Result.UploadAddress;

      // 上传图片
      const uploadImgUrl = `https://${UploadAddress.UploadHosts[0]}/upload/v1/${UploadAddress.StoreInfos[0].StoreUri}`;

      const imageUploadRes = await this.httpClient.request({
        method: 'POST',
        url: uploadImgUrl,
        data: imageBuffer,
        headers: {
          Authorization: UploadAddress.StoreInfos[0].Auth,
          'Content-Crc32': imageCrc32,
          'Content-Type': 'application/octet-stream',
        }
      });

      if (imageUploadRes.code !== 2000) {
        throw new Error(imageUploadRes.message);
      }

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

      const commitRes = await this.httpClient.request({
        method: 'POST',
        url: commitImgUrl + '?' + this.httpClient.httpBuildQuery(commitImgParams),
        data: commitImgContent,
        headers: commitImgHead
      });

      if (commitRes?.['Response']?.hasOwnProperty('Error')) {
        throw new Error(commitRes['Response']['Error']['Message']);
      }

      const uri = commitRes.Result.PluginResult[0].Uri;

      return {
        uri,
        originalPath: imagePath,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      };
    } catch (error) {
      throw new Error(`图片上传失败 [${imagePath}]: ${error}`);
    }
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
      console.error('检测图片格式失败:', error);
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
        return await fs.promises.readFile(absolutePath);
      }
    } catch (error) {
      throw new Error(`读取文件失败: ${filePath}`);
    }
  }

  /**
   * 获取上传凭证
   */
  private async getUploadAuth(): Promise<any> {
    const authRes = await this.httpClient.request({
      method: 'POST',
      url: '/mweb/v1/get_upload_token?aid=513695&da_version=3.2.2&aigc_features=app_lip_sync',
      data: { scene: 2 }
    });

    if (!authRes.data) {
      throw new Error(authRes.errmsg ?? '获取上传凭证失败,账号可能已掉线!');
    }

    return authRes.data;
  }
}
