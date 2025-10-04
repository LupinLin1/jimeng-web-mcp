/**
 * 模型映射和常量定义
 * 从api.ts中提取的模型相关常量和配置
 */

import { generateUuid } from '../utils/index.js';
import { logger } from '../utils/logger.js';

// ============== 模型映射 ==============

/**
 * 模型映射表
 * jimeng-4.0 (seedream4.0) 的内部模型名称已通过网络请求分析确认
 */
export const MODEL_MAP: Record<string, string> = {
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

// ============== 默认常量 ==============

export const DEFAULT_MODEL = 'jimeng-4.0';
export const DEFAULT_VIDEO_MODEL = 'jimeng-video-3.0';
export const DEFAULT_BLEND_MODEL = 'jimeng-4.0'; //不允许修改
export const DRAFT_VERSION = '3.0.2';
export const DEFAULT_ASSISTANT_ID = '513695'; // 从原始仓库中提取
export const WEB_ID = Math.random() * 999999999999999999 + 7000000000000000000;
export const USER_ID = generateUuid().replace(/-/g, '');
export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ============== 宽高比配置 ==============

/**
 * 宽高比预设选项 - 使用API官方预定义尺寸
 */
export interface AspectRatioPreset {
  name: string;
  ratio: number;
  displayName: string;
  imageRatio: number; // 即梦API内部的比例标识符 (ratio_type)
  width: number; // API官方预定义宽度
  height: number; // API官方预定义高度
  resolutionType: string; // 分辨率类型
}

/**
 * 宽高比预设列表 - 基于JiMeng API官方预定义的8种尺寸
 * 对应API返回的 image_ratio_sizes 数组
 */
export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  // ratio_type: 1 - 1:1 正方形
  { name: 'auto', ratio: 1, displayName: '智能', imageRatio: 1, width: 2048, height: 2048, resolutionType: '2k' },
  { name: '1:1', ratio: 1, displayName: '1:1', imageRatio: 1, width: 2048, height: 2048, resolutionType: '2k' },
  
  // ratio_type: 2 - 3:4 竖屏
  { name: '3:4', ratio: 3/4, displayName: '3:4', imageRatio: 2, width: 1728, height: 2304, resolutionType: '2k' },
  
  // ratio_type: 3 - 16:9 横屏
  { name: '16:9', ratio: 16/9, displayName: '16:9', imageRatio: 3, width: 2560, height: 1440, resolutionType: '2k' },
  
  // ratio_type: 4 - 4:3 传统横屏
  { name: '4:3', ratio: 4/3, displayName: '4:3', imageRatio: 4, width: 2304, height: 1728, resolutionType: '2k' },
  
  // ratio_type: 5 - 9:16 手机竖屏
  { name: '9:16', ratio: 9/16, displayName: '9:16', imageRatio: 5, width: 1440, height: 2560, resolutionType: '2k' },
  
  // ratio_type: 6 - 2:3 书籍比例
  { name: '2:3', ratio: 2/3, displayName: '2:3', imageRatio: 6, width: 1664, height: 2496, resolutionType: '2k' },
  
  // ratio_type: 7 - 3:2 摄影比例
  { name: '3:2', ratio: 3/2, displayName: '3:2', imageRatio: 7, width: 2496, height: 1664, resolutionType: '2k' },
  
  // ratio_type: 8 - 21:9 超宽屏
  { name: '21:9', ratio: 21/9, displayName: '21:9', imageRatio: 8, width: 3024, height: 1296, resolutionType: '2k' }
];

/**
 * 获取模型的内部名称
 */
export function getModel(model: string): string {
  const mappedModel = MODEL_MAP[model];
  if (!mappedModel) {
    logger.debug(`未知模型: ${model}，使用默认模型: ${DEFAULT_MODEL}`);
    return MODEL_MAP[DEFAULT_MODEL];
  }
  return mappedModel;
}

/**
 * 根据宽度和高度确定分辨率类型
 */
export function getResolutionType(width: number, height: number): string {
  const maxDimension = Math.max(width, height);
  if (maxDimension <= 1024) return '1k';
  if (maxDimension <= 1536) return '1.5k';
  if (maxDimension <= 2048) return '2k';
  if (maxDimension <= 2560) return '2.5k';
  return '3k';
}