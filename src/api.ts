/**
 * JiMeng MCP API - 重构后的主入口文件
 * 
 * 📁 此文件已重构为模块化架构，原2800+行代码被拆分为以下模块：
 * - src/types/api.types.ts - API类型定义 (200行)
 * - src/types/models.ts - 模型映射和常量 (80行)
 * - src/api/ApiClient.ts - 基础API客户端 (90行)
 * - src/api/CreditService.ts - 积分服务 (40行)
 * - src/api/JimengClient.ts - 统一客户端 (400行)
 * - src/utils/auth.ts - 认证工具 (200行)
 * - src/utils/dimensions.ts - 尺寸计算工具 (已存在)
 * 
 * ✅ 保持完全向后兼容 - 所有现有代码无需修改即可正常工作
 * 🔄 如遇问题，可使用 api-original-backup.ts 作为备用方案
 */

// ============== 重新导出所有类型 ==============
export * from './types/api.types.js';
export * from './types/models.js';

// ============== 重新导出工具类 ==============
export { ImageDimensionCalculator } from './utils/dimensions.js';
export { generateCookie } from './utils/auth.js';

// ============== API功能导出 ==============
import { JimengClient } from './api/JimengClient.js';
import { 
  ImageGenerationParams, 
  VideoGenerationParams, 
  FrameInterpolationParams, 
  SuperResolutionParams,
  AudioEffectGenerationParams,
  VideoPostProcessUnifiedParams,
  LogoInfo 
} from './types/api.types.js';

// 创建单例实例以保持向后兼容
let globalApiClient: JimengClient | null = null;

const getApiClient = (token?: string): JimengClient => {
  if (!globalApiClient || (token && token !== globalApiClient.getRefreshToken())) {
    globalApiClient = new JimengClient(token);
  }
  return globalApiClient;
};

// ============== 主要API函数（保持100%兼容） ==============

/**
 * 图像生成 - 与原API完全兼容
 * ✨ 支持所有新特性：单图参考、多图参考、Draft-based响应、creation_agent模式
 */
export const generateImage = (params: ImageGenerationParams): Promise<string[]> => {
  console.log('🔍 [重构后API] generateImage 被调用');
  console.log('🔍 [参数] 文件数量:', params?.filePath ? params.filePath.length : 0);
  console.log('🔍 [参数] 模型:', params.model || 'jimeng-4.0 (默认)');

  if (!params.refresh_token) {
    throw new Error('refresh_token is required');
  }

  const client = getApiClient(params.refresh_token);
  
  return client.generateImage(params)
    .catch(error => {
      console.error('❌ [重构后API] 图像生成失败:', error.message);
      console.log('💡 提示: 如果问题持续，请使用 api-original-backup.ts 中的原始实现');
      throw error;
    });
};

/**
 * 视频生成 - 与原API完全兼容
 * ✨ 支持传统模式和智能多帧模式
 */
export const generateVideo = (params: VideoGenerationParams): Promise<string> => {
  console.log('🔍 [重构后API] generateVideo 被调用');
  console.log('🔍 [参数] 模式:', params.multiFrames ? '多帧模式' : '传统模式');
  
  if (!params.refresh_token) {
    throw new Error('refresh_token is required');
  }
  
  const client = getApiClient(params.refresh_token);
  
  return client.generateVideo(params)
    .catch(error => {
      console.error('❌ [重构后API] 视频生成失败:', error.message);
      console.log('💡 提示: 如果问题持续，请使用 api-original-backup.ts 中的原始实现');
      throw error;
    });
};

// ============== 后处理功能 ==============

export async function frameInterpolation(params: FrameInterpolationParams): Promise<string> {
  console.log('🔍 [重构后API] frameInterpolation 被调用');
  
  const token = params.refresh_token || process.env.JIMENG_API_TOKEN;
  if (!token) {
    throw new Error('JIMENG_API_TOKEN 环境变量未设置');
  }
  
  const client = new JimengClient(token);
  return await client.frameInterpolation(params);
}

export async function superResolution(params: SuperResolutionParams): Promise<string> {
  console.log('🔍 [重构后API] superResolution 被调用');
  
  const token = params.refresh_token || process.env.JIMENG_API_TOKEN;
  if (!token) {
    throw new Error('JIMENG_API_TOKEN 环境变量未设置');
  }
  
  const client = new JimengClient(token);
  return await client.superResolution(params);
}

export async function generateAudioEffect(params: AudioEffectGenerationParams): Promise<string> {
  console.log('🔍 [重构后API] generateAudioEffect 被调用');
  
  const token = params.refresh_token || process.env.JIMENG_API_TOKEN;
  if (!token) {
    throw new Error('JIMENG_API_TOKEN 环境变量未设置');
  }
  
  const client = new JimengClient(token);
  return await client.generateAudioEffect(params);
}

export async function videoPostProcess(params: VideoPostProcessUnifiedParams): Promise<string> {
  console.log('🔍 [重构后API] videoPostProcess 被调用');
  console.log('🔍 [参数] 操作类型:', params.operation);
  
  const token = params.refresh_token || process.env.JIMENG_API_TOKEN;
  if (!token) {
    throw new Error('JIMENG_API_TOKEN 环境变量未设置');
  }
  
  const client = new JimengClient(token);
  return await client.videoPostProcess(params);
}

// ============== 类型导出（保持兼容性） ==============
export type { 
  ImageGenerationParams, 
  VideoGenerationParams, 
  FrameInterpolationParams, 
  SuperResolutionParams,
  AudioEffectGenerationParams,
  VideoPostProcessUnifiedParams,
  LogoInfo 
};

// ============== 高级用户API ==============
/**
 * 直接导出JimengClient供需要更多控制的用户使用
 */
export { JimengClient };

// ============== 重构完成 ==============
// 移除了启动时的重构提示信息，避免在生产环境产生不必要的日志输出