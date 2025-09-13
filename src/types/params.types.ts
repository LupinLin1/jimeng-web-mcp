// API parameter interfaces
export interface ImageGenerationParams {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  negative_prompt?: string;
  filePath?: string | string[];
  fileStrengths?: number[];
  sample_strength?: number;
}

export interface VideoGenerationParams {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  fps?: number;
  duration_ms?: number;
  resolution?: string;
  filePath?: string[];
  multiFrames?: MultiFrameConfig[];
  video_aspect_ratio?: string;
}

export interface MultiFrameConfig {
  idx: number;
  duration_ms: number;
  prompt: string;
  image_path: string;
}

export interface FrameInterpolationParams {
  videoId: string;
  originHistoryId: string;
  targetFps: 30 | 60;
  originFps: number;
  duration?: number;
}

export interface SuperResolutionParams {
  videoId: string;
  originHistoryId: string;
  targetWidth: number;
  targetHeight: number;
  originWidth: number;
  originHeight: number;
}

export interface VideoPostProcessParams {
  videoId: string;
  originHistoryId: string;
}

// Aspect ratio and dimension types
export interface AspectRatioPreset {
  name: string;
  ratio: number;
  displayName: string;
  imageRatio: number;
}

export interface DimensionInfo {
  width: number;
  height: number;
  resolutionType: string;
}

// Logo and blend types
export interface LogoInfo {
  url: string;
  width: number;
  height: number;
}

// Response types
export interface PollResult {
  itemList: any[];
  recordData: any;
  needsContinuation: boolean;
}

export interface UploadResult {
  upload_id: string;
  uri: string;
  width: number;
  height: number;
  format: string;
}

export interface CreditInfo {
  credit: number;
  receive_credit: number;
}

// Service interfaces
export interface ApiClientConfig {
  refreshToken: string;
  baseUrl?: string;
  timeout?: number;
}

export interface PollingConfig {
  maxPollCount: number;
  initialWaitTime: number;
  subsequentWaitTime: number;
}