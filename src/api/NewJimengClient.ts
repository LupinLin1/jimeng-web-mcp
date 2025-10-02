/**
 * JimengClient - 重构后的主客户端（组合模式）
 *
 * 架构变更：
 * - 移除 extends BaseClient 继承
 * - 使用组合模式：注入 HttpClient, ImageUploader, NewCreditService, VideoService
 * - 保持所有现有API签名不变（100%向后兼容）
 * - 旧方法静默重定向到新方法（无警告）
 */

import { HttpClient } from './HttpClient.js';
import { ImageUploader } from './ImageUploader.js';
import { NewCreditService } from './NewCreditService.js';
import { VideoService } from './VideoService.js';
import { getModel, DEFAULT_MODEL, DRAFT_VERSION, WEB_ID } from '../types/models.js';
import { generateUuid, jsonEncode, urlEncode } from '../utils/index.js';
import type {
  ImageGenerationParams,
  VideoGenerationParams,
  MainReferenceVideoParams
} from '../types/api.types.js';

/**
 * JimengClient - 组合模式实现
 */
export class NewJimengClient {
  // 组合的服务类
  private httpClient: HttpClient;
  private imageUploader: ImageUploader;
  private creditService: NewCreditService;
  private videoService: VideoService;

  constructor(token?: string) {
    // 初始化所有服务（组合模式）
    this.httpClient = new HttpClient(token);
    this.imageUploader = new ImageUploader(this.httpClient);
    this.creditService = new NewCreditService(this.httpClient);
    this.videoService = new VideoService(this.httpClient, this.imageUploader);
  }

  // ==================== 图片生成功能 ====================

  /**
   * 图片生成（保持100%向后兼容）
   * 支持继续生成功能（>4张自动触发）
   */
  async generateImage(params: ImageGenerationParams & { async: true }): Promise<string>;
  async generateImage(params: ImageGenerationParams & { async?: false }): Promise<string[]>;
  async generateImage(params: ImageGenerationParams): Promise<string[] | string> {
    const {
      prompt,
      count = 1,
      model = DEFAULT_MODEL,
      aspectRatio = 'auto',
      filePath,
      reference_strength,
      sample_strength,
      negative_prompt,
      async: asyncMode = false
    } = params;

    // 验证参数
    if (count < 1 || count > 15) {
      throw new Error('count必须在1-15之间');
    }

    // 处理参考图
    let uploadedImages: any[] = [];
    if (filePath && filePath.length > 0) {
      uploadedImages = await this.imageUploader.uploadBatch(filePath);
    }

    // 构建API参数
    const apiParams: any = {
      prompt: this.buildPromptWithPrefix(prompt, uploadedImages.length),
      model_name: getModel(model),
      count: Math.min(count, 4), // API限制单次最多4张
      aspect_ratio: aspectRatio,
      negative_prompt: negative_prompt || '',
      draft_version: DRAFT_VERSION
    };

    // 添加参考图参数
    if (uploadedImages.length > 0) {
      apiParams.reference_images = uploadedImages.map((img, idx) => ({
        uri: img.uri,
        strength: reference_strength?.[idx] ?? sample_strength ?? 0.5
      }));
    }

    if (asyncMode) {
      // 异步模式：返回historyId
      return this.submitImageTask(apiParams);
    }

    // 同步模式：等待完成
    const historyId = await this.submitImageTask(apiParams);
    let images = await this.waitForImageCompletion(historyId);

    // 继续生成逻辑（>4张）
    if (count > 4) {
      const remainingCount = count - 4;
      const continueParams = {
        ...apiParams,
        count: Math.min(remainingCount, 4),
        history_id: historyId
      };

      const continueHistoryId = await this.submitImageTask(continueParams);
      const continueImages = await this.waitForImageCompletion(continueHistoryId);
      images = [...images, ...continueImages];
    }

    return images;
  }

  /**
   * 异步提交图像生成任务
   */
  async generateImageAsync(params: ImageGenerationParams): Promise<string> {
    return this.generateImage({ ...params, async: true }) as Promise<string>;
  }

  /**
   * 查询图像生成结果
   */
  async getImageResult(historyId: string): Promise<any> {
    const requestParams = this.httpClient.generateRequestParams();

    const response = await this.httpClient.request({
      method: 'POST',
      url: '/mweb/v1/query_result',
      params: requestParams,
      data: { history_id: historyId }
    });

    return response;
  }

  /**
   * 批量查询任务结果
   */
  async getBatchResults(historyIds: string[]): Promise<any> {
    const results: any = {};

    for (const id of historyIds) {
      try {
        results[id] = await this.getImageResult(id);
      } catch (error) {
        results[id] = { error: String(error) };
      }
    }

    return results;
  }

