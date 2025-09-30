/**
 * 视频生成相关类型定义
 */

/**
 * 主体参考提示词片段类型
 */
export interface MainReferenceSegment {
  type: 'text' | 'image_ref';  // 文本片段或图片引用
  content: string;              // text类型是文本内容，image_ref类型是图片索引（"0", "1"等）
}

/**
 * 主体参考视频生成参数
 */
export interface MainReferenceVideoParams {
  referenceImages: string[];                  // 参考图片路径数组（2-4张）
  prompt: string;                             // 提示词，支持[图0]、[图1]语法，如"[图0]中的猫在[图1]的地板上跑"
  model?: string;                             // 模型名称，默认jimeng-video-3.0
  resolution?: '720p' | '1080p';              // 分辨率，默认720p
  videoAspectRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';  // 视频比例，默认16:9
  fps?: number;                               // 帧率，范围12-30，默认24
  duration?: number;                          // 总时长（毫秒），范围3000-15000ms，默认5000
  refresh_token?: string;                     // API令牌（可选，通常从环境变量读取）
}

/**
 * idip_meta_list 元素类型
 */
export interface IdipMetaItem {
  type: string;
  id: string;
  meta_type: 'text' | 'idip_frame';
  text?: string;                    // meta_type为text时使用
  frame_info?: {                    // meta_type为idip_frame时使用
    type: string;
    id: string;
    image_idx: number;              // 图片索引
  };
}

/**
 * idip_frames 图片信息类型
 */
export interface IdipFrameImage {
  type: 'image';
  id: string;
  source_from: 'upload';
  platform_type: 1;
  name: string;
  image_uri: string;
  width: number;
  height: number;
  format: string;
  uri: string;
}