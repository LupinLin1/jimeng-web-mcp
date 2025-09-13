import axios from 'axios';
import * as crypto from 'crypto';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import crc32 from 'crc32';
import { generate_a_bogus } from './utils/a_bogus.js';
import { generateMsToken, toUrlParams, generateUuid, jsonEncode, urlEncode, unixTimestamp } from './utils/index.js';


// 模型映射
// jimeng-4.0 (seedream4.0) 的内部模型名称已通过网络请求分析确认
const MODEL_MAP: Record<string, string> = {
  // 图像生成模型 - 经过实际网络请求验证
  'jimeng-4.0': 'high_aes_general_v40', // 最新4.0模型，支持creation_agent模式
  'jimeng-3.1': 'high_aes_general_v30l_art_fangzhou:general_v3.0_18b',
  'jimeng-3.0': 'high_aes_general_v30l:general_v3.0_18b', // 支持creation_agent_v30模式
  'jimeng-2.1': 'high_aes_general_v21_L:general_v2.1_L',
  'jimeng-2.0-pro': 'high_aes_general_v20_L:general_v2.0_L',
  'jimeng-2.0': 'high_aes_general_v20:general_v2.0',
  'jimeng-1.4': 'high_aes_general_v14:general_v1.4',
  'jimeng-xl-pro': 'text2img_xl_sft',
  // 视频生成模型
  'jimeng-video-3.0-pro': 'dreamina_ic_generate_video_model_vgfm_3.0_pro',
  'jimeng-video-3.0': 'dreamina_ic_generate_video_model_vgfm_3.0',
  'jimeng-video-2.0': 'dreamina_ic_generate_video_model_vgfm_lite',
  'jimeng-video-2.0-pro': 'dreamina_ic_generate_video_model_vgfm1.0',
  // 智能多帧视频模型
  'jimeng-video-multiframe': 'dreamina_ic_generate_video_model_vgfm_3.0'
};


// 常量定义
const DEFAULT_MODEL = 'jimeng-4.0';
const DEFAULT_VIDEO_MODEL = 'jimeng-video-3.0';
const DEFAULT_BLEND_MODEL = 'jimeng-3.0';
const DRAFT_VERSION = '3.2.9';
const DEFAULT_ASSISTANT_ID = '513695'; // 从原始仓库中提取
const WEB_ID = Math.random() * 999999999999999999 + 7000000000000000000;
const USER_ID = generateUuid().replace(/-/g, '');
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// 宽高比预设选项
export interface AspectRatioPreset {
  name: string;
  ratio: number;
  displayName: string;
  imageRatio: number; // 即梦API内部的比例标识符
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { name: 'auto', ratio: 0, displayName: '智能', imageRatio: 1 },
  { name: '21:9', ratio: 21/9, displayName: '21:9', imageRatio: 8 },
  { name: '16:9', ratio: 16/9, displayName: '16:9', imageRatio: 3 },
  { name: '3:2', ratio: 3/2, displayName: '3:2', imageRatio: 7 },
  { name: '4:3', ratio: 4/3, displayName: '4:3', imageRatio: 4 },
  { name: '1:1', ratio: 1, displayName: '1:1', imageRatio: 1 },
  { name: '3:4', ratio: 3/4, displayName: '3:4', imageRatio: 2 },
  { name: '2:3', ratio: 2/3, displayName: '2:3', imageRatio: 6 },
  { name: '9:16', ratio: 9/16, displayName: '9:16', imageRatio: 5 }
];

// ============== Draft-based API 新类型定义 ==============

/**
 * Draft-based API 响应中的组件类型
 */
export interface DraftComponent {
  id: string;
  type: 'image' | 'text' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content?: {
    image_url?: string;
    large_images?: Array<{
      image_url: string;
      width: number;
      height: number;
    }>;
    text?: string;
    video_url?: string;
  };
  meta?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
  };
}

/**
 * Draft-based API 响应结构
 */
export interface DraftResponse {
  draft_id: string;
  status: 'processing' | 'completed' | 'failed';
  component_list: DraftComponent[];
  progress?: number;
  error_message?: string;
  created_at: number;
  updated_at: number;
}

/**
 * AIGC 模式定义
 */
export type AigcMode = 'creation_agent' | 'creation_agent_v30' | 'workbench';

/**
 * 生成类型定义
 */
export interface GenerationType {
  text2img: 1;
  img2img: 12;
  video: 2;
}

/**
 * 图像引用信息
 */
export interface ImageReference {
  type: 'image';
  id: string;
  source_from: 'upload' | 'generated';
  platform_type: number;
  name: string;
  image_uri: string;
  width: number;
  height: number;
  format: string;
  uri: string;
}

/**
 * 能力配置项
 */
export interface AbilityItem {
  type: string;
  id: string;
  name: string;
  image_uri_list?: string[];
  image_list?: ImageReference[];
  strength?: number;
  enabled?: boolean;
}

/**
 * 多参考图能力列表配置
 */
export interface AbilityConfig {
  name: string;
  enabled: boolean;
  max_count?: number;
}

/**
 * 增强的component_list支持
 */
export interface EnhancedComponent {
  type: string;
  id: string;
  min_version: string;
  aigc_mode: AigcMode;
  metadata: {
    type: string;
    id: string;
    created_platform: number;
    created_platform_version: string;
    created_time_in_ms: number;
    created_did: string;
  };
  generate_type: string;
  gen_type: number;
  abilities: {
    type: string;
    id: string;
    [key: string]: any; // 灵活支持不同类型的abilities
  };
}

// 图像尺寸计算工具
export class ImageDimensionCalculator {
  // 标准尺寸映射表（基于用户提供的精确规格）
  private static readonly STANDARD_DIMENSIONS: Record<string, { width: number; height: number }> = {
    '21:9': { width: 3024, height: 1296 },
    '16:9': { width: 2560, height: 1440 },
    '3:2': { width: 2496, height: 1664 },
    '4:3': { width: 2304, height: 1728 },
    '1:1': { width: 2048, height: 2048 },
    '3:4': { width: 1728, height: 2304 },
    '2:3': { width: 1664, height: 2496 },
    '9:16': { width: 1440, height: 2560 }
  };

  static calculateDimensions(aspectRatio: string = 'auto'): { width: number; height: number; imageRatio: number } {
    // 获取预设配置
    const preset = ASPECT_RATIO_PRESETS.find(p => p.name === aspectRatio);
    if (!preset) {
      throw new Error(`不支持的宽高比: ${aspectRatio}. 支持的值: ${ASPECT_RATIO_PRESETS.map(p => p.name).join(', ')}`);
    }

    // 智能模式特殊处理
    if (preset.name === 'auto') {
      return { width: 1024, height: 1024, imageRatio: preset.imageRatio };
    }

    // 直接使用固定表格，不做任何计算或限制
    const dimensions = this.STANDARD_DIMENSIONS[preset.name];
    if (!dimensions) {
      throw new Error(`未找到 ${aspectRatio} 的尺寸配置`);
    }

    return {
      width: dimensions.width,
      height: dimensions.height,
      imageRatio: preset.imageRatio
    };
  }

  static getPresetByName(name: string): AspectRatioPreset | undefined {
    return ASPECT_RATIO_PRESETS.find(p => p.name === name);
  }

  static getAllPresets(): AspectRatioPreset[] {
    return ASPECT_RATIO_PRESETS;
  }

  static getStandardDimensions(): Record<string, { width: number; height: number }> {
    return this.STANDARD_DIMENSIONS;
  }
}

// 分辨率类型判断工具
function getResolutionType(width: number, height: number): string {
  const maxDimension = Math.max(width, height);
  if (maxDimension <= 1024) {
    return '1k';
  } else if (maxDimension <= 1536) {
    return '1.5k';
  } else if (maxDimension <= 2048) {
    return '2k';
  } else if (maxDimension <= 2560) {
    return '2.5k';
  } else {
    return '3k';
  }
}

// 接口定义
interface LogoInfo {
  add_logo?: boolean; // 是否添加水印 默认不添加
  position?: number; // 0-右下角 1-左下角 2-左上角 3-右上角
  language?: number; // 0-中文（AI生成）1-英文（Generated by AI）
  opacity?: number; // 0-1 default: 0.3
  logo_text_content?: string; // 水印文字内容
}

interface ImageGenerationParams {
  filePath?: string | string[]; // 单个图片路径或多个参考图片路径数组
  model?: string; // 模型名称，默认使用 DEFAULT_MODEL
  prompt: string; // 提示词
  aspectRatio?: string; // 宽高比预设，如 '16:9', '9:16', 'auto' 等
  sample_strength?: number; // 精细度，默认0.5
  negative_prompt?: string; // 反向提示词，默认空
  refresh_token?: string; // 刷新令牌，必需
  req_key?: string; // 自定义参数，兼容旧接口
  // 新增blend模式参数
  blend_mode?: 'single' | 'multi'; // blend模式类型
  reference_strength?: number[]; // 每个参考图的强度（与filePath数组对应）
}

interface MultiFrameConfig {
  idx: number; // 帧索引
  duration_ms: number; // 帧持续时间（毫秒，范围：1000-5000ms，即1-5秒）
  prompt: string; // 该帧的提示词
  image_path: string; // 该帧的图片路径
}

interface VideoGenerationParams {
  filePath?: string[]; // 首帧和尾帧路径，支持数组（传统模式）
  multiFrames?: MultiFrameConfig[]; // 智能多帧配置（新模式，最多10帧）
  resolution?: string; // 分辨率 720p 1080p
  model?: string; // 模型名称，默认使用 DEFAULT_MODEL
  prompt: string; // 提示词（传统模式）或全局提示词（多帧模式）
  width?: number; // 图像宽度，默认1024
  height?: number; // 图像高度，默认1024
  fps?: number; // 帧率，默认24（多帧模式）
  duration_ms?: number; // 总时长（毫秒，多帧模式）
  video_aspect_ratio?: string; // 视频比例，如"3:4"（多帧模式）
  refresh_token?: string; // 刷新令牌，必需
  req_key?: string; // 自定义参数，兼容旧接口
}

export function generateCookie(refreshToken: string) {
  return [
    `_tea_web_id=${WEB_ID}`,
    `is_staff_user=false`,
    `store-region=cn-gd`,
    `store-region-src=uid`,
    `sid_guard=${refreshToken}%7C${unixTimestamp()}%7C5184000%7CMon%2C+03-Feb-2025+08%3A17%3A09+GMT`,
    `uid_tt=${USER_ID}`,
    `uid_tt_ss=${USER_ID}`,
    `sid_tt=${refreshToken}`,
    `sessionid=${refreshToken}`,
    `sessionid_ss=${refreshToken}`,
    `sid_tt=${refreshToken}`
  ].join("; ");
}

// 即梦API客户端类
class JimengApiClient {
  private refreshToken: string;
  private getUploadImageProofUrl = 'https://imagex.bytedanceapi.com/'

  constructor(token?: string) {
    this.refreshToken = token || process.env.JIMENG_API_TOKEN || '';
    if (!this.refreshToken) {
      throw new Error('JIMENG_API_TOKEN 环境变量未设置');
    }
  }

  /**
   * 获取模型映射
   * @param model 模型名称
   * @returns 映射后的模型名称
   */
  private getModel(model: string): string {
    const mappedModel = MODEL_MAP[model] || MODEL_MAP[DEFAULT_MODEL];
    console.log(`🔍 模型映射调试: ${model} -> ${mappedModel} (更新时间: ${new Date().toISOString()})`);
    return mappedModel;
  }