  // ==================== 视频生成功能 ====================

  /**
   * 旧视频生成API（向后兼容，静默重定向）
   */
  async generateVideo(params: VideoGenerationParams): Promise<string> {
    // 根据参数类型重定向到新方法
    if (params.multiFrames && params.multiFrames.length > 0) {
      // 多帧模式
      const result = await this.videoService.generateMultiFrame({
        frames: params.multiFrames as any, // Type compatibility
        resolution: params.resolution as '720p' | '1080p' | undefined,
        fps: params.fps,
        model: params.model,
        async: false
      });
      return result.videoUrl!;
    }

    // 文生视频模式
    const result = await this.videoService.generateTextToVideo({
      prompt: params.prompt,
      firstFrameImage: params.filePath?.[0],
      lastFrameImage: params.filePath?.[1],
      resolution: params.resolution as '720p' | '1080p' | undefined,
      fps: params.fps,
      duration: params.duration_ms,
      model: params.model,
      async: false
    });
    return result.videoUrl!;
  }

  /**
   * 文生视频（新API）
   */
  async generateTextToVideo(params: any): Promise<any> {
    return this.videoService.generateTextToVideo(params);
  }

  /**
   * 多帧视频（新API）
   */
  async generateMultiFrameVideo(params: any): Promise<any> {
    return this.videoService.generateMultiFrame(params);
  }

  /**
   * 主参考视频（新API）
   */
  async generateMainReferenceVideo(params: MainReferenceVideoParams): Promise<string> {
    const result = await this.videoService.generateMainReference({
      referenceImages: params.referenceImages,
      prompt: params.prompt,
      resolution: params.resolution,
      fps: params.fps,
      duration: params.duration,
      model: params.model,
      async: false
    });
    return result.videoUrl!;
  }

  /**
   * 主参考视频（统一API）
   */
  async generateMainReferenceVideoUnified(params: any): Promise<any> {
    return this.videoService.generateMainReference(params);
  }

  /**
   * 视频后处理（帧插值、超分辨率、音效）
   */
  async videoPostProcess(params: any): Promise<any> {
    // TODO: 实现视频后处理逻辑
    throw new Error('视频后处理功能待实现');
  }

  /**
   * 帧插值（视频后处理）
   */
  async frameInterpolation(params: any): Promise<string> {
    // TODO: 实现帧插值逻辑
    throw new Error('帧插值功能待实现');
  }

  /**
   * 超分辨率（视频后处理）
   */
  async superResolution(params: any): Promise<string> {
    // TODO: 实现超分辨率逻辑
    throw new Error('超分辨率功能待实现');
  }

  /**
   * 音效生成（视频后处理）
   */
  async generateAudioEffect(params: any): Promise<string> {
    // TODO: 实现音效生成逻辑
    throw new Error('音效生成功能待实现');
  }

  // ==================== 积分管理 ====================

  /**
   * 获取积分
   */
  async getCredits(): Promise<number> {
    return this.creditService.getBalance();
  }

  /**
   * 获取详细积分信息
   */
  async getCredit(): Promise<any> {
    return this.creditService.getCredit();
  }

  /**
   * 领取积分
   */
  async receiveCredit(): Promise<void> {
    return this.creditService.receiveCredit();
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 构建带前缀的提示词（参考图逻辑）
   */
  private buildPromptWithPrefix(prompt: string, imageCount: number): string {
    if (imageCount === 0) return prompt;
    if (imageCount === 1) return `##${prompt}`;
    return `####${prompt}`;
  }

  /**
   * 提交图片生成任务
   */
  private async submitImageTask(params: any): Promise<string> {
    const requestParams = this.httpClient.generateRequestParams();

    const response = await this.httpClient.request({
      method: 'POST',
      url: '/mweb/v1/image_generate',
      params: requestParams,
      data: params
    });

    if (!response.history_id) {
      throw new Error(response.errmsg || '提交图片任务失败');
    }

    return response.history_id;
  }

  /**
   * 等待图片生成完成
   */
  private async waitForImageCompletion(historyId: string): Promise<string[]> {
    let attempts = 0;
    const maxAttempts = 60; // 最多等待2分钟

    while (attempts < maxAttempts) {
      const result = await this.getImageResult(historyId);

      if (result.status === 'completed' && result.images) {
        return result.images.map((img: any) => img.url);
      }

      if (result.status === 'failed') {
        throw new Error(result.error || '图片生成失败');
      }

      await this.sleep(2000);
      attempts++;
    }

    throw new Error(`图片生成超时: historyId=${historyId}`);
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取refresh token
   */
  getRefreshToken(): string {
    return this.httpClient.getRefreshToken();
  }
}
