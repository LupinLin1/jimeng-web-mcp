/**
 * Unit tests for new ImageUploader implementation
 * Tests image-size library integration
 */

import { jest } from '@jest/globals';
import { ImageUploader } from '../../src/api/ImageUploader.js';
import { HttpClient } from '../../src/api/HttpClient.js';
import fs from 'fs';
import path from 'path';

describe('ImageUploader (New Implementation)', () => {
  let imageUploader: ImageUploader;
  let httpClient: HttpClient;

  beforeAll(() => {
    process.env.JIMENG_API_TOKEN = 'test-token-12345';
    httpClient = new HttpClient();
    imageUploader = new ImageUploader(httpClient);
  });

  describe('Image Format Detection (using image-size library)', () => {
    it('should detect PNG format and dimensions', () => {
      // Create a minimal valid PNG buffer (1x1 pixel)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, // Width: 1
        0x00, 0x00, 0x00, 0x01, // Height: 1
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
        0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
        0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const metadata = imageUploader.detectFormat(pngBuffer);

      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(1);
      expect(metadata.height).toBe(1);
    });

    it('should detect JPEG format and dimensions', () => {
      // Create a minimal valid JPEG buffer
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG SOI + APP0
        0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        0xFF, 0xC0, // SOF0 marker
        0x00, 0x11, 0x08, // Length and precision
        0x00, 0x10, // Height: 16
        0x00, 0x10, // Width: 16
        0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
        0xFF, 0xD9 // EOI
      ]);

      const metadata = imageUploader.detectFormat(jpegBuffer);

      expect(metadata.format).toBe('jpg'); // image-size库返回'jpg'而不是'jpeg'
      expect(metadata.width).toBe(16);
      expect(metadata.height).toBe(16);
    });

    it('should return default values for invalid image data', () => {
      const invalidBuffer = Buffer.from([0x00, 0x00, 0x00]);

      const metadata = imageUploader.detectFormat(invalidBuffer);

      // Should return defaults without crashing
      expect(metadata.width).toBe(0);
      expect(metadata.height).toBe(0);
      expect(metadata.format).toBe('png'); // Default format
    });
  });

  describe('Composition Pattern', () => {
    it('should use injected HttpClient for requests', () => {
      expect(imageUploader['httpClient']).toBe(httpClient);
    });

    it('should not extend any base class', () => {
      const proto = Object.getPrototypeOf(imageUploader);
      expect(proto.constructor.name).toBe('ImageUploader');

      // Should only have ImageUploader in the prototype chain (plus Object)
      const protoChain: string[] = [];
      let current = imageUploader;
      while (Object.getPrototypeOf(current) !== null) {
        current = Object.getPrototypeOf(current);
        protoChain.push(current.constructor.name);
      }

      expect(protoChain).toEqual(['ImageUploader', 'Object']);
    });
  });

  describe('Upload Retry Mechanism', () => {
    it('验证重试机制已集成到图片上传步骤', () => {
      // 验证uploadImageDataWithRetry方法存在
      // 该方法内部使用retryAsync实现重试逻辑
      // 详细的重试行为已在retry.test.ts中测试
      expect(imageUploader['uploadImageDataWithRetry']).toBeDefined();
      expect(typeof imageUploader['uploadImageDataWithRetry']).toBe('function');
    });

    it('获取凭证失败时应立即抛出错误', async () => {
      let authAttempts = 0;

      jest.spyOn(imageUploader as any, 'getUploadAuth').mockImplementation(() => {
        authAttempts++;
        throw new Error('Auth failed');
      });

      jest.spyOn(imageUploader as any, 'getFileContent').mockResolvedValue(
        Buffer.from([0x89, 0x50, 0x4E, 0x47])
      );

      jest.spyOn(imageUploader, 'detectFormat').mockReturnValue({
        format: 'png',
        width: 100,
        height: 100
      });

      await expect(imageUploader.upload('/test/image.png')).rejects.toThrow('Auth failed');

      expect(authAttempts).toBe(1); // 只尝试一次，不重试
    });

    it('批量上传使用Promise.all保持原子性', async () => {
      // 验证uploadBatch使用Promise.all而非Promise.allSettled
      const uploadSpy = jest.spyOn(imageUploader, 'upload');
      uploadSpy
        .mockResolvedValueOnce({ uri: 'image1.jpg', originalPath: '/test1.png', width: 100, height: 100, format: 'png' })
        .mockRejectedValueOnce(new Error('Upload failed'));

      await expect(
        imageUploader.uploadBatch(['/test/image1.png', '/test/image2.png'])
      ).rejects.toThrow('Upload failed');

      // 验证Promise.all行为：一个失败全部失败
      expect(uploadSpy).toHaveBeenCalledTimes(2);
    });
  });
});
