/**
 * JiMeng MCP API - 重构后的兼容层
 * 保持与原api.ts完全兼容的导出接口，内部使用新的模块化结构
 */

// Re-export all types
export * from './types/api.types.js';
export * from './types/models.js';

// Re-export utilities that were in the original file
export { ImageDimensionCalculator } from './utils/dimensions.js';
export { generateCookie } from './utils/auth.js';

// Import the new client
import { JimengClient, frameInterpolation, superResolution } from './api/JimengClient.js';
import { 
  ImageGenerationParams, 
  VideoGenerationParams, 
  FrameInterpolationParams, 
  SuperResolutionParams,
  LogoInfo 
} from './types/api.types.js';

// Create a singleton instance for backward compatibility
let apiClient: JimengClient | null = null;

const getApiClient = (token?: string): JimengClient => {
  if (!apiClient || (token && token !== apiClient.getRefreshToken())) {
    apiClient = new JimengClient(token);
  }
  return apiClient;
};

// ============== 兼容性导出函数 ==============

/**
 * 图像生成 - 保持与原API完全兼容
 */
export const generateImage = (params: ImageGenerationParams): Promise<string[]> => {
  console.log('🔍 [API Export] generateImage called with params:', JSON.stringify({
    hasFilePath: Boolean(params?.filePath),
    model: params.model,
    prompt: params.prompt ? `${params.prompt.substring(0, 50)}...` : undefined,
    aspectRatio: params.aspectRatio,
    sample_strength: params.sample_strength,
    negative_prompt: params.negative_prompt
  }, null, 2));

  if (!params.refresh_token) {
    throw new Error('refresh_token is required');
  }

  console.log('🔍 [API Export] Creating API client with provided refresh_token');
  const client = getApiClient(params.refresh_token);

  return client.generateImage(params);
};

/**
 * 视频生成 - 保持与原API完全兼容
 */
export const generateVideo = (params: VideoGenerationParams): Promise<string> => {
  if (!params.refresh_token) {
    throw new Error('refresh_token is required');
  }
  
  return getApiClient(params.refresh_token).generateVideo(params);
};

/**
 * 帧插值后处理 - 保持与原API完全兼容
 */
export const frameInterpolation = frameInterpolation;

/**
 * 超分辨率后处理 - 保持与原API完全兼容
 */
export const superResolution = superResolution;

/**
 * 导出类型 - 保持与原API完全兼容
 */
export type { 
  ImageGenerationParams, 
  VideoGenerationParams, 
  FrameInterpolationParams, 
  SuperResolutionParams,
  LogoInfo 
};

// ============== 直接导出JimengClient供高级用户使用 ==============
export { JimengClient };