  /**
   * 发送请求到即梦API
   * @param method 请求方法
   * @param path 请求路径
   * @param data 请求数据
   * @param params 请求参数
   * @param headers 请求头
   * @returns 响应结果
   */
  private async request(
    method: string,
    path: string,
    data: any = {},
    params: any = {},
    headers: any = {}
  ): Promise<any> {
    const baseUrl = 'https://jimeng.jianying.com';
    const url = path.includes('https://') ? path : `${baseUrl}${path}`;
    const FAKE_HEADERS = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-language": "zh-CN,zh;q=0.9",
      "Cache-control": "no-cache",
      "Last-event-id": "undefined",
      Appid: DEFAULT_ASSISTANT_ID,
      Appvr: "5.8.0",
      Origin: "https://jimeng.jianying.com",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: "https://jimeng.jianying.com",
      Pf: "7",
      "Sec-Ch-Ua":
        '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": UA
    };
    const requestHeaders = {
      ...FAKE_HEADERS,
      'Cookie': generateCookie(this.refreshToken),
      ...headers
    };
    try {
      const response = await axios({
        method: method.toLowerCase(),
        url,
        data: method.toUpperCase() !== 'GET' ? data : undefined,
        params: method.toUpperCase() === 'GET' ? { ...data, ...params } : params,
        headers: requestHeaders,
        timeout: 60000
      });


      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`即梦API请求错误: ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error(`即梦API请求失败: ${error}`);
      }
    }
  }

  /**
   * 获取积分信息
   * @returns 积分信息
   */
  public async getCredit(): Promise<Record<string, number>> {
    const result = await this.request(
      'POST',
      '/commerce/v1/benefits/user_credit',
      {},
      {},
      { 'Referer': 'https://jimeng.jianying.com/ai-tool/image/generate' }
    );

    const credit = result.credit || {};
    const giftCredit = credit.gift_credit || 0;
    const purchaseCredit = credit.purchase_credit || 0;
    const vipCredit = credit.vip_credit || 0;

    return {
      giftCredit,
      purchaseCredit,
      vipCredit,
      totalCredit: giftCredit + purchaseCredit + vipCredit
    };
  }

  /**
   * 领取积分
   */
  public async receiveCredit(): Promise<void> {
    const credit = await this.request(
      'POST',
      '/commerce/v1/benefits/credit_receive',
      { 'time_zone': 'Asia/Shanghai' },
      {},
      { 'Referer': 'https://jimeng.jianying.com/ai-tool/image/generate' }
    );
    console.log("领取积分", credit)
  }

  /**
   * 即梦AI图像生成（支持批量生成）
   * @param params 图像生成参数
   * @returns 生成的图像URL列表
   */
  public async generateImage(params: ImageGenerationParams): Promise<string[]> {
    // 🔍 Debug logging - 记录API类方法调用
    console.log('🔍 [API Client] generateImage method called');
    console.log('🔍 [API Client] Token in this instance:', this.refreshToken ? '[PROVIDED]' : '[MISSING]');
    console.log('🔍 [API Client] Parameters received:', JSON.stringify({
      filePath: params.filePath,
      prompt: params.prompt ? `${params.prompt.substring(0, 50)}...` : undefined,
      model: params.model,
      aspectRatio: params.aspectRatio,
      sample_strength: params.sample_strength,
      negative_prompt: params.negative_prompt
    }, null, 2));
    
    return await this.generateImageWithBatch(params);
  }

  /**
   * 批量生成图像，支持自动继续生成
   * @param params 图像生成参数
   * @returns 生成的图像URL列表
   */
  private async generateImageWithBatch(params: ImageGenerationParams): Promise<string[]> {
    // 🔍 Debug logging - 记录批量生成方法入口
    console.log('🔍 [API Client] generateImageWithBatch called');
    console.log('🔍 [API Client] Full params object:', JSON.stringify(params, null, 2));
    
    // 参数验证
    console.log('🔍 [API Client] Validating parameters...');
    if (!params.prompt || typeof params.prompt !== 'string') {
      console.error('🔍 [API Client] Parameter validation failed: prompt is invalid');
      console.error('🔍 [API Client] prompt value:', params.prompt);
      console.error('🔍 [API Client] prompt type:', typeof params.prompt);
      throw new Error('prompt必须是非空字符串');
    }
    console.log('🔍 [API Client] Parameter validation passed');
    
    // 🔍 处理单个或多个文件上传
    const hasFilePath = Boolean(params?.filePath);
    let uploadResult = null;
    let uploadResults: Array<{uri: string, width: number, height: number, format: string}> = [];
    
    if (params?.filePath) {
      if (Array.isArray(params.filePath)) {
        // 多文件上传 - 增强blend模式
        console.log(`🔍 多文件上传模式，共${params.filePath.length}个文件`);
        for (const filePath of params.filePath) {
          const result = await this.uploadCoverFile(filePath);
          uploadResults.push(result);
        }
        // 为了兼容现有逻辑，使用第一个上传结果作为主要结果
        uploadResult = uploadResults[0];
        console.log(`🔍 多文件上传完成，主要图片: ${uploadResult.uri}`);
      } else {
        // 单文件上传 - 传统模式
        console.log('🔍 单文件上传模式');
        uploadResult = await this.uploadCoverFile(params.filePath);
        uploadResults = [uploadResult];
      }
    }
    
    // 获取实际模型 - 优先使用用户指定的模型，默认使用jimeng-4.0
    const modelName = params.model || DEFAULT_MODEL;
    const actualModel = this.getModel(modelName);
    
    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }

    // 第一次生成
    console.log('🔍 开始第一次图像生成请求...');
    const firstResult = await this.performSingleGeneration(params, actualModel, modelName, hasFilePath, uploadResult, uploadResults);
    let allResults: string[] = [...firstResult.imageUrls];
    const historyId = firstResult.historyId;
    let recordData = firstResult.recordData;
    
    if (!historyId) {
      throw new Error('未能获取历史记录ID');
    }

    console.log(`🔍 第一次生成完成，获得 ${firstResult.imageUrls.length} 张图片`);

    // 检查轮询过程中是否检测到需要继续生成
    if (firstResult.needsContinuation) {
      console.log('🔍 轮询过程中检测到需要继续生成，立即发送继续生成请求');
      try {
        const continuationResult = await this.performContinuationGeneration(
          params, 
          actualModel, 
          modelName, 
          hasFilePath, 
          null, 
          historyId, 
          allResults.length
        );
        
        allResults.push(...continuationResult.imageUrls);
        recordData = continuationResult.recordData;
        
        console.log(`🔍 继续生成完成，新增 ${continuationResult.imageUrls.length} 张图片，总计 ${allResults.length} 张`);
      } catch (error) {
        console.error(`🔍 继续生成失败:`, error);
      }
    }

    // 检查是否还需要继续生成（用于超过8张图片的情况）
    let continuationCount = 0;
    const maxContinuations = 10; // 最多继续生成10次，避免无限循环
    
    while (continuationCount < maxContinuations && this.shouldContinueGeneration(recordData, allResults.length)) {
      continuationCount++;
      console.log(`🔍 开始第${continuationCount + 1}次继续生成请求...`);
      
      try {
        const continuationResult = await this.performContinuationGeneration(
          params, 
          actualModel, 
          modelName, 
          hasFilePath, 
          null, 
          historyId, 
          allResults.length
        );
        
        allResults.push(...continuationResult.imageUrls);
        recordData = continuationResult.recordData;
        
        console.log(`🔍 第${continuationCount + 1}次继续生成完成，新增 ${continuationResult.imageUrls.length} 张图片，总计 ${allResults.length} 张`);
      } catch (error) {
        console.error(`🔍 第${continuationCount + 1}次继续生成失败:`, error);
        break;
      }
    }

    console.log(`🔍 批量生成完成，总共生成了 ${allResults.length} 张图片`);
    
    // 去重处理
    const deduplicatedResults = this.deduplicateImageUrls(allResults);
    if (deduplicatedResults.length !== allResults.length) {
      console.log(`⚠️ 检测到重复图片，已去重: ${allResults.length} -> ${deduplicatedResults.length}`);
    }
    
    return deduplicatedResults;
  }

  /**
   * 执行单次生成（第一次请求）
   */
  private async performSingleGeneration(
    params: ImageGenerationParams, 
    actualModel: string, 
    modelName: string, 
    hasFilePath: boolean, 
    uploadResult: {uri: string, width: number, height: number, format: string} | null,
    uploadResults?: Array<{uri: string, width: number, height: number, format: string}>
  ): Promise<{ imageUrls: string[], historyId: string | null, recordData: any, needsContinuation: boolean }> {
    // 使用统一方法构建请求数据
    const { rqData, rqParams } = this.buildGenerationRequestData(
      params, actualModel, modelName, hasFilePath, uploadResult, uploadResults
    );

    // 记录完整的提交请求内容
    console.log('🔍 图像生成请求参数:', JSON.stringify({ 
      requestedModel: modelName,
      actualModel,
      rqData: {
        extend: rqData.extend,
        draft_content_sample: rqData.draft_content.substring(0, 200) + '...'
      }
    }, null, 2));

    // 发送生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    // 🔍 检查是否为Draft-based响应（新AIGC模式）
    const draftId = result?.data?.draft_id || result?.data?.aigc_data?.draft_id;
    if (draftId) {
      console.log('🔍 检测到Draft-based响应，使用新轮询逻辑，Draft ID:', draftId);
      
      // 使用Draft-based轮询
      const draftResponse = await this.pollDraftResult(draftId);
      const imageUrls = this.extractImageUrlsFromDraft(draftResponse);
      
      // 保存Draft调试数据
      const debugData = {
        timestamp: new Date().toISOString(),
        requestedModel: modelName,
        actualModel,
        draftResponse,
        originalResult: result,
        mode: 'draft-based'
      };
      
      const fs = await import('fs');
      const debugFileName = `debug-draft-response-${modelName}-${Date.now()}.json`;
      fs.writeFileSync(debugFileName, JSON.stringify(debugData, null, 2));
      console.log('🔍 Draft响应数据已保存到:', debugFileName);
      
      return {
        imageUrls,
        historyId: draftId, // 使用Draft ID作为历史记录ID
        recordData: draftResponse,
        needsContinuation: false // Draft模式不需要继续生成逻辑
      };
    }

    console.log('🔍 使用传统轮询逻辑');
    // 第一次生成不需要增量，传入0作为lastItemCount
    const pollResult = await this.pollResultWithHistoryExtended(result, 0);
    const itemList = pollResult.itemList;
    const recordData = pollResult.recordData;
    const needsContinuation = pollResult.needsContinuation;
    
    // 保存完整的返回数据到文件中以供分析
    const debugData = {
      timestamp: new Date().toISOString(),
      requestedModel: modelName,
      actualModel,
      pollResult: itemList,
      originalResult: result,
      recordData: recordData
    };
    
    const fs = await import('fs');
    const debugFileName = `debug-jimeng-response-${modelName}-${Date.now()}.json`;
    fs.writeFileSync(debugFileName, JSON.stringify(debugData, null, 2));
    console.log('🔍 完整返回数据已保存到:', debugFileName);

    // 提取图片URL
    const imageUrls = this.extractImageUrls(itemList);
    
    return {
      imageUrls,
      historyId: result?.data?.aigc_data?.history_record_id || null,
      recordData,
      needsContinuation
    };
  }

  /**
   * 执行继续生成请求
   */
  private async performContinuationGeneration(
    params: ImageGenerationParams, 
    actualModel: string, 
    modelName: string, 
    hasFilePath: boolean, 
    uploadID: string | null,
    historyId: string,
    currentItemCount: number = 0
  ): Promise<{ imageUrls: string[], recordData: any }> {
    // 使用统一方法构建继续生成请求数据
    const { rqData, rqParams } = this.buildGenerationRequestData(
      params, actualModel, modelName, hasFilePath, null, undefined, historyId, true
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

    // 继续生成时传入当前已有的项目数量，实现增量返回
    const pollResult = await this.pollResultWithHistoryExtended(result, currentItemCount);
    const itemList = pollResult.itemList;
    const recordData = pollResult.recordData;

    // 提取图片URL
    const imageUrls = this.extractImageUrls(itemList);
    
    return {
      imageUrls,
      recordData
    };
  }

  /**
   * 判断是否需要继续生成
   */
  private shouldContinueGeneration(recordData: any, currentCount: number): boolean {
    if (!recordData) {
      console.log('🔍 无recordData，停止继续生成');
      return false;
    }
    
    // 检查是否有未完成的图片数量指示
    const finishedCount = recordData.finished_image_count || 0;
    const totalCount = recordData.total_image_count || 0;
    const taskStatus = recordData.status;
    const confirmStatus = recordData.confirm_status;
    
    console.log(`🔍 生成状态检查: finished_image_count=${finishedCount}, total_image_count=${totalCount}, currentCount=${currentCount}, status=${taskStatus}, confirm_status=${confirmStatus}`);
    
    // 如果任务失败，不继续
    if (taskStatus === 30) {
      console.log('🔍 任务状态为30（失败），停止继续生成');
      return false;
    }
    
    // 修复的主要判断条件：只有当totalCount大于4且当前数量小于总数时才继续生成
    // 这避免了在获得标准4张图片时进行不必要的继续生成请求
    if (totalCount > 4 && currentCount < totalCount) {
      console.log(`🔍 需要继续生成: 目标${totalCount}张(>4张)，已获得${currentCount}张`);
      return true;
    }
    
    // 如果totalCount <= 4，说明是标准生成，不需要继续
    if (totalCount <= 4) {
      console.log(`🔍 标准生成完成: 总数${totalCount}张(<=4张)，已获得${currentCount}张，无需继续生成`);
      return false;
    }
    
    console.log('🔍 所有条件都不满足，停止继续生成');
    return false;
  }


  /**
   * 构建通用的生成请求数据
   * @param params 图像生成参数
   * @param actualModel 实际模型名称
   * @param modelName 请求的模型名称
   * @param hasFilePath 是否有文件路径
   * @param uploadID 上传文件ID
   * @param historyId 历史记录ID（继续生成时使用）
   * @param isContinuation 是否是继续生成请求
   */
  private buildGenerationRequestData(
    params: ImageGenerationParams,
    actualModel: string,
    modelName: string,
    hasFilePath: boolean,
    uploadResult: {uri: string, width: number, height: number, format: string} | null,
    uploadResults?: Array<{uri: string, width: number, height: number, format: string}>,
    historyId?: string,
    isContinuation: boolean = false
  ): { rqData: any, rqParams: any } {
    // 生成组件ID
    const componentId = generateUuid();
    
    // 计算基于宽高比的尺寸
    console.log('🔍 [API Client] Calculating dimensions for aspectRatio:', params.aspectRatio || 'auto');
    
    try {
      const dimensions = ImageDimensionCalculator.calculateDimensions(params.aspectRatio || 'auto');
      const { width, height, imageRatio } = dimensions;
      
      console.log(`🔍 [API Client] Dimension calculation successful:`);
      console.log(`🔍 [API Client] - Input aspectRatio: ${params.aspectRatio || 'auto'}`);
      console.log(`🔍 [API Client] - Calculated width: ${width}`);
      console.log(`🔍 [API Client] - Calculated height: ${height}`);
      console.log(`🔍 [API Client] - Calculated imageRatio: ${imageRatio}`);
    } catch (dimensionError) {
      console.error('🔍 [API Client] Dimension calculation failed:');
      console.error('🔍 [API Client] Error:', dimensionError);
      console.error('🔍 [API Client] aspectRatio value:', params.aspectRatio);
      throw dimensionError;
    }
    
    const dimensions = ImageDimensionCalculator.calculateDimensions(params.aspectRatio || 'auto');
    const { width, height, imageRatio } = dimensions;
    
    console.log(`🔍 使用宽高比: ${params.aspectRatio || 'auto'}，计算尺寸: ${width}x${height}`);

    let abilities: Record<string, any> = {};
    if (hasFilePath) {
      abilities = {
        "blend": {
          "type": "",
          "id": generateUuid(),
          "min_features": [],
          "core_param": {
            "type": "",
            "id": generateUuid(),
            "model": actualModel,
            "prompt": "####" + params.prompt,
            "sample_strength": params.sample_strength || 0.5,
            "image_ratio": imageRatio,
            "large_image_info": {
              "type": "",
              "id": generateUuid(),
              "height": height,
              "width": width,
              "resolution_type": getResolutionType(width, height)
            },
            "intelligent_ratio": false
          },
          "ability_list": this.buildEnhancedAbilityList(
            uploadResults || [uploadResult!], 
            params.sample_strength || 0.5
          ),
          "history_option": {
            "type": "",
            "id": generateUuid(),
          },
          "prompt_placeholder_info_list": (uploadResults || [uploadResult!]).map((_, index) => ({
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
      }
    } else {
      abilities = {
        "generate": {
          "type": "",
          "id": generateUuid(),
          "core_param": {
            "type": "",
            "id": generateUuid(),
            "model": actualModel,
            "prompt": "####" + params.prompt,
            "negative_prompt": params.negative_prompt || "",
            "seed": Math.floor(Math.random() * 100000000) + 2500000000,
            "sample_strength": params.sample_strength || 0.5,
            "image_ratio": imageRatio,
            "large_image_info": {
              "type": "",
              "id": generateUuid(),
              "height": height,
              "width": width,
              "resolution_type": getResolutionType(width, height)
            },
            "intelligent_ratio": false
          },
          "history_option": {
            "type": "",
            "id": generateUuid(),
          }
        }
      }
    }

    // 🔍 确定AIGC模式 - 根据模型名称选择适当的模式
    let aigcMode: AigcMode = "workbench";
    let generateType: 1 | 12 | 2 = hasFilePath ? 12 : 1; // 12: img2img, 1: text2img
    
    // 新模型使用creation_agent模式
    if (modelName === 'jimeng-4.0' || actualModel.includes('v40')) {
      aigcMode = "creation_agent";
      console.log('🔍 使用creation_agent模式（jimeng-4.0）');
    } else if (modelName === 'jimeng-3.0' || actualModel.includes('v30')) {
      aigcMode = "creation_agent_v30";
      console.log('🔍 使用creation_agent_v30模式（jimeng-3.0）');
    } else {
      aigcMode = "workbench";
      console.log('🔍 使用传统workbench模式');
    }

    const baseData: any = {
      "extend": {
        "root_model": actualModel,
        "template_id": "",
      },
      "submit_id": generateUuid(),
      "metrics_extra": hasFilePath ? undefined : jsonEncode({
        "templateId": "",
        "generateCount": 1,
        "promptSource": "custom",
        "templateSource": "",
        "lastRequestId": "",
        "originRequestId": "",
      }),
      "draft_content": jsonEncode({
        "type": "draft",
        "id": generateUuid(),
        "min_version": DRAFT_VERSION,
        "is_from_tsn": true,
        "version": "3.2.9",
        "main_component_id": componentId,
        "component_list": [{
          "type": "image_base_component",
          "id": componentId,
          "min_version": DRAFT_VERSION,
          "aigc_mode": aigcMode,
          "metadata": {
            "type": "",
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now(),
            "created_did": ""
          },
          "generate_type": hasFilePath ? "blend" : "generate",
          "gen_type": generateType, // 数字类型：1=text2img, 12=img2img, 2=video
          "abilities": {
            "type": "",
            "id": generateUuid(),
            ...abilities
          }
        }]
      }),
    };

    // 如果是继续生成请求，添加特有字段
    if (isContinuation && historyId) {
      baseData.action = 2;
      baseData.history_id = historyId;
    }

    const rqParams = {
      "babi_param": urlEncode(jsonEncode({
        "scenario": "image_video_generation",
        "feature_key": hasFilePath ? "to_image_referenceimage_generate" : "aigc_to_image",
        "feature_entrance": "to_image",
        "feature_entrance_detail": hasFilePath ? "to_image-referenceimage-byte_edit" : `to_image-${actualModel}`,
      })),
      "aid": parseInt(DEFAULT_ASSISTANT_ID),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "web_component_open_flag": 1
    };

    return {
      rqData: baseData,
      rqParams: rqParams
    };
  }

  /**
   * 构建增强的ability_list，支持多参考图像
   */
  private buildEnhancedAbilityList(
    uploadResults: Array<{uri: string, width: number, height: number, format: string}>,
    strength: number = 0.5
  ): AbilityItem[] {
    const abilityList: AbilityItem[] = [];
    
    for (let i = 0; i < uploadResults.length; i++) {
      const uploadResult = uploadResults[i];
      const ability: AbilityItem = {
        type: "",
        id: generateUuid(),
        name: "byte_edit",
        image_uri_list: [uploadResult.uri],
        image_list: [{
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
        }],
        strength: strength,
        enabled: true
      };
      abilityList.push(ability);
    }
    
    console.log(`🔍 构建了 ${abilityList.length} 个ability项，支持多参考图像`);
    return abilityList;
  }

  /**
   * 构建增强的component结构，支持新的AIGC模式
   */
  private buildEnhancedComponent(
    componentId: string,
    aigcMode: AigcMode,
    generateType: string,
    genType: number,
    abilities: any
  ): EnhancedComponent {
    return {
      type: "image_base_component",
      id: componentId,
      min_version: DRAFT_VERSION,
      aigc_mode: aigcMode,
      metadata: {
        type: "",
        id: generateUuid(),
        created_platform: 3,
        created_platform_version: "",
        created_time_in_ms: Date.now(),
        created_did: ""
      },
      generate_type: generateType,
      gen_type: genType,
      abilities: {
        type: "",
        id: generateUuid(),
        ...abilities
      }
    };
  }

  /**
   * 构建智能多帧视频生成请求数据
   */
  private async buildMultiFrameVideoRequest(params: VideoGenerationParams, actualModel: string): Promise<{ rqData: any, rqParams: any }> {
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
    const metricsExtra = jsonEncode({
      "isDefaultSeed": 1,
      "originSubmitId": generateUuid(),
      "isRegenerate": false,
      "enterFrom": "click",
      "functionMode": "multi_frame"
    });

    const rqParams: {
      [key: string]: string | number
    } = {
      msToken: generateMsToken(),
      aigc_features: "app_lip_sync",
      web_version: "6.6.0",
      "da_version": "3.2.9",
      "aid": parseInt(DEFAULT_ASSISTANT_ID),
      "device_platform": "web", 
      "region": "cn",
      "webId": WEB_ID,
      "web_component_open_flag": 1
    };

    rqParams['a_bogus'] = generate_a_bogus(toUrlParams(rqParams), UA);

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
      "draft_content": jsonEncode({
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
        "aid": parseInt(DEFAULT_ASSISTANT_ID)
      }
    };

    return {
      rqData,
      rqParams
    };
  }

  /**
   * 去重图片URL列表，基于图片ID
   */
  private deduplicateImageUrls(urls: string[]): string[] {
    const seen = new Set<string>();
    const uniqueUrls: string[] = [];
    
    for (const url of urls) {
      // 提取图片ID（URL中的关键标识符）
      const match = url.match(/([a-f0-9]{32})/);
      const imageId = match ? match[1] : url;
      
      if (!seen.has(imageId)) {
        seen.add(imageId);
        uniqueUrls.push(url);
      }
    }
    
    console.log(`🔍 去重结果: 原始${urls.length}张 -> 去重后${uniqueUrls.length}张`);
    return uniqueUrls;
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
   * 扩展的轮询方法，返回更多详细信息
   * @param result 初始请求结果
   * @param lastItemCount 上次轮询时的项目数量，用于增量返回（可选）
   */
  async pollResultWithHistoryExtended(result: any, lastItemCount: number = 0): Promise<{ itemList: any[], recordData: any, needsContinuation: boolean }> {
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
    let itemList: any[] = [];
    let recordData: any = null;
    let pollCount = 0;
    let needsContinuation = false; // 是否需要继续生成
    const maxPollCount = 20; // 最多轮询20次

    console.log('🔍 开始轮询，historyId:', historyId);
    
    while ((status === 20 || status === 45 || status === 42) && pollCount < maxPollCount) {
      pollCount++;
      // 根据状态码调整等待时间：status=45需要更长等待时间，status=42可能是错误或特殊处理状态
      let waitTime;
      if (status === 45) {
        // status=45可能是排队或处理中，需要更长等待时间
        waitTime = pollCount === 1 ? 30000 : 10000; // 第一次30秒，后续10秒
      } else if (status === 42) {
        // status=42可能是错误或特殊处理状态，适中的等待时间
        waitTime = pollCount === 1 ? 15000 : 8000; // 第一次15秒，后续8秒
      } else {
        // status=20正常处理中
        waitTime = pollCount === 1 ? 20000 : 5000; // 第一次20秒，后续5秒
      }
      
      console.log(`🔍 轮询第 ${pollCount} 次，状态=${status}，等待 ${waitTime/1000} 秒...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      const result = await this.request(
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
            "aid": parseInt(DEFAULT_ASSISTANT_ID)
          }
        }
      );

      const record = result?.data?.[historyId];
      if (!record) {
        throw new Error('记录不存在');
      }
      status = record.status;
      failCode = record.fail_code;
      recordData = record; // 保存完整的记录数据

      console.log(`🔍 轮询状态: status=${status}, failCode=${failCode}, itemList长度=${record.item_list?.length || 0}`);
      console.log(`🔍 详细状态: total_image_count=${record.total_image_count}, finished_image_count=${record.finished_image_count}, confirm_status=${record.confirm_status}`);

      // 检测是否需要继续生成：当total_image_count > 4时
      const totalCount = record.total_image_count || 0;
      if (totalCount > 4 && !needsContinuation) {
        console.log('🔍 检测到需要生成超过4张图片，标记需要继续生成');
        needsContinuation = true;
      }

      if (status === 30) {
        if (failCode === '2038') {
          throw new Error('内容被过滤');
        }
        throw new Error('生成失败');
      }
      
      // 检查是否本轮生成完成：等待达到批次大小或特定状态
      if (record.item_list && record.item_list.length > 0) {
        const currentItemList = record.item_list as any[];
        const finishedCount = record.finished_image_count || 0;
        const totalCount = record.total_image_count || 0;
        
        console.log(`🔍 当前状态检查: item_list长度=${currentItemList.length}, finished_count=${finishedCount}, total_count=${totalCount}, status=${status}`);
        
        // 检测是否为视频生成（通过finished_image_count和total_image_count都为0来判断）
        const isVideoGeneration = finishedCount === 0 && totalCount === 0 && currentItemList.length > 0;
        
        if (isVideoGeneration) {
          console.log(`🔍 检测到视频生成模式: status=${status}, itemList长度=${currentItemList.length}`);
        }
        
        // 按照用户指导修改判断逻辑：等待合适的条件才提取URL
        const isBatchComplete = 
          // 视频生成完成条件：status=50且有itemList项目
          (isVideoGeneration && status === 50 && currentItemList.length > 0) ||
          // 条件1: 达到了一个批次的大小（4张图片），且状态稳定
          (currentItemList.length >= 4 && status !== 20 && status !== 45 && status !== 42) ||
          // 条件2: finished_image_count达到了total_image_count（全部完成）
          (totalCount > 0 && finishedCount >= totalCount) ||
          // 条件3: 对于小批次（<=4张），等待所有状态指示完成
          (totalCount > 0 && totalCount <= 4 && finishedCount >= totalCount && status !== 20) ||
          // 条件4: 当检测到需要继续生成且已达到批次上限（4张）时，立即完成当前批次
          (needsContinuation && currentItemList.length >= 4 && finishedCount >= 4);
          
        if (isBatchComplete) {
          // 实现增量返回：只返回新增的图片项目
          const incrementalItems = currentItemList.slice(lastItemCount);
          
          console.log('🔍 本轮生成完成，返回结果');
          console.log(`🔍 总项目数: ${currentItemList.length}, 上次数量: ${lastItemCount}, 新增项目: ${incrementalItems.length}`);
          console.log(`🔍 完成条件: item_list长度=${currentItemList.length}, finished=${finishedCount}, total=${totalCount}, status=${status}`);
          
          return { itemList: incrementalItems, recordData, needsContinuation };
        } else {
          console.log('🔍 本轮生成未完成，继续轮询...');
          console.log(`🔍 等待条件: item_list长度=${currentItemList.length}, finished=${finishedCount}, total=${totalCount}, status=${status}`);
        }
      }
      
      // 如果状态不再是处理中，但也没有结果，可能需要继续轮询其他状态
      if (status !== 20 && status !== 45) {
        console.log(`🔍 遇到新状态 ${status}，继续轮询...`);
      }
    }
    
    if (pollCount >= maxPollCount) {
      console.log('🔍 轮询超时，但状态仍为20，返回空数组');
    }
    return { itemList: [], recordData, needsContinuation }
  }

  async pollResultWithHistory(result: any): Promise<any[]> {
    const extendedResult = await this.pollResultWithHistoryExtended(result, 0);
    return extendedResult.itemList;
  }
  /**
   * Draft-based API 轮询方法
   * 用于新的AIGC模式（creation_agent）的响应处理
   */
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

  /**
   * 从Draft响应中提取图片URL
   */
  private extractImageUrlsFromDraft(draftResponse: DraftResponse): string[] {
    console.log('🔍 从Draft提取图片URL，组件数量:', draftResponse.component_list?.length || 0);

    const imageUrls: string[] = [];
    
    for (const component of draftResponse.component_list || []) {
      if (component.type === 'image' && component.status === 'completed') {
        // 尝试多种可能的URL路径
        let imageUrl = component.content?.image_url;
        
        // 如果有large_images数组，优先使用
        if (component.content?.large_images?.length) {
          imageUrl = component.content.large_images[0].image_url;
        }
        
        if (imageUrl) {
          console.log(`🔍 提取到图片URL:`, imageUrl);
          imageUrls.push(imageUrl);
        }
      }
    }
    
    console.log(`🔍 从Draft总计提取到 ${imageUrls.length} 张图片`);
    return imageUrls;
  }

  /**
  * 获取上传凭证所需Ak和Tk
  */
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
        if (
          !authRes.data
        ) {
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

  public async getFileContent(filePath: string): Promise<Buffer> {
    try {
      if (filePath.includes('https://') || filePath.includes('http://')) {
        // 直接用axios获取图片Buffer
        const res = await axios.get(filePath, { responseType: 'arraybuffer' });
        return Buffer.from(res.data);
      } else {
        // 确保路径是绝对路径
        const absolutePath = path.resolve(filePath);
        // 读取文件内容
        return await fs.promises.readFile(absolutePath);
      }
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error(`读取文件失败: filePath`);
    }
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

  /**
  * 生成请求所需Header
  */
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

  /**
   * 生成请求所需Header
   */
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
        // @ts-ignore
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

  /**
   * 获取credentialString
   */
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

  /**
   * 生成http请求参数字符串
   */
  private httpBuildQuery(params: any): string {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      if (params?.hasOwnProperty(key)) {
        searchParams.append(key, params[key]);
      }
    }
    return searchParams.toString();
  }

  private signedHeaders(requestHeaders: any): string {
    const headers: string[] = [];
    Object.keys(requestHeaders).forEach(function (r) {
      r = r.toLowerCase();
      headers.push(r);
    });
    return headers.sort().join(';');
  }


  /**
   * 生成canonicalString
   */
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

  /**
   * 上传文件到远程服务器
   * @param url 上传地址
   * @param fileContent 文件内容
   * @param headers 请求头
   * @param method HTTP 方法
   * @param proxy
   */
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

  /**
   * 从图片文件获取元数据 (宽度、高度、格式)
   */
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


        // 获取图片上传凭证
        const uploadImgRes = await this.request(
          'GET',
          this.getUploadImageProofUrl + '?' +
          this.httpBuildQuery(getUploadImageProofRequestParams),
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
            // 'X-Storage-U': '3674996648187204',
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
          // user_id: userUid,
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
          this.getUploadImageProofUrl +
          '?' +
          this.httpBuildQuery(commitImgParams),
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

  /**
   * 生成智能多帧视频
   */
  private async generateMultiFrameVideo(params: VideoGenerationParams, actualModel: string): Promise<string> {
    console.log('🔍 开始智能多帧视频生成...');
    
    // 使用多帧请求构建器
    const { rqData, rqParams } = await this.buildMultiFrameVideoRequest(params, actualModel);
    
    console.log('🔍 多帧视频生成请求参数:', {
      model: actualModel,
      frameCount: params.multiFrames?.length,
      aspectRatio: params.video_aspect_ratio,
      duration: params.duration_ms
    });
    
    // 发送生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    // 使用扩展的轮询方法来获取详细数据
    const pollResult = await this.pollResultWithHistoryExtended(result, 0);
    const itemList = pollResult.itemList;
    
    // 保存完整的视频返回数据到文件中以供分析
    const debugData = {
      timestamp: new Date().toISOString(),
      requestType: 'multiframe-video',
      actualModel,
      pollResult: itemList,
      originalResult: result,
      recordData: pollResult.recordData
    };
    
    const fs = await import('fs');
    const debugFileName = `debug-jimeng-video-response-${Date.now()}.json`;
    fs.writeFileSync(debugFileName, JSON.stringify(debugData, null, 2));
    console.log('🔍 完整视频返回数据已保存到:', debugFileName);
    
    // 尝试多种可能的视频URL路径
    let videoUrl;
    if (itemList && itemList.length > 0) {
      const item = itemList[0];
      console.log('🔍 检查视频数据结构 keys:', Object.keys(item || {}));
      
      // 尝试不同的URL路径
      videoUrl = item?.video?.transcoded_video?.origin?.video_url ||
                item?.video?.video_url ||
                item?.video?.origin?.video_url ||
                item?.common_attr?.cover_url ||
                item?.aigc_video_params?.video_url ||
                item?.url ||
                item?.video_url;
      
      console.log('🔍 尝试的URL路径结果:', {
        'video?.transcoded_video?.origin?.video_url': item?.video?.transcoded_video?.origin?.video_url,
        'video?.video_url': item?.video?.video_url,
        'video?.origin?.video_url': item?.video?.origin?.video_url,
        'common_attr?.cover_url': item?.common_attr?.cover_url,
        'aigc_video_params?.video_url': item?.aigc_video_params?.video_url,
        'url': item?.url,
        'video_url': item?.video_url
      });
      
      // 如果还没有找到URL，尝试深度遍历
      if (!videoUrl && item?.video) {
        console.log('🔍 深度检查 video 对象 keys:', Object.keys(item.video || {}));
        if (item.video.transcoded_video) {
          console.log('🔍 检查 transcoded_video keys:', Object.keys(item.video.transcoded_video || {}));
        }
      }
    } else {
      console.log('🔍 警告: itemList为空或长度为0');
    }
    
    console.log('🔍 多帧视频生成结果:', videoUrl);
    return videoUrl;
  }

  async generateVideo(params: VideoGenerationParams): Promise<string> {
    if (!params.prompt || typeof params.prompt !== 'string') {
      throw new Error('prompt必须是非空字符串');
    }
    
    // 检测是否为多帧模式
    const isMultiFrameMode = params.multiFrames && params.multiFrames.length > 0;
    const modelName = params.model || (isMultiFrameMode ? 'jimeng-video-multiframe' : DEFAULT_VIDEO_MODEL);
    const actualModel = this.getModel(modelName);
    
    console.log(`🔍 视频生成模式: ${isMultiFrameMode ? '智能多帧' : '传统模式'}`);
    console.log(`🔍 使用模型: ${modelName} -> ${actualModel}`);
    
    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }
    
    // 根据模式选择不同的处理逻辑
    if (isMultiFrameMode) {
      return this.generateMultiFrameVideo(params, actualModel);
    }
    
    // 传统单帧/首尾帧模式的处理逻辑保持不变
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
    const metricsExtra = jsonEncode({
      "enterFrom": "click",
      "isDefaultSeed": 1,
      "promptSource": "custom",
      "isRegenerate": false,
      "originSubmitId": generateUuid(),
    })
    const rqParams: {
      [key: string]: string | number
    } = {
      msToken: generateMsToken(),
      aigc_features: "app_lip_sync",
      web_version: "6.6.0",
      "da_version": "3.2.9",
      "aid": parseInt(DEFAULT_ASSISTANT_ID),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "web_component_open_flag": 1
    }
    rqParams['a_bogus'] = generate_a_bogus(toUrlParams(rqParams), UA)
    const rqData = {
      "extend": {
        "root_model": end_frame_image ? MODEL_MAP['jimeng-video-3.0'] : actualModel,
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
      "draft_content": jsonEncode({
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
    }
    // 发送生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    const itemList = await this.pollResultWithHistory(result);
    const videoUrl = itemList?.[0]?.video?.transcoded_video?.origin?.video_url
    console.log('生成视频结果:', videoUrl);

    return videoUrl;
  }

  /**
   * 视频补帧方法 - 将低帧率视频提升至30fps或60fps
   * 
   * 功能说明：
   * - 对已生成的视频进行帧插值处理，提升视频播放流畅度
   * - 支持24fps→30fps或24fps→60fps的帧率提升
   * - 使用AI技术生成中间帧，保持视频内容连贯性
   * 
   * @param params 补帧参数
   * @param params.videoId 原始视频ID
   * @param params.originHistoryId 原始生成历史ID
   * @param params.targetFps 目标帧率，支持30或60
   * @param params.originFps 原始视频帧率
   * @param params.duration 视频时长（毫秒），可选
   * @returns 处理后的高帧率视频URL
   */
  async frameInterpolation(params: FrameInterpolationParams): Promise<string> {
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
    const rqParams: any = {
      "babi_param": urlEncode(jsonEncode({
        "scenario": "image_video_generation",
        "feature_key": "aigc_to_video", 
        "feature_entrance": "to_video",
        "feature_entrance_detail": "to_video-jimeng-video-multiframe"
      })),
      "aid": parseInt(DEFAULT_ASSISTANT_ID),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "web_component_open_flag": 1
    };
    rqParams['a_bogus'] = generate_a_bogus(toUrlParams(rqParams), UA);

    // 发送补帧请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      requestData,
      rqParams
    );

    console.log('🔍 开始轮询补帧结果...');
    const pollResult = await this.pollResultWithHistoryExtended(result);
    const itemList = pollResult.itemList;
    
    // 提取视频URL
    let videoUrl;
    if (itemList && itemList.length > 0) {
      const item = itemList[0];
      videoUrl = item?.video?.transcoded_video?.origin?.video_url ||
                item?.video?.video_url ||
                item?.common_attr?.cover_url;
    }

    console.log('🎬 补帧处理完成:', videoUrl);
    return videoUrl;
  }

  /**
   * 视频分辨率提升方法 - 将低分辨率视频提升至更高分辨率
   * 
   * 功能说明：
   * - 对已生成的视频进行超分辨率处理，提升视频画质和清晰度
   * - 支持将视频分辨率提升至原来的2倍或更高（如704x1248 → 1408x2496）
   * - 使用AI技术重建视频细节，保持画面质量和内容完整性
   * 
   * @param params 分辨率提升参数
   * @param params.videoId 原始视频ID
   * @param params.originHistoryId 原始生成历史ID  
   * @param params.targetWidth 目标宽度
   * @param params.targetHeight 目标高度
   * @param params.originWidth 原始宽度
   * @param params.originHeight 原始高度
   * @returns 处理后的高分辨率视频URL
   */
  async superResolution(params: SuperResolutionParams): Promise<string> {
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
    const rqParams: any = {
      "babi_param": urlEncode(jsonEncode({
        "scenario": "image_video_generation",
        "feature_key": "aigc_to_video",
        "feature_entrance": "to_video", 
        "feature_entrance_detail": "to_video-jimeng-video-multiframe"
      })),
      "aid": parseInt(DEFAULT_ASSISTANT_ID),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "web_component_open_flag": 1
    };
    rqParams['a_bogus'] = generate_a_bogus(toUrlParams(rqParams), UA);

    // 发送分辨率提升请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      requestData,
      rqParams
    );

    console.log('🔍 开始轮询分辨率提升结果...');
    const pollResult = await this.pollResultWithHistoryExtended(result);
    const itemList = pollResult.itemList;
    
    // 提取视频URL
    let videoUrl;
    if (itemList && itemList.length > 0) {
      const item = itemList[0];
      videoUrl = item?.video?.transcoded_video?.origin?.video_url ||
                item?.video?.video_url ||
                item?.common_attr?.cover_url;
    }

    console.log('🎨 分辨率提升完成:', videoUrl);
    return videoUrl;
  }

}

// 创建API客户端实例，确保环境变量正确加载
const getApiClient = () => {
  const token = process.env.JIMENG_API_TOKEN;
  console.log('🔍 [API Client Factory] Creating API client instance');
  console.log('🔍 [API Client Factory] Environment token available:', !!token);
  
  if (!token) {
    console.error('🔍 [API Client Factory] WARNING: JIMENG_API_TOKEN not found in environment variables');
    console.error('🔍 [API Client Factory] Available env vars starting with JIMENG:', 
      Object.keys(process.env).filter(key => key.startsWith('JIMENG')));
  }
  
  return new JimengApiClient(token);
};

// 延迟初始化API客户端实例
let apiClient: JimengApiClient | null = null;


// 导出函数，保持对外接口不变

/**
 * 生成AI图像
 * @param params 图像生成参数
 * @returns 返回生成的图像URL数组
 */
export const generateImage = (params: ImageGenerationParams): Promise<string[]> => {
  // 🔍 Debug logging - 记录API入口参数
  console.log('🔍 [API Export] generateImage called with params:', JSON.stringify({
    filePath: params.filePath,
    prompt: params.prompt ? `${params.prompt.substring(0, 100)}...` : undefined,
    model: params.model,
    aspectRatio: params.aspectRatio,
    sample_strength: params.sample_strength,
    negative_prompt: params.negative_prompt,
    refresh_token: params.refresh_token ? '[PROVIDED]' : '[MISSING]'
  }, null, 2));

  // 延迟初始化API客户端
  if (!apiClient) {
    console.log('🔍 [API Export] Initializing API client on first use');
    apiClient = getApiClient();
  }

  // 🔍 Debug logging - 检查API客户端实例状态
  console.log('🔍 [API Export] API Client instance available:', !!apiClient);
  
  return apiClient.generateImage(params);
};

/**
 * 生成AI视频
 * 支持传统模式（首尾帧）和智能多帧模式
 * @param params 视频生成参数
 * @returns 返回生成的视频URL
 */
export const generateVideo = (params: VideoGenerationParams): Promise<string> => {
  // 延迟初始化API客户端
  if (!apiClient) {
    console.log('🔍 [API Export] Initializing API client for generateVideo');
    apiClient = getApiClient();
  }
  
  return apiClient.generateVideo(params)
}

// 视频后处理参数接口
export interface VideoPostProcessParams {
  videoId: string;
  originHistoryId: string;
}

export interface FrameInterpolationParams extends VideoPostProcessParams {
  targetFps: 30 | 60;
  originFps: number;
  duration?: number;
}

export interface SuperResolutionParams extends VideoPostProcessParams {
  targetWidth: number; // 范围768-2560像素
  targetHeight: number; // 范围768-2560像素
  originWidth: number;
  originHeight: number;
}

/**
 * 视频补帧操作
 * 将低帧率视频提升至30fps或60fps，提升视频流畅度
 * @param params 补帧参数，包含视频ID、目标帧率等信息
 * @returns 返回处理后的高帧率视频URL
 */
export const frameInterpolation = (params: FrameInterpolationParams): Promise<string> => {
  // 延迟初始化API客户端
  if (!apiClient) {
    console.log('🔍 [API Export] Initializing API client for frameInterpolation');
    apiClient = getApiClient();
  }
  
  return apiClient.frameInterpolation(params);
};

/**
 * 视频分辨率提升操作
 * 将低分辨率视频提升至更高分辨率，增强视频画质
 * @param params 分辨率提升参数，包含原始和目标分辨率信息
 * @returns 返回处理后的高分辨率视频URL
 */
export const superResolution = (params: SuperResolutionParams): Promise<string> => {
  // 延迟初始化API客户端
  if (!apiClient) {
    console.log('🔍 [API Export] Initializing API client for superResolution');
    apiClient = getApiClient();
  }
  
  return apiClient.superResolution(params);
};

// 导出接口定义，以便其他模块使用
export type { ImageGenerationParams, LogoInfo, VideoGenerationParams };
