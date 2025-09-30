/**
 * JiMeng API 统一客户端
 * 重构后的主要API客户端，整合所有服务功能
 * 保持与原api.ts完全兼容的接口
 */

import { JimengApiClient } from './ApiClient.js';
import { BaseClient } from './BaseClient.js';
import { VideoGenerator } from './video/VideoGenerator.js';
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

  constructor(refreshToken?: string) {
    super(refreshToken);
    this.videoGen = new VideoGenerator(refreshToken);
  }

  // ============== 图像生成功能 ==============
  
  /**
   * 即梦AI图像生成（支持批量生成和多参考图）
   */
  public async generateImage(params: ImageGenerationParams): Promise<string[]> {
    console.log('[DEBUG] [API Client] generateImage method called');
    console.log('[DEBUG] [API Client] Token in this instance:', this.refreshToken ? '[PROVIDED]' : '[MISSING]');
    
    return await this.generateImageWithBatch(params);
  }

  /**
   * 批量生成图像，支持自动继续生成和多参考图
   */
  private async generateImageWithBatch(params: ImageGenerationParams): Promise<string[]> {
    console.log('[DEBUG] [API Client] generateImageWithBatch called');
    
    // 参数验证
    if (!params.prompt || typeof params.prompt !== 'string') {
      throw new Error('prompt必须是非空字符串');
    }
    
    // 处理单个或多个文件上传
    const hasFilePath = Boolean(params?.filePath);
    let uploadResult = null;
    let uploadResults: Array<{uri: string, width: number, height: number, format: string}> = [];
    
    if (params?.filePath) {
      // filePath 现在只支持数组格式
      console.log(`[DEBUG] 文件上传模式，共${params.filePath.length}个文件`);
      for (const filePath of params.filePath) {
        const result = await this.uploadImage(filePath);
        uploadResults.push(result);
      }
      uploadResult = uploadResults[0]; // 兼容现有逻辑
    }
    
    // 获取实际模型
    const modelName = params.model || DEFAULT_MODEL;
    const actualModel = this.getModel(modelName);
    
    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }
    
    // 执行生成
    const result = await this.performGeneration(params, actualModel, modelName, hasFilePath, uploadResult, uploadResults);
    
    return result;
  }

  /**
   * 执行图像生成
   */
  private async performGeneration(
    params: ImageGenerationParams,
    actualModel: string,
    modelName: string,
    hasFilePath: boolean,
    uploadResult: any,
    uploadResults: any[]
  ): Promise<string[]> {
    
    // 构建请求数据
    const { rqData, rqParams } = this.buildGenerationRequestData(
      params, actualModel, modelName, hasFilePath, uploadResult, uploadResults
    );
    
    console.log('[DEBUG] 发送的请求数据:', JSON.stringify(rqData, null, 2));
    console.log('[DEBUG] 发送的请求参数:', JSON.stringify(rqParams, null, 2));
    
    // 保存请求日志到文件
    this.saveRequestLog({
      timestamp: new Date().toISOString(),
      type: 'image_generation',
      model: actualModel,
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      requestData: rqData,
      requestParams: rqParams
    });
    
    // 发送生成请求
    const result = await this.request('POST', '/mweb/v1/aigc_draft/generate', rqData, rqParams);
    
    // 检查是否为Draft-based响应（新AIGC模式）
    const draftId = result?.data?.draft_id || result?.data?.aigc_data?.draft_id;
    if (draftId) {
      console.log('[DEBUG] 检测到Draft-based响应，使用新轮询逻辑');
      const draftResponse = await this.pollDraftResult(draftId);
      return this.extractImageUrlsFromDraft(draftResponse);
    }
    
    // 传统轮询逻辑
    console.log('[DEBUG] 使用传统轮询逻辑');
    return await this.pollTraditionalResult(result, params, actualModel, modelName, hasFilePath, uploadResult, uploadResults);
  }

  // ============== 视频生成功能 ==============

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

  // ============== 文件上传功能 ==============

  // ============== 私有辅助方法 ==============
  
  /**
   * 构建生成请求数据
   */
  private buildGenerationRequestData(
    params: ImageGenerationParams,
    actualModel: string,
    modelName: string,
    hasFilePath: boolean,
    uploadResult: any,
    uploadResults: any[],
    historyId?: string,
    isContinuation: boolean = false
  ) {
    // 生成组件ID
    const componentId = generateUuid();
    
    // 计算尺寸和正确的imageRatio
    const dimensions = ImageDimensionCalculator.calculateDimensions(params.aspectRatio || 'auto');
    const { width, height } = dimensions;
    
    // 使用预设的imageRatio而不是计算值
    const aspectRatioPreset = ImageDimensionCalculator.getAspectRatioPreset(params.aspectRatio || 'auto');
    const imageRatio = aspectRatioPreset?.imageRatio || 3; // 默认使用16:9的imageRatio
    
    // 确定AIGC模式 - 根据成功的参考文件，都应该使用 workbench 模式
    let aigcMode: AigcMode = "workbench";

    // 构建abilities
    let abilities: Record<string, any> = {};
    if (hasFilePath) {
      abilities = this.buildBlendAbilities(params, actualModel, uploadResults || [uploadResult!], imageRatio, width, height);
    } else {
      abilities = this.buildGenerateAbilities(params, actualModel, imageRatio, width, height);
    }

    // 生成提交ID
    const submitId = generateUuid();
    
    // 构建请求数据
    const baseData: any = {
      "extend": {
        "root_model": actualModel
      },
      "submit_id": submitId,
      "metrics_extra": jsonEncode({
        "promptSource": "custom",
        "generateCount": 1,
        "enterFrom": "click",
        "generateId": submitId,
        "isRegenerate": false
      }),
      "draft_content": jsonEncode({
        "type": "draft",
        "id": generateUuid(),
        "min_version": DRAFT_VERSION,
        "min_features": [],
        "is_from_tsn": true,
        "version": "3.3.2",
        "main_component_id": componentId,
        "component_list": [{
          "type": "image_base_component",
          "id": componentId,
          "min_version": hasFilePath ? "3.0.2" : DRAFT_VERSION,
          "aigc_mode": aigcMode,
          "gen_type": 1,
          "metadata": {
            "type": "",
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now().toString(),
            "created_did": ""
          },
          "generate_type": hasFilePath ? "blend" : "generate",
          "abilities": {
            "type": "",
            "id": generateUuid(),
            ...abilities
          }
        }]
      }),
      "http_common_info": {
        "aid": parseInt("513695")
      }
    };

    // 如果是继续生成请求，添加特有字段
    if (isContinuation && historyId) {
      baseData.action = 2;
      baseData.history_id = historyId;
    }

    return { rqData: baseData, rqParams: this.generateRequestParams() };
  }

  /**
   * 构建blend模式abilities
   */
  private buildBlendAbilities(params: ImageGenerationParams, actualModel: string, uploadResults: any[], imageRatio: number, width: number, height: number) {
    // 根据参考图数量确定前缀：单参考图用##，多参考图用####
    const promptPrefix = uploadResults.length === 1 ? "##" : "####";
    
    const blendData: any = {
      "blend": {
        "type": "",
        "id": generateUuid(),
        "min_features": [],
        "core_param": {
          "type": "",
          "id": generateUuid(),
          "model": actualModel,
          "prompt": promptPrefix + params.prompt,
          "sample_strength": params.sample_strength || 0.5,
          "image_ratio": imageRatio,
          "large_image_info": {
            "type": "",
            "id": generateUuid(),
            "height": height,
            "width": width,
            "resolution_type": "2k"
          },
          "intelligent_ratio": false
        },
        "ability_list": uploadResults.map((result, index) => ({
          "type": "",
          "id": generateUuid(),
          "name": "byte_edit",
          "image_uri_list": [result.uri],
          "image_list": [{
            "type": "image",
            "id": generateUuid(),
            "source_from": "upload",
            "platform_type": 1,
            "name": "",
            "image_uri": result.uri,
            "width": result.width,
            "height": result.height,
            "format": result.format,
            "uri": result.uri
          }],
          "strength": this.getReferenceStrength(params, index)
        })),
        "prompt_placeholder_info_list": uploadResults.map((_, index) => ({
          "type": "",
          "id": generateUuid(),
          "ability_index": index
        })),
        "postedit_param": {
          "type": "",
          "id": generateUuid(),
          "generate_type": 0
        }
      }
    };

    // 多参考图需要添加 min_version
    if (uploadResults.length > 1) {
      blendData.blend.min_version = "3.2.9";
    }

    return blendData;
  }

  /**
   * 获取指定索引参考图的强度值
   * 优先级：reference_strength[index] > sample_strength > 默认值0.5
   */
  private getReferenceStrength(params: ImageGenerationParams, index: number): number {
    // 如果提供了 reference_strength 数组且索引有效，使用数组中的值
    if (params.reference_strength && params.reference_strength.length > index) {
      return params.reference_strength[index];
    }
    
    // 否则使用 sample_strength 或默认值
    return params.sample_strength || 0.5;
  }

  /**
   * 构建generate模式abilities
   */
  private buildGenerateAbilities(params: ImageGenerationParams, actualModel: string, imageRatio: number, width: number, height: number) {
    return {
      "generate": {
        "type": "",
        "id": generateUuid(),
        "core_param": {
          "type": "",
          "id": generateUuid(),
          "model": actualModel,
          "prompt": params.prompt, // 无参考图时不需要前缀
          "negative_prompt": params.negative_prompt || "",
          "seed": Math.floor(Math.random() * 100000000) + 2500000000,
          "sample_strength": params.sample_strength || 0.5,
          "image_ratio": imageRatio,
          "large_image_info": {
            "type": "",
            "id": generateUuid(),
            "height": height,
            "width": width,
            "resolution_type": "2k"
          },
          "intelligent_ratio": false
        }
      }
    };
  }

  // ============== 继续生成相关方法 ==============
  
  /**
   * 判断是否需要继续生成
   * 新逻辑：等待首批图片开始完成后再发送继续生成请求
   */
  private shouldContinueGeneration(totalCount: number, finishedCount: number, currentStatus: number): boolean {
    console.log(`[DEBUG] [继续生成检查] 接收参数: totalCount=${totalCount}, finishedCount=${finishedCount}, status=${currentStatus}`);

    // 基本条件：需要超过4张图片
    if (totalCount <= 4) {
      console.log(`[DEBUG] 标准生成: 总数${totalCount}张(<=4张)，无需继续生成`);
      return false;
    }

    // 精确条件：只有当已完成数量恰好等于4张时发送继续生成请求
    const readyForContinuation = finishedCount === 4;

    if (readyForContinuation) {
      console.log(`[DEBUG] 需要继续生成: 目标${totalCount}张，已完成${finishedCount}张，精确时机到达`);
      return true;
    } else {
      console.log(`[DEBUG] 等待继续生成条件: 目标${totalCount}张，已完成${finishedCount}张，等待完成4张`);
      return false;
    }
  }

  /**
   * 执行继续生成请求
   * 只执行一次，不循环
   */
  private async performContinuationGeneration(
    params: ImageGenerationParams,
    actualModel: string,
    modelName: string,
    hasFilePath: boolean,
    uploadResult: any,
    uploadResults: any[],
    historyId: string
  ): Promise<void> {
    console.log('[DEBUG] 开始执行继续生成请求...');
    
    // 构建继续生成请求数据
    const { rqData, rqParams } = this.buildGenerationRequestData(
      params, actualModel, modelName, hasFilePath, uploadResult, uploadResults, historyId, true
    );

    console.log('[DEBUG] 继续生成请求参数:', JSON.stringify({ 
      action: rqData.action,
      history_id: rqData.history_id,
      requestedModel: modelName,
      actualModel
    }, null, 2));

    // 发送继续生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    console.log('[DEBUG] 继续生成请求已发送，响应:', JSON.stringify(result, null, 2));
  }

  // ============== 轮询相关方法（简化版本） ==============
  
  private async pollDraftResult(draftId: string): Promise<DraftResponse> {
    let pollCount = 0;
    const maxPollCount = 30; // 最多轮询30次，约5分钟
    let networkErrorCount = 0; // 🛡️ 网络错误计数器
    const maxNetworkErrors = 3; // 🛡️ 最大网络错误重试次数
    
    // 🛡️ 安全防护：设置总体超时
    const overallStartTime = Date.now();
    const overallTimeoutMs = 300000; // 5分钟总体超时
    
    console.log('[DEBUG] 开始Draft轮询，draftId:', draftId);
    
    while (pollCount < maxPollCount) {
      // 🛡️ 安全防护：检查总体超时
      if (Date.now() - overallStartTime > overallTimeoutMs) {
        console.error('[FATAL] Draft轮询总体超时，强制终止');
        break;
      }
      
      pollCount++;
      const waitTime = pollCount === 1 ? 5000 : 3000; // 首次5秒，后续3秒

      // [DATA] Draft轮询日志 - 轮询开始
      const pollStartTime = Date.now();
      const elapsedTotal = Math.round((pollStartTime - overallStartTime) / 1000);
      console.log(`[DATA] [DRAFT-START] 轮询=${pollCount}/${maxPollCount}, 等待=${waitTime/1000}s, 总耗时=${elapsedTotal}s, 网络错误=${networkErrorCount}/${maxNetworkErrors}, Draft ID=${draftId}`);

      await new Promise(resolve => setTimeout(resolve, waitTime));

      try {
        // 轮询Draft状态
        const result = await this.request(
          'GET', 
          `/mweb/v1/draft/${draftId}`,
          {},
          {
            'Content-Type': 'application/json'
          }
        );

        // [DATA] Draft轮询日志 - API响应处理
        const apiResponseTime = Date.now();
        const apiCallDuration = apiResponseTime - pollStartTime;

        // 🛡️ 安全防护：网络请求成功，重置网络错误计数器
        networkErrorCount = 0;

        if (result?.data) {
          const draftResponse: DraftResponse = {
            draft_id: draftId,
            status: result.data.status || 'processing',
            component_list: result.data.component_list || [],
            progress: result.data.progress,
            error_message: result.data.error_message,
            created_at: result.data.created_at || Date.now(),
            updated_at: result.data.updated_at || Date.now()
          };

          // [DATA] Draft轮询日志 - 状态数据详情
          console.log(`[DATA] [DRAFT-DATA] 轮询=${pollCount}, API耗时=${apiCallDuration}ms, 状态=${draftResponse.status}, 组件数=${draftResponse.component_list.length}, 进度=${draftResponse.progress || 'N/A'}, 错误=${draftResponse.error_message || 'N/A'}`);

          // [DATA] Draft轮询日志 - 状态验证
          const knownStatuses = new Set(['processing', 'completed', 'failed', 'pending', 'success', 'error']);
          const isKnownStatus = knownStatuses.has(draftResponse.status);
          const isCompleted = draftResponse.status === 'completed' || draftResponse.status === 'success';
          const isFailed = draftResponse.status === 'failed' || draftResponse.status === 'error';

          console.log(`[DATA] [DRAFT-CHECK] 轮询=${pollCount}, 状态验证={已知状态:${isKnownStatus}, 已完成:${isCompleted}, 已失败:${isFailed}}`);

          // 🛡️ 安全防护：检查状态有效性（放宽状态检查）
          if (!isKnownStatus) {
            console.warn(`[WARN] [DRAFT-WARN] 轮询=${pollCount}, 未知Draft状态=${draftResponse.status}, 继续轮询`);
            // 不要break，继续轮询以适应可能的新状态
          }

          // 检查是否完成
          if (isCompleted) {
            console.log(`[SUCCESS] [DRAFT-COMPLETE] 轮询=${pollCount}, Draft生成完成, 状态=${draftResponse.status}, 组件数=${draftResponse.component_list.length}`);
            return draftResponse;
          } else if (isFailed) {
            console.error(`[ERROR] [DRAFT-FAIL] 轮询=${pollCount}, Draft生成失败, 状态=${draftResponse.status}, 错误=${draftResponse.error_message || 'N/A'}`);
            throw new Error(draftResponse.error_message || 'Draft生成失败');
          }

          // [DATA] Draft轮询日志 - 进度报告
          if (pollCount % 5 === 0) {
            const currentElapsed = Math.round((Date.now() - overallStartTime) / 1000);
            console.log(`[DATA] [DRAFT-PROGRESS] 轮询=${pollCount}/${maxPollCount}, 状态=${draftResponse.status}, 已用时=${currentElapsed}s, 进度=${draftResponse.progress || 'N/A'}, 网络错误=${networkErrorCount}`);
          }
        }
      } catch (error) {
        // [DATA] Draft轮询日志 - 错误处理
        const errorTime = Date.now();
        const errorDuration = errorTime - pollStartTime;
        networkErrorCount++;

        console.error(`[ERROR] [DRAFT-ERROR] 轮询=${pollCount}, 网络错误=${networkErrorCount}/${maxNetworkErrors}, API耗时=${errorDuration}ms, 错误=${error}`);

        if (networkErrorCount >= maxNetworkErrors) {
          console.error(`[FATAL] [DRAFT-FATAL] 轮询=${pollCount}, 网络错误超过最大重试次数, 终止轮询`);
          throw new Error(`Draft轮询网络错误超过最大重试次数: ${error}`);
        }

        // 🛡️ 安全防护：网络错误也要增加轮询计数，避免无限重试
        if (pollCount >= maxPollCount) {
          console.error(`[FATAL] [DRAFT-TIMEOUT] 轮询=${pollCount}, 达到最大轮询次数, 网络错误导致轮询超时`);
          throw new Error(`Draft轮询超时: ${error}`);
        }

        console.log(`[RETRY] [DRAFT-RETRY] 轮询=${pollCount}, 网络错误重试, 继续轮询`);
        continue;
      }
    }
    
    // [DATA] Draft轮询日志 - 结束统计
    const elapsedTime = Date.now() - overallStartTime;
    const finalElapsedSec = Math.round(elapsedTime / 1000);
    console.log(`[END] [DRAFT-END] 轮询结束, 总轮询=${pollCount}/${maxPollCount}, 总耗时=${finalElapsedSec}s, 网络错误=${networkErrorCount}, Draft ID=${draftId}`);

    // 判断结束原因
    if (pollCount >= maxPollCount) {
      console.warn(`[TIMEOUT] [DRAFT-TIMEOUT] 达到最大轮询次数限制, Draft轮询超时`);
    } else if (Date.now() - overallStartTime > overallTimeoutMs) {
      console.warn(`[TIMEOUT] [DRAFT-TIMEOUT] 达到总体时间限制, Draft轮询超时`);
    } else {
      console.warn(`[UNKNOWN] [DRAFT-UNKNOWN] 未知原因导致Draft轮询结束`);
    }

    throw new Error('Draft轮询超时，未能获取结果');
  }

  private async pollTraditionalResult(result: any, params?: ImageGenerationParams, actualModel?: string, modelName?: string, hasFilePath?: boolean, uploadResult?: any, uploadResults?: any[]): Promise<string[]> {
    console.log('[DEBUG] 开始传统轮询');
    console.log('[DEBUG] 初始响应: historyId=', result?.data?.aigc_data?.history_record_id, 'status=', result?.data?.status);

    // 获取历史记录ID
    const historyId = result?.data?.aigc_data?.history_record_id;
    if (!historyId) {
      if (result?.errmsg) {
        throw new Error(result.errmsg);
      } else {
        throw new Error('记录ID不存在');
      }
    }

    // 🛡️ 安全防护：定义已知状态码集合
    const PROCESSING_STATES = new Set([20, 42, 45]); // 处理中状态
    const KNOWN_STATES = new Set([20, 30, 42, 45, 50]); // 所有已知状态
    const COMPLETION_STATES = new Set([30, 50]); // 完成或失败状态

    // 轮询获取结果
    let status = 20;
    let failCode = null;
    let pollCount = 0;
    let continuationSent = false; // 标记是否已发送继续生成请求
    let networkErrorCount = 0; // 网络错误计数器
    const maxPollCount = 30; // 增加最大轮询次数以支持继续生成
    const maxNetworkErrors = 3; // 最大网络错误重试次数

    // 🛡️ 安全防护：设置总体超时
    const overallStartTime = Date.now();
    const overallTimeoutMs = 300000; // 5分钟总体超时

    console.log('[DEBUG] 开始轮询，historyId:', historyId);

    // 🔧 修复：保存最后的记录以便在轮询结束后提取结果
    let finalRecord: any = null;

    while (pollCount < maxPollCount) {
      // 🛡️ 安全防护：检查总体超时
      if (Date.now() - overallStartTime > overallTimeoutMs) {
        console.error('[FATAL] 轮询总体超时，强制终止');
        break;
      }

      pollCount++;
      
      // 根据状态码调整等待时间
      let waitTime;
      if (status === 45) {
        waitTime = pollCount === 1 ? 30000 : 10000;
      } else if (status === 42) {
        waitTime = pollCount === 1 ? 15000 : 8000;
      } else {
        waitTime = pollCount === 1 ? 5000 : 5000;
      }
      
      // [DATA] 轮询日志 - 轮询开始
      const pollStartTime = Date.now();
      const elapsedTotal = Math.round((pollStartTime - overallStartTime) / 1000);
      console.log(`[DATA] [POLL-START] 轮询=${pollCount}/${maxPollCount}, 状态=${status}, 等待=${waitTime/1000}s, 总耗时=${elapsedTotal}s, 网络错误=${networkErrorCount}/${maxNetworkErrors}, 继续生成=${continuationSent ? '已发送' : '未发送'}`);

      await new Promise(resolve => setTimeout(resolve, waitTime));

      let pollResult;
      try {
        pollResult = await this.request(
          'POST',
          '/mweb/v1/get_history_by_ids',
          {
            "history_ids": [historyId],
            "image_info": {
              "width": 2048,
              "height": 2048,
              "format": "webp",
              "image_scene_list": [
                { "scene": "smart_crop", "width": 360, "height": 360, "uniq_key": "smart_crop-w:360-h:360", "format": "webp" },
                { "scene": "smart_crop", "width": 480, "height": 480, "uniq_key": "smart_crop-w:480-h:480", "format": "webp" },
                { "scene": "smart_crop", "width": 720, "height": 720, "uniq_key": "smart_crop-w:720-h:720", "format": "webp" },
                { "scene": "smart_crop", "width": 720, "height": 480, "uniq_key": "smart_crop-w:720-h:480", "format": "webp" },
                { "scene": "smart_crop", "width": 360, "height": 240, "uniq_key": "smart_crop-w:360-h:240", "format": "webp" },
                { "scene": "smart_crop", "width": 240, "height": 320, "uniq_key": "smart_crop-w:240-h:320", "format": "webp" },
                { "scene": "smart_crop", "width": 480, "height": 640, "uniq_key": "smart_crop-w:480-h:640", "format": "webp" },
                { "scene": "normal", "width": 2400, "height": 2400, "uniq_key": "2400", "format": "webp" },
                { "scene": "normal", "width": 1080, "height": 1080, "uniq_key": "1080", "format": "webp" },
                { "scene": "normal", "width": 720, "height": 720, "uniq_key": "720", "format": "webp" },
                { "scene": "normal", "width": 480, "height": 480, "uniq_key": "480", "format": "webp" },
                { "scene": "normal", "width": 360, "height": 360, "uniq_key": "360", "format": "webp" }
              ]
            },
            "http_common_info": {
              "aid": parseInt("513695")
            }
          }
        );
        // 🛡️ 安全防护：网络请求成功，重置网络错误计数器
        networkErrorCount = 0;
      } catch (error) {
        // 🛡️ 安全防护：增强网络错误处理
        networkErrorCount++;
        console.error(`[ERROR] 网络请求错误 (${networkErrorCount}/${maxNetworkErrors}):`, error);
        
        if (networkErrorCount >= maxNetworkErrors) {
          throw new Error(`网络错误超过最大重试次数: ${error}`);
        }
        
        // 🛡️ 安全防护：网络错误也要增加轮询计数，避免无限重试
        console.log(`[DEBUG] 网络错误，继续轮询...`);
        continue;
      }
      
      // [DATA] 轮询日志 - API响应处理
      const apiResponseTime = Date.now();
      const apiCallDuration = apiResponseTime - pollStartTime;

      const record = pollResult?.data?.[historyId];
      if (!record) {
        console.error(`[ERROR] [POLL-ERROR] 轮询=${pollCount}, API响应时间=${apiCallDuration}ms, 错误=记录不存在`);
        throw new Error('记录不存在');
      }

      // 🔧 修复：每次轮询都更新最终记录
      finalRecord = record;

      const prevStatus = status;
      status = record.status;
      failCode = record.fail_code;
      const finishedCount = record.finished_image_count || 0;
      const totalCount = record.total_image_count || 0;
      const itemListLength = record.item_list?.length || 0;

      // [DATA] 轮询日志 - 状态数据详情
      console.log(`[DATA] [POLL-DATA] 轮询=${pollCount}, API耗时=${apiCallDuration}ms, 状态变化=${prevStatus}→${status}, 失败码=${failCode || 'null'}, 完成度=${finishedCount}/${totalCount}, 结果数=${itemListLength}`);

      // 🛡️ 安全防护：检查状态码有效性
      if (!KNOWN_STATES.has(status)) {
        console.warn(`[WARN] [POLL-WARN] 轮询=${pollCount}, 未知状态码=${status}, 终止轮询`);
        break;
      }

      // [DATA] 轮询日志 - 继续生成检查
      const shouldContinue = !continuationSent && params && actualModel && modelName !== undefined && hasFilePath !== undefined && this.shouldContinueGeneration(totalCount, finishedCount, status);
      console.log(`[DATA] [POLL-CONTINUE] 轮询=${pollCount}, 继续生成检查={已发送:${continuationSent}, 应继续:${shouldContinue}, 完成度:${finishedCount}/${totalCount}}`);

      // 🛡️ 安全防护：安全的继续生成机制 - 提前到状态判断之前
      if (shouldContinue) {
        const continueStartTime = Date.now();
        console.log(`[DEBUG] [CONTINUE-START] 轮询=${pollCount}, 开始继续生成请求`);
        try {
          await this.performContinuationGeneration(params, actualModel, modelName, hasFilePath, uploadResult, uploadResults || [], historyId);
          continuationSent = true;
          const continueDuration = Date.now() - continueStartTime;
          console.log(`[SUCCESS] [CONTINUE-SUCCESS] 轮询=${pollCount}, 继续生成成功, 耗时=${continueDuration}ms`);
        } catch (error) {
          const continueDuration = Date.now() - continueStartTime;
          console.error(`[ERROR] [CONTINUE-ERROR] 轮询=${pollCount}, 继续生成失败, 耗时=${continueDuration}ms, 错误:${error}`);
          // 🛡️ 安全防护：即使失败也标记为已尝试，避免重复尝试
          continuationSent = true;
          throw error; // 重新抛出错误，让上层处理
        }
      }

      // [DATA] 轮询日志 - 完成状态检查
      const isCompletionState = COMPLETION_STATES.has(status);
      const isProcessingState = PROCESSING_STATES.has(status);
      console.log(`[DATA] [POLL-STATUS] 轮询=${pollCount}, 状态检查={完成状态:${isCompletionState}, 处理中:${isProcessingState}, 当前状态:${status}}`);

      // 🛡️ 安全防护：如果是完成状态，立即退出轮询
      if (isCompletionState) {
        if (status === 30) {
          console.error(`[ERROR] [POLL-FAIL] 轮询=${pollCount}, 生成失败, 状态=${status}, 失败码=${failCode}`);
          if (failCode === '2038') {
            throw new Error('内容被过滤');
          }
          throw new Error('生成失败');
        }
        console.log(`[SUCCESS] [POLL-COMPLETE] 轮询=${pollCount}, 检测到完成状态=${status}, 准备提取结果`);
        break;
      }

      // 🛡️ 安全防护：如果不在处理中状态，检查是否可以完成
      if (!isProcessingState) {
        console.log(`[DEBUG] [POLL-EXIT] 轮询=${pollCount}, 状态=${status}不在处理中, 检查完成条件`);
        break;
      }
      
      // [DATA] 轮询日志 - 完成条件判断
      const hasItemList = record.item_list && record.item_list.length > 0;
      console.log(`[DATA] [POLL-CHECK] 轮询=${pollCount}, 完成检查={有结果:${hasItemList}, 结果数:${itemListLength}}`);

      // 🛡️ 安全防护：检查是否完成（增强的逻辑）
      if (hasItemList) {
        const currentItemList = record.item_list as any[];

        // 检测是否为视频生成
        const isVideoGeneration = finishedCount === 0 && totalCount === 0 && currentItemList.length > 0;
        console.log(`[DATA] [POLL-TYPE] 轮询=${pollCount}, 生成类型={视频生成:${isVideoGeneration}, 完成度:${finishedCount}/${totalCount}}`);

        if (isVideoGeneration) {
          const canCompleteVideo = (status === 50 || currentItemList.length > 0) && currentItemList.length > 0;
          console.log(`[DATA] [VIDEO-CHECK] 轮询=${pollCount}, 视频完成检查={状态:${status}, 结果数:${currentItemList.length}, 可完成:${canCompleteVideo}}`);

          if (canCompleteVideo) {
            console.log(`[SUCCESS] [VIDEO-DONE] 轮询=${pollCount}, 视频生成完成, 返回${currentItemList.length}个结果`);
            return this.extractImageUrls(currentItemList);
          }
        } else {
          // 图像生成逻辑：纯数量判断，不依赖status状态
          const canCompleteImage = totalCount > 0 && finishedCount >= totalCount && currentItemList.length > 0;
          console.log(`[DATA] [IMAGE-CHECK] 轮询=${pollCount}, 图像完成检查={总数:${totalCount}, 完成:${finishedCount}, 结果数:${currentItemList.length}, 可完成:${canCompleteImage}}`);

          if (canCompleteImage) {
            console.log(`[SUCCESS] [IMAGE-DONE] 轮询=${pollCount}, 图像生成完成, 返回${currentItemList.length}个结果`);
            return this.extractImageUrls(currentItemList);
          }
        }
      }
      
      // [DATA] 轮询日志 - 进度报告
      if (pollCount % 5 === 0) {
        const currentElapsed = Math.round((Date.now() - overallStartTime) / 1000);
        console.log(`[DATA] [POLL-PROGRESS] 轮询=${pollCount}/${maxPollCount}, 状态=${status}, 已用时=${currentElapsed}s, 完成度=${finishedCount}/${totalCount}, 网络错误=${networkErrorCount}`);
      }
    }

    // [DATA] 轮询日志 - 结束统计
    const elapsedTime = Date.now() - overallStartTime;
    const finalElapsedSec = Math.round(elapsedTime / 1000);
    console.log(`[END] [POLL-END] 轮询结束, 总轮询=${pollCount}/${maxPollCount}, 最终状态=${status}, 总耗时=${finalElapsedSec}s, 网络错误=${networkErrorCount}, 继续生成=${continuationSent ? '已发送' : '未发送'}`);

    // 🔧 修复：在轮询结束后检查是否有最终结果可以提取
    if (finalRecord && finalRecord.item_list && finalRecord.item_list.length > 0) {
      console.log(`[FINAL] [FINAL-EXTRACT] 轮询结束，提取最终结果，状态=${status}，结果数=${finalRecord.item_list.length}`);
      return this.extractImageUrls(finalRecord.item_list);
    }

    // 判断结束原因
    if (pollCount >= maxPollCount) {
      console.warn(`[TIMEOUT] [POLL-TIMEOUT] 达到最大轮询次数限制, 轮询超时`);
    } else if (Date.now() - overallStartTime > overallTimeoutMs) {
      console.warn(`[TIMEOUT] [POLL-TIMEOUT] 达到总体时间限制, 轮询超时`);
    } else {
      console.warn(`[UNKNOWN] [POLL-UNKNOWN] 未知原因导致轮询结束`);
    }

    console.log('[DEBUG] 轮询超时，返回空数组');
    return [];
  }

  private extractImageUrlsFromDraft(draftResponse: DraftResponse): string[] {
    // 从Draft响应中提取图片URL
    const imageUrls: string[] = [];
    for (const component of draftResponse.component_list || []) {
      if (component.type === 'image' && component.status === 'completed') {
        const imageUrl = component.content?.large_images?.[0]?.image_url || component.content?.image_url;
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }
      }
    }
    return imageUrls;
  }

  /**
   * 从itemList中提取图片URL
   */
  private extractImageUrls(itemList: any[]): string[] {
    console.log('[DEBUG] itemList 项目数量:', itemList?.length || 0);

    // 提取图片URL - 尝试多种可能的路径
    const resultList = (itemList || []).map((item, index) => {
      console.log(`[DEBUG] 处理第${index}项: status=${item?.common_attr?.status}, has_url=${!!item?.image?.large_images?.[0]?.image_url}`);
      
      // 尝试多种可能的URL路径
      let imageUrl = item?.image?.large_images?.[0]?.image_url 
                  || item?.common_attr?.cover_url
                  || item?.image?.url
                  || item?.image?.image_url
                  || item?.cover_url
                  || item?.url;
      
      // 如果还是没找到，尝试在嵌套对象中查找
      if (!imageUrl && item?.image?.large_images) {
        for (const img of item.image.large_images) {
          if (img?.image_url || img?.url) {
            imageUrl = img.image_url || img.url;
            break;
          }
        }
      }
      
      console.log(`[DEBUG] 提取到的URL:`, imageUrl);
      return imageUrl;
    }).filter(Boolean)
    
    console.log('[DEBUG] 本轮提取的图片结果:', resultList)
    return resultList
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

  // ============== 异步查询功能 ==============

  /**
   * 异步提交图像生成任务（立即返回historyId，不等待完成）
   *
   * @param params 图像生成参数
   * @returns Promise<string> 返回historyId，用于后续查询生成状态
   * @throws Error 当提交失败或无法获取historyId时抛出错误
   */
  async generateImageAsync(params: ImageGenerationParams): Promise<string> {
    console.log('🚀 [Async] 提交异步图像生成任务');

    // 获取模型信息（复用现有逻辑）
    const modelName = params.model || DEFAULT_MODEL;
    const actualModel = this.getModel(modelName);

    // 处理参考图上传（复用现有逻辑）
    let uploadResult;
    let uploadResults: any[] = [];
    const hasFilePath = !!(params.filePath && params.filePath.length > 0);

    if (hasFilePath) {
      console.log(`📤 [Async] 上传 ${params.filePath!.length} 张参考图`);
      for (const filePath of params.filePath!) {
        const result = await this.uploadImage(filePath);
        uploadResults.push(result);
      }
      uploadResult = uploadResults[0]; // 兼容现有逻辑
    }

    // 构建请求数据（复用现有逻辑）
    const { rqData, rqParams } = this.buildGenerationRequestData(
      params, actualModel, modelName, hasFilePath, uploadResult, uploadResults
    );

    // 提交生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    // 提取historyId
    const historyId = result?.data?.aigc_data?.history_record_id;

    if (!historyId) {
      if (result?.errmsg) {
        throw new Error(`提交失败: ${result.errmsg}`);
      }
      throw new Error('提交失败: 无法获取historyId');
    }

    console.log(`✅ [Async] 任务提交成功, historyId: ${historyId}`);
    return historyId;
  }

  /**
   * 查询生成任务的当前状态和结果
   *
   * @param historyId 生成任务的历史记录ID
   * @returns Promise<QueryResultResponse> 返回当前状态、进度和结果
   * @throws Error 当historyId无效或查询失败时抛出错误
   */
  async getImageResult(historyId: string): Promise<QueryResultResponse> {
    // 验证historyId格式
    if (!historyId || historyId.trim() === '') {
      throw new Error('无效的historyId格式: historyId不能为空');
    }
    // JiMeng API 返回的 historyId 是纯数字字符串（如 "4721606420748"）或 'h' 开头的字符串
    // 接受两种格式以保持兼容性
    const isValidFormat = /^[0-9]+$/.test(historyId) || /^h[a-zA-Z0-9]+$/.test(historyId);
    if (!isValidFormat) {
      throw new Error('无效的historyId格式: historyId必须是纯数字或以"h"开头的字母数字字符串');
    }

    console.log(`🔍 [Query] 查询生成状态, historyId: ${historyId}`);

    // 调用查询接口
    const pollResult = await this.request(
      'POST',
      '/mweb/v1/get_history_by_ids',
      {
        "history_ids": [historyId],
        "image_info": {
          "width": 2048,
          "height": 2048,
          "format": "webp",
          "image_scene_list": [
            { "scene": "smart_crop", "width": 360, "height": 360, "uniq_key": "smart_crop-w:360-h:360", "format": "webp" },
            { "scene": "smart_crop", "width": 480, "height": 480, "uniq_key": "smart_crop-w:480-h:480", "format": "webp" },
            { "scene": "smart_crop", "width": 720, "height": 720, "uniq_key": "smart_crop-w:720-h:720", "format": "webp" },
            { "scene": "smart_crop", "width": 720, "height": 480, "uniq_key": "smart_crop-w:720-h:480", "format": "webp" },
            { "scene": "smart_crop", "width": 360, "height": 240, "uniq_key": "smart_crop-w:360-h:240", "format": "webp" },
            { "scene": "smart_crop", "width": 240, "height": 320, "uniq_key": "smart_crop-w:240-h:320", "format": "webp" },
            { "scene": "smart_crop", "width": 480, "height": 640, "uniq_key": "smart_crop-w:480-h:640", "format": "webp" },
            { "scene": "normal", "width": 2400, "height": 2400, "uniq_key": "2400", "format": "webp" },
            { "scene": "normal", "width": 1080, "height": 1080, "uniq_key": "1080", "format": "webp" },
            { "scene": "normal", "width": 720, "height": 720, "uniq_key": "720", "format": "webp" },
            { "scene": "normal", "width": 480, "height": 480, "uniq_key": "480", "format": "webp" },
            { "scene": "normal", "width": 360, "height": 360, "uniq_key": "360", "format": "webp" }
          ]
        },
        "http_common_info": {
          "aid": parseInt("513695")
        }
      }
    );

    const record = pollResult?.data?.[historyId];
    if (!record) {
      throw new Error('记录不存在');
    }

    // 解析状态
    const statusCode = record.status;
    const failCode = record.fail_code;
    const finishedCount = record.finished_image_count || 0;
    const totalCount = record.total_image_count || 1;
    const progress = totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0;

    // 映射状态码到用户友好的字符串
    let status: GenerationStatus;
    if (statusCode === 50) {
      status = 'completed';
    } else if (statusCode === 30) {
      status = 'failed';
    } else if (statusCode === 20 || statusCode === 42 || statusCode === 45) {
      status = finishedCount === 0 ? 'pending' : 'processing';
    } else {
      // 未知状态码，默认为processing
      status = 'processing';
    }

    console.log(`📊 [Query] 状态: ${status}, 进度: ${progress}%, 代码: ${statusCode}`);

    // 构建响应
    const response: QueryResultResponse = {
      status,
      progress
    };

    // 处理完成状态
    if (status === 'completed' && record.item_list && record.item_list.length > 0) {
      const itemList = record.item_list as any[];

      // 判断是图片还是视频
      const firstItem = itemList[0];

      // 视频生成 - 检查多个可能的视频URL路径
      const videoUrl = firstItem.video?.transcoded_video?.origin?.video_url  // 新格式：完整路径
                    || firstItem.video_url;                                    // 旧格式：直接字段

      if (videoUrl) {
        response.videoUrl = videoUrl;
        console.log(`✅ [Query] 视频生成完成: ${response.videoUrl}`);
      } else if (firstItem.image_url) {
        // 直接在item上的image_url（旧格式）
        response.imageUrls = itemList.map(item => item.image_url).filter(url => url);
        console.log(`✅ [Query] 图片生成完成: ${response.imageUrls!.length} 张`);
      } else if (firstItem.image && firstItem.image.large_images) {
        // 在item.image.large_images数组中（新格式）
        response.imageUrls = itemList
          .map(item => item.image?.large_images?.[0]?.image_url)
          .filter(url => url);
        console.log(`✅ [Query] 图片生成完成: ${response.imageUrls!.length} 张`);
      }
    }

    // 处理失败状态
    if (status === 'failed') {
      if (failCode === '2038') {
        response.error = '内容被过滤';
      } else if (failCode) {
        response.error = `生成失败 (错误码: ${failCode})`;
      } else {
        response.error = '生成失败';
      }
      console.log(`❌ [Query] 生成失败: ${response.error}`);
    }

    return response;
  }

  /**
   * 批量查询多个任务的生成状态和结果（Feature 002-）
   *
   * @param historyIds 任务ID数组（建议≤10个）
   * @returns Promise<BatchQueryResponse> 每个任务ID对应的结果或错误
   *
   * @example
   * ```typescript
   * const results = await client.getBatchResults([
   *   "4721606420748",
   *   "4721606420749",
   *   "invalid-id"
   * ]);
   * // {
   * //   "4721606420748": { status: "completed", progress: 100, videoUrl: "..." },
   * //   "4721606420749": { status: "processing", progress: 45 },
   * //   "invalid-id": { error: "无效的historyId格式" }
   * // }
   * ```
   */
  async getBatchResults(historyIds: string[]): Promise<{ [historyId: string]: QueryResultResponse | { error: string } }> {
    console.log(`🔍 [Batch Query] 批量查询 ${historyIds.length} 个任务状态`);

    // 验证输入
    if (!historyIds || historyIds.length === 0) {
      throw new Error('historyIds数组不能为空');
    }

    if (historyIds.length > 10) {
      console.warn(`⚠️ [Batch Query] 批量查询超过10个任务 (${historyIds.length}), 可能影响性能`);
    }

    // 预先验证所有historyId格式，记录无效的ID
    const validIds: string[] = [];
    const results: { [historyId: string]: QueryResultResponse | { error: string } } = {};

    for (const id of historyIds) {
      if (!id || id.trim() === '') {
        results[id] = { error: '无效的historyId格式: historyId不能为空' };
        continue;
      }

      const isValidFormat = /^[0-9]+$/.test(id) || /^h[a-zA-Z0-9]+$/.test(id);
      if (!isValidFormat) {
        results[id] = { error: '无效的historyId格式: historyId必须是纯数字或以"h"开头的字母数字字符串' };
        continue;
      }

      validIds.push(id);
    }

    // 如果没有有效ID，直接返回
    if (validIds.length === 0) {
      console.log('⚠️ [Batch Query] 没有有效的historyId');
      return results;
    }

    console.log(`✅ [Batch Query] 有效ID数量: ${validIds.length}/${historyIds.length}`);

    // 批量调用API（单次请求）
    try {
      const pollResult = await this.request(
        'POST',
        '/mweb/v1/get_history_by_ids',
        {
          "history_ids": validIds,
          "image_info": {
            "width": 2048,
            "height": 2048,
            "format": "webp",
            "image_scene_list": [
              { "scene": "smart_crop", "width": 360, "height": 360, "uniq_key": "smart_crop-w:360-h:360", "format": "webp" },
              { "scene": "smart_crop", "width": 480, "height": 480, "uniq_key": "smart_crop-w:480-h:480", "format": "webp" },
              { "scene": "smart_crop", "width": 720, "height": 720, "uniq_key": "smart_crop-w:720-h:720", "format": "webp" },
              { "scene": "normal", "width": 1080, "height": 1080, "uniq_key": "1080", "format": "webp" },
              { "scene": "normal", "width": 720, "height": 720, "uniq_key": "720", "format": "webp" },
              { "scene": "normal", "width": 480, "height": 480, "uniq_key": "480", "format": "webp" }
            ]
          },
          "http_common_info": {
            "aid": parseInt("513695")
          }
        }
      );

      // 处理每个有效ID的结果
      for (const id of validIds) {
        const record = pollResult?.data?.[id];

        if (!record) {
          results[id] = { error: '记录不存在' };
          continue;
        }

        // 复用getImageResult的状态解析逻辑
        const statusCode = record.status;
        const failCode = record.fail_code;
        const finishedCount = record.finished_image_count || 0;
        const totalCount = record.total_image_count || 1;
        const progress = totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0;

        // 映射状态码
        let status: GenerationStatus;
        if (statusCode === 50) {
          status = 'completed';
        } else if (statusCode === 30) {
          status = 'failed';
        } else if (statusCode === 20 || statusCode === 42 || statusCode === 45) {
          status = finishedCount === 0 ? 'pending' : 'processing';
        } else {
          status = 'processing';
        }

        // 构建响应
        const response: QueryResultResponse = {
          status,
          progress
        };

        // 处理完成状态
        if (status === 'completed' && record.item_list && record.item_list.length > 0) {
          const itemList = record.item_list as any[];
          const firstItem = itemList[0];

          if (firstItem.video_url) {
            response.videoUrl = firstItem.video_url;
          } else if (firstItem.image_url) {
            response.imageUrls = itemList.map(item => item.image_url).filter(url => url);
          } else if (firstItem.image && firstItem.image.large_images) {
            response.imageUrls = itemList
              .map(item => item.image?.large_images?.[0]?.image_url)
              .filter(url => url);
          }
        }

        // 处理失败状态
        if (status === 'failed') {
          if (failCode === '2038') {
            response.error = '内容被过滤';
          } else if (failCode) {
            response.error = `生成失败 (错误码: ${failCode})`;
          } else {
            response.error = '生成失败';
          }
        }

        results[id] = response;
      }

      console.log(`✅ [Batch Query] 查询完成: ${Object.keys(results).length} 个结果`);
      return results;

    } catch (error) {
      console.error('❌ [Batch Query] API请求失败:', error);
      throw error;
    }
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