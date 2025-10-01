/**
 * ImageGenerator 接口定义
 *
 * 此接口定义了图像生成器的公共 API 合约。
 * 所有实现必须遵守此接口，确保向后兼容性。
 *
 * @interface IImageGenerator
 * @since 1.12.0
 */

import {
  ImageGenerationParams,
  QueryResultResponse
} from '../../../src/types/api.types';

export interface IImageGenerator {
  /**
   * 同步图像生成
   *
   * 生成图像并等待完成，返回所有生成的图片 URL。
   * 支持批量生成（count > 4 时自动继续生成）。
   *
   * @param params - 图像生成参数
   * @returns Promise<string[]> - 生成的图片 URL 数组
   * @throws Error - 当参数无效或生成失败时
   *
   * @example
   * ```typescript
   * const generator = new ImageGenerator(token);
   * const urls = await generator.generateImage({
   *   prompt: "一只可爱的猫",
   *   aspectRatio: "16:9"
   * });
   * console.log(urls); // ["https://...", "https://..."]
   * ```
   */
  generateImage(params: ImageGenerationParams): Promise<string[]>;

  /**
   * 异步图像生成
   *
   * 提交图像生成任务，立即返回任务 ID（historyId），不等待完成。
   * 适用于长时间任务或需要轮询状态的场景。
   *
   * @param params - 图像生成参数
   * @returns Promise<string> - 任务历史记录 ID（historyId）
   * @throws Error - 当提交失败或无法获取 historyId 时
   *
   * @example
   * ```typescript
   * const generator = new ImageGenerator(token);
   * const historyId = await generator.generateImageAsync({
   *   prompt: "一只可爱的猫",
   *   count: 10  // 大批量任务
   * });
   * console.log(historyId); // "4721606420748"
   *
   * // 稍后查询状态
   * const result = await generator.getImageResult(historyId);
   * ```
   */
  generateImageAsync(params: ImageGenerationParams): Promise<string>;

  /**
   * 查询生成任务状态和结果
   *
   * 查询指定任务的当前状态、进度和结果。
   * 当检测到需要继续生成时（count > 4 且已完成 4 张），
   * 自动触发继续生成请求。
   *
   * @param historyId - 任务历史记录 ID
   * @returns Promise<QueryResultResponse> - 任务状态和结果
   * @throws Error - 当 historyId 无效或查询失败时
   *
   * @example
   * ```typescript
   * const generator = new ImageGenerator(token);
   * const result = await generator.getImageResult("4721606420748");
   *
   * if (result.status === 'completed') {
   *   console.log('生成完成:', result.imageUrls);
   * } else if (result.status === 'processing') {
   *   console.log('生成中，进度:', result.progress + '%');
   * } else if (result.status === 'failed') {
   *   console.error('生成失败:', result.error);
   * }
   * ```
   */
  getImageResult(historyId: string): Promise<QueryResultResponse>;

  /**
   * 批量查询多个任务状态
   *
   * 一次性查询多个任务的状态和结果（建议 ≤10 个）。
   * 单次 API 调用，高效查询。
   *
   * @param historyIds - 任务历史记录 ID 数组
   * @returns Promise<{[historyId: string]: QueryResultResponse | {error: string}}>
   *          - 每个任务 ID 对应的结果或错误
   * @throws Error - 当 historyIds 为空或 API 请求失败时
   *
   * @example
   * ```typescript
   * const generator = new ImageGenerator(token);
   * const results = await generator.getBatchResults([
   *   "4721606420748",
   *   "4721606420749",
   *   "invalid-id"
   * ]);
   *
   * // {
   * //   "4721606420748": { status: "completed", progress: 100, imageUrls: [...] },
   * //   "4721606420749": { status: "processing", progress: 45 },
   * //   "invalid-id": { error: "无效的historyId格式" }
   * // }
   * ```
   */
  getBatchResults(historyIds: string[]): Promise<{
    [historyId: string]: QueryResultResponse | { error: string };
  }>;
}

/**
 * 类型导出
 *
 * 为了方便使用，导出相关类型定义。
 */
export type {
  ImageGenerationParams,
  QueryResultResponse
} from '../../../src/types/api.types';

/**
 * 接口版本历史
 *
 * v1.0.0 (2025-10-01) - 初始版本
 *   - generateImage: 同步图像生成
 *   - generateImageAsync: 异步图像生成
 *   - getImageResult: 查询单个任务
 *   - getBatchResults: 批量查询任务
 *
 * 向后兼容性保证：
 *   - 所有方法签名不变
 *   - 所有返回类型不变
 *   - 所有错误类型不变
 */
