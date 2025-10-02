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
import { ImageDimensionCalculator } from '../utils/dimensions.js';
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
      frames,
      async: asyncMode = false
    } = params;

    // 验证参数
    if (count < 1 || count > 15) {
      throw new Error('count必须在1-15之间');
    }

    // 处理frames参数（与旧代码一致）
    const validFrames = this.validateAndFilterFrames(frames);
    const finalPrompt = this.buildPromptWithFrames(prompt, validFrames, count);

    // 处理参考图
    let uploadedImages: any[] = [];
    if (filePath && filePath.length > 0) {
      console.log(`📤 [参考图] 开始上传 ${filePath.length} 张参考图`);
      uploadedImages = await this.imageUploader.uploadBatch(filePath);
      console.log(`✅ [参考图] 上传完成:`, uploadedImages);
    }

    // 构建API参数
    const apiParams: any = {
      prompt: finalPrompt,  // 使用处理后的prompt
      model_name: getModel(model),
      count: Math.min(count, 4), // API限制单次最多4张
      aspect_ratio: aspectRatio,
      negative_prompt: negative_prompt || '',
      draft_version: DRAFT_VERSION
    };

    // 添加参考图参数（包含完整的图片元数据）
    if (uploadedImages.length > 0) {
      apiParams.reference_images = uploadedImages.map((img, idx) => ({
        uri: img.uri,
        width: img.width,
        height: img.height,
        format: img.format,
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
      url: '/mweb/v1/get_history_by_ids',
      params: requestParams,
      data: {
        history_ids: [historyId],
        image_info: {
          width: 2048,
          height: 2048,
          format: "webp",
          image_scene_list: [
            { scene: "smart_crop", width: 360, height: 360, uniq_key: "smart_crop-w:360-h:360", format: "webp" },
            { scene: "smart_crop", width: 480, height: 480, uniq_key: "smart_crop-w:480-h:480", format: "webp" },
            { scene: "smart_crop", width: 720, height: 720, uniq_key: "smart_crop-w:720-h:720", format: "webp" },
            { scene: "normal", width: 2400, height: 2400, uniq_key: "2400", format: "webp" },
            { scene: "normal", width: 1080, height: 1080, uniq_key: "1080", format: "webp" },
            { scene: "normal", width: 720, height: 720, uniq_key: "720", format: "webp" },
            { scene: "normal", width: 480, height: 480, uniq_key: "480", format: "webp" },
            { scene: "normal", width: 360, height: 360, uniq_key: "360", format: "webp" }
          ]
        },
        http_common_info: { aid: 513695 }
      }
    });

    // 解析响应
    const record = response?.data?.[historyId];
    if (!record) {
      return { status: 'failed', error: '记录不存在' };
    }

    const statusCode = record.status;
    const finishedCount = record.finished_image_count || 0;
    const totalCount = record.total_image_count || 1;

    // 映射状态码
    let status: string;
    if (statusCode === 50) {
      status = 'completed';
    } else if (statusCode === 30) {
      status = 'failed';
    } else if (statusCode === 20 || statusCode === 42 || statusCode === 45) {
      status = finishedCount === 0 ? 'pending' : 'processing';
    } else {
      status = 'processing';
    }

    const result: any = {
      status,
      progress: totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0
    };

    // 提取图片URLs（完成状态）
    if (status === 'completed' && record.item_list && record.item_list.length > 0) {
      result.images = record.item_list
        .map((item: any) => ({
          url: item.image?.large_images?.[0]?.image_url
            || item.image_url
            || item.image?.url
        }))
        .filter((img: any) => img.url);
    }

    // 处理失败状态
    if (status === 'failed') {
      const failCode = record.fail_code;
      result.error = failCode === '2038' ? '内容被过滤'
        : failCode ? `生成失败 (错误码: ${failCode})`
        : '生成失败';
    }

    return result;
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
   * 提交图片生成任务
   */
  private async submitImageTask(params: any): Promise<string> {
    const requestParams = this.httpClient.generateRequestParams();

    // 构建完整的请求体结构（兼容即梦API）
    const submitId = generateUuid();
    const componentId = generateUuid();
    const hasRefImages = !!(params.reference_images && params.reference_images.length > 0);

    const requestBody: any = {
      extend: {
        root_model: params.model_name
      },
      submit_id: submitId,
      metrics_extra: jsonEncode({
        promptSource: "custom",
        generateCount: params.count || 1,
        enterFrom: "click",
        generateId: submitId,
        isRegenerate: false
      }),
      draft_content: jsonEncode({
        type: "draft",
        id: generateUuid(),
        min_version: params.draft_version || DRAFT_VERSION,
        min_features: [],
        is_from_tsn: true,
        version: "3.3.2",
        main_component_id: componentId,
        component_list: [{
          type: "image_base_component",
          id: componentId,
          min_version: hasRefImages ? "3.0.2" : (params.draft_version || DRAFT_VERSION),
          aigc_mode: "workbench",
          gen_type: 1,
          metadata: {
            type: "",
            id: generateUuid(),
            created_platform: 3,
            created_platform_version: "",
            created_time_in_ms: Date.now().toString(),
            created_did: ""
          },
          generate_type: hasRefImages ? "blend" : "generate",
          abilities: {
            type: "",
            id: generateUuid(),
            ...this.buildAbilities(params, hasRefImages)
          }
        }]
      }),
      http_common_info: {
        aid: 513695
      }
    };

    // 如果有history_id，说明是继续生成
    if (params.history_id) {
      requestBody.action = 2;
      requestBody.history_id = params.history_id;
    }

    const response = await this.httpClient.request({
      method: 'POST',
      url: '/mweb/v1/aigc_draft/generate',
      params: requestParams,
      data: requestBody
    });

    const historyId = response?.data?.aigc_data?.history_record_id;
    if (!historyId) {
      throw new Error(response?.errmsg || '提交图片任务失败');
    }

    return historyId;
  }

  /**
   * 构建abilities结构
   */
  private buildAbilities(params: any, hasRefImages: boolean): any {
    const { prompt, model_name, aspect_ratio, negative_prompt, reference_images } = params;

    // 使用ImageDimensionCalculator获取正确的尺寸和imageRatio
    const dimensions = ImageDimensionCalculator.calculateDimensions(aspect_ratio || 'auto');
    const aspectRatioPreset = ImageDimensionCalculator.getAspectRatioPreset(aspect_ratio || 'auto');
    const imageRatio = aspectRatioPreset?.imageRatio || 1; // 默认1:1的imageRatio

    if (hasRefImages) {
      // blend模式（与旧代码完全一致）
      const promptPrefix = reference_images.length === 1 ? "##" : "####";

      const blendData: any = {
        type: "",
        id: generateUuid(),
        blend: {
          type: "",
          id: generateUuid(),
          min_features: [],
          core_param: {
            type: "",
            id: generateUuid(),
            model: model_name,
            prompt: promptPrefix + prompt,
            sample_strength: params.sample_strength || 0.5,
            image_ratio: imageRatio,
            large_image_info: {
              type: "",
              id: generateUuid(),
              height: dimensions.height,
              width: dimensions.width,
              resolution_type: "2k"
            },
            intelligent_ratio: false
          },
          ability_list: reference_images.map((ref: any, index: number) => ({
            type: "",
            id: generateUuid(),
            name: "byte_edit",
            image_uri_list: [ref.uri],
            image_list: [{
              type: "image",
              id: generateUuid(),
              source_from: "upload",
              platform_type: 1,
              name: "",
              image_uri: ref.uri,
              width: ref.width,
              height: ref.height,
              format: ref.format,
              uri: ref.uri
            }],
            strength: ref.strength
          })),
          prompt_placeholder_info_list: reference_images.map((_: any, index: number) => ({
            type: "",
            id: generateUuid(),
            ability_index: index
          })),
          postedit_param: {
            type: "",
            id: generateUuid(),
            generate_type: 0
          }
        }
      };

      // 多参考图需要添加 min_version
      if (reference_images.length > 1) {
        blendData.blend.min_version = "3.2.9";
      }

      return blendData;
    } else {
      // generate模式（与旧代码完全一致）
      return {
        type: "",
        id: generateUuid(),
        generate: {
          type: "",
          id: generateUuid(),
          core_param: {
            type: "",
            id: generateUuid(),
            model: model_name,
            prompt: prompt,
            negative_prompt: negative_prompt || "",
            seed: Math.floor(Math.random() * 100000000) + 2500000000,
            sample_strength: params.sample_strength || 0.5,
            image_ratio: imageRatio,
            large_image_info: {
              type: "",
              id: generateUuid(),
              height: dimensions.height,
              width: dimensions.width,
              resolution_type: "2k"
            },
            intelligent_ratio: false
          }
        }
      };
    }
  }

  /**
   * 等待图片生成完成
   */
  private async waitForImageCompletion(historyId: string): Promise<string[]> {
    let attempts = 0;
    const maxAttempts = 60; // 最多等待2分钟

    while (attempts < maxAttempts) {
      const result = await this.getImageResult(historyId);

      if (result.status === 'completed' && result.images && result.images.length > 0) {
        return result.images.map((img: any) => img.url).filter(Boolean);
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
   * 验证并过滤frames数组（与旧代码一致）
   */
  private validateAndFilterFrames(frames?: string[]): string[] {
    if (!frames || !Array.isArray(frames)) {
      return [];
    }

    // 过滤无效元素
    const valid = frames
      .filter(f => f != null && typeof f === 'string' && f.trim() !== '')
      .map(f => f.trim());

    // 长度限制
    if (valid.length > 15) {
      console.warn(`[Frames] 截断frames数组: ${valid.length} -> 15`);
      return valid.slice(0, 15);
    }

    return valid;
  }

  /**
   * 构建包含frames的最终prompt（与旧代码一致）
   */
  private buildPromptWithFrames(
    basePrompt: string,
    frames: string[],
    count: number
  ): string {
    if (frames.length === 0) {
      return basePrompt;
    }

    // 给每个frame加上序号
    const numberedFrames = frames.map((frame, index) => `第${index + 1}张：${frame}`);
    const framesText = numberedFrames.join(' ');
    // 使用frames的数量，而不是count参数
    return `${basePrompt} ${framesText}，一共${frames.length}张图`;
  }

  /**
   * 获取refresh token
   */
  getRefreshToken(): string {
    return this.httpClient.getRefreshToken();
  }
}
