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
      "da_version": "3.2.9",
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
    console.log('🔍 [API Client] generateImage method called');
    console.log('🔍 [API Client] Token in this instance:', this.refreshToken ? '[PROVIDED]' : '[MISSING]');
    
    return await this.generateImageWithBatch(params);
  }

  /**
   * 批量生成图像，支持自动继续生成和多参考图
   */
  private async generateImageWithBatch(params: ImageGenerationParams): Promise<string[]> {
    console.log('🔍 [API Client] generateImageWithBatch called');
    
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
      console.log(`🔍 文件上传模式，共${params.filePath.length}个文件`);
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
    
    console.log('🔍 发送的请求数据:', JSON.stringify(rqData, null, 2));
    console.log('🔍 发送的请求参数:', JSON.stringify(rqParams, null, 2));
    
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
      console.log('🔍 检测到Draft-based响应，使用新轮询逻辑');
      const draftResponse = await this.pollDraftResult(draftId);
      return this.extractImageUrlsFromDraft(draftResponse);
    }
    
    // 传统轮询逻辑
    console.log('🔍 使用传统轮询逻辑');
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
        "version": "3.2.9",
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
   * 简化逻辑：只有当total_image_count > 4时才需要继续生成
   */
  private shouldContinueGeneration(recordData: any): boolean {
    if (!recordData) {
      console.log('🔍 无recordData，停止继续生成');
      return false;
    }
    
    const totalCount = recordData.total_image_count || 0;
    const needsContinuation = totalCount > 4;
    
    if (needsContinuation) {
      console.log(`🔍 需要继续生成: 目标${totalCount}张(>4张)`);
    } else {
      console.log(`🔍 标准生成: 总数${totalCount}张(<=4张)，无需继续生成`);
    }
    
    return needsContinuation;
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
    console.log('🔍 开始执行继续生成请求...');
    
    // 构建继续生成请求数据
    const { rqData, rqParams } = this.buildGenerationRequestData(
      params, actualModel, modelName, hasFilePath, uploadResult, uploadResults, historyId, true
    );

    console.log('🔍 继续生成请求参数:', JSON.stringify({ 
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

    console.log('🔍 继续生成请求已发送，响应:', JSON.stringify(result, null, 2));
  }

  // ============== 轮询相关方法（简化版本） ==============
  
  private async pollDraftResult(draftId: string): Promise<DraftResponse> {
    let pollCount = 0;
    const maxPollCount = 30; // 最多轮询30次，约5分钟
    
    console.log('🔍 开始Draft轮询，draftId:', draftId);
    
    while (pollCount < maxPollCount) {
      pollCount++;
      const waitTime = pollCount === 1 ? 10000 : 3000; // 首次10秒，后续3秒
      
      console.log(`🔍 Draft轮询第 ${pollCount} 次，等待 ${waitTime/1000} 秒...`);
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

          console.log(`🔍 Draft状态: ${draftResponse.status}, 组件数量: ${draftResponse.component_list.length}`);

          // 检查是否完成
          if (draftResponse.status === 'completed') {
            console.log('✅ Draft生成完成');
            return draftResponse;
          } else if (draftResponse.status === 'failed') {
            throw new Error(draftResponse.error_message || 'Draft生成失败');
          }
        }
      } catch (error) {
        console.error(`❌ Draft轮询错误:`, error);
        // 如果是网络错误，继续重试
        if (pollCount >= maxPollCount) {
          throw new Error(`Draft轮询超时: ${error}`);
        }
      }
    }
    
    throw new Error('Draft轮询超时，未能获取结果');
  }

  private async pollTraditionalResult(result: any, params?: ImageGenerationParams, actualModel?: string, modelName?: string, hasFilePath?: boolean, uploadResult?: any, uploadResults?: any[]): Promise<string[]> {
    console.log('🔍 开始传统轮询');
    console.log('🔍 初始响应:', JSON.stringify(result, null, 2));
    
    // 获取历史记录ID
    const historyId = result?.data?.aigc_data?.history_record_id;
    if (!historyId) {
      if (result?.errmsg) {
        throw new Error(result.errmsg);
      } else {
        throw new Error('记录ID不存在');
      }
    }

    // 轮询获取结果
    let status = 20;
    let failCode = null;
    let pollCount = 0;
    let continuationSent = false; // 标记是否已发送继续生成请求
    const maxPollCount = 30; // 增加最大轮询次数以支持继续生成

    console.log('🔍 开始轮询，historyId:', historyId);
    
    while (pollCount < maxPollCount) {
      pollCount++;
      // 根据状态码调整等待时间
      let waitTime;
      if (status === 45) {
        waitTime = pollCount === 1 ? 30000 : 10000;
      } else if (status === 42) {
        waitTime = pollCount === 1 ? 15000 : 8000;
      } else {
        waitTime = pollCount === 1 ? 20000 : 5000;
      }
      
      console.log(`🔍 轮询第 ${pollCount} 次，状态=${status}，等待 ${waitTime/1000} 秒...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

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
      
      console.log('🔍 轮询响应:', JSON.stringify(pollResult, null, 2));

      const record = pollResult?.data?.[historyId];
      if (!record) {
        throw new Error('记录不存在');
      }
      status = record.status;
      failCode = record.fail_code;

      const finishedCount = record.finished_image_count || 0;
      const totalCount = record.total_image_count || 0;
      console.log(`🔍 轮询状态: status=${status}, failCode=${failCode}, itemList长度=${record.item_list?.length || 0}, finished_count=${finishedCount}, total_count=${totalCount}`);

      if (status === 30) {
        if (failCode === '2038') {
          throw new Error('内容被过滤');
        }
        throw new Error('生成失败');
      }

      // 检查是否需要发送继续生成请求（只发送一次）
      if (!continuationSent && params && actualModel && modelName !== undefined && hasFilePath !== undefined && this.shouldContinueGeneration(record)) {
        console.log('🔍 检测到需要继续生成，发送继续生成请求');
        try {
          await this.performContinuationGeneration(params, actualModel, modelName, hasFilePath, uploadResult, uploadResults || [], historyId);
          continuationSent = true;
        } catch (error) {
          console.error('🔍 继续生成请求失败:', error);
        }
      }
      
      // 检查是否完成
      if (record.item_list && record.item_list.length > 0) {
        const currentItemList = record.item_list as any[];
        
        // 检测是否为视频生成
        const isVideoGeneration = finishedCount === 0 && totalCount === 0 && currentItemList.length > 0;
        
        if (isVideoGeneration) {
          console.log(`🔍 检测到视频生成模式: status=${status}, itemList长度=${currentItemList.length}`);
          if (status === 50 && currentItemList.length > 0) {
            console.log('🔍 视频生成完成，返回结果');
            return this.extractImageUrls(currentItemList);
          }
        } else {
          // 图像生成逻辑：等待所有图片完成
          if (totalCount > 0 && finishedCount >= totalCount) {
            console.log('🔍 所有图片生成完成，返回结果');
            return this.extractImageUrls(currentItemList);
          } else if (totalCount <= 4 && currentItemList.length >= 4 && status !== 20 && status !== 45 && status !== 42) {
            // 对于小批次（<=4张），达到批次大小且状态稳定时完成
            console.log('🔍 小批次图片生成完成，返回结果');
            return this.extractImageUrls(currentItemList);
          }
        }
      }
      
      // 只在处理状态下继续轮询
      if (status !== 20 && status !== 45 && status !== 42) {
        console.log(`🔍 遇到新状态 ${status}，继续轮询...`);
      }
    }
    
    console.log('🔍 轮询超时，返回空数组');
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
    console.log('🔍 itemList 项目数量:', itemList?.length || 0);

    // 提取图片URL - 尝试多种可能的路径
    const resultList = (itemList || []).map((item, index) => {
      console.log(`🔍 处理第${index}项:`, JSON.stringify(item, null, 2));
      
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
      
      console.log(`🔍 提取到的URL:`, imageUrl);
      return imageUrl;
    }).filter(Boolean)
    
    console.log('🔍 本轮提取的图片结果:', resultList)
    return resultList
  }

  /**
   * 专门用于视频生成的轮询方法
   */
  private async pollTraditionalResultForVideo(result: any): Promise<string[]> {
    console.log('🔍 开始视频轮询');
    
    // 获取历史记录ID
    const historyId = result?.data?.aigc_data?.history_record_id;
    if (!historyId) {
      if (result?.errmsg) {
        throw new Error(result.errmsg);
      } else {
        throw new Error('记录ID不存在');
      }
    }

    // 轮询获取结果
    let status = 20;
    let failCode = null;
    let pollCount = 0;
    const maxPollCount = 20; // 最多轮询20次

    console.log('🔍 开始视频轮询，historyId:', historyId);
    
    while ((status === 20 || status === 45 || status === 42) && pollCount < maxPollCount) {
      pollCount++;
      // 根据状态码调整等待时间
      let waitTime;
      if (status === 45) {
        waitTime = pollCount === 1 ? 30000 : 10000;
      } else if (status === 42) {
        waitTime = pollCount === 1 ? 15000 : 8000;
      } else {
        waitTime = pollCount === 1 ? 20000 : 5000;
      }
      
      console.log(`🔍 视频轮询第 ${pollCount} 次，状态=${status}，等待 ${waitTime/1000} 秒...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      const pollResult = await this.request(
        'POST',
        '/mweb/v1/get_history_by_ids',
        {
          "history_ids": [historyId],
          "http_common_info": {
            "aid": parseInt("513695")
          }
        }
      );

      const record = pollResult?.data?.[historyId];
      if (!record) {
        throw new Error('记录不存在');
      }
      status = record.status;
      failCode = record.fail_code;

      console.log(`🔍 视频轮询状态: status=${status}, failCode=${failCode}, itemList长度=${record.item_list?.length || 0}`);

      if (status === 30) {
        if (failCode === '2038') {
          throw new Error('内容被过滤');
        }
        throw new Error('生成失败');
      }
      
      // 检查视频是否完成
      if (record.item_list && record.item_list.length > 0) {
        const currentItemList = record.item_list as any[];
        const finishedCount = record.finished_image_count || 0;
        const totalCount = record.total_image_count || 0;
        
        // 检测是否为视频生成
        const isVideoGeneration = finishedCount === 0 && totalCount === 0 && currentItemList.length > 0;
        
        if (isVideoGeneration && status === 50 && currentItemList.length > 0) {
          console.log('🔍 视频生成完成，提取视频URL');
          return this.extractVideoUrls(currentItemList);
        }
      }
    }
    
    return [];
  }

  /**
   * 从itemList中提取视频URL
   */
  private extractVideoUrls(itemList: any[]): string[] {
    console.log('🔍 提取视频URL，itemList长度:', itemList?.length || 0);

    const resultList = (itemList || []).map((item, index) => {
      console.log(`🔍 处理视频第${index}项:`, Object.keys(item || {}));
      
      // 尝试多种可能的视频URL路径
      let videoUrl = item?.video?.transcoded_video?.origin?.video_url ||
                    item?.video?.video_url ||
                    item?.video?.origin?.video_url ||
                    item?.common_attr?.cover_url ||
                    item?.aigc_video_params?.video_url ||
                    item?.url ||
                    item?.video_url;
      
      console.log(`🔍 提取到的视频URL:`, videoUrl);
      return videoUrl;
    }).filter(Boolean)
    
    console.log('🔍 本轮提取的视频结果:', resultList)
    return resultList
  }

  // ============== 占位符方法（需要从原文件继续提取） ==============
  
  private async generateMultiFrameVideo(params: VideoGenerationParams, actualModel: string): Promise<string> {
    console.log('🔍 开始智能多帧视频生成...');
    
    // 验证多帧参数
    if (!params.multiFrames || params.multiFrames.length === 0) {
      throw new Error('多帧模式需要提供multiFrames参数');
    }

    // 验证帧数量限制
    if (params.multiFrames.length > 10) {
      throw new Error(`智能多帧最多支持10帧，当前提供了${params.multiFrames.length}帧`);
    }

    // 验证每个帧的参数
    for (const frame of params.multiFrames) {
      if (frame.duration_ms < 1000 || frame.duration_ms > 5000) {
        throw new Error(`帧${frame.idx}的duration_ms必须在1000-5000ms范围内（1-5秒）`);
      }
    }

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
        "version": "3.2.9",
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
                  "duration_ms": params.duration_ms || 10000,
                  "resolution": params.resolution || "720p",
                  "multi_frames": processedFrames
                }],
                "video_aspect_ratio": params.video_aspect_ratio || "3:4",
                "seed": Math.floor(Math.random() * 100000000) + 2500000000,
                "model_req_key": actualModel,
                "priority": 0
              },
              "video_task_extra": metricsExtra
            }
          }
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

    // 使用传统轮询获取结果
    const imageUrls = await this.pollTraditionalResult(result);
    
    // 尝试多种可能的视频URL路径
    let videoUrl;
    if (imageUrls && imageUrls.length > 0) {
      // 对于视频生成，URL可能在不同的路径中
      videoUrl = imageUrls[0];
      console.log('🔍 多帧视频生成结果:', videoUrl);
    }
    
    return videoUrl || '';
  }

  private async generateTraditionalVideo(params: VideoGenerationParams, actualModel: string): Promise<string> {
    console.log('🔍 开始传统视频生成...');
    
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
        "version": "3.2.8",
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
                "video_aspect_ratio": "1:1",
                "video_gen_inputs": [{
                  duration_ms: 5000,
                  first_frame_image: first_frame_image,
                  end_frame_image: end_frame_image,
                  fps: 24,
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

    console.log('🔍 传统视频生成结果:', videoUrl);
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

    console.log('🔍 开始轮询补帧结果...');
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

    console.log('🔍 开始轮询分辨率提升结果...');
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

    console.log('🔍 开始轮询音效生成结果...');
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
        console.log('🔍 创建新的日志文件:', logFilePath);
      }
      
      // 添加新的日志条目
      existingLogs.push(logEntry);
      
      // 写入文件
      fs.writeFileSync(logFilePath, JSON.stringify(existingLogs, null, 2), 'utf8');
      
      console.log('📝 请求日志已保存:', logFilePath);
      console.log('📊 当前日志条目数:', existingLogs.length);
      
    } catch (error) {
      console.error('❌ 保存请求日志失败:', error);
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