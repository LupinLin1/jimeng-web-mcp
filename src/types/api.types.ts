/**
 * API相关类型定义
 * 从api.ts中提取的所有API相关的接口和类型
 */

// 导出视频相关类型
export type { MainReferenceVideoParams } from './video.types.js';

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
  // 生成数量控制
  count?: number; // 生成图片数量，默认1张，最大15张，超过4张会自动触发继续生成

  /**
   * 是否异步模式
   * - false (默认): 同步等待生成完成，返回图片URL数组
   * - true: 立即返回historyId，不等待完成
   */
  async?: boolean;

  /**
   * 多帧场景描述数组
   * - 最多15个元素
   * - 非空字符串才有效
   * - 会与prompt组合成最终提示词
   *
   * @example
   * frames: ["实验室场景", "时空隧道", "外星球"]
   * 最终prompt: "{prompt} 实验室场景 时空隧道 外星球，一共3张图"
   */
  frames?: string[];
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

// ============== 异步查询 API 类型定义 ==============

/**
 * 生成状态枚举
 * 用于表示图片/视频生成任务的当前状态
 */
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 查询结果响应接口
 * 用于异步查询生成任务的状态和结果
 *
 * @interface QueryResultResponse
 * @property {GenerationStatus} status - 当前生成状态
 * @property {number} progress - 生成进度百分比 (0-100)
 * @property {string[]} [imageUrls] - 生成完成的图片URL数组（仅图片生成）
 * @property {string} [videoUrl] - 生成完成的视频URL（仅视频生成）
 * @property {string} [error] - 错误信息（仅失败状态）
 */
export interface QueryResultResponse {
  /** 当前生成状态：pending(待处理), processing(生成中), completed(完成), failed(失败) */
  status: GenerationStatus;

  /** 生成进度百分比 (0-100) */
  progress: number;

  /** 生成完成的图片URL数组（仅当 status='completed' 且为图片生成时存在） */
  imageUrls?: string[];

  /** 生成完成的视频URL（仅当 status='completed' 且为视频生成时存在） */
  videoUrl?: string;

  /** 错误信息（仅当 status='failed' 时存在） */
  error?: string;

  /** 调试信息：总目标数量 */
  totalCount?: number;

  /** 调试信息：已完成数量 */
  finishedCount?: number;

  /** 调试信息：当前返回的item数量 */
  itemCount?: number;

  /** 是否还有更多图片正在生成（智能继续生成标记） */
  needs_more?: boolean;

  /** 提示信息（如继续生成提示） */
  message?: string;

  /** 智能继续生成调试信息 */
  _debug?: {
    /** 是否有缓存条目 */
    hasCacheEntry: boolean;
    /** 是否已发送继续生成请求 */
    continuationSent: boolean;
    /** 是否应该触发继续生成 */
    shouldTriggerContinuation: boolean;
  };
}

/**
 * 批量查询响应接口
 * 用于批量查询多个生成任务的状态和结果
 *
 * @interface BatchQueryResponse
 * @property {QueryResultResponse | {error: string}} [historyId] - 每个任务ID对应的查询结果或错误信息
 *
 * @example
 * ```typescript
 * const results: BatchQueryResponse = {
 *   "4721606420748": { status: "completed", progress: 100, videoUrl: "https://..." },
 *   "4721606420749": { status: "processing", progress: 45 },
 *   "invalid-id": { error: "无效的historyId格式" }
 * };
 * ```
 */
export interface BatchQueryResponse {
  [historyId: string]: QueryResultResponse | { error: string };
}

// ============== 视频生成方法重构相关类型 (Feature 005-3-1-2) ==============

/**
 * 视频生成模式枚举
 */
export enum VideoGenerationMode {
  TEXT_TO_VIDEO = 'text_to_video',      // 文生视频及首尾帧
  MULTI_FRAME = 'multi_frame',          // 多帧视频
  MAIN_REFERENCE = 'main_reference'     // 主体参考
}

/**
 * 视频任务状态
 */
export type VideoTaskStatus =
  | 'pending'      // 等待处理
  | 'processing'   // 处理中
  | 'completed'    // 已完成
  | 'failed';      // 失败

/**
 * 视频生成错误对象
 */
export interface VideoGenerationError {
  /** 错误码 */
  code:
    | 'TIMEOUT'            // 超时
    | 'CONTENT_VIOLATION'  // 内容违规
    | 'API_ERROR'          // API错误
    | 'INVALID_PARAMS'     // 参数无效
    | 'PROCESSING_FAILED'  // 处理失败
    | 'UNKNOWN';           // 未知错误

  /** 简短错误消息 */
  message: string;

  /** 详细原因说明 */
  reason: string;

  /** 关联的任务ID（如果有） */
  taskId?: string;

  /** 错误发生时间戳 */
  timestamp: number;
}

/**
 * 视频元数据
 */
export interface VideoMetadata {
  /** 实际时长（毫秒） */
  duration: number;

  /** 分辨率 */
  resolution: string;

  /** 文件大小（字节） */
  fileSize?: number;

  /** 格式 */
  format?: string;

  /** 生成参数快照 */
  generationParams: {
    mode: VideoGenerationMode;
    model: string;
    fps: number;
    aspectRatio: string;
  };
}

/**
 * 视频任务结果（统一返回类型）
 */
export interface VideoTaskResult {
  /** 任务ID（异步模式返回） */
  taskId?: string;

  /** 视频URL（同步模式返回） */
  videoUrl?: string;

  /** 任务状态（查询时返回） */
  status?: VideoTaskStatus;

  /** 错误信息（失败时返回） */
  error?: VideoGenerationError;

  /** 视频元数据（完成时返回） */
  metadata?: VideoMetadata;
}

/**
 * 基础视频生成选项（所有方法共享）
 */
export interface BaseVideoGenerationOptions {
  /** 是否异步模式，默认false（同步） */
  async?: boolean;

  /** 视频分辨率 */
  resolution?: '720p' | '1080p';

  /** 视频宽高比 */
  videoAspectRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

  /** 帧率 (12-30) */
  fps?: number;

  /** 时长（毫秒，3000-15000） */
  duration?: number;

  /** 模型名称 */
  model?: string;
}

/**
 * 文生视频选项
 */
export interface TextToVideoOptions extends BaseVideoGenerationOptions {
  /** 视频描述文本 */
  prompt: string;

  /** 首帧图片路径（可选） */
  firstFrameImage?: string;

  /** 尾帧图片路径（可选） */
  lastFrameImage?: string;
}

/**
 * 单帧配置
 */
export interface FrameConfiguration {
  /** 帧序号 */
  idx: number;

  /** 帧时长（毫秒） */
  duration_ms: number;

  /** 帧描述文本 */
  prompt: string;

  /** 参考图片路径 */
  image_path: string;
}

/**
 * 多帧视频选项
 */
export interface MultiFrameVideoOptions extends BaseVideoGenerationOptions {
  /** 帧配置数组（2-10个） */
  frames: FrameConfiguration[];
}

/**
 * 主体参考视频选项（扩展支持async）
 */
export interface MainReferenceVideoOptionsExtended extends BaseVideoGenerationOptions {
  /** 参考图片路径数组（2-4张） */
  referenceImages: string[];

  /** 提示词，使用[图N]语法引用图片 */
  prompt: string;
}