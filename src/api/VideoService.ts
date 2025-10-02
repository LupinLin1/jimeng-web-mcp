/**
 * VideoService - 统一视频生成服务
 * 合并4个独立生成器的功能（TextToVideo, MultiFrame, MainReference）
 * 内联轮询逻辑（≤30行），移除timeout.ts依赖
 * 使用组合模式，依赖HttpClient和ImageUploader
 */

import { HttpClient } from './HttpClient.js';
import { ImageUploader } from './ImageUploader.js';
import { getModel } from '../types/models.js';

// ==================== 类型定义 ====================

export interface VideoResult {
  videoUrl?: string;
  taskId?: string;
  metadata: {
    model: string;
    resolution: string;
    duration: number;
    fps: number;
  };
}

export interface TextToVideoParams {
  prompt: string;
  model?: string;
  resolution?: '720p' | '1080p';
  fps?: number;
  duration?: number;
  async?: boolean;
  firstFrameImage?: string;
  lastFrameImage?: string;
  videoAspectRatio?: string;
}

export interface FrameConfig {
  idx: number;
  imagePath: string;
  duration_ms: number;
  prompt: string;
}

export interface MultiFrameParams {
  frames: FrameConfig[];
  model?: string;
  resolution?: '720p' | '1080p';
  fps?: number;
  async?: boolean;
  videoAspectRatio?: string;
}

export interface MainReferenceParams {
  referenceImages: string[];
  prompt: string;
  model?: string;
  resolution?: '720p' | '1080p';
  fps?: number;
  duration?: number;
  async?: boolean;
  videoAspectRatio?: string;
}

/**
 * VideoService类
 * 整合所有视频生成功能
 */
export class VideoService {
  constructor(
    private httpClient: HttpClient,
    private imageUploader: ImageUploader
  ) {}

  // ==================== 公共方法：三种视频生成模式 ====================

  /**
   * 文本生成视频（支持首尾帧）
   */
  async generateTextToVideo(params: TextToVideoParams): Promise<VideoResult> {
    const {
      prompt,
      firstFrameImage,
      lastFrameImage,
      async: asyncMode = false,
      resolution = '720p',
      videoAspectRatio = '16:9',
      fps = 24,
      duration = 5000,
      model = 'jimeng-video-3.0'
    } = params;

    // 验证参数
    if (duration < 3000 || duration > 15000) {
      throw new Error('duration必须在3000-15000毫秒之间');
    }

    // 构建请求参数
    const apiParams: any = {
      prompt,
      model: getModel(model),
      resolution,
      video_aspect_ratio: videoAspectRatio,
      fps,
      duration_ms: duration
    };

    // 如果有首尾帧，上传图片
    if (firstFrameImage || lastFrameImage) {
      const framePaths: string[] = [];
      if (firstFrameImage) framePaths.push(firstFrameImage);
      if (lastFrameImage) framePaths.push(lastFrameImage);

      const uploadedFrames = await this.uploadFrames(framePaths);
      apiParams.file_list = uploadedFrames.map(f => ({ uri: f.uri }));
    }

    // 提交任务并返回
    return this.submitAndPoll(apiParams, asyncMode, {
      model, resolution, duration, fps
    });
  }

  /**
   * 多帧视频生成（2-10帧）
   */
  async generateMultiFrame(params: MultiFrameParams): Promise<VideoResult> {
    const {
      frames,
      async: asyncMode = false,
      resolution = '720p',
      fps = 24,
      model = 'jimeng-video-3.0',
      videoAspectRatio = '16:9'
    } = params;

    // 验证参数
    if (frames.length < 2 || frames.length > 10) {
      throw new Error('帧数量必须在2-10之间');
    }

    // 按索引排序
    const sortedFrames = [...frames].sort((a, b) => a.idx - b.idx);

    // 上传所有帧图片
    const uploadedFrames = await this.uploadFrames(sortedFrames.map(f => f.imagePath));

    // 构建multiFrames参数
    const multiFrames = sortedFrames.map((frame, index) => ({
      idx: frame.idx,
      duration_ms: frame.duration_ms,
      prompt: frame.prompt,
      image_path: uploadedFrames[index].uri
    }));

    const totalDuration = sortedFrames.reduce((sum, f) => sum + f.duration_ms, 0);

    const apiParams = {
      prompt: sortedFrames[0].prompt, // 使用第一帧的提示词作为主提示
      model: getModel(model),
      resolution,
      video_aspect_ratio: videoAspectRatio,
      fps,
      duration_ms: totalDuration,
      multiFrames
    };

    return this.submitAndPoll(apiParams, asyncMode, {
      model, resolution, duration: totalDuration, fps
    });
  }

  /**
   * 主参考视频生成（2-4张参考图）
   */
  async generateMainReference(params: MainReferenceParams): Promise<VideoResult> {
    const {
      referenceImages,
      prompt,
      async: asyncMode = false,
      resolution = '720p',
      fps = 24,
      duration = 5000,
      model = 'jimeng-video-3.0',
      videoAspectRatio = '16:9'
    } = params;

    // 验证参数
    if (referenceImages.length < 2 || referenceImages.length > 4) {
      throw new Error('参考图片数量必须在2-4之间');
    }

    if (!prompt.includes('[图')) {
      throw new Error('必须包含至少一个图片引用（如[图0]）');
    }

    // 上传参考图片
    const uploadedImages = await this.uploadFrames(referenceImages);

    // 解析提示词，提取[图N]引用
    const { textSegments, imageRefs } = this.parseMainReferencePrompt(prompt, referenceImages.length);

    // 构建idip_meta_list
    const idip_meta_list = this.buildIdipMetaList(textSegments, imageRefs);

    const apiParams = {
      prompt: prompt.replace(/\[图\d+\]/g, ''), // 移除图片引用标记
      model: getModel(model),
      resolution,
      video_aspect_ratio: videoAspectRatio,
      fps,
      duration_ms: duration,
      video_mode: 2, // 主参考模式
      idip_frames: uploadedImages.map(img => ({ uri: img.uri })),
      idip_meta_list
    };

    return this.submitAndPoll(apiParams, asyncMode, {
      model, resolution, duration, fps
    });
  }

  // ==================== 私有方法：共享逻辑 ====================

  /**
   * 上传多个帧图片
   */
  private async uploadFrames(imagePaths: string[]): Promise<any[]> {
    return this.imageUploader.uploadBatch(imagePaths);
  }

  /**
   * 提交任务并根据模式处理
   */
  private async submitAndPoll(
    apiParams: any,
    asyncMode: boolean,
    metadata: { model: string; resolution: string; duration: number; fps: number }
  ): Promise<VideoResult> {
    // 提交任务
    const taskId = await this.submitTask(apiParams);

    if (asyncMode) {
      // 异步模式：立即返回taskId
      return {
        taskId,
        metadata
      };
    }

    // 同步模式：轮询直到完成
    const videoUrl = await this.pollUntilComplete(taskId);
    return {
      videoUrl,
      metadata
    };
  }

  /**
   * 提交视频生成任务
   */
  private async submitTask(params: any): Promise<string> {
    const requestParams = this.httpClient.generateRequestParams();

    const response = await this.httpClient.request({
      method: 'POST',
      url: '/mweb/v1/aigc_draft/generate',
      params: requestParams,
      data: params
    });

    if (!response.history_id) {
      throw new Error(response.errmsg || '提交视频任务失败');
    }

    return response.history_id;
  }

  /**
   * 轮询直到任务完成（内联实现，≤30行）
   */
  private async pollUntilComplete(taskId: string): Promise<string> {
    let interval = 2000; // 初始2秒
    const startTime = Date.now();
    const timeout = 600000; // 600秒

    while (Date.now() - startTime < timeout) {
      const status = await this.checkTaskStatus(taskId);

      if (status.status === 'completed' && status.video_url) {
        return status.video_url;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || '视频生成失败');
      }

      // 等待后重试
      await this.sleep(interval);
      interval = Math.min(interval * 1.5, 10000); // 指数退避，最大10秒
    }

    throw new Error(`视频生成超时: taskId=${taskId}`);
  }

  /**
   * 检查任务状态
   */
  private async checkTaskStatus(taskId: string): Promise<any> {
    const requestParams = this.httpClient.generateRequestParams();

    const response = await this.httpClient.request({
      method: 'POST',
      url: '/mweb/v1/get_history_by_ids',
      params: requestParams,
      data: { submit_ids: [taskId] }
    });

    const history = response?.data?.[taskId];
    if (!history) {
      return { status: 'processing' };
    }

    return {
      status: history.status === 2 ? 'completed' : history.status === 3 ? 'failed' : 'processing',
      video_url: history.resource_url,
      error: history.errmsg
    };
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 解析主参考提示词（提取[图N]引用）
   */
  private parseMainReferencePrompt(prompt: string, imageCount: number): {
    textSegments: string[];
    imageRefs: number[];
  } {
    const regex = /\[图(\d+)\]/g;
    const textSegments: string[] = [];
    const imageRefs: number[] = [];

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(prompt)) !== null) {
      // 添加前面的文本段
      if (match.index > lastIndex) {
        textSegments.push(prompt.substring(lastIndex, match.index));
      }

      // 添加图片引用索引
      const imageIndex = parseInt(match[1]);
      if (imageIndex >= imageCount) {
        throw new Error(`图片引用[图${imageIndex}]超出范围（0-${imageCount - 1}）`);
      }
      imageRefs.push(imageIndex);

      lastIndex = regex.lastIndex;
    }

    // 添加最后的文本段
    if (lastIndex < prompt.length) {
      textSegments.push(prompt.substring(lastIndex));
    }

    return { textSegments, imageRefs };
  }

  /**
   * 构建idip_meta_list（主参考模式参数）
   */
  private buildIdipMetaList(textSegments: string[], imageRefs: number[]): any[] {
    const metaList: any[] = [];

    for (let i = 0; i < Math.max(textSegments.length, imageRefs.length); i++) {
      if (i < textSegments.length && textSegments[i].trim()) {
        metaList.push({
          type: 'text',
          content: textSegments[i].trim()
        });
      }
      if (i < imageRefs.length) {
        metaList.push({
          type: 'idip',
          idip_idx: imageRefs[i]
        });
      }
    }

    return metaList;
  }
}
