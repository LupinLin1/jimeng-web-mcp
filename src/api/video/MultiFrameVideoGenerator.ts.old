/**
 * 多帧视频生成器
 *
 * 功能：根据多个关键帧配置生成视频
 * 特性：
 * - 支持2-10个帧配置
 * - 每帧独立的提示词、时长和参考图片
 * - 统一的async参数控制同步/异步模式
 * - 自动验证帧序号唯一性和总时长限制
 *
 * @module MultiFrameVideoGenerator
 */

import { VideoGenerator } from './VideoGenerator.js';
import { pollUntilComplete, TimeoutError } from '../../utils/timeout.js';
import { generateUuid } from '../../utils/index.js';
import { getModel } from '../../types/models.js';
import type {
  MultiFrameVideoOptions,
  FrameConfiguration,
  VideoTaskResult,
  VideoGenerationError,
  VideoTaskStatus,
  VideoGenerationMode
} from '../../types/api.types.js';

/**
 * 多帧视频生成器类
 */
export class MultiFrameVideoGenerator extends VideoGenerator {
  /**
   * 生成多帧视频
   *
   * @param options - 多帧视频选项
   * @returns Promise<VideoTaskResult>
   */
  async generateMultiFrameVideo(options: MultiFrameVideoOptions): Promise<VideoTaskResult> {
    // 参数验证
    this.validateMultiFrameOptions(options);

    const {
      frames,
      async = false,
      resolution = '720p',
      videoAspectRatio = '16:9',
      fps = 24,
      model = 'jimeng-video-3.0'
    } = options;

    try {
      // 按idx排序帧
      const sortedFrames = [...frames].sort((a, b) => a.idx - b.idx);

      // 上传所有参考图片
      const uploadedFrames = await this.uploadFrameImages(sortedFrames);

      // 提交任务
      const taskId = await this.submitMultiFrameTask({
        frames: uploadedFrames,
        model,
        resolution,
        videoAspectRatio,
        fps
      });

      // 返回结果
      if (async) {
        return { taskId };
      } else {
        const result = await pollUntilComplete(
          taskId,
          async (id) => this.checkTaskStatus(id)
        );

        const totalDuration = frames.reduce((sum, f) => sum + f.duration_ms, 0);

        return {
          videoUrl: result.videoUrl,
          metadata: {
            duration: totalDuration,
            resolution,
            format: 'mp4',
            generationParams: {
              mode: 'multi_frame' as VideoGenerationMode,
              model,
              fps,
              aspectRatio: videoAspectRatio
            }
          }
        };
      }
    } catch (error: any) {
      if (error instanceof TimeoutError) {
        throw this.createError('TIMEOUT', error.message, error.message);
      }
      throw this.handleError(error);
    }
  }

  /**
   * 验证多帧选项
   * NOTE: Schema验证已处理大部分参数验证，这里只保留关键业务逻辑验证
   */
  private validateMultiFrameOptions(options: MultiFrameVideoOptions): void {
    const { frames } = options;

    // 只进行关键的业务逻辑验证
    // 基础参数验证由schema处理

    // 验证帧序号唯一性（业务逻辑要求）
    const indices = frames.map(f => f.idx);
    const uniqueIndices = new Set(indices);
    if (indices.length !== uniqueIndices.size) {
      throw this.createError(
        'INVALID_PARAMS',
        '帧序号必须唯一',
        `检测到重复的帧序号`
      );
    }

    // 验证总时长（业务逻辑限制）
    const totalDuration = frames.reduce((sum: number, f: FrameConfiguration) => sum + f.duration_ms, 0);
    if (totalDuration > 15000) {
      throw this.createError(
        'INVALID_PARAMS',
        '总时长不能超过15秒',
        `所有帧的总时长为${totalDuration}ms，超过15000ms限制`
      );
    }

    console.log(`[DEBUG] 多帧视频验证通过: ${frames.length}个帧，总时长${totalDuration}ms`);
  }

  /**
   * 上传所有帧的参考图片
   */
  private async uploadFrameImages(frames: FrameConfiguration[]): Promise<any[]> {
    console.log(`[DEBUG] 开始上传${frames.length}个帧的参考图片`);

    const uploadedFrames = [];
    for (const frame of frames) {
      try {
        const uploadResult = await this.uploadImage(frame.image_path);
        uploadedFrames.push({
          ...frame,
          uploadedImage: {
            format: uploadResult.format,
            height: uploadResult.height,
            id: generateUuid(),
            image_uri: uploadResult.uri,
            name: "",
            platform_type: 1,
            source_from: "upload",
            type: "image",
            uri: uploadResult.uri,
            width: uploadResult.width,
          }
        });
        console.log(`[DEBUG] 帧${frame.idx}图片上传成功: ${uploadResult.uri}`);
      } catch (error) {
        console.error(`[ERROR] 帧${frame.idx}图片上传失败:`, error);
        throw this.createError('API_ERROR', `帧${frame.idx}图片上传失败`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`[DEBUG] 所有帧图片上传完成，共${uploadedFrames.length}个`);
    return uploadedFrames;
  }

  /**
   * 提交多帧任务
   */
  private async submitMultiFrameTask(params: any): Promise<string> {
    console.log('[DEBUG] 开始提交多帧视频任务（使用工作的API格式）');

    const { frames, model, resolution, videoAspectRatio, fps } = params;

    // 计算总时长
    const totalDuration = frames.reduce((sum: number, f: FrameConfiguration) => sum + f.duration_ms, 0);
    console.log(`[DEBUG] 计算总时长: ${totalDuration}ms (${frames.length}个帧)`);

    // 处理多帧数据，转换为官方API格式
    const multiFrames = frames.map((frame: FrameConfiguration, index: number) => ({
      type: "",
      id: generateUuid(),
      idx: frame.idx,
      duration_ms: frame.duration_ms,
      prompt: frame.prompt,
      media_info: {
        type: "",
        id: generateUuid(),
        media_type: 1,
        image_info: {
          type: "image",
          id: generateUuid(),
          source_from: "upload",
          platform_type: 1,
          name: "",
          image_uri: frame.uploadedImage.image_uri,
          width: frame.uploadedImage.width,
          height: frame.uploadedImage.height,
          format: frame.uploadedImage.format,
          uri: frame.uploadedImage.uri
        }
      }
    }));

    // 生成请求参数
    const componentId = generateUuid();
    const submitId = generateUuid();
    const actualModel = model || "jimeng-video-3.0";
    const internalModel = getModel(actualModel); // 转换为完整的内部模型名

    // 构建metrics_extra（与官方API一致）
    const metricsExtra = JSON.stringify({
      isDefaultSeed: 1,
      originSubmitId: submitId,
      isRegenerate: false,
      enterFrom: "result_click_reference",
      functionMode: "multi_frame"
    });

    // 构建官方API的draft_content结构
    const draftContent = {
      type: "draft",
      id: generateUuid(),
      min_version: "3.0.5",
      min_features: ["AIGC_GenerateType_VideoMultiFrame"],
      is_from_tsn: true,
      version: "3.3.3",
      main_component_id: componentId,
      component_list: [{
        type: "video_base_component",
        id: componentId,
        min_version: "1.0.0",
        aigc_mode: "workbench",
        metadata: {
          type: "",
          id: generateUuid(),
          created_platform: 3,
          created_platform_version: "",
          created_time_in_ms: Date.now().toString(),
          created_did: ""
        },
        generate_type: "gen_video",
        abilities: {
          type: "",
          id: generateUuid(),
          gen_video: {
            type: "",
            id: generateUuid(),
            text_to_video_params: {
              type: "",
              id: generateUuid(),
              video_gen_inputs: [{
                type: "",
                id: generateUuid(),
                min_version: "3.0.5",
                prompt: "",
                video_mode: 2, // 重要：使用官方API的video_mode = 2
                fps: fps || 24,
                duration_ms: totalDuration,
                resolution: resolution === "1080p" ? "1080p" : "720p",
                multi_frames: multiFrames,
                idip_meta_list: []
              }],
              video_aspect_ratio: videoAspectRatio || "16:9",
              seed: Math.floor(Math.random() * 100000000) + 2500000000,
              model_req_key: internalModel,
              priority: 0
            },
            video_task_extra: JSON.stringify({
              isDefaultSeed: 1,
              originSubmitId: submitId,
              isRegenerate: false,
              enterFrom: "result_click_reference",
              functionMode: "multi_frame"
            })
          }
        },
        process_type: 1
      }]
    };

    // 构建完整的请求数据（与官方API一致）
    const requestData = {
      extend: {
        root_model: internalModel,
        m_video_commerce_info: {
          benefit_type: "basic_video_operation_vgfm_v_three",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        m_video_commerce_info_list: [{
          benefit_type: "basic_video_operation_vgfm_v_three",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        }]
      },
      submit_id: submitId,
      metrics_extra: metricsExtra,
      draft_content: JSON.stringify(draftContent),
      http_common_info: { aid: 513695 }
    };

    console.log('[DEBUG] 修复后的多帧视频请求数据:', JSON.stringify(requestData, null, 2));

    try {
      // 使用官方API端点
      const result = await this.request(
        'POST',
        '/mweb/v1/aigc_draft/generate',
        requestData,
        this.generateRequestParams()
      );

      console.log('[DEBUG] 多帧视频任务提交响应:', JSON.stringify(result, null, 2));

      // 获取正确的submitId用于轮询（与官方API一致）
      const responseSubmitId = result?.data?.aigc_data?.task?.submit_id ||
                              result?.data?.aigc_data?.submit_id ||
                              result?.data?.submit_id ||
                              result?.submit_id;

      if (!responseSubmitId) {
        console.error('[ERROR] 未找到有效的submit_id:', result);
        throw new Error('submit_id不存在');
      }

      console.log('[DEBUG] 多帧视频任务提交成功，submitId:', responseSubmitId);
      return responseSubmitId;

    } catch (error) {
      console.error('[ERROR] 多帧视频任务提交失败:', error);
      throw this.createError('API_ERROR', '多帧视频任务提交失败', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 检查任务状态
   */
  private async checkTaskStatus(taskId: string): Promise<{
    status: VideoTaskStatus;
    result?: { videoUrl: string };
    error?: string;
  }> {
    console.log('[DEBUG] 检查多帧视频任务状态, taskId:', taskId);

    try {
      const pollResult = await this.request(
        'POST',
        '/mweb/v1/get_history_by_ids',
        { submit_ids: [taskId] },
        this.generateRequestParams()
      );

      if (!pollResult?.data || !pollResult.data[taskId]) {
        console.error(`[ERROR] 轮询响应无效，taskId=${taskId}`);
        return { status: 'failed', error: '轮询响应无效' };
      }

      const record = pollResult.data[taskId];
      const status = record.common_attr?.status ?? 'unknown';
      const failCode = record.common_attr?.fail_code ?? null;

      // 获取状态相关数据
      const finishedCount = record.finished_count ?? 0;
      const totalCount = record.total_count ?? 0;
      const itemListLength = record.item_list?.length ?? 0;

      console.log(`[DEBUG] 多帧视频任务状态: ${status}, 完成度=${finishedCount}/${totalCount}, 结果数=${itemListLength}`);

      // 检查是否有item_list
      const hasItemList = record.item_list && record.item_list.length > 0;

      if (hasItemList) {
        const currentItemList = record.item_list as any[];
        console.log(`[DEBUG] 尝试提取多帧视频URL, 结果数=${currentItemList.length}`);

        // 尝试提取视频URL
        const videoUrls = this.extractVideoUrls(currentItemList);

        if (videoUrls && videoUrls.length > 0) {
          console.log(`[SUCCESS] 多帧视频生成完成，提取到${videoUrls.length}个视频URL`);
          return {
            status: 'completed',
            result: { videoUrl: videoUrls[0] }
          };
        }
      }

      // 处理失败状态
      if (status === 'fail' || failCode !== null) {
        const errorMessage = record.common_attr?.fail_reason || '生成失败';
        console.error(`[ERROR] 多帧视频生成失败: ${errorMessage} (fail_code=${failCode})`);
        return {
          status: 'failed',
          error: errorMessage
        };
      }

      // 继续处理中
      return { status: 'processing' };

    } catch (error) {
      console.error('[ERROR] 多帧视频状态查询失败:', error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 创建错误对象
   */
  private createError(
    code: VideoGenerationError['code'],
    message: string,
    reason: string
  ): { error: VideoGenerationError } {
    return {
      error: { code, message, reason, timestamp: Date.now() }
    };
  }

  /**
   * 提取视频URL
   */
  private extractVideoUrls(itemList: any[]): string[] {
    console.log('[DEBUG] 提取多帧视频URL，itemList长度:', itemList?.length || 0);
    const resultList = (itemList || []).map((item, index) => {
      console.log(`[DEBUG] 处理多帧视频第${index}项:`, Object.keys(item || {}));
      // 尝试多种可能的视频URL路径
      let videoUrl = item?.video?.transcoded_video?.origin?.video_url ||
                    item?.video?.video_url ||
                    item?.video?.origin?.video_url ||
                    item?.common_attr?.cover_url ||
                    item?.aigc_video_params?.video_url ||
                    item?.url ||
                    item?.video_url;
      if (videoUrl) {
        console.log(`[DEBUG] 找到多帧视频URL:`, videoUrl.substring(0, 100));
        return videoUrl;
      }
      console.log(`[DEBUG] 多帧视频第${index}项未找到有效的视频URL`);
      return null;
    }).filter(url => url !== null);

    console.log(`[DEBUG] 提取到${resultList.length}个有效的多帧视频URL`);
    return resultList;
  }

  /**
   * 处理通用错误
   */
  private handleError(error: any): { error: VideoGenerationError } {
    if (error.error) return error;

    if (error.message.includes('上传')) {
      return this.createError('API_ERROR', '图片上传失败', error.message);
    }
    return this.createError('API_ERROR', 'API调用失败', error.message);
  }
}
