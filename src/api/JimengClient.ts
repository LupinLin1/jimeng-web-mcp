/**
 * JiMeng API 统一客户端
 * 重构后的主要API客户端，整合所有服务功能
 * 保持与原api.ts完全兼容的接口
 */

import { JimengApiClient } from './ApiClient.js';
import { BaseClient } from './BaseClient.js';
import { VideoGenerator } from './video/VideoGenerator.js';
import { ImageGenerator } from './image/ImageGenerator.js';
import {
  ImageGenerationParams,
  VideoGenerationParams,
  FrameInterpolationParams,
  SuperResolutionParams,
  AudioEffectGenerationParams,
  VideoPostProcessUnifiedParams,
  MainReferenceVideoParams,
  DraftResponse,
  AigcMode,
  AbilityItem,
  QueryResultResponse,
  GenerationStatus
} from '../types/api.types.js';
import {
  DEFAULT_MODEL,
  DEFAULT_VIDEO_MODEL,
  DRAFT_VERSION,
  getResolutionType,
  ASPECT_RATIO_PRESETS,
  WEB_ID
} from '../types/models.js';
import { ImageDimensionCalculator } from '../utils/dimensions.js';
import { generateUuid, jsonEncode, urlEncode, generateMsToken, toUrlParams } from '../utils/index.js';
import { generate_a_bogus } from '../utils/a_bogus.js';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
// @ts-ignore
import crc32 from 'crc32';

/**
 * JiMeng 完整功能客户端
 * 提供图像生成、视频生成、文件上传等全部功能
 */
export class JimengClient extends BaseClient {
  private videoGen: VideoGenerator;
  private imageGen: ImageGenerator;

  constructor(refreshToken?: string) {
    super(refreshToken);
    this.videoGen = new VideoGenerator(refreshToken);
    this.imageGen = new ImageGenerator(refreshToken);
  }


  // ============== 图像生成功能（委托给 ImageGenerator）==============

  /**
   * 即梦AI图像生成（支持批量生成和多参考图）
   */
  public async generateImage(params: ImageGenerationParams): Promise<string[]> {
    return this.imageGen.generateImage(params);
  }

  /**
   * 异步提交图像生成任务（立即返回historyId，不等待完成）
   */
  public async generateImageAsync(params: ImageGenerationParams): Promise<string> {
    return this.imageGen.generateImageAsync(params);
  }

  /**
   * 查询生成任务的当前状态和结果
   */
  public async getImageResult(historyId: string): Promise<QueryResultResponse> {
    return this.imageGen.getImageResult(historyId);
  }

  /**
   * 批量查询多个任务的生成状态和结果
   */
  public async getBatchResults(historyIds: string[]): Promise<{ [historyId: string]: QueryResultResponse | { error: string } }> {
    return this.imageGen.getBatchResults(historyIds);
  }

  // ============== 视频生成功能（委托给 VideoGenerator）==============

  /**
   * 即梦AI视频生成
   */
  public async generateVideo(params: VideoGenerationParams): Promise<string> {
    return this.videoGen.generateVideo(params);
  }

  /**
   * 主体参考视频生成 - 组合多图主体到一个场景
   */
  public async generateMainReferenceVideo(params: MainReferenceVideoParams): Promise<string> {
    return this.videoGen.generateMainReferenceVideo(params);
  }

  // ============== 视频后处理方法 ==============

  /**
   * 视频补帧方法 - 将低帧率视频提升至30fps或60fps
   */
  public async frameInterpolation(params: FrameInterpolationParams): Promise<string> {
    console.log('🎬 开始视频补帧处理...');
    console.log(`📋 补帧参数: ${params.originFps}fps -> ${params.targetFps}fps`);
    
    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }

    // 生成基础参数
    const submitId = generateUuid();
    const modelKey = this.getModel('jimeng-video-multiframe');
    const metricsExtra = JSON.stringify({
      promptSource: "custom",
      isDefaultSeed: 1,
      originSubmitId: submitId,
      enterFrom: "click",
      isRegenerate: false,
      functionMode: "multi_frame"
    });

    const draftContent = {
      type: "draft",
      id: generateUuid(),
      min_version: "3.1.0",
      min_features: ["AIGC_GenerateType_VideoInsertFrame", "AIGC_GenerateType_VideoMultiFrame"],
      is_from_tsn: true,
      version: "3.2.9",
      main_component_id: generateUuid(),
      component_list: [{
        type: "video_base_component",
        id: generateUuid(),
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
                prompt: "视频补帧处理",
                lens_motion_type: "",
                motion_speed: "",
                vid: params.videoId,
                video_mode: 2,
                fps: params.originFps,
                duration_ms: params.duration || 10000,
                template_id: 0,
                v2v_opt: {
                  type: "",
                  id: generateUuid(),
                  min_version: "3.1.0",
                  insert_frame: {
                    type: "",
                    id: generateUuid(),
                    enable: true,
                    target_fps: params.targetFps,
                    origin_fps: params.originFps,
                    duration_ms: params.duration || 10000
                  }
                },
                origin_history_id: params.originHistoryId,
                resolution: "720p"
              }]
            },
            scene: "insert_frame",
            video_task_extra: metricsExtra,
            video_ref_params: {
              type: "",
              id: generateUuid(),
              generate_type: 0,
              item_id: parseInt(params.videoId.replace('v', '')),
              origin_history_id: params.originHistoryId
            }
          },
          process_type: 3
        }
      }]
    };

    const requestData = {
      extend: {
        root_model: modelKey,
        m_video_commerce_info: {
          benefit_type: "video_frame_interpolation",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        m_video_commerce_info_list: [{
          benefit_type: "video_frame_interpolation", 
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

    // 构建请求参数
    const rqParams: any = this.generateRequestParams();

    // 发送补帧请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      requestData,
      rqParams
    );

    console.log('[DEBUG] 开始轮询补帧结果...');
    const imageUrls = await this.pollTraditionalResult(result);
    
    // 提取视频URL
    let videoUrl;
    if (imageUrls && imageUrls.length > 0) {
      videoUrl = imageUrls[0];
    }

    console.log('🎬 补帧处理完成:', videoUrl);
    return videoUrl || '';
  }

  /**
   * 视频分辨率提升方法 - 将低分辨率视频提升至更高分辨率
   */
  public async superResolution(params: SuperResolutionParams): Promise<string> {
    console.log('🎨 开始视频分辨率提升处理...');
    console.log(`📋 分辨率提升: ${params.originWidth}x${params.originHeight} -> ${params.targetWidth}x${params.targetHeight}`);
    
    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }

    // 生成基础参数
    const submitId = generateUuid();
    const modelKey = this.getModel('jimeng-video-multiframe');
    const metricsExtra = JSON.stringify({
      promptSource: "custom",
      isDefaultSeed: 1,
      originSubmitId: submitId,
      enterFrom: "click",
      isRegenerate: false,
      functionMode: "multi_frame"
    });

    const draftContent = {
      type: "draft",
      id: generateUuid(),
      min_version: "3.1.0",
      min_features: ["AIGC_GenerateType_VideoSuperResolution", "AIGC_GenerateType_VideoMultiFrame"],
      is_from_tsn: true,
      version: "3.2.9",
      main_component_id: generateUuid(),
      component_list: [{
        type: "video_base_component",
        id: generateUuid(),
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
                prompt: "视频分辨率提升处理",
                lens_motion_type: "",
                motion_speed: "",
                vid: params.videoId,
                video_mode: 2,
                fps: 24,
                duration_ms: 10000,
                template_id: 0,
                v2v_opt: {
                  type: "",
                  id: generateUuid(),
                  min_version: "3.1.0",
                  super_resolution: {
                    type: "",
                    id: generateUuid(),
                    enable: true,
                    target_width: params.targetWidth,
                    target_height: params.targetHeight,
                    origin_width: params.originWidth,
                    origin_height: params.originHeight
                  }
                },
                origin_history_id: params.originHistoryId,
                resolution: "720p"
              }]
            },
            scene: "super_resolution",
            video_task_extra: metricsExtra,
            video_ref_params: {
              type: "",
              id: generateUuid(),
              generate_type: 0,
              item_id: parseInt(params.videoId.replace('v', '')),
              origin_history_id: params.originHistoryId
            }
          },
          process_type: 2
        }
      }]
    };

    const requestData = {
      extend: {
        root_model: modelKey,
        m_video_commerce_info: {
          benefit_type: "video_upscale",
          resource_id: "generate_video", 
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        m_video_commerce_info_list: [{
          benefit_type: "video_upscale",
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

    // 构建请求参数
    const rqParams: any = this.generateRequestParams();

    // 发送分辨率提升请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      requestData,
      rqParams
    );

    console.log('[DEBUG] 开始轮询分辨率提升结果...');
    const imageUrls = await this.pollTraditionalResult(result);
    
    // 提取视频URL
    let videoUrl;
    if (imageUrls && imageUrls.length > 0) {
      videoUrl = imageUrls[0];
    }

    console.log('🎨 分辨率提升完成:', videoUrl);
    return videoUrl || '';
  }

  /**
   * 视频音效生成方法 - 为已生成的视频添加AI背景音效
   */
  public async generateAudioEffect(params: AudioEffectGenerationParams): Promise<string> {
    console.log('🎵 开始视频音效生成处理...');
    console.log(`📋 为视频 ${params.videoId} 生成音效`);
    
    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }

    // 生成基础参数
    const submitId = generateUuid();
    const modelKey = this.getModel('jimeng-video-multiframe'); 
    const metricsExtra = JSON.stringify({
      promptSource: "custom",
      isDefaultSeed: 1,
      originSubmitId: submitId,
      enterFrom: "click",
      isRegenerate: true
    });

    // 构建父组件ID和主组件ID
    const parentComponentId = generateUuid();
    const mainComponentId = generateUuid();

    const draftContent = {
      type: "draft",
      id: generateUuid(),
      min_version: "3.1.2",
      min_features: [],
      is_from_tsn: true,
      version: "3.2.9",
      main_component_id: mainComponentId,
      component_list: [
        // 父组件：video_base_component
        {
          type: "video_base_component",
          id: parentComponentId,
          min_version: "1.0.0",
          aigc_mode: "workbench",
          gen_type: 10,
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
                  prompt: "测试多参考图功能",
                  first_frame_image: {
                    type: "image",
                    id: generateUuid(),
                    source_from: "upload",
                    platform_type: 1,
                    name: "",
                    image_uri: "tos-cn-i-tb4s082cfz/25f77f2bcaf64b6786562c4e168ac310",
                    width: 1728,
                    height: 2304,
                    format: "png",
                    uri: "tos-cn-i-tb4s082cfz/25f77f2bcaf64b6786562c4e168ac310"
                  },
                  end_frame_image: {
                    type: "image", 
                    id: generateUuid(),
                    source_from: "upload",
                    platform_type: 1,
                    name: "",
                    image_uri: "tos-cn-i-tb4s082cfz/0ff0b4ce831444738d8a0add5b53e4b4",
                    width: 1728,
                    height: 2304,
                    format: "png",
                    uri: "tos-cn-i-tb4s082cfz/0ff0b4ce831444738d8a0add5b53e4b4"
                  },
                  video_mode: 2,
                  fps: 24,
                  duration_ms: 5000,
                  resolution: "720p"
                }],
                video_aspect_ratio: "1:1",
                seed: Math.floor(Math.random() * 100000000) + 2500000000,
                model_req_key: modelKey,
                priority: 0
              },
              video_task_extra: metricsExtra
            }
          }
        },
        // 主组件：音效生成组件
        {
          type: "video_base_component",
          id: mainComponentId,
          min_version: "1.0.0",
          parent_id: parentComponentId,
          aigc_mode: "workbench",
          metadata: {
            type: "",
            id: generateUuid(),
            created_platform: 3,
            created_platform_version: "",
            created_time_in_ms: Date.now().toString(),
            created_did: ""
          },
          generate_type: "video_audio_effect",
          abilities: {
            type: "",
            id: generateUuid(),
            video_audio_effect: {
              type: "",
              id: generateUuid(),
              min_version: "3.1.2",
              origin_history_id: parseInt(params.originHistoryId),
              origin_item_id: parseInt(params.videoId.replace('v', '')),
              video_ref_params: {
                type: "",
                id: generateUuid(),
                generate_type: 0,
                item_id: parseInt(params.videoId.replace('v', '')),
                origin_history_id: parseInt(params.originHistoryId)
              },
              video_resource: {
                type: "video",
                id: generateUuid(),
                source_from: "upload",
                name: "",
                vid: params.videoId,
                fps: 0,
                width: 832,
                height: 1120,
                duration: 5000,
                cover_image_url: ""
              }
            }
          },
          process_type: 12
        }
      ]
    };

    const requestData = {
      extend: {
        root_model: modelKey,
        m_video_commerce_info: {
          benefit_type: "video_audio_effect_generation",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        m_video_commerce_info_list: [{
          benefit_type: "video_audio_effect_generation",
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

    // 构建请求参数
    const rqParams: any = this.generateRequestParams();

    // 发送音效生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      requestData,
      rqParams
    );

    console.log('[DEBUG] 开始轮询音效生成结果...');
    const imageUrls = await this.pollTraditionalResult(result);
    
    // 提取视频URL
    let videoUrl;
    if (imageUrls && imageUrls.length > 0) {
      videoUrl = imageUrls[0];
    }

    console.log('🎵 音效生成完成:', videoUrl);
    return videoUrl || '';
  }

  /**
   * 统一视频后处理方法 - 整合补帧、分辨率提升和音效生成
   */
  public async videoPostProcess(params: VideoPostProcessUnifiedParams): Promise<string> {
    return this.videoGen.videoPostProcess(params);
  }

  // ============== 辅助方法 ==============

  /**
   * 视频后处理专用的传统轮询方法(简化版,无continuation逻辑)
   */
  private async pollTraditionalResult(result: any): Promise<string[]> {
    console.log('[DEBUG] 开始视频后处理轮询');

    const historyId = result?.data?.aigc_data?.history_record_id;
    if (!historyId) {
      if (result?.errmsg) {
        throw new Error(result.errmsg);
      } else {
        throw new Error('记录ID不存在');
      }
    }

    let status = 20;
    let pollCount = 0;
    const maxPollCount = 30;
    const overallStartTime = Date.now();
    const overallTimeoutMs = 300000; // 5分钟

    while (pollCount < maxPollCount && Date.now() - overallStartTime < overallTimeoutMs) {
      pollCount++;
      await new Promise(resolve => setTimeout(resolve, 5000));

      const pollResult = await this.request(
        'POST',
        '/mweb/v1/get_history_by_ids',
        {
          "history_ids": [historyId],
          "image_info": {
            "width": 2048,
            "height": 2048,
            "format": "webp",
            "image_scene_list": []
          },
          "http_common_info": { "aid": 513695 }
        }
      );

      const record = pollResult?.data?.history_record_list?.[0];
      if (record) {
        status = record.status;

        if (status === 30) {
          console.log('[SUCCESS] 视频后处理完成');
          return this.extractImageUrls(record.item_list || []);
        } else if (status === 50) {
          throw new Error(record.fail_reason || '生成失败');
        }
      }
    }

    throw new Error('视频后处理轮询超时');
  }

  /**
   * 从item_list中提取图片/视频URL
   */
  private extractImageUrls(itemList: any[]): string[] {
    return itemList.map(item => {
      let imageUrl = item?.image?.large_images?.[0]?.image_url ||
                     item?.image?.large_images?.[0]?.url ||
                     item?.image?.url ||
                     item?.video?.url;

      if (!imageUrl && item?.image?.large_images) {
        for (const img of item.image.large_images) {
          if (img?.image_url || img?.url) {
            imageUrl = img.image_url || img.url;
            break;
          }
        }
      }

      return imageUrl;
    }).filter(Boolean);
  }

  // ============== 请求日志功能 ==============

  /**
   * 保存每次图片生成的请求日志到文件
   */
  private saveRequestLog(logData: {
    timestamp: string;
    type: string;
    model: string;
    prompt: string;
    aspectRatio?: string;
    requestData: any;
    requestParams: any;
  }): void {
    try {
      const logFileName = `jimeng-request-log-${new Date().toISOString().split('T')[0]}.json`;
      const logFilePath = path.resolve(logFileName);
      
      // 创建日志条目
      const logEntry = {
        ...logData,
        id: generateUuid(),
        sessionId: this.getSessionId()
      };
      
      // 读取现有日志文件或创建新的
      let existingLogs: any[] = [];
      try {
        if (fs.existsSync(logFilePath)) {
          const fileContent = fs.readFileSync(logFilePath, 'utf8');
          existingLogs = JSON.parse(fileContent);
        }
      } catch (readError) {
        console.log('[DEBUG] 创建新的日志文件:', logFilePath);
      }
      
      // 添加新的日志条目
      existingLogs.push(logEntry);
      
      // 写入文件
      fs.writeFileSync(logFilePath, JSON.stringify(existingLogs, null, 2), 'utf8');
      
      console.log('📝 请求日志已保存:', logFilePath);
      console.log('[DATA] 当前日志条目数:', existingLogs.length);
      
    } catch (error) {
      console.error('[ERROR] 保存请求日志失败:', error);
    }
  }
  
  /**
   * 获取会话ID（基于当前时间和随机数）
   */
  private getSessionId(): string {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }

}

// ============== 后处理功能 ==============

export async function frameInterpolation(params: FrameInterpolationParams): Promise<string> {
  // 创建API客户端实例
  const token = process.env.JIMENG_API_TOKEN;
  if (!token) {
    throw new Error('JIMENG_API_TOKEN 环境变量未设置');
  }
  
  const client = new JimengClient(token);
  return await client.frameInterpolation(params);
}

export async function superResolution(params: SuperResolutionParams): Promise<string> {
  // 创建API客户端实例
  const token = process.env.JIMENG_API_TOKEN;
  if (!token) {
    throw new Error('JIMENG_API_TOKEN 环境变量未设置');
  }
  
  const client = new JimengClient(token);
  return await client.superResolution(params);
}