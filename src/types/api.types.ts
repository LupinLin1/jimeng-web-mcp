/**
 * API相关类型定义
 * 从api.ts中提取的所有API相关的接口和类型
 */

// ============== Draft-based API 类型定义 ==============

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
  status: 'processing' | 'completed' | 'failed' | 'pending' | 'success' | 'error';
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

// ============== 参数类型定义 ==============

/**
 * Logo信息配置
 */
export interface LogoInfo {
  position?: string; // 水印位置 center|top_left|top_right|bottom_left|bottom_right default: bottom_right
  opacity?: number; // 0-1 default: 0.3
  logo_text_content?: string; // 水印文字内容
}

/**
 * 图像生成参数
 */
export interface ImageGenerationParams {
  filePath?: string[]; // 参考图片绝对路径数组
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

/**
 * 多帧配置
 */
export interface MultiFrameConfig {
  idx: number; // 帧索引
  duration_ms: number; // 帧持续时间（毫秒，范围：1000-5000ms，即1-5秒）
  prompt: string; // 该帧的提示词
  image_path: string; // 该帧的图片路径
}

/**
 * 视频生成参数
 */
export interface VideoGenerationParams {
  filePath?: string[]; // 首帧和尾帧路径，支持数组（传统模式）
  model?: string; // 模型名称，默认使用 DEFAULT_VIDEO_MODEL
  prompt: string; // 提示词
  refresh_token?: string; // 刷新令牌，必需
  req_key?: string; // 自定义参数，兼容旧接口
  
  // 传统模式参数
  resolution?: string; // 分辨率，可选720p或1080p，默认720p
  
  // 多帧模式参数
  multiFrames?: MultiFrameConfig[]; // 智能多帧配置，支持多个关键帧（最多10帧）
  duration_ms?: number; // 总时长（毫秒，范围3000-15000ms，多帧模式）
  fps?: number; // 帧率，范围12-30，默认24（多帧模式）
  video_aspect_ratio?: string; // 视频比例，如'3:4'（多帧模式）
}

// ============== 后处理参数类型 ==============

/**
 * 视频后处理基础参数
 */
export interface VideoPostProcessParams {
  videoId: string; // 视频ID
  originHistoryId: string; // 原始生成历史ID
  refresh_token?: string; // 即梦API令牌（可选，通常从环境变量读取）
}

/**
 * 帧插值参数
 */
export interface FrameInterpolationParams extends VideoPostProcessParams {
  targetFps: 30 | 60; // 目标帧率：30或60fps
  originFps: number; // 原始帧率
  duration?: number; // 视频时长（毫秒），可选
}

/**
 * 超分辨率参数
 */
export interface SuperResolutionParams extends VideoPostProcessParams {
  targetWidth: number; // 目标宽度，范围768-2560像素
  targetHeight: number; // 目标高度，范围768-2560像素
  originWidth: number; // 原始宽度
  originHeight: number; // 原始高度
}

/**
 * 音效生成参数
 */
export interface AudioEffectGenerationParams extends VideoPostProcessParams {
  // 继承基础参数，音效生成不需要额外特定参数
}

/**
 * 统一视频后处理参数
 */
export interface VideoPostProcessUnifiedParams {
  operation: 'frame_interpolation' | 'super_resolution' | 'audio_effect';
  videoId: string; // 视频ID
  originHistoryId: string; // 原始生成历史ID
  refresh_token?: string; // 即梦API令牌（可选，通常从环境变量读取）
  
  // 帧插值参数（operation = 'frame_interpolation' 时使用）
  targetFps?: 30 | 60; // 目标帧率：30或60fps
  originFps?: number; // 原始帧率
  
  // 超分辨率参数（operation = 'super_resolution' 时使用）
  targetWidth?: number; // 目标宽度，范围768-2560像素
  targetHeight?: number; // 目标高度，范围768-2560像素
  originWidth?: number; // 原始宽度
  originHeight?: number; // 原始高度
  
  // 通用参数
  duration?: number; // 视频时长（毫秒），可选
}