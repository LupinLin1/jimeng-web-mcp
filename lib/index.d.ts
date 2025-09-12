interface AspectRatioPreset {
    name: string;
    ratio: number;
    displayName: string;
    imageRatio: number;
}
declare const ASPECT_RATIO_PRESETS: AspectRatioPreset[];
declare class ImageDimensionCalculator {
    private static readonly STANDARD_DIMENSIONS;
    static calculateDimensions(aspectRatio?: string): {
        width: number;
        height: number;
        imageRatio: number;
    };
    static getPresetByName(name: string): AspectRatioPreset | undefined;
    static getAllPresets(): AspectRatioPreset[];
    static getStandardDimensions(): Record<string, {
        width: number;
        height: number;
    }>;
}
interface ImageGenerationParams {
    filePath?: string;
    model?: string;
    prompt: string;
    aspectRatio?: string;
    sample_strength?: number;
    negative_prompt?: string;
    refresh_token?: string;
    req_key?: string;
}
interface MultiFrameConfig {
    idx: number;
    duration_ms: number;
    prompt: string;
    image_path: string;
}
interface VideoGenerationParams {
    filePath?: string[];
    multiFrames?: MultiFrameConfig[];
    resolution?: string;
    model?: string;
    prompt: string;
    width?: number;
    height?: number;
    fps?: number;
    duration_ms?: number;
    video_aspect_ratio?: string;
    refresh_token?: string;
    req_key?: string;
}
/**
 * 生成AI图像
 * @param params 图像生成参数
 * @returns 返回生成的图像URL数组
 */
declare const generateImage: (params: ImageGenerationParams) => Promise<string[]>;
/**
 * 生成AI视频
 * 支持传统模式（首尾帧）和智能多帧模式
 * @param params 视频生成参数
 * @returns 返回生成的视频URL
 */
declare const generateVideo: (params: VideoGenerationParams) => Promise<string>;

export { ASPECT_RATIO_PRESETS, ImageDimensionCalculator, generateImage, generateVideo };
