/**
 * JiMeng API 统一客户端
 * 重构后的主要API客户端，整合所有服务功能
 * 保持与原api.ts完全兼容的接口
 */

import { JimengApiClient } from './ApiClient.js';
import { CreditService } from './CreditService.js';
import { 
  ImageGenerationParams, 
  VideoGenerationParams, 
  FrameInterpolationParams, 
  SuperResolutionParams,
  AudioEffectGenerationParams,
  VideoPostProcessUnifiedParams,
  DraftResponse,
  AigcMode,
  AbilityItem
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
export class JimengClient extends CreditService {
  private sessionId?: string;

  /**
   * 生成完整的请求参数
   */
  private generateRequestParams(): any {
    const rqParams: any = {
      "aid": parseInt("513695"),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "da_version": "3.3.2",
      "web_component_open_flag": 1,
      "web_version": "6.6.0",
      "aigc_features": "app_lip_sync",
      "msToken": generateMsToken(),
    };

    // 添加a_bogus防篡改参数
    rqParams['a_bogus'] = generate_a_bogus(toUrlParams(rqParams), 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    return rqParams;
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
        const result = await this.uploadCoverFile(filePath);
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
    const modelName = params.model || DEFAULT_VIDEO_MODEL;
    const actualModel = this.getModel(modelName);
    
    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }
    
    // 多帧模式 vs 传统模式
    if (params.multiFrames && params.multiFrames.length > 0) {
      return await this.generateMultiFrameVideo(params, actualModel);
    } else {
      return await this.generateTraditionalVideo(params, actualModel);
    }
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

  // ============== 轮询日志格式化函数 ==============

  /**
   * 格式化轮询开始日志
   */
  private logPollStart(type: 'POLL' | 'DRAFT' | 'VIDEO', pollCount: number, maxPollCount: number,
                      status: number | string, waitTime: number, elapsedTotal: number,
                      networkErrorCount: number, maxNetworkErrors: number, id: string): void {
    console.log(`[${type}-START] Poll=${pollCount}/${maxPollCount}, Status=${status}, Wait=${waitTime/1000}s, Elapsed=${elapsedTotal}s, NetErr=${networkErrorCount}/${maxNetworkErrors}, ID=${id}`);
  }

  /**
   * 格式化轮询数据日志
   */
  private logPollData(type: 'POLL' | 'DRAFT' | 'VIDEO', pollCount: number, apiCallDuration: number,
                     status: number | string, prevStatus?: number | string, failCode?: string,
                     finishedCount?: number, totalCount?: number, itemListLength?: number,
                     progress?: string, errorMessage?: string): void {

    let message = `[DATA] [${type}-DATA] 轮询=${pollCount}, API耗时=${apiCallDuration}ms`;

    if (prevStatus !== undefined) {
      message += `, 状态变化=${prevStatus}→${status}`;
    } else {
      message += `, 状态=${status}`;
    }

    message += `, 失败码=${failCode || 'null'}`;

    if (finishedCount !== undefined && totalCount !== undefined) {
      message += `, 完成度=${finishedCount}/${totalCount}`;
    }

    if (itemListLength !== undefined) {
      message += `, 结果数=${itemListLength}`;
    }

    if (progress !== undefined) {
      message += `, 进度=${progress}`;
    }

    if (errorMessage !== undefined) {
      message += `, 错误=${errorMessage}`;
    }

    console.log(message);
  }

  /**
   * 格式化轮询错误日志
   */
  private logPollError(type: 'POLL' | 'DRAFT' | 'VIDEO', pollCount: number, networkErrorCount: number,
                      maxNetworkErrors: number, errorDuration: number, error: any): void {
    console.error(`[${type}-ERROR] Poll=${pollCount}, NetErr=${networkErrorCount}/${maxNetworkErrors}, Duration=${errorDuration}ms, Error=${error}`);
  }

  /**
   * 格式化轮询状态检查日志
   */
  private logPollStatusCheck(type: 'POLL' | 'DRAFT' | 'VIDEO', pollCount: number,
                           isCompletionState: boolean, isProcessingState: boolean,
                           currentStatus: number | string, hasResults?: boolean, resultCount?: number): void {

    let message = `[DATA] [${type}-STATUS] 轮询=${pollCount}, 状态检查={完成状态:${isCompletionState}, 处理中:${isProcessingState}, 当前状态:${currentStatus}`;

    if (hasResults !== undefined) {
      message += `, 有结果:${hasResults}`;
    }

    if (resultCount !== undefined) {
      message += `, 结果数:${resultCount}`;
    }

    message += '}';
    console.log(message);
  }

  /**
   * 格式化轮询进度日志
   */
  private logPollProgress(type: 'POLL' | 'DRAFT' | 'VIDEO', pollCount: number, maxPollCount: number,
                         status: number | string, elapsedTime: number, networkErrorCount: number,
                         finishedCount?: number, totalCount?: number, progress?: string): void {

    let message = `[DATA] [${type}-PROGRESS] 轮询=${pollCount}/${maxPollCount}, 状态=${status}, 已用时=${elapsedTime}s, 网络错误=${networkErrorCount}`;

    if (finishedCount !== undefined && totalCount !== undefined) {
      message += `, 完成度=${finishedCount}/${totalCount}`;
    }

    if (progress !== undefined) {
      message += `, 进度=${progress}`;
    }

    console.log(message);
  }

  /**
   * 格式化轮询结束日志
   */
  private logPollEnd(type: 'POLL' | 'DRAFT' | 'VIDEO', pollCount: number, maxPollCount: number,
                    status: number | string, totalElapsedSec: number, networkErrorCount: number,
                    id: string, timeoutReason?: 'MAX_POLLS' | 'OVERALL_TIMEOUT' | 'UNKNOWN'): void {

    console.log(`[END] [${type}-END] 轮询结束, 总轮询=${pollCount}/${maxPollCount}, 最终状态=${status}, 总耗时=${totalElapsedSec}s, 网络错误=${networkErrorCount}, ID=${id}`);

    // 记录超时原因
    if (timeoutReason === 'MAX_POLLS') {
      console.warn(`[TIMEOUT] [${type}-TIMEOUT] 达到最大轮询次数限制, 轮询超时`);
    } else if (timeoutReason === 'OVERALL_TIMEOUT') {
      console.warn(`[TIMEOUT] [${type}-TIMEOUT] 达到总体时间限制, 轮询超时`);
    } else if (timeoutReason === 'UNKNOWN') {
      console.warn(`[UNKNOWN] [${type}-UNKNOWN] 未知原因导致轮询结束`);
    }
  }

  /**
   * 格式化轮询完成日志
   */
  private logPollComplete(type: 'POLL' | 'DRAFT' | 'VIDEO', pollCount: number, status: number | string,
                         resultCount: number, completionType?: 'SUCCESS' | 'FAIL'): void {
    if (completionType === 'FAIL') {
      console.error(`[ERROR] [${type}-FAIL] 轮询=${pollCount}, 生成失败, 状态=${status}`);
    } else {
      console.log(`[SUCCESS] [${type}-COMPLETE] 轮询=${pollCount}, 生成完成, 状态=${status}, 返回${resultCount}个结果`);
    }
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
    console.log('[DEBUG] 初始响应:', JSON.stringify(result, null, 2));
    
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
      console.log(`[DEBUG] 处理第${index}项:`, JSON.stringify(item, null, 2));
      
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

  /**
   * 专门用于视频生成的轮询方法 - 只基于URL存在性判断完成
   */
  private async pollTraditionalResultForVideo(result: any): Promise<string[]> {
    console.log('[DEBUG] 开始视频轮询');
    console.log('[DEBUG] 视频生成响应结构:', JSON.stringify(result, null, 2));

    // 获取正确的ID用于轮询 - 实际需要使用submit_id
    const submitId = result?.data?.aigc_data?.task?.submit_id ||
                    result?.data?.aigc_data?.submit_id ||
                    result?.data?.submit_id ||
                    result?.submit_id;

    const historyId = result?.data?.aigc_data?.history_record_id;

    if (!submitId) {
      console.error('[ERROR] 未找到有效的submit_id，响应结构:', JSON.stringify(result, null, 2));
      if (result?.errmsg) {
        throw new Error(result.errmsg);
      } else {
        throw new Error('submit_id不存在');
      }
    }

    console.log('[DEBUG] 使用的submitId:', submitId);
    console.log('[DEBUG] historyId:', historyId);

    // 轮询获取结果
    let pollCount = 0;
    let networkErrorCount = 0;

    const maxPollCount = 30;
    const maxNetworkErrors = 3;
    const overallTimeoutMs = 10 * 60 * 1000; // 10分钟总体超时
    const overallStartTime = Date.now();

    console.log('[DEBUG] 开始视频轮询，submitId:', submitId);
    
    while (pollCount < maxPollCount && Date.now() - overallStartTime < overallTimeoutMs) {
      // 检查网络错误次数
      if (networkErrorCount >= maxNetworkErrors) {
        console.error(`[ERROR] [VIDEO-ERROR] 网络错误次数达到限制=${networkErrorCount}, 退出视频轮询`);
        break;
      }

      pollCount++;

      // 等待时间：第一次等待久一点，后续缩短
      const waitTime = pollCount === 1 ? 60000 : 5000;

      // [DATA] 视频轮询日志 - 轮询开始
      const pollStartTime = Date.now();
      const elapsedTotal = Math.round((pollStartTime - overallStartTime) / 1000);
      console.log(`[DATA] [VIDEO-START] 轮询=${pollCount}/${maxPollCount}, 等待=${waitTime/1000}s, 总耗时=${elapsedTotal}s, 网络错误=${networkErrorCount}/${maxNetworkErrors}, Submit ID=${submitId}`);

      await new Promise(resolve => setTimeout(resolve, waitTime));

      let pollResult;
      try {
        pollResult = await this.request(
          'POST',
          '/mweb/v1/get_history_by_ids',
          { submit_ids: [submitId] },
          this.generateRequestParams()
        );
        networkErrorCount = 0; // 重置网络错误计数
      } catch (error) {
        networkErrorCount++;
        console.error(`[ERROR] [VIDEO-ERROR] 轮询=${pollCount}, 网络错误=${networkErrorCount}/${maxNetworkErrors}, 错误:`, error instanceof Error ? error.message : String(error));

        continue; // 继续下一轮询
      }

      if (!pollResult?.data || !pollResult.data[submitId]) {
        console.error(`[ERROR] 轮询响应无效，submitId=${submitId}`);
        console.log(`[DEBUG] API响应结构:`, JSON.stringify(pollResult, null, 2));
        continue;
      }

      const record = pollResult.data[submitId];
      const status = record.common_attr?.status ?? 'unknown';
      const failCode = record.common_attr?.fail_code ?? null;

      // 获取状态相关数据
      const finishedCount = record.finished_count ?? 0;
      const totalCount = record.total_count ?? 0;
      const itemListLength = record.item_list?.length ?? 0;

      // [DATA] 视频轮询日志 - 状态数据详情
      const apiCallDuration = Date.now() - pollStartTime;
      console.log(`[DATA] [VIDEO-DATA] 轮询=${pollCount}, API耗时=${apiCallDuration}ms, 状态=${status}, 失败码=${failCode || 'null'}, 完成度=${finishedCount}/${totalCount}, 结果数=${itemListLength}`);

      // 检查是否有item_list
      const hasItemList = record.item_list && record.item_list.length > 0;
      console.log(`[DATA] [VIDEO-CHECK] 轮询=${pollCount}, 完成检查={有结果:${hasItemList}, 结果数:${itemListLength}}`);

      // 核心逻辑：如果有结果，尝试提取视频URL
      if (hasItemList) {
        const currentItemList = record.item_list as any[];
        console.log(`[DATA] [VIDEO-EXTRACT-TRY] 轮询=${pollCount}, 尝试提取视频URL, 结果数=${currentItemList.length}`);

        // 尝试提取视频URL
        const videoUrls = this.extractVideoUrls(currentItemList);

        if (videoUrls && videoUrls.length > 0) {
          console.log(`[SUCCESS] [VIDEO-DONE] 轮询=${pollCount}, 成功提取到${videoUrls.length}个视频URL`);
          return videoUrls;
        } else {
          console.log(`[DATA] [VIDEO-NO-URL] 轮询=${pollCount}, 有结果但未提取到URL，继续轮询`);
        }
      }
      
      // [DATA] 视频轮询日志 - 进度报告
      if (pollCount % 5 === 0) {
        const currentElapsed = Math.round((Date.now() - overallStartTime) / 1000);
        console.log(`[DATA] [VIDEO-PROGRESS] 轮询=${pollCount}/${maxPollCount}, 状态=${status}, 已用时=${currentElapsed}s, 完成度=${finishedCount}/${totalCount}, 网络错误=${networkErrorCount}`);
      }
    }

    // [DATA] 视频轮询日志 - 结束统计
    const elapsedTime = Date.now() - overallStartTime;
    const finalElapsedSec = Math.round(elapsedTime / 1000);
    console.log(`[END] [VIDEO-END] 视频轮询结束, 总轮询=${pollCount}/${maxPollCount}, 总耗时=${finalElapsedSec}s, 网络错误=${networkErrorCount}, Submit ID=${submitId}`);

    // 判断结束原因
    if (pollCount >= maxPollCount) {
      console.warn(`[TIMEOUT] [VIDEO-TIMEOUT] 达到最大轮询次数限制`);
    } else if (Date.now() - overallStartTime > overallTimeoutMs) {
      console.warn(`[TIMEOUT] [VIDEO-TIMEOUT] 达到总体时间限制`);
    } else {
      console.warn(`[TIMEOUT] [VIDEO-TIMEOUT] 网络错误过多，退出轮询`);
    }

    console.log('[DEBUG] 视频轮询结束，未找到视频URL，返回空数组');
    return [];
  }

  /**
   * 从itemList中提取视频URL
   */
  private extractVideoUrls(itemList: any[]): string[] {
    console.log('[DEBUG] 提取视频URL，itemList长度:', itemList?.length || 0);

    const resultList = (itemList || []).map((item, index) => {
      console.log(`[DEBUG] 处理视频第${index}项:`, Object.keys(item || {}));
      
      // 尝试多种可能的视频URL路径
      let videoUrl = item?.video?.transcoded_video?.origin?.video_url ||
                    item?.video?.video_url ||
                    item?.video?.origin?.video_url ||
                    item?.common_attr?.cover_url ||
                    item?.aigc_video_params?.video_url ||
                    item?.url ||
                    item?.video_url;
      
      console.log(`[DEBUG] 提取到的视频URL:`, videoUrl);
      return videoUrl;
    }).filter(Boolean)
    
    console.log('[DEBUG] 本轮提取的视频结果:', resultList)
    return resultList
  }

  // ============== 占位符方法（需要从原文件继续提取） ==============
  
  private async generateMultiFrameVideo(params: VideoGenerationParams, actualModel: string): Promise<string> {
    console.log('[DEBUG] 开始智能多帧视频生成...');
    
    // 验证多帧参数
    if (!params.multiFrames || params.multiFrames.length === 0) {
      throw new Error('多帧模式需要提供multiFrames参数');
    }

    // 验证帧数量限制（实际用户提供的帧数，系统会自动添加结束帧）
    if (params.multiFrames.length > 9) {
      throw new Error(`智能多帧最多支持9个内容帧（系统会自动添加结束帧），当前提供了${params.multiFrames.length}帧`);
    }

    // 验证每个帧的参数
    for (const frame of params.multiFrames) {
      if (frame.duration_ms < 1000 || frame.duration_ms > 5000) {
        throw new Error(`帧${frame.idx}的duration_ms必须在1000-5000ms范围内（1-5秒）`);
      }
    }

    // 计算总时长（所有用户提供帧的累计时长）
    const totalDuration = params.multiFrames.reduce((sum, frame) => sum + frame.duration_ms, 0);
    console.log(`[DEBUG] 计算总时长: ${totalDuration}ms (${params.multiFrames.length}个内容帧)`);

    // 处理多帧图片上传
    const processedFrames = [];
    for (const frame of params.multiFrames) {
      const uploadResult = await this.uploadCoverFile(frame.image_path);
      processedFrames.push({
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
            image_uri: uploadResult.uri,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            uri: uploadResult.uri
          }
        }
      });
    }

    // 添加最后一个结束帧（duration_ms: 0, prompt: ""）
    // 根据实际API调用分析，最后一帧需要是结束状态
    const lastFrame = params.multiFrames[params.multiFrames.length - 1];
    const lastUploadResult = await this.uploadCoverFile(lastFrame.image_path);
    processedFrames.push({
      type: "",
      id: generateUuid(),
      idx: params.multiFrames.length, // 下一个idx
      duration_ms: 0, // 结束帧时长为0
      prompt: "", // 结束帧prompt为空
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
          image_uri: lastUploadResult.uri,
          width: lastUploadResult.width,
          height: lastUploadResult.height,
          format: lastUploadResult.format,
          uri: lastUploadResult.uri
        }
      }
    });

    console.log(`[DEBUG] 处理后的帧数量: ${processedFrames.length} (${params.multiFrames.length}内容帧 + 1结束帧)`);

    const componentId = generateUuid();
    const metricsExtra = JSON.stringify({
      "isDefaultSeed": 1,
      "originSubmitId": generateUuid(),
      "isRegenerate": false,
      "enterFrom": "click",
      "functionMode": "multi_frame"
    });

    const rqData = {
      "extend": {
        "root_model": actualModel,
        "m_video_commerce_info": {
          "benefit_type": "basic_video_operation_vgfm_v_three",
          "resource_id": "generate_video", 
          "resource_id_type": "str",
          "resource_sub_type": "aigc"
        },
        "m_video_commerce_info_list": [{
          "benefit_type": "basic_video_operation_vgfm_v_three",
          "resource_id": "generate_video",
          "resource_id_type": "str", 
          "resource_sub_type": "aigc"
        }]
      },
      "submit_id": generateUuid(),
      "metrics_extra": metricsExtra,
      "draft_content": JSON.stringify({
        "type": "draft",
        "id": generateUuid(),
        "min_version": "3.0.5",
        "min_features": ["AIGC_GenerateType_VideoMultiFrame"],
        "is_from_tsn": true,
        "version": "3.3.2",
        "main_component_id": componentId,
        "component_list": [{
          "type": "video_base_component",
          "id": componentId,
          "min_version": "1.0.0",
          "aigc_mode": "workbench",
          "metadata": {
            "type": "",
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now().toString(),
            "created_did": ""
          },
          "generate_type": "gen_video",
          "abilities": {
            "type": "",
            "id": generateUuid(),
            "gen_video": {
              "type": "",
              "id": generateUuid(),
              "text_to_video_params": {
                "type": "",
                "id": generateUuid(),
                "video_gen_inputs": [{
                  "type": "",
                  "id": generateUuid(),
                  "min_version": "3.0.5",
                  "prompt": params.prompt || "",
                  "video_mode": 2,
                  "fps": params.fps || 24,
                  "duration_ms": totalDuration,
                  "resolution": params.resolution || "720p",
                  "multi_frames": processedFrames,
                  "idip_meta_list": []
                }],
                "video_aspect_ratio": params.video_aspect_ratio || "3:4",
                "seed": Math.floor(Math.random() * 100000000) + 2500000000,
                "model_req_key": actualModel,
                "priority": 0
              },
              "video_task_extra": metricsExtra
            }
          },
          "process_type": 1
        }]
      }),
      "http_common_info": {
        "aid": parseInt("513695")
      }
    };

    const rqParams = this.generateRequestParams();

    // 发送生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    // 使用视频专用轮询获取结果
    const videoUrls = await this.pollTraditionalResultForVideo(result);

    // 提取视频URL
    let videoUrl;
    if (videoUrls && videoUrls.length > 0) {
      videoUrl = videoUrls[0];
      console.log('[DEBUG] 多帧视频生成结果:', videoUrl);
    }

    return videoUrl || '';
  }

  private async generateTraditionalVideo(params: VideoGenerationParams, actualModel: string): Promise<string> {
    console.log('[DEBUG] 开始传统视频生成...');
    
    // 传统单帧/首尾帧模式的处理逻辑
    let first_frame_image = undefined
    let end_frame_image = undefined
    if (params?.filePath) {
      let uploadResults: any[] = []
      for (const item of params.filePath) {
        const uploadResult = await this.uploadCoverFile(item)
        uploadResults.push(uploadResult)
      }
      if (uploadResults[0]) {
        first_frame_image = {
          format: uploadResults[0].format,
          height: uploadResults[0].height,
          id: generateUuid(),
          image_uri: uploadResults[0].uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResults[0].uri,
          width: uploadResults[0].width,
        }
      }
      if (uploadResults[1]) {
        end_frame_image = {
          format: uploadResults[1].format,
          height: uploadResults[1].height,
          id: generateUuid(),
          image_uri: uploadResults[1].uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResults[1].uri,
          width: uploadResults[1].width,
        }
      }
      if (!first_frame_image && !end_frame_image) {
        throw new Error('上传封面图片失败，请检查图片路径是否正确');
      }
    }

    const componentId = generateUuid();
    const metricsExtra = JSON.stringify({
      "enterFrom": "click",
      "isDefaultSeed": 1,
      "promptSource": "custom",
      "isRegenerate": false,
      "originSubmitId": generateUuid(),
    });

    const rqData = {
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
      "submit_id": generateUuid(),
      "metrics_extra": metricsExtra,
      "draft_content": JSON.stringify({
        "type": "draft",
        "id": generateUuid(),
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
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now(),
            "created_did": ""
          },
          "generate_type": "gen_video",
          "aigc_mode": "workbench",
          "abilities": {
            "type": "",
            "id": generateUuid(),
            "gen_video": {
              "id": generateUuid(),
              "type": "",
              "text_to_video_params": {
                "type": "",
                "id": generateUuid(),
                "model_req_key": actualModel,
                "priority": 0,
                "seed": Math.floor(Math.random() * 100000000) + 2500000000,
                "video_aspect_ratio": params.video_aspect_ratio || "1:1",
                "video_gen_inputs": [{
                  duration_ms: params.duration_ms || 5000,
                  first_frame_image: first_frame_image,
                  end_frame_image: end_frame_image,
                  fps: params.fps || 24,
                  id: generateUuid(),
                  min_version: "3.0.5",
                  prompt: params.prompt,
                  resolution: params.resolution || "720p",
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

    const rqParams = this.generateRequestParams();

    // 发送生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    const videoUrls = await this.pollTraditionalResultForVideo(result);
    let videoUrl;
    if (videoUrls && videoUrls.length > 0) {
      videoUrl = videoUrls[0];
    }

    console.log('[DEBUG] 传统视频生成结果:', videoUrl);
    return videoUrl || '';
  }

  private async getUploadAuth(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const authRes = await this.request(
          'POST',
          '/mweb/v1/get_upload_token?aid=513695&da_version=3.2.2&aigc_features=app_lip_sync',
          {
            scene: 2
          },
          {},
        );
        if (!authRes.data) {
          reject(authRes.errmsg ?? '获取上传凭证失败,账号可能已掉线!');
          return;
        }
        resolve(authRes.data);
      } catch (err) {
        console.error('获取上传凭证失败:', err);
        reject(err);
      }
    });
  }

  private async uploadFile(
    url: string,
    fileContent: Buffer,
    headers: any,
    method: string = 'PUT',
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const res = await this.request(
        'POST',
        url,
        fileContent,
        {},
        headers
      );
      resolve(res);
    });
  }

  public async getFileContent(filePath: string): Promise<Buffer> {
    try {
      if (filePath.includes('https://') || filePath.includes('http://')) {
        // 直接用axios获取图片Buffer
        const axios = (await import('axios')).default;
        const res = await axios.get(filePath, { responseType: 'arraybuffer' });
        return Buffer.from(res.data);
      } else {
        // 确保路径是绝对路径
        const path = (await import('path')).default;
        const fs = await import('fs');
        const absolutePath = path.resolve(filePath);
        // 读取文件内容
        return await fs.promises.readFile(absolutePath);
      }
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error(`读取文件失败: ${filePath}`);
    }
  }

  private getImageMetadata(buffer: Buffer, filePath: string): {width: number, height: number, format: string} {
    try {
      // 检测文件格式
      const format = this.detectImageFormat(buffer, filePath);
      
      // 根据格式解析尺寸
      let width = 0;
      let height = 0;

      if (format === 'png') {
        const metadata = this.parsePNG(buffer);
        width = metadata.width;
        height = metadata.height;
      } else if (format === 'jpg' || format === 'jpeg') {
        const metadata = this.parseJPEG(buffer);
        width = metadata.width;
        height = metadata.height;
      } else if (format === 'webp') {
        const metadata = this.parseWebP(buffer);
        width = metadata.width;
        height = metadata.height;
      }

      return { width, height, format };
    } catch (error) {
      console.error('获取图片元数据失败:', error);
      // 返回默认值以保持兼容性
      return { width: 0, height: 0, format: 'png' };
    }
  }

  /**
   * 检测图片格式
   */
  private detectImageFormat(buffer: Buffer, filePath: string): string {
    // 通过文件扩展名检测
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'png';
    if (ext === '.jpg' || ext === '.jpeg') return 'jpeg';
    if (ext === '.webp') return 'webp';

    // 通过文件头检测
    if (buffer.length >= 8) {
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'png';
      }
      // JPEG: FF D8 FF
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'jpeg';
      }
      // WebP: 52 49 46 46 xx xx xx xx 57 45 42 50
      if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
          buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return 'webp';
      }
    }

    return 'png'; // 默认格式
  }

  /**
   * 解析PNG尺寸
   */
  private parsePNG(buffer: Buffer): { width: number; height: number } {
    try {
      // PNG IHDR chunk starts at byte 16
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
    } catch (error) {
      console.error('解析PNG失败:', error);
    }
    return { width: 0, height: 0 };
  }

  /**
   * 解析JPEG尺寸
   */
  private parseJPEG(buffer: Buffer): { width: number; height: number } {
    try {
      let i = 2; // Skip SOI marker
      while (i < buffer.length - 4) {
        // Find SOF marker (Start of Frame)
        if (buffer[i] === 0xFF) {
          const marker = buffer[i + 1];
          // SOF0, SOF1, SOF2, SOF3, SOF5, SOF6, SOF7, SOF9, SOF10, SOF11, SOF13, SOF14, SOF15
          if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || 
              (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
            const height = buffer.readUInt16BE(i + 5);
            const width = buffer.readUInt16BE(i + 7);
            return { width, height };
          }
          // Skip this segment
          const segmentLength = buffer.readUInt16BE(i + 2);
          i += segmentLength + 2;
        } else {
          i++;
        }
      }
    } catch (error) {
      console.error('解析JPEG失败:', error);
    }
    return { width: 0, height: 0 };
  }

  /**
   * 解析WebP尺寸
   */
  private parseWebP(buffer: Buffer): { width: number; height: number } {
    try {
      if (buffer.length >= 30) {
        // Simple WebP format
        if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
          const width = buffer.readUInt16LE(26) & 0x3FFF;
          const height = buffer.readUInt16LE(28) & 0x3FFF;
          return { width, height };
        }
        // Lossless WebP format
        if (buffer.toString('ascii', 12, 16) === 'VP8L') {
          const bits = buffer.readUInt32LE(21);
          const width = (bits & 0x3FFF) + 1;
          const height = ((bits >> 14) & 0x3FFF) + 1;
          return { width, height };
        }
      }
    } catch (error) {
      console.error('解析WebP失败:', error);
    }
    return { width: 0, height: 0 };
  }

  /**
   * 上传文件并获取图片元数据
   */
  private async uploadCoverFile(
    filePath: string,
  ): Promise<{uri: string, width: number, height: number, format: string}> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('开始上传文件:', filePath);
        // 获取上传令牌所需Ak和Tk
        const uploadAuth = await this.getUploadAuth();

        // 获取图片数据
        const imageRes = await this.getFileContent(filePath);
        // 获取图片元数据
        const metadata = this.getImageMetadata(imageRes, filePath);
        // 获取图片Crc32标识
        const imageCrc32 = crc32(imageRes).toString(16);

        // 获取图片上传凭证签名所需参数
        const getUploadImageProofRequestParams = {
          Action: 'ApplyImageUpload',
          FileSize: imageRes.length,
          ServiceId: 'tb4s082cfz',
          Version: '2018-08-01',
          s: this.generateRandomString(11),
        };

        // 获取图片上传请求头
        const requestHeadersInfo = await this.generateAuthorizationAndHeader(
          uploadAuth.access_key_id,
          uploadAuth.secret_access_key,
          uploadAuth.session_token,
          'cn-north-1',
          'imagex',
          'GET',
          getUploadImageProofRequestParams,
        );

        const getUploadImageProofUrl = 'https://imagex.bytedanceapi.com/';
        
        // 获取图片上传凭证
        const uploadImgRes = await this.request(
          'GET',
          getUploadImageProofUrl + '?' + this.httpBuildQuery(getUploadImageProofRequestParams),
          {},
          {},
          requestHeadersInfo
        );

        if (uploadImgRes?.['Response  ']?.hasOwnProperty('Error')) {
          reject(uploadImgRes['Response ']['Error']['Message']);
          return;
        }

        const UploadAddress = uploadImgRes.Result.UploadAddress;
        // 用凭证拼接上传图片接口
        const uploadImgUrl = `https://${UploadAddress.UploadHosts[0]}/upload/v1/${UploadAddress.StoreInfos[0].StoreUri}`;

        // 上传图片
        const imageUploadRes = await this.uploadFile(
          uploadImgUrl,
          imageRes,
          {
            Authorization: UploadAddress.StoreInfos[0].Auth,
            'Content-Crc32': imageCrc32,
            'Content-Type': 'application/octet-stream',
          },
          'POST',
        );

        if (imageUploadRes.code !== 2000) {
          reject(imageUploadRes.message);
          return;
        }

        const commitImgParams = {
          Action: 'CommitImageUpload',
          FileSize: imageRes.length,
          ServiceId: 'tb4s082cfz',
          Version: '2018-08-01',
        };

        const commitImgContent = {
          SessionKey: UploadAddress.SessionKey,
        };

        const commitImgHead = await this.generateAuthorizationAndHeader(
          uploadAuth.access_key_id,
          uploadAuth.secret_access_key,
          uploadAuth.session_token,
          'cn-north-1',
          'imagex',
          'POST',
          commitImgParams,
          commitImgContent,
        );

        // 提交图片上传
        const commitImg = await this.request(
          'POST',
          getUploadImageProofUrl + '?' + this.httpBuildQuery(commitImgParams),
          commitImgContent,
          {},
          {
            ...commitImgHead,
            'Content-Type': 'application/json',
          }
        );

        if (commitImg['Response ']?.hasOwnProperty('Error')) {
          reject(commitImg['Response  ']['Error']['Message']);
          return;
        }

        resolve({
          uri: commitImg.Result.Results[0].Uri,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        });
      } catch (err: any) {
        console.error('上传文件失败:', err);
        const errorMessage = err?.message || err || '未知';
        reject('上传失败,失败原因:' + errorMessage);
      }
    });
  }

  private generateRandomString(length: number): string {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  private httpBuildQuery(params: any): string {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      if (params?.hasOwnProperty(key)) {
        searchParams.append(key, params[key]);
      }
    }
    return searchParams.toString();
  }

  private async generateAuthorizationAndHeader(
    accessKeyID: string,
    secretAccessKey: string,
    sessionToken: string,
    region: string,
    service: string,
    requestMethod: string,
    requestParams: any,
    requestBody: any = {},
  ): Promise<any> {
    return new Promise((resolve) => {
      // 获取当前ISO时间
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';

      // 生成请求的Header
      const requestHeaders: Record<string, string> = this.addHeaders(
        amzDate,
        sessionToken,
        requestBody,
      )

      if (Object.keys(requestBody).length > 0) {
        requestHeaders['X-Amz-Content-Sha256'] = crypto
          .createHash('sha256')
          .update(JSON.stringify(requestBody))
          .digest('hex')
      }
      // 生成请求的Authorization
      const authorizationParams = [
        'AWS4-HMAC-SHA256 Credential=' + accessKeyID + '/' +
        this.credentialString(amzDate, region, service),
        'SignedHeaders=' + this.signedHeaders(requestHeaders),
        'Signature=' + this.signature(
          secretAccessKey,
          amzDate,
          region,
          service,
          requestMethod,
          requestParams,
          requestHeaders,
          requestBody,
        ),
      ];
      const authorization = authorizationParams.join(', ');

      // 返回Headers
      const headers: any = {};
      for (const key in requestHeaders) {
        headers[key] = requestHeaders[key];
      }
      headers['Authorization'] = authorization;
      resolve(headers);
    });
  }

  private addHeaders(
    amzDate: string,
    sessionToken: string,
    requestBody: any,
  ): any {
    const headers = {
      'X-Amz-Date': amzDate,
      'X-Amz-Security-Token': sessionToken,
    };
    if (Object.keys(requestBody).length > 0) {
      // @ts-ignore
      headers['X-Amz-Content-Sha256'] = crypto
        .createHash('sha256')
        .update(JSON.stringify(requestBody))
        .digest('hex');
    }
    return headers;
  }

  private credentialString(
    amzDate: string,
    region: string,
    service: string,
  ): string {
    const credentialArr = [
      amzDate.substring(0, 8),
      region,
      service,
      'aws4_request',
    ];
    return credentialArr.join('/');
  }

  private signedHeaders(requestHeaders: any): string {
    const headers: string[] = [];
    Object.keys(requestHeaders).forEach(function (r) {
      r = r.toLowerCase();
      headers.push(r);
    });
    return headers.sort().join(';');
  }

  private canonicalString(
    requestMethod: string,
    requestParams: any,
    requestHeaders: any,
    requestBody: any,
  ): string {
    let canonicalHeaders: string[] = [];
    const headerKeys = Object.keys(requestHeaders).sort();
    for (let i = 0; i < headerKeys.length; i++) {
      canonicalHeaders.push(
        headerKeys[i].toLowerCase() + ':' + requestHeaders[headerKeys[i]],
      );
    }
    // @ts-ignore
    canonicalHeaders = canonicalHeaders.join('\n') + '\n';
    let body = '';
    if (Object.keys(requestBody).length > 0) {
      body = JSON.stringify(requestBody);
    }

    const canonicalStringArr = [
      requestMethod.toUpperCase(),
      '/',
      this.httpBuildQuery(requestParams),
      canonicalHeaders,
      this.signedHeaders(requestHeaders),
      crypto.createHash('sha256').update(body).digest('hex'),
    ];
    return canonicalStringArr.join('\n');
  }

  private signature(
    secretAccessKey: string,
    amzDate: string,
    region: string,
    service: string,
    requestMethod: string,
    requestParams: any,
    requestHeaders: any,
    requestBody: any,
  ): string {
    // 生成signingKey
    const amzDay = amzDate.substring(0, 8);
    const kDate = crypto
      .createHmac('sha256', 'AWS4' + secretAccessKey)
      .update(amzDay)
      .digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto
      .createHmac('sha256', kRegion)
      .update(service)
      .digest();
    const signingKey = crypto
      .createHmac('sha256', kService)
      .update('aws4_request')
      .digest();

    // 生成StringToSign
    const stringToSignArr = [
      'AWS4-HMAC-SHA256',
      amzDate,
      this.credentialString(amzDate, region, service),
      crypto
        .createHash('sha256')
        .update(
          this.canonicalString(
            requestMethod,
            requestParams,
            requestHeaders,
            requestBody,
          ),
        )
        .digest('hex'),
    ];
    const stringToSign = stringToSignArr.join('\n');
    return crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');
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
    console.log(`🎬 开始视频后处理: ${params.operation}`);
    
    switch (params.operation) {
      case 'frame_interpolation':
        if (!params.targetFps || !params.originFps) {
          throw new Error('补帧操作需要提供 targetFps 和 originFps 参数');
        }
        return await this.frameInterpolation({
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          targetFps: params.targetFps,
          originFps: params.originFps,
          duration: params.duration,
          refresh_token: params.refresh_token
        });
      
      case 'super_resolution':
        if (!params.targetWidth || !params.targetHeight || !params.originWidth || !params.originHeight) {
          throw new Error('分辨率提升操作需要提供 targetWidth, targetHeight, originWidth, originHeight 参数');
        }
        return await this.superResolution({
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          targetWidth: params.targetWidth,
          targetHeight: params.targetHeight,
          originWidth: params.originWidth,
          originHeight: params.originHeight,
          refresh_token: params.refresh_token
        });
      
      case 'audio_effect':
        return await this.generateAudioEffect({
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          refresh_token: params.refresh_token
        });
      
      default:
        throw new Error(`不支持的操作类型: ${params.operation}`);
    }
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