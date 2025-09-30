/**
 * 主体参考视频生成器
 * 独立实现主体参考功能，不改动现有JimengClient代码
 */

import { JimengClient } from '../JimengClient.js';
import {
  MainReferenceVideoParams,
  MainReferenceSegment,
  IdipMetaItem,
  IdipFrameImage
} from '../../types/video.types.js';
import { DEFAULT_VIDEO_MODEL } from '../../types/models.js';
import { generateUuid } from '../../utils/index.js';

/**
 * 主体参考视频生成器
 * 通过继承JimengClient复用基础能力（上传、请求、积分等）
 */
export class MainReferenceVideoGenerator extends JimengClient {

  /**
   * 生成主体参考视频
   * @param params 主体参考视频参数
   * @returns 生成的视频URL
   */
  async generate(params: MainReferenceVideoParams): Promise<string> {
    console.log('[MainReference] 开始生成主体参考视频...');

    // 1. 参数验证
    this.validateParams(params);

    // 2. 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      console.log('[MainReference] 积分不足，尝试领取积分...');
      await this.receiveCredit();
    }

    // 3. 解析提示词，提取图片引用和文本片段
    const segments = this.parsePrompt(params.prompt);
    console.log(`[MainReference] 提示词解析完成，共${segments.length}个片段`);

    // 4. 上传参考图片
    console.log(`[MainReference] 开始上传${params.referenceImages.length}张参考图片...`);
    const uploadedImages = await this.uploadReferenceImages(params.referenceImages);
    console.log(`[MainReference] 图片上传完成`);

    // 5. 构建请求数据
    const requestData = this.buildRequestData(params, segments, uploadedImages);

    // 6. 发送请求
    console.log('[MainReference] 发送视频生成请求...');
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      requestData.draft_content,
      requestData
    );

    console.log('[MainReference] 请求发送成功，开始轮询结果...');

    // 7. 轮询结果
    const videoUrl = await this.pollVideoResult(result);
    console.log('[MainReference] 视频生成完成:', videoUrl);

    return videoUrl;
  }

  /**
   * 验证参数
   */
  private validateParams(params: MainReferenceVideoParams): void {
    // 验证参考图片数量
    if (!params.referenceImages || params.referenceImages.length < 2) {
      throw new Error('主体参考模式至少需要2张参考图片');
    }
    if (params.referenceImages.length > 4) {
      throw new Error('主体参考模式最多支持4张参考图片');
    }

    // 验证提示词
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new Error('提示词不能为空');
    }

    // 验证提示词中包含图片引用
    const imageRefPattern = /\[图\d+\]/g;
    const matches = params.prompt.match(imageRefPattern);
    if (!matches || matches.length === 0) {
      throw new Error('提示词中必须包含至少一个图片引用，格式如：[图0]、[图1]');
    }

    // 验证图片索引有效性
    const maxIndex = params.referenceImages.length - 1;
    for (const match of matches) {
      const index = parseInt(match.match(/\d+/)?.[0] || '0');
      if (index > maxIndex) {
        throw new Error(`图片引用[图${index}]超出范围，当前只有${params.referenceImages.length}张图片（索引0-${maxIndex}）`);
      }
    }

    // 验证其他参数
    if (params.duration && (params.duration < 3000 || params.duration > 15000)) {
      throw new Error('时长必须在3000-15000ms范围内');
    }
    if (params.fps && (params.fps < 12 || params.fps > 30)) {
      throw new Error('帧率必须在12-30范围内');
    }
  }

  /**
   * 解析提示词，提取图片引用和文本片段
   * 例如："[图0]中的猫在[图1]的地板上跑"
   * => [{type:'image_ref', content:'0'}, {type:'text', content:' 中的猫在'}, ...]
   */
  private parsePrompt(prompt: string): MainReferenceSegment[] {
    const segments: MainReferenceSegment[] = [];
    const imageRefPattern = /\[图(\d+)\]/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = imageRefPattern.exec(prompt)) !== null) {
      // 添加图片引用前的文本片段
      if (match.index > lastIndex) {
        const textContent = prompt.substring(lastIndex, match.index);
        if (textContent) {
          segments.push({
            type: 'text',
            content: textContent
          });
        }
      }

      // 添加图片引用片段
      segments.push({
        type: 'image_ref',
        content: match[1]  // 图片索引（如 "0", "1"）
      });

      lastIndex = match.index + match[0].length;
    }

    // 添加最后的文本片段
    if (lastIndex < prompt.length) {
      const textContent = prompt.substring(lastIndex);
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent
        });
      }
    }

    return segments;
  }

  /**
   * 上传所有参考图片
   */
  private async uploadReferenceImages(imagePaths: string[]): Promise<IdipFrameImage[]> {
    const uploadedImages: IdipFrameImage[] = [];

    for (let i = 0; i < imagePaths.length; i++) {
      console.log(`[MainReference] 上传图片 ${i + 1}/${imagePaths.length}: ${imagePaths[i]}`);

      // 使用父类的uploadCoverFile方法
      const uploadResult = await (this as any).uploadCoverFile(imagePaths[i]);

      uploadedImages.push({
        type: 'image',
        id: generateUuid(),
        source_from: 'upload',
        platform_type: 1,
        name: '',
        image_uri: uploadResult.uri,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        uri: uploadResult.uri
      });
    }

    return uploadedImages;
  }

  /**
   * 构建idip_meta_list
   * 将解析后的segments转换为API所需的idip_meta_list格式
   */
  private buildIdipMetaList(segments: MainReferenceSegment[]): IdipMetaItem[] {
    return segments.map(segment => {
      if (segment.type === 'text') {
        return {
          type: '',
          id: generateUuid(),
          meta_type: 'text',
          text: segment.content
        };
      } else {
        // image_ref类型
        return {
          type: '',
          id: generateUuid(),
          meta_type: 'idip_frame',
          frame_info: {
            type: '',
            id: generateUuid(),
            image_idx: parseInt(segment.content)
          }
        };
      }
    });
  }

  /**
   * 构建完整的请求数据
   */
  private buildRequestData(
    params: MainReferenceVideoParams,
    segments: MainReferenceSegment[],
    uploadedImages: IdipFrameImage[]
  ): any {
    const componentId = generateUuid();
    const submitId = generateUuid();
    const model = params.model || DEFAULT_VIDEO_MODEL;
    const resolution = params.resolution || '720p';
    const videoAspectRatio = params.videoAspectRatio || '16:9';
    const fps = params.fps || 24;
    const duration = params.duration || 5000;

    // 构建idip_meta_list
    const idipMetaList = this.buildIdipMetaList(segments);

    const metricsExtra = JSON.stringify({
      isDefaultSeed: 1,
      originSubmitId: submitId,
      isRegenerate: false,
      enterFrom: 'click',
      functionMode: 'main_reference'  // 关键标识：主体参考模式
    });

    const draftContent = {
      type: 'draft',
      id: generateUuid(),
      min_version: '3.0.5',
      min_features: ['AIGC_GenerateType_VideoIdipFrame'],  // 关键特性标识
      is_from_tsn: true,
      version: '3.3.3',
      main_component_id: componentId,
      component_list: [{
        type: 'video_base_component',
        id: componentId,
        min_version: '1.0.0',
        aigc_mode: 'workbench',
        metadata: {
          type: '',
          id: generateUuid(),
          created_platform: 3,
          created_platform_version: '',
          created_time_in_ms: Date.now().toString(),
          created_did: ''
        },
        generate_type: 'gen_video',
        abilities: {
          type: '',
          id: generateUuid(),
          gen_video: {
            type: '',
            id: generateUuid(),
            text_to_video_params: {
              type: '',
              id: generateUuid(),
              video_gen_inputs: [{
                type: '',
                id: generateUuid(),
                min_version: '3.0.5',
                prompt: '',  // 主体参考模式prompt为空
                video_mode: 2,  // 关键参数：主体参考模式
                fps: fps,
                duration_ms: duration,
                resolution: resolution,
                idip_frames: uploadedImages,  // 上传的参考图片
                idip_meta_list: idipMetaList  // 关键：图片引用和文本的组合
              }],
              video_aspect_ratio: videoAspectRatio,
              seed: Math.floor(Math.random() * 100000000) + 2500000000,
              model_req_key: model,
              priority: 0
            },
            video_task_extra: JSON.stringify({
              isDefaultSeed: 1,
              originSubmitId: submitId,
              isRegenerate: false,
              enterFrom: 'click',
              functionMode: 'main_reference'
            })
          }
        },
        process_type: 1
      }]
    };

    return {
      extend: {
        root_model: model,
        m_video_commerce_info: {
          benefit_type: 'basic_video_operation_vgfm_v_three',
          resource_id: 'generate_video',
          resource_id_type: 'str',
          resource_sub_type: 'aigc'
        },
        m_video_commerce_info_list: [{
          benefit_type: 'basic_video_operation_vgfm_v_three',
          resource_id: 'generate_video',
          resource_id_type: 'str',
          resource_sub_type: 'aigc'
        }]
      },
      submit_id: submitId,
      metrics_extra: metricsExtra,
      draft_content: JSON.stringify(draftContent),
      http_common_info: { aid: 513695 }
    };
  }

  /**
   * 轮询视频生成结果
   * 复用JimengClient的轮询逻辑
   */
  private async pollVideoResult(result: any): Promise<string> {
    // 获取历史记录ID
    const historyId = result?.data?.aigc_data?.history_record_id;
    if (!historyId) {
      throw new Error(result?.errmsg || '获取历史记录ID失败');
    }

    console.log(`[MainReference] 开始轮询视频结果，historyId: ${historyId}`);

    const maxPollCount = 60; // 最多轮询60次
    let pollCount = 0;

    while (pollCount < maxPollCount) {
      pollCount++;

      // 等待一段时间再轮询
      const waitTime = pollCount === 1 ? 5000 : 10000;  // 首次5秒，后续10秒
      await new Promise(resolve => setTimeout(resolve, waitTime));

      console.log(`[MainReference] 轮询 ${pollCount}/${maxPollCount}...`);

      try {
        const pollResult = await this.request(
          'POST',
          '/mweb/v1/get_history_by_ids',
          {
            history_ids: [historyId],
            image_info: {
              width: 2048,
              height: 2048,
              resolution_type: '2k'
            }
          },
          {}
        );

        const record = pollResult?.data?.history_records?.[0];
        if (!record) {
          console.log(`[MainReference] 轮询 ${pollCount}: 未获取到记录`);
          continue;
        }

        const status = record.status;
        console.log(`[MainReference] 轮询 ${pollCount}: 状态=${status}`);

        // 状态30表示完成
        if (status === 30) {
          const videoUrl = record.item_list?.[0]?.video_info?.video_url;
          if (!videoUrl) {
            throw new Error('视频生成完成但未获取到视频URL');
          }
          return videoUrl;
        }

        // 状态50表示失败
        if (status === 50) {
          const failCode = record.fail_code || 'unknown';
          throw new Error(`视频生成失败，错误码: ${failCode}`);
        }

        // 其他状态继续轮询
      } catch (error) {
        console.error(`[MainReference] 轮询 ${pollCount} 出错:`, error);
        // 网络错误继续轮询，其他错误抛出
        if (pollCount >= maxPollCount - 5) {
          throw error;
        }
      }
    }

    throw new Error('视频生成超时，轮询次数已达上限');
  }
}