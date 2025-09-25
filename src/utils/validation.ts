import { z } from 'zod';

// Parameter validation schemas
export const imageGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  model: z.string().optional(),
  aspectRatio: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  negative_prompt: z.string().optional(),
  filePath: z.array(z.string()).optional(),
  fileStrengths: z.array(z.number().min(0).max(1)).optional(),
  sample_strength: z.number().min(0).max(1).optional()
});

export const videoGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  model: z.string().optional(),
  fps: z.number().min(12).max(30).optional(),
  duration_ms: z.number().min(3000).max(15000).optional(),
  resolution: z.string().optional(),
  filePath: z.array(z.string()).optional(),
  multiFrames: z.array(z.object({
    idx: z.number(),
    duration_ms: z.number().min(1000).max(5000),
    prompt: z.string(),
    image_path: z.string()
  })).optional(),
  video_aspect_ratio: z.string().optional()
});

export const frameInterpolationSchema = z.object({
  videoId: z.string().min(1, 'Video ID is required'),
  originHistoryId: z.string().min(1, 'Origin history ID is required'),
  targetFps: z.union([z.literal(30), z.literal(60)]),
  originFps: z.number().positive(),
  duration: z.number().positive().optional()
});

export const superResolutionSchema = z.object({
  videoId: z.string().min(1, 'Video ID is required'),
  originHistoryId: z.string().min(1, 'Origin history ID is required'),
  targetWidth: z.number().min(768).max(2560),
  targetHeight: z.number().min(768).max(2560),
  originWidth: z.number().positive(),
  originHeight: z.number().positive()
});

export class ValidationService {
  static validateImageGeneration(params: any): void {
    const result = imageGenerationSchema.safeParse(params);
    if (!result.success) {
      throw new Error(`Image generation validation failed: ${result.error.message}`);
    }

    // Validate fileStrengths length matches filePath length if both provided
    if (params.filePath && params.fileStrengths) {
      if (params.filePath.length !== params.fileStrengths.length) {
        throw new Error('fileStrengths array length must match filePath array length');
      }
    }
  }

  static validateVideoGeneration(params: any): void {
    const result = videoGenerationSchema.safeParse(params);
    if (!result.success) {
      throw new Error(`Video generation validation failed: ${result.error.message}`);
    }
  }

  static validateFrameInterpolation(params: any): void {
    const result = frameInterpolationSchema.safeParse(params);
    if (!result.success) {
      throw new Error(`Frame interpolation validation failed: ${result.error.message}`);
    }
  }

  static validateSuperResolution(params: any): void {
    const result = superResolutionSchema.safeParse(params);
    if (!result.success) {
      throw new Error(`Super resolution validation failed: ${result.error.message}`);
    }
  }

  static validateNotBlank(value: any, fieldName: string): void {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      throw new Error(`${fieldName} is required`);
    }
  }

  static validatePositiveNumber(value: any, fieldName: string): void {
    if (typeof value !== 'number' || value <= 0) {
      throw new Error(`${fieldName} must be a positive number`);
    }
  }

  static validateArray(value: any, fieldName: string): void {
    if (!Array.isArray(value)) {
      throw new Error(`${fieldName} must be an array`);
    }
  }
}