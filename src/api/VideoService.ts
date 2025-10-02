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

    const actualModel = getModel(model);

    // 上传首尾帧图片
    let first_frame_image = undefined;
    let end_frame_image = undefined;

    if (firstFrameImage || lastFrameImage) {
      const uploadResults: any[] = [];

      if (firstFrameImage) {
        const result = await this.imageUploader.upload(firstFrameImage);
        uploadResults.push(result);
      }

      if (lastFrameImage) {
        const result = await this.imageUploader.upload(lastFrameImage);
        if (!firstFrameImage) uploadResults.unshift(null as any);
        uploadResults.push(result);
      }

      if (uploadResults[0]) {
        first_frame_image = {
          format: uploadResults[0].format,
          height: uploadResults[0].height,
          id: this.generateUuid(),
          image_uri: uploadResults[0].uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResults[0].uri,
          width: uploadResults[0].width,
        };
      }

      if (uploadResults[1]) {
        end_frame_image = {
          format: uploadResults[1].format,
          height: uploadResults[1].height,
          id: this.generateUuid(),
          image_uri: uploadResults[1].uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResults[1].uri,
          width: uploadResults[1].width,
        };
      }
    }

    // 构建draft_content请求体（与旧代码完全一致）
    const componentId = this.generateUuid();
    const submitId = this.generateUuid();
    const metricsExtra = JSON.stringify({
      "enterFrom": "click",
      "isDefaultSeed": 1,
      "promptSource": "custom",
      "isRegenerate": false,
      "originSubmitId": this.generateUuid(),
    });

    const requestBody = {
      "extend": {
        "root_model": end_frame_image ? 'dreamina_ic_generate_video_model_vgfm_3.0' : actualModel,
        "m_video_commerce_info": {
          benefit_type: "basic_video_operation_vgfm_v_three",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        "m_video_commerce_info_list": [{
          benefit_type: "basic_video_operation_vgfm_v_three",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        }]
      },
      "submit_id": submitId,
      "metrics_extra": metricsExtra,
      "draft_content": JSON.stringify({
        "type": "draft",
        "id": this.generateUuid(),
        "min_version": "3.0.5",
        "is_from_tsn": true,
        "version": "3.3.2",
        "main_component_id": componentId,
        "component_list": [{
          "type": "video_base_component",
          "id": componentId,
          "min_version": "1.0.0",
          "metadata": {
            "type": "",
            "id": this.generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now(),
            "created_did": ""
          },
          "generate_type": "gen_video",
          "aigc_mode": "workbench",
          "abilities": {
            "type": "",
            "id": this.generateUuid(),
            "gen_video": {
              "id": this.generateUuid(),
              "type": "",
              "text_to_video_params": {
                "type": "",
                "id": this.generateUuid(),
                "model_req_key": actualModel,
                "priority": 0,
                "seed": Math.floor(Math.random() * 100000000) + 2500000000,
                "video_aspect_ratio": videoAspectRatio,
                "video_gen_inputs": [{
                  duration_ms: duration,
                  first_frame_image: first_frame_image,
                  end_frame_image: end_frame_image,
                  fps: fps,
                  id: this.generateUuid(),
                  min_version: "3.0.5",
                  prompt: prompt,
                  resolution: resolution,
                  type: "",
                  video_mode: 2
                }]
              },
              "video_task_extra": metricsExtra,
            }
          }
        }],
      }),
    };

    // 提交任务
    const taskId = await this.submitTaskWithDraft(requestBody);

    if (asyncMode) {
      return {
        taskId,
        metadata: { model, resolution, duration, fps }
      };
    }

    // 同步模式：轮询
    const videoUrl = await this.pollUntilComplete(taskId);
    return {
      videoUrl,
      metadata: { model, resolution, duration, fps }
    };
  }

  /**
   * 生成UUID（本地方法）
   */
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
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
   * 提交draft格式的视频生成任务（新方法）
   */
  private async submitTaskWithDraft(requestBody: any): Promise<string> {
    const requestParams = this.httpClient.generateRequestParams();

    const response = await this.httpClient.request({
      method: 'POST',
      url: '/mweb/v1/aigc_draft/generate',
      params: requestParams,
      data: requestBody
    });

    // 正确的响应路径（与图片生成一致）
    const historyId = response?.data?.aigc_data?.history_record_id;

    if (!historyId) {
      throw new Error(response.errmsg || '提交视频任务失败');
    }

    return historyId;
  }

  /**
   * 提交视频生成任务（旧方法，保留用于其他模式）
   */
  private async submitTask(params: any): Promise<string> {
    const requestParams = this.httpClient.generateRequestParams();

    const response = await this.httpClient.request({
      method: 'POST',
      url: '/mweb/v1/aigc_draft/generate',
      params: requestParams,
      data: params
    });

    // 正确的响应路径（与图片生成一致）
    const historyId = response?.data?.aigc_data?.history_record_id;

    if (!historyId) {
      throw new Error(response.errmsg || '提交视频任务失败');
    }

    return historyId;
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

    const record = response?.data?.[taskId];
    if (!record) {
      return { status: 'processing' };
    }

    // 解析状态（与旧代码一致）
    const status = record.common_attr?.status ?? 'unknown';
    const failCode = record.common_attr?.fail_code ?? null;

    // 映射状态
    let mappedStatus: string;
    if (status === 'completed' || status === 'success') {
      mappedStatus = 'completed';
    } else if (status === 'failed' || status === 'error') {
      mappedStatus = 'failed';
    } else {
      mappedStatus = 'processing';
    }

    // 提取视频URL（与旧代码一致，尝试多种路径）
    let videoUrl = null;
    if (record.item_list && record.item_list.length > 0) {
      const item = record.item_list[0];
      videoUrl = item?.video?.transcoded_video?.origin?.video_url ||
                item?.video?.video_url ||
                item?.video?.origin?.video_url ||
                item?.common_attr?.cover_url ||
                item?.aigc_video_params?.video_url ||
                item?.url ||
                item?.video_url;
    }

    return {
      status: mappedStatus,
      video_url: videoUrl,
      error: failCode ? `生成失败 (错误码: ${failCode})` : null
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
