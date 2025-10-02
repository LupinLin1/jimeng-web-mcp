/**
 * 文生视频生成器
 *
 * 功能：生成文本描述的视频，支持可选的首尾帧图片
 * 特性：
 * - 统一的async参数控制同步/异步模式
 * - 同步模式：自动轮询直到完成或超时（600秒）
 * - 异步模式：立即返回taskId
 * - 支持首帧和尾帧图片上传
 *
 * @module TextToVideoGenerator
 */

import { VideoGenerator } from './VideoGenerator.js';
import { pollUntilComplete, TimeoutError } from '../../utils/timeout.js';
import { getModel } from '../../types/models.js';
import type {
  TextToVideoOptions,
  VideoTaskResult,
  VideoGenerationError,
  VideoTaskStatus,
  VideoGenerationMode
} from '../../types/api.types.js';

/**
 * 文生视频生成器类
 *
 * 继承自VideoGenerator以复用上传和API调用功能
 */
export class TextToVideoGenerator extends VideoGenerator {
  /**
   * 生成文生视频
   *
   * @param options - 文生视频选项
   * @returns Promise<VideoTaskResult> - 同步模式返回videoUrl，异步模式返回taskId
   *
   * @throws VideoGenerationError - 参数验证失败、超时、内容违规、API错误等
   *
   * @example
   * // 同步模式（默认）
   * const result = await generator.generateTextToVideo({
   *   prompt: "一只猫在阳光下奔跑"
   * });
   * console.log(result.videoUrl); // https://...
   *
   * @example
   * // 异步模式
   * const result = await generator.generateTextToVideo({
   *   prompt: "长视频",
   *   async: true
   * });
   * console.log(result.taskId); // task_abc123
   */
  async generateTextToVideo(options: TextToVideoOptions): Promise<VideoTaskResult> {
    // ==================== 步骤1: 参数验证 ====================
    this.validateTextToVideoOptions(options);

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
    } = options;

