import type { DimensionInfo } from '../types/params.types.js';
import { ASPECT_RATIO_PRESETS, type AspectRatioPreset } from '../types/models.js';

export class ImageDimensionCalculator {
  static calculateDimensions(
    aspectRatio?: string,
    width?: number,
    height?: number
  ): DimensionInfo {
    // If explicit width and height provided, use them
    if (width && height) {
      return {
        width,
        height,
        resolutionType: this.getResolutionType(width, height)
      };
    }

    // Find matching aspect ratio preset
    const preset = ASPECT_RATIO_PRESETS.find(p => p.name === aspectRatio);
    
    if (!preset) {
      // Default to 1:1 official dimensions if no match found
      const defaultPreset = ASPECT_RATIO_PRESETS.find(p => p.name === '1:1')!;
      return {
        width: defaultPreset.width,
        height: defaultPreset.height,
        resolutionType: defaultPreset.resolutionType
      };
    }

    // Use official API dimensions directly from preset
    return {
      width: preset.width,
      height: preset.height,
      resolutionType: preset.resolutionType
    };
  }

  private static getResolutionType(width: number, height: number): string {
    // API只支持2k分辨率，不需要计算
    return '2k';
  }

  static getAspectRatioPreset(name: string): AspectRatioPreset | undefined {
    return ASPECT_RATIO_PRESETS.find(preset => preset.name === name);
  }

  static getAspectRatioByName(ratioName: string): number {
    const preset = this.getAspectRatioPreset(ratioName);
    return preset ? preset.imageRatio : 1;
  }
}