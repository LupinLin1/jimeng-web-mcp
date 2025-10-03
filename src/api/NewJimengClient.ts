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

  // 异步任务参数缓存（用于智能继续生成）
  private static asyncTaskCache = new Map<string, {
    params: ImageGenerationParams;
    uploadedImages: any[];
    apiParams: any;
  }>();

  // 继续生成发送状态（防重复）
  private static continuationSent = new Map<string, boolean>();

  // 原始请求体缓存（用于继续生成）
  private static requestBodyCache = new Map<string, {
    submitId: string;
    draftContent: string;
    metricsExtra: string;
    extend: any;
  }>();

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
    let finalPrompt = this.buildPromptWithFrames(prompt, validFrames, count);

    // 🔥 关键修复：多张图必须在prompt中明确说明总数
    if (count > 1 && validFrames.length === 0) {
      finalPrompt = `${finalPrompt}，一共${count}张图`;
    }

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
      // 异步模式：提交任务并缓存参数（用于智能继续生成）
      const historyId = await this.submitImageTask(apiParams);

      // 缓存参数以供后续继续生成使用
      NewJimengClient.asyncTaskCache.set(historyId, {
        params,
        uploadedImages,
        apiParams
      });

      console.log(`💾 [异步生成] 已缓存参数, historyId: ${historyId}, count: ${count}`);
      console.log(`💾 [异步生成] 缓存内容:`, JSON.stringify({
        'params.count': params.count,
        'params.prompt': params.prompt?.substring(0, 50),
        'apiParams.count': apiParams.count,
        'uploadedImages.length': uploadedImages.length
      }));

      return historyId;
    }

    // 同步模式：等待完成
    const historyId = await this.submitImageTask(apiParams);

    // 🔥 同步模式下也缓存参数（用于智能继续生成）
    if (count > 4) {
      NewJimengClient.asyncTaskCache.set(historyId, {
        params,
        uploadedImages,
        apiParams
      });
      console.log(`💾 [同步缓存] 已缓存参数用于继续生成, historyId: ${historyId}`);
    }

    let images = await this.waitForImageCompletion(historyId);

    // 继续生成逻辑（>4张）
    // 🔥 关键修复：检查是否智能继续生成已经完成了所有图片
    if (count > 4 && images.length < count) {
      console.log(`🔄 [手动继续生成] 已获得${images.length}张，目标${count}张，需要继续生成`);

      const remainingCount = count - images.length;
      const continueParams = {
        ...apiParams,
        count: Math.min(remainingCount, 4),
        history_id: historyId
      };

      const continueHistoryId = await this.submitImageTask(continueParams);
      const continueImages = await this.waitForImageCompletion(continueHistoryId);
      images = [...images, ...continueImages];
    } else if (count > 4) {
      console.log(`✅ [继续生成] 智能继续生成已完成，实际获得${images.length}张图片`);
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
   * 查询图像/视频生成结果
   * 自动判断ID类型：UUID格式使用submit_ids，数字格式使用history_ids
   */
  async getImageResult(historyId: string): Promise<any> {
    const requestParams = this.httpClient.generateRequestParams();

    // UUID格式（如1e06b3c9-bd41-46dd-8889-70f2c61f66bb）使用submit_ids（视频）
    // 数字格式（如4722540945676）使用history_ids（图片）
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(historyId);
    const idField = isUUID ? 'submit_ids' : 'history_ids';

    console.log(`🔍 [getImageResult] ID类型: ${isUUID ? 'UUID(视频)' : '数字(图片)'}, 使用字段: ${idField}`);

    const response = await this.httpClient.request({
      method: 'POST',
      url: '/mweb/v1/get_history_by_ids',
      params: requestParams,
      data: {
        [idField]: [historyId],
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

    // 解析基础结果
    const result = this.parseQueryResult(record, historyId);

    // 🔥 智能继续生成逻辑（修复：不管status是什么都检查，参考旧代码）
    // 检测是否需要触发继续生成（仅对图片任务）
    if (!isUUID) {
      const statusCode = record.status;
      const totalCount = record.total_image_count || 0;
      const finishedCount = record.finished_image_count || 0;
      const itemCount = record.item_list?.length || 0;

      console.log(`🔍 [智能继续生成检测] historyId=${historyId}, status=${result.status}(${statusCode}), total=${totalCount}, finished=${finishedCount}, items=${itemCount}`);
      console.log(`🔍 [缓存检查] 是否有缓存: ${NewJimengClient.asyncTaskCache.has(historyId)}, 是否已发送: ${NewJimengClient.continuationSent.has(historyId)}`);

      // 判断是否需要继续生成（与旧代码一致）
      // 1. totalCount > 4 - 需要生成超过4张
      // 2. finishedCount >= 4 - 已完成至少4张
      // 3. finishedCount < totalCount - 还没全部完成
      // 4. statusCode !== 30 - 没有失败
      // 5. 未发送过继续生成请求（防重复）
      const needsContinuation = totalCount > 4 &&
                               finishedCount >= 4 &&
                               finishedCount < totalCount &&
                               statusCode !== 30 &&
                               !NewJimengClient.continuationSent.get(historyId);

      console.log(`🔍 [判断结果] needsContinuation=${needsContinuation} (total>4: ${totalCount > 4}, finished>=4: ${finishedCount >= 4}, finished<total: ${finishedCount < totalCount}, notFailed: ${statusCode !== 30}, notSent: ${!NewJimengClient.continuationSent.get(historyId)})`);

      if (needsContinuation) {
        console.log(`🔄 [智能继续生成] 检测到需要继续: 目标${totalCount}张, 已完成${finishedCount}张, 当前${itemCount}张`);

        // 标记为已处理，防止重复
        NewJimengClient.continuationSent.set(historyId, true);

        // 异步发送继续生成请求（不等待完成，与旧代码一致）
        this.performAsyncContinueGeneration(historyId).catch(err => {
          console.error(`❌ [智能继续生成] 失败:`, err);
          NewJimengClient.continuationSent.delete(historyId); // 失败时清除标记，允许重试
        });

        // 提示用户需要再次查询
        result.needs_more = true;
        result.message = `已触发继续生成（${finishedCount}/${totalCount}），请稍后再次查询以获取所有图片`;
      } else if (result.status === 'completed' && totalCount > itemCount && finishedCount === totalCount) {
        // 所有图片已完成，但item_list不完整（可能需要多次查询）
        result.needs_more = true;
        result.message = `生成完成（${totalCount}张），但当前只返回${itemCount}张，可能需要再次查询`;
      }
    }

    return result;
  }

  /**
   * 批量查询任务结果（真正的批量API）
   * 自动按ID类型分组：图片用history_ids，视频用submit_ids
   */
  async getBatchResults(ids: string[]): Promise<Record<string, any>> {
    if (!ids || ids.length === 0) {
      return {};
    }

    // 按ID类型分组
    const imageIds: string[] = [];
    const videoIds: string[] = [];

    for (const id of ids) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        videoIds.push(id);
      } else {
        imageIds.push(id);
      }
    }

    const results: Record<string, any> = {};

    // 批量查询图片
    if (imageIds.length > 0) {
      try {
        const requestParams = this.httpClient.generateRequestParams();
        const response = await this.httpClient.request({
          method: 'POST',
          url: '/mweb/v1/get_history_by_ids',
          params: requestParams,
          data: {
            history_ids: imageIds,
            image_info: {
              width: 2048,
              height: 2048,
              format: "webp"
            }
          }
        });

        // 解析图片结果
        for (const id of imageIds) {
          const record = response?.data?.[id];
          if (record) {
            results[id] = this.parseQueryResult(record, id);
          } else {
            results[id] = { status: 'failed', error: '记录不存在' };
          }
        }
      } catch (error) {
        for (const id of imageIds) {
          results[id] = { status: 'failed', error: String(error) };
        }
      }
    }

    // 批量查询视频
    if (videoIds.length > 0) {
      try {
        const requestParams = this.httpClient.generateRequestParams();
        const response = await this.httpClient.request({
          method: 'POST',
          url: '/mweb/v1/get_history_by_ids',
          params: requestParams,
          data: {
            submit_ids: videoIds
          }
        });

        // 解析视频结果
        for (const id of videoIds) {
          const record = response?.data?.[id];
          if (record) {
            results[id] = this.parseQueryResult(record, id);
          } else {
            results[id] = { status: 'failed', error: '记录不存在' };
          }
        }
      } catch (error) {
        for (const id of videoIds) {
          results[id] = { status: 'failed', error: String(error) };
        }
      }
    }

    return results;
  }

  /**
   * 解析查询结果（提取公共逻辑）
   */
  private parseQueryResult(record: any, id: string): any {
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

    // 提取URLs
    if (status === 'completed' && record.item_list && record.item_list.length > 0) {
      const firstItem = record.item_list[0];

      if (firstItem.video) {
        result.videoUrl = firstItem.video?.transcoded_video?.origin?.video_url
          || firstItem.video?.video_url
          || firstItem.video?.origin?.video_url;
      } else if (firstItem.image || firstItem.image_url) {
        result.imageUrls = record.item_list
          .map((item: any) =>
            item.image?.large_images?.[0]?.image_url
            || item.image_url
            || item.image?.url
          )
          .filter((url: any) => url);
      }
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
   * 执行异步继续生成（智能继续生成核心方法）
   */
  private async performAsyncContinueGeneration(historyId: string): Promise<void> {
    console.log(`🔄 [AsyncContinue] 开始执行继续生成, historyId: ${historyId}`);

    // 从缓存获取原始参数
    const cached = NewJimengClient.asyncTaskCache.get(historyId);

    if (!cached) {
      console.error(`❌ [AsyncContinue] 未找到缓存参数, historyId: ${historyId}`);
      throw new Error(`无法找到historyId对应的原始参数: ${historyId}`);
    }

    console.log(`💾 [AsyncContinue] 从缓存获取参数成功, count: ${cached.params.count}`);

    // 计算剩余数量
    const totalCount = cached.params.count || 1;
    const remainingCount = totalCount - 4;

    if (remainingCount <= 0) {
      console.log(`⏭️  [AsyncContinue] 无需继续生成, totalCount: ${totalCount}`);
      return;
    }

    // 构建继续生成请求
    const continueParams = {
      ...cached.apiParams,
      count: Math.min(remainingCount, 4),
      history_id: historyId  // 关键：使用原始historyId触发继续生成
    };

    console.log(`📤 [AsyncContinue] 提交继续生成请求: count=${continueParams.count}, history_id=${historyId}`);

    // 提交继续生成任务
    try {
      const newHistoryId = await this.submitImageTask(continueParams);
      console.log(`✅ [AsyncContinue] 继续生成任务已提交, 新historyId: ${newHistoryId}`);

      // 如果还有更多图片需要生成，缓存新任务的参数
      if (remainingCount > 4) {
        NewJimengClient.asyncTaskCache.set(newHistoryId, {
          params: {
            ...cached.params,
            count: remainingCount
          },
          uploadedImages: cached.uploadedImages,
          apiParams: cached.apiParams
        });
        console.log(`💾 [AsyncContinue] 已缓存新任务参数, historyId: ${newHistoryId}, remaining: ${remainingCount - 4}`);
      }
    } catch (error) {
      console.error(`❌ [AsyncContinue] 提交失败:`, error);
      throw error;
    }
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
   * 查询视频生成结果（单个）
   */
  async queryVideoResult(submitId: string): Promise<any> {
    return this.videoService.queryVideo(submitId);
  }

  /**
   * 批量查询视频生成结果
   */
  async queryVideoResults(submitIds: string[]): Promise<Record<string, any>> {
    return this.videoService.queryVideoBatch(submitIds);
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
    const hasRefImages = !!(params.reference_images && params.reference_images.length > 0);

    // 🔥 关键修复：继续生成必须重用原始请求参数
    let requestBody: any;

    if (params.history_id && NewJimengClient.requestBodyCache.has(params.history_id)) {
      // 继续生成：重用原始参数，但更新generateCount
      const cached = NewJimengClient.requestBodyCache.get(params.history_id)!;
      console.log(`🔄 [继续生成] 重用原始请求参数, historyId: ${params.history_id}, count: ${params.count}`);

      // 🔥 关键修复：更新metrics_extra中的generateCount为剩余数量
      const originalMetrics = JSON.parse(cached.metricsExtra);
      originalMetrics.generateCount = params.count || 1;  // 更新为剩余数量
      const updatedMetricsExtra = jsonEncode(originalMetrics);

      requestBody = {
        extend: cached.extend,
        submit_id: cached.submitId,          // ⚠️ 使用原始submit_id
        metrics_extra: updatedMetricsExtra,  // ⚠️ 使用更新后的metrics_extra
        draft_content: cached.draftContent,  // ⚠️ 使用原始draft_content
        http_common_info: {
          aid: 513695
        },
        action: 2,                           // ✅ 继续生成标识
        history_id: params.history_id        // ✅ 原始任务ID
      };
    } else {
      // 首次生成：构建新的请求参数
      const submitId = generateUuid();
      const componentId = generateUuid();

      const extend = {
        root_model: params.model_name
      };

      const metricsExtra = jsonEncode({
        promptSource: "custom",
        generateCount: params.count || 1,
        enterFrom: "click",
        generateId: submitId,
        isRegenerate: false
      });

      const draftContent = jsonEncode({
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
      });

      requestBody = {
        extend,
        submit_id: submitId,
        metrics_extra: metricsExtra,
        draft_content: draftContent,
        http_common_info: {
          aid: 513695
        }
      };
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

    // 🔥 缓存首次请求的参数（用于继续生成）
    if (!params.history_id) {
      NewJimengClient.requestBodyCache.set(historyId, {
        submitId: requestBody.submit_id,
        draftContent: requestBody.draft_content,
        metricsExtra: requestBody.metrics_extra,
        extend: requestBody.extend
      });
      console.log(`💾 [缓存] 已保存首次请求参数, historyId: ${historyId}`);
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

      if (result.status === 'completed' && result.imageUrls && result.imageUrls.length > 0) {
        return result.imageUrls;
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