    try {
      // ==================== 步骤2: 构建API请求参数 ====================
      const apiParams: any = {
        prompt,
        model,
        resolution,
        video_aspect_ratio: videoAspectRatio,
        fps,
        duration_ms: duration
      };

      // 如果有首尾帧，添加文件路径（VideoGenerator会自己上传）
      const framePaths: string[] = [];
      if (firstFrameImage) {
        console.log(`[TextToVideo] 添加首帧图片: ${firstFrameImage}`);
        framePaths.push(firstFrameImage);
      }
      if (lastFrameImage) {
        console.log(`[TextToVideo] 添加尾帧图片: ${lastFrameImage}`);
        framePaths.push(lastFrameImage);
      }

      if (framePaths.length > 0) {
        apiParams.filePath = framePaths;
      }

      // ==================== 步骤3: 根据模式调用不同的API ====================
      if (asyncMode) {
        // 异步模式：使用generateVideoAsync（立即返回taskId）
        console.log(`[TextToVideo] 异步模式，提交任务...`);
        const taskId = await this.generateVideoAsync(apiParams);
        console.log(`[TextToVideo] 异步任务ID: ${taskId}`);
        return { taskId };
      } else {
        // 同步模式：使用generateVideo（已包含完整轮询逻辑）
        console.log(`[TextToVideo] 同步模式，开始生成: ${prompt.substring(0, 50)}...`);
        const result = await this.generateVideo(apiParams);

        // generateVideo返回的是URL数组或字符串
        const videoUrl = Array.isArray(result) ? result[0] : result;
        console.log(`[TextToVideo] 视频生成完成: ${videoUrl}`);

        return {
          videoUrl,
          metadata: {
            duration,
            resolution,
            format: 'mp4',
            generationParams: {
              mode: 'text_to_video' as VideoGenerationMode,
              model,
              fps,
              aspectRatio: videoAspectRatio
            }
          }
        };
      }
    } catch (error: any) {
      // ==================== 错误处理 ====================
      if (error.error) {
        // 已经是VideoGenerationError格式
        throw error;
      }

      // 转换为标准错误格式
      if (error.message.includes('上传')) {
        throw this.createError(
          'API_ERROR',
          '图片上传失败',
          error.message
        );
      } else if (error.message.includes('审核')) {
        throw this.createError(
          'CONTENT_VIOLATION',
          '内容审核未通过',
          error.message
        );
      } else {
        throw this.createError(
          'API_ERROR',
          'API调用失败',
          error.message
        );
      }
    }
  }

  /**
   * 验证文生视频选项
   *
   * @param options - 待验证的选项
   * @throws VideoGenerationError - 参数无效时抛出
   */
  private validateTextToVideoOptions(options: TextToVideoOptions): void {
    // 验证prompt
    if (!options.prompt || options.prompt.trim() === '') {
      throw this.createError(
        'INVALID_PARAMS',
        '提示词不能为空',
        'prompt字段必须是非空字符串'
      );
    }

    // 验证fps
    if (options.fps !== undefined) {
      if (options.fps < 12 || options.fps > 30) {
        throw this.createError(
          'INVALID_PARAMS',
          '帧率必须在12-30之间',
          `提供的fps值为${options.fps}，有效范围是12-30`
        );
      }
    }

    // 验证duration
    if (options.duration !== undefined) {
      if (options.duration < 3000 || options.duration > 15000) {
        throw this.createError(
          'INVALID_PARAMS',
          '时长必须在3-15秒之间',
          `提供的duration值为${options.duration}ms，有效范围是3000-15000ms`
        );
      }
    }

    // 验证async类型
    if (options.async !== undefined && typeof options.async !== 'boolean') {
      throw this.createError(
        'INVALID_PARAMS',
        'async参数必须为布尔值',
        `提供的async值类型为${typeof options.async}`
      );
    }
  }

  /**
   * 提交视频生成任务到API
   *
   * @param params - API参数
   * @returns Promise<string> - 任务ID
   */
  private async submitVideoGenerationTask(params: any): Promise<string | string[]> {
    console.log('[TextToVideo] 提交文生视频任务');

    const {
      prompt,
      model,
      resolution,
      video_aspect_ratio,
      fps,
      duration_ms,
      filePath
    } = params;

    // 调用父类的通用视频生成方法（已实现完整的API调用逻辑，包含轮询）
    const videoParams: any = {
      prompt,
      model: model || 'jimeng-video-3.0',
      resolution,
      video_aspect_ratio,
      fps,
      duration_ms
    };

    // 只有在有图片时才添加filePath
    if (filePath && filePath.length > 0) {
      videoParams.filePath = filePath;
    }

    // VideoGenerator.generateVideo实际上会轮询并返回视频URL数组（而不是submitId）
    const result = await this.generateVideo(videoParams);

    console.log(`[TextToVideo] 视频生成完成，结果:`, result);
    return result;
  }

  /**
   * 检查任务状态
   *
   * @param taskId - 任务ID
   * @returns Promise - 包含status、result和error的对象
   */
  private async checkTaskStatus(taskId: string): Promise<{
    status: VideoTaskStatus;
    result?: { videoUrl: string };
    error?: string;
  }> {
    console.info(`[TextToVideo] 检查任务状态, taskId: ${taskId}`);

    try {
      const pollResult = await this.request(
        'POST',
        '/mweb/v1/get_history_by_ids',
        { submit_ids: [taskId] },
        this.generateRequestParams()
      );

      if (!pollResult?.data || !pollResult.data[taskId]) {
        console.error(`[TextToVideo] 轮询响应无效，taskId=${taskId}`);
        return { status: 'failed', error: '轮询响应无效' };
      }

      const record = pollResult.data[taskId];
      const status = record.common_attr?.status ?? 'unknown';
      const failCode = record.common_attr?.fail_code ?? null;

      console.info(`[TextToVideo] 任务状态: ${status}, fail_code: ${failCode}`);

      // 检查是否有结果
      const hasItemList = record.item_list && record.item_list.length > 0;

      if (hasItemList) {
        const currentItemList = record.item_list as any[];
        console.log(`[TextToVideo] 尝试提取视频URL, 结果数=${currentItemList.length}`);

        // 提取视频URL
        const videoUrls = this.extractVideoUrls(currentItemList);

        if (videoUrls && videoUrls.length > 0) {
          console.log(`[TextToVideo] 视频生成完成，URL: ${videoUrls[0]}`);
          return {
            status: 'completed',
            result: { videoUrl: videoUrls[0] }
          };
        } else {
          console.log(`[TextToVideo] 有结果但未提取到URL，继续轮询...`);
          // 不返回，继续轮询
        }
      }

      // 处理失败状态
      if (status === 'fail' || failCode !== null) {
        const errorMessage = record.common_attr?.fail_reason || '生成失败';
        console.error(`[TextToVideo] 生成失败: ${errorMessage} (fail_code=${failCode})`);
        return {
          status: 'failed',
          error: errorMessage
        };
      }

      // 继续处理中
      return { status: 'processing' };

    } catch (error) {
      console.error('[TextToVideo] 状态查询失败:', error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 提取视频URL
   */
  private extractVideoUrls(itemList: any[]): string[] {
    console.log('[TextToVideo] 提取视频URL，itemList长度:', itemList?.length || 0);
    const resultList = (itemList || []).map((item, index) => {
      console.log(`[TextToVideo] 处理第${index}项:`, JSON.stringify(Object.keys(item || {})));

      // 尝试多种可能的视频URL路径
      let videoUrl = item?.video?.transcoded_video?.origin?.video_url ||
                    item?.video?.video_url ||
                    item?.video?.origin?.video_url ||
                    item?.common_attr?.cover_url ||
                    item?.aigc_video_params?.video_url ||
                    item?.url ||
                    item?.video_url;

      if (videoUrl) {
        console.log(`[TextToVideo] 找到视频URL:`, videoUrl.substring(0, 100));
        return videoUrl;
      }

      // 打印完整的item结构以便调试
      console.log(`[TextToVideo] 第${index}项未找到视频URL，item结构:`, JSON.stringify(item, null, 2).substring(0, 500));
      return null;
    }).filter(url => url !== null);

    console.log(`[TextToVideo] 提取到${resultList.length}个有效的视频URL`);
    return resultList;
  }

  /**
   * 创建标准化的VideoGenerationError
   *
   * @param code - 错误码
   * @param message - 简短错误消息
   * @param reason - 详细原因说明
   * @param taskId - 关联的任务ID（可选）
   * @returns 包含error字段的对象
   */
  private createError(
    code: VideoGenerationError['code'],
    message: string,
    reason: string,
    taskId?: string
  ): { error: VideoGenerationError } {
    return {
      error: {
        code,
        message,
        reason,
        taskId,
        timestamp: Date.now()
      }
    };
  }
}
