/**
 * 图像生成参数
 */
interface ImageGenerationParams {
    filePath?: string | string[];
    model?: string;
    prompt: string;
    aspectRatio?: string;
    sample_strength?: number;
    negative_prompt?: string;
    refresh_token?: string;
    req_key?: string;
    blend_mode?: 'single' | 'multi';
    reference_strength?: number[];
}
/**
 * 多帧配置
 */
interface MultiFrameConfig {
    idx: number;
    duration_ms: number;
    prompt: string;
    image_path: string;
}
/**
 * 视频生成参数
 */
interface VideoGenerationParams {
    filePath?: string[];
    model?: string;
    prompt: string;
    refresh_token?: string;
    req_key?: string;
    resolution?: string;
    width?: number;
    height?: number;
    multiFrames?: MultiFrameConfig[];
    duration_ms?: number;
    fps?: number;
    video_aspect_ratio?: string;
}

/**
 * 宽高比预设选项 - 使用API官方预定义尺寸
 */
interface AspectRatioPreset {
    name: string;
    ratio: number;
    displayName: string;
    imageRatio: number;
    width: number;
    height: number;
    resolutionType: string;
}
/**
 * 宽高比预设列表 - 基于JiMeng API官方预定义的8种尺寸
 * 对应API返回的 image_ratio_sizes 数组
 */
declare const ASPECT_RATIO_PRESETS: AspectRatioPreset[];

interface DimensionInfo {
    width: number;
    height: number;
    resolutionType: string;
}

declare class ImageDimensionCalculator {
    static calculateDimensions(aspectRatio?: string, width?: number, height?: number): DimensionInfo;
    private static getResolutionType;
    static getAspectRatioPreset(name: string): AspectRatioPreset | undefined;
    static getAspectRatioByName(ratioName: string): number;
}

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

/**
 * 图像生成 - 与原API完全兼容
 * ✨ 支持所有新特性：单图参考、多图参考、Draft-based响应、creation_agent模式
 */
declare const generateImage: (params: ImageGenerationParams) => Promise<string[]>;
/**
 * 视频生成 - 与原API完全兼容
 * ✨ 支持传统模式和智能多帧模式
 */
declare const generateVideo: (params: VideoGenerationParams) => Promise<string>;

export { ASPECT_RATIO_PRESETS, ImageDimensionCalculator, generateImage, generateVideo };
