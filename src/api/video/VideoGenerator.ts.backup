/**
 * VideoGenerator 视频生成核心类
 * 负责视频生成的所有逻辑，包括传统模式、多帧模式和主体参考模式
 */

import { BaseClient } from '../BaseClient.js';
import {
  VideoGenerationParams,
  VideoPostProcessUnifiedParams,
  MainReferenceVideoParams,
  FrameInterpolationParams,
  SuperResolutionParams,
  AudioEffectGenerationParams
} from '../../types/api.types.js';
import { DEFAULT_VIDEO_MODEL } from '../../types/models.js';
import { generateUuid } from '../../utils/index.js';
import { MainReferenceVideoGenerator } from './MainReferenceVideoGenerator.js';

/**
 * 视频生成器类
 * 继承BaseClient，提供视频生成的完整功能
 */
export class VideoGenerator extends BaseClient {

  // ============== 视频生成主入口 ==============

  /**
   * 即梦AI视频生成主入口
   * 支持传统模式（首尾帧）和多帧模式
   */
  public async generateVideo(params: VideoGenerationParams): Promise<string> {
    const modelName = params.model || DEFAULT_VIDEO_MODEL;
    const actualModel = this.getModel(modelName);

    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }

    // 多帧模式 vs 传统模式
    if (params.multiFrames && params.multiFrames.length > 0) {
      return await this.generateMultiFrameVideo(params, actualModel);
    } else {
      return await this.generateTraditionalVideo(params, actualModel);
    }
  }

  // ============== 异步视频生成（Feature 002-）==============

  /**
   * 异步视频生成 - 立即返回historyId而不等待完成
   * 支持传统模式（首尾帧）和多帧模式
   *
   * @param params 视频生成参数
   * @returns Promise<string> historyId - 任务唯一标识符
   *
   * @example
   * ```typescript
   * const videoGen = new VideoGenerator(token);
   * const historyId = await videoGen.generateVideoAsync({
   *   prompt: "海上升明月",
   *   resolution: "720p"
   * });
   * // 稍后使用 getImageResult(historyId) 查询状态
   * ```
   */
  public async generateVideoAsync(params: VideoGenerationParams): Promise<string> {
    console.log('🚀 [Async] 提交异步视频生成任务');

    const modelName = params.model || DEFAULT_VIDEO_MODEL;
    const actualModel = this.getModel(modelName);

    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }

    // 多帧模式 vs 传统模式
    if (params.multiFrames && params.multiFrames.length > 0) {
      return await this.generateMultiFrameVideoAsync(params, actualModel);
    } else {
      return await this.generateTraditionalVideoAsync(params, actualModel);
    }
  }

  /**
   * 异步传统视频生成 - 立即返回historyId
   */
  private async generateTraditionalVideoAsync(params: VideoGenerationParams, actualModel: string): Promise<string> {
    console.log('[DEBUG] [Async] 开始异步传统视频生成...');

    // 复用同步方法的图片上传逻辑
    let first_frame_image = undefined;
    let end_frame_image = undefined;
    if (params?.filePath) {
      let uploadResults: any[] = [];
      for (const item of params.filePath) {
        const uploadResult = await this.uploadImage(item);
        uploadResults.push(uploadResult);
      }
      if (uploadResults[0]) {
        first_frame_image = {
          format: uploadResults[0].format,
          height: uploadResults[0].height,
          id: generateUuid(),
          image_uri: uploadResults[0].uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResults[0].uri,
          width: uploadResults[0].width,
        };
      }
      if (uploadResults[1]) {
        end_frame_image = {
          format: uploadResults[1].format,
          height: uploadResults[1].height,
          id: generateUuid(),
          image_uri: uploadResults[1].uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResults[1].uri,
          width: uploadResults[1].width,
        };
      }
      if (!first_frame_image && !end_frame_image) {
        throw new Error('上传封面图片失败，请检查图片路径是否正确');
      }
    }

    const componentId = generateUuid();
    const metricsExtra = JSON.stringify({
      "enterFrom": "click",
      "isDefaultSeed": 1,
      "promptSource": "custom",
      "isRegenerate": false,
      "originSubmitId": generateUuid(),
    });

    // 使用与同步方法相同的请求结构
    const rqData = {
      "extend": {
        "root_model": end_frame_image ? 'dreamina_ic_generate_video_model_vgfm_3.0' : actualModel,
        "m_video_commerce_info": {
          benefit_type: "basic_video_operation_vgfm_v_three",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        "m_video_commerce_info_list": [{
          benefit_type: "basic_video_operation_vgfm_v_three",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        }]
      },
      "submit_id": generateUuid(),
      "metrics_extra": metricsExtra,
      "draft_content": JSON.stringify({
        "type": "draft",
        "id": generateUuid(),
        "min_version": "3.0.5",
        "is_from_tsn": true,
        "version": "3.3.2",
        "main_component_id": componentId,
        "component_list": [{
          "type": "video_base_component",
          "id": componentId,
          "min_version": "1.0.0",
          "metadata": {
            "type": "",
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now(),
            "created_did": ""
          },
          "generate_type": "gen_video",
          "aigc_mode": "workbench",
          "abilities": {
            "type": "",
            "id": generateUuid(),
            "gen_video": {
              "id": generateUuid(),
              "type": "",
              "text_to_video_params": {
                "type": "",
                "id": generateUuid(),
                "model_req_key": actualModel,
                "priority": 0,
                "seed": Math.floor(Math.random() * 100000000) + 2500000000,
                "video_aspect_ratio": params.video_aspect_ratio || "1:1",
                "video_gen_inputs": [{
                  duration_ms: params.duration_ms || 5000,
                  first_frame_image: first_frame_image,
                  end_frame_image: end_frame_image,
                  fps: params.fps || 24,
                  id: generateUuid(),
                  min_version: "3.0.5",
                  prompt: params.prompt,
                  resolution: params.resolution || "720p",
                  type: "",
                  video_mode: 2
                }]
              },
              "video_task_extra": metricsExtra,
            }
          }
        }],
      }),
    };

    const rqParams = this.generateRequestParams();

    // 发送生成请求
    console.log('[DEBUG] [Async] 提交视频生成请求...');
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    // 提取history_record_id并立即返回
    const historyId = result?.data?.aigc_data?.history_record_id;
    if (!historyId) {
      console.error('[ERROR] [Async] 未返回history_record_id', result);
      throw new Error(result?.errmsg || '未返回history_id');
    }

    console.log('[DEBUG] [Async] 返回historyId:', historyId);
    return historyId;
  }

  /**
   * 异步多帧视频生成 - 立即返回historyId
   */
  private async generateMultiFrameVideoAsync(params: VideoGenerationParams, actualModel: string): Promise<string> {
    console.log('[DEBUG] [Async] 开始异步多帧视频生成...');

    if (!params.multiFrames || params.multiFrames.length === 0) {
      throw new Error('多帧模式需要提供multiFrames参数');
    }
    if (params.multiFrames.length > 10) {
      throw new Error('多帧模式最多支持10个关键帧');
    }

    // 上传所有关键帧图片
    const uploadedFrames = [];
    for (const frame of params.multiFrames) {
      const uploadResult = await this.uploadImage(frame.image_path);
      uploadedFrames.push({
        ...frame,
        uploadedImage: {
          format: uploadResult.format,
          height: uploadResult.height,
          id: generateUuid(),
          image_uri: uploadResult.uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResult.uri,
          width: uploadResult.width,
        }
      });
    }

    const componentId = generateUuid();
    const totalDuration = params.duration_ms || uploadedFrames.reduce((sum, f) => sum + f.duration_ms, 0);

    // 构建frames数组
    const frames = uploadedFrames.map(frame => ({
      "image": frame.uploadedImage,
      "text": frame.prompt,
      "duration_ms": frame.duration_ms
    }));

    // 构建请求数据
    const rqData: any = {
      "component_list": JSON.stringify([{
        "abilities": {
          "type": "video_model",
          "id": generateUuid(),
          "enabled": true,
          "video_model_name": actualModel || "jimeng-video-3.0",
          "frames": frames,
          "fps": params.fps || 24,
          "duration_ms": totalDuration,
          "video_ratio": params.video_aspect_ratio || "3:4"
        },
        "gen_type": 2,
        "generate_type": "video",
        "id": componentId,
        "metadata": {
          "created_did": "",
          "created_platform": 1,
          "created_platform_version": "",
          "created_time_in_ms": Date.now(),
          "id": componentId,
          "type": "component"
        },
        "min_version": "0.0.0",
        "type": "component",
      }]),
      "generate_mode": "v3",
      "metrics_extra": JSON.stringify({
        "enter_from": "pc_mine_page_video",
        "creation_id": componentId,
        "prop_version": "v3",
      }),
      ...(params.req_key && {"req_key": params.req_key}),
    };

    const rqParams = this.generateRequestParams();

    // 发送生成请求
    console.log('[DEBUG] [Async] 提交多帧视频生成请求...');
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    // 提取history_record_id并立即返回
    const historyId = result?.data?.aigc_data?.history_record_id;
    if (!historyId) {
      console.error('[ERROR] [Async] 未返回history_record_id', result);
      throw new Error(result?.errmsg || '未返回history_id');
    }

    console.log('[DEBUG] [Async] 返回historyId:', historyId);
    return historyId;
  }

  // ============== 传统视频生成（首尾帧模式）==============

  /**
   * 传统视频生成 - 支持单帧或首尾帧模式
   */
  private async generateTraditionalVideo(params: VideoGenerationParams, actualModel: string): Promise<string> {
    console.log('[DEBUG] 开始传统视频生成...');

    // 传统单帧/首尾帧模式的处理逻辑
    let first_frame_image = undefined
    let end_frame_image = undefined
    if (params?.filePath) {
      let uploadResults: any[] = []
      for (const item of params.filePath) {
        const uploadResult = await this.uploadImage(item)
        uploadResults.push(uploadResult)
      }
      if (uploadResults[0]) {
        first_frame_image = {
          format: uploadResults[0].format,
          height: uploadResults[0].height,
          id: generateUuid(),
          image_uri: uploadResults[0].uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResults[0].uri,
          width: uploadResults[0].width,
        }
      }
      if (uploadResults[1]) {
        end_frame_image = {
          format: uploadResults[1].format,
          height: uploadResults[1].height,
          id: generateUuid(),
          image_uri: uploadResults[1].uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResults[1].uri,
          width: uploadResults[1].width,
        }
      }
      if (!first_frame_image && !end_frame_image) {
        throw new Error('上传封面图片失败，请检查图片路径是否正确');
      }
    }

    const componentId = generateUuid();
    const metricsExtra = JSON.stringify({
      "enterFrom": "click",
      "isDefaultSeed": 1,
      "promptSource": "custom",
      "isRegenerate": false,
      "originSubmitId": generateUuid(),
    });

    const rqData = {
      "extend": {
        "root_model": end_frame_image ? 'dreamina_ic_generate_video_model_vgfm_3.0' : actualModel,
        "m_video_commerce_info": {
          benefit_type: "basic_video_operation_vgfm_v_three",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        "m_video_commerce_info_list": [{
          benefit_type: "basic_video_operation_vgfm_v_three",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        }]
      },
      "submit_id": generateUuid(),
      "metrics_extra": metricsExtra,
      "draft_content": JSON.stringify({
        "type": "draft",
        "id": generateUuid(),
        "min_version": "3.0.5",
        "is_from_tsn": true,
        "version": "3.3.2",
        "main_component_id": componentId,
        "component_list": [{
          "type": "video_base_component",
          "id": componentId,
          "min_version": "1.0.0",
          "metadata": {
            "type": "",
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now(),
            "created_did": ""
          },
          "generate_type": "gen_video",
          "aigc_mode": "workbench",
          "abilities": {
            "type": "",
            "id": generateUuid(),
            "gen_video": {
              "id": generateUuid(),
              "type": "",
              "text_to_video_params": {
                "type": "",
                "id": generateUuid(),
                "model_req_key": actualModel,
                "priority": 0,
                "seed": Math.floor(Math.random() * 100000000) + 2500000000,
                "video_aspect_ratio": params.video_aspect_ratio || "1:1",
                "video_gen_inputs": [{
                  duration_ms: params.duration_ms || 5000,
                  first_frame_image: first_frame_image,
                  end_frame_image: end_frame_image,
                  fps: params.fps || 24,
                  id: generateUuid(),
                  min_version: "3.0.5",
                  prompt: params.prompt,
                  resolution: params.resolution || "720p",
                  type: "",
                  video_mode: 2
                }]
              },
              "video_task_extra": metricsExtra,
            }
          }
        }],
      }),
    };

    const rqParams = this.generateRequestParams();

    // 发送生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    const videoUrls = await this.pollTraditionalResultForVideo(result);
    let videoUrl;
    if (videoUrls && videoUrls.length > 0) {
      videoUrl = videoUrls[0];
    }

    console.log('[DEBUG] 传统视频生成结果:', videoUrl);
    return videoUrl || '';
  }

  // ============== 多帧视频生成 ==============

  /**
   * 多帧视频生成 - 支持多个关键帧的智能视频生成
   */
  private async generateMultiFrameVideo(params: VideoGenerationParams, actualModel: string): Promise<string> {
    console.log('[DEBUG] 开始智能多帧视频生成...');

    // 验证多帧参数
    if (!params.multiFrames || params.multiFrames.length === 0) {
      throw new Error('多帧模式需要提供multiFrames参数');
    }

    // 验证帧数量限制（实际用户提供的帧数，系统会自动添加结束帧）
    if (params.multiFrames.length > 9) {
      throw new Error(`智能多帧最多支持9个内容帧（系统会自动添加结束帧），当前提供了${params.multiFrames.length}帧`);
    }

    // 验证每个帧的参数
    for (const frame of params.multiFrames) {
      if (frame.duration_ms < 1000 || frame.duration_ms > 5000) {
        throw new Error(`帧${frame.idx}的duration_ms必须在1000-5000ms范围内（1-5秒）`);
      }
    }

    // 计算总时长（所有用户提供帧的累计时长）
    const totalDuration = params.multiFrames.reduce((sum, frame) => sum + frame.duration_ms, 0);
    console.log(`[DEBUG] 计算总时长: ${totalDuration}ms (${params.multiFrames.length}个内容帧)`);

    // 处理多帧图片上传
    const processedFrames = [];
    for (const frame of params.multiFrames) {
      const uploadResult = await this.uploadImage(frame.image_path);
      processedFrames.push({
        type: "",
        id: generateUuid(),
        idx: frame.idx,
        duration_ms: frame.duration_ms,
        prompt: frame.prompt,
        media_info: {
          type: "",
          id: generateUuid(),
          media_type: 1,
          image_info: {
            type: "image",
            id: generateUuid(),
            source_from: "upload",
            platform_type: 1,
            name: "",
            image_uri: uploadResult.uri,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            uri: uploadResult.uri
          }
        }
      });
    }

    // 添加最后一个结束帧（duration_ms: 0, prompt: ""）
    // 根据实际API调用分析，最后一帧需要是结束状态
    const lastFrame = params.multiFrames[params.multiFrames.length - 1];
    const lastUploadResult = await this.uploadImage(lastFrame.image_path);
    processedFrames.push({
      type: "",
      id: generateUuid(),
      idx: params.multiFrames.length, // 下一个idx
      duration_ms: 0, // 结束帧时长为0
      prompt: "", // 结束帧prompt为空
      media_info: {
        type: "",
        id: generateUuid(),
        media_type: 1,
        image_info: {
          type: "image",
          id: generateUuid(),
          source_from: "upload",
          platform_type: 1,
          name: "",
          image_uri: lastUploadResult.uri,
          width: lastUploadResult.width,
          height: lastUploadResult.height,
          format: lastUploadResult.format,
          uri: lastUploadResult.uri
        }
      }
    });

    console.log(`[DEBUG] 处理后的帧数量: ${processedFrames.length} (${params.multiFrames.length}内容帧 + 1结束帧)`);

    const componentId = generateUuid();
    const metricsExtra = JSON.stringify({
      "isDefaultSeed": 1,
      "originSubmitId": generateUuid(),
      "isRegenerate": false,
      "enterFrom": "click",
      "functionMode": "multi_frame"
    });

    const rqData = {
      "extend": {
        "root_model": actualModel,
        "m_video_commerce_info": {
          "benefit_type": "basic_video_operation_vgfm_v_three",
          "resource_id": "generate_video",
          "resource_id_type": "str",
          "resource_sub_type": "aigc"
        },
        "m_video_commerce_info_list": [{
          "benefit_type": "basic_video_operation_vgfm_v_three",
          "resource_id": "generate_video",
          "resource_id_type": "str",
          "resource_sub_type": "aigc"
        }]
      },
      "submit_id": generateUuid(),
      "metrics_extra": metricsExtra,
      "draft_content": JSON.stringify({
        "type": "draft",
        "id": generateUuid(),
        "min_version": "3.0.5",
        "min_features": ["AIGC_GenerateType_VideoMultiFrame"],
        "is_from_tsn": true,
        "version": "3.3.2",
        "main_component_id": componentId,
        "component_list": [{
          "type": "video_base_component",
          "id": componentId,
          "min_version": "1.0.0",
          "aigc_mode": "workbench",
          "metadata": {
            "type": "",
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now().toString(),
            "created_did": ""
          },
          "generate_type": "gen_video",
          "abilities": {
            "type": "",
            "id": generateUuid(),
            "gen_video": {
              "type": "",
              "id": generateUuid(),
              "text_to_video_params": {
                "type": "",
                "id": generateUuid(),
                "video_gen_inputs": [{
                  "type": "",
                  "id": generateUuid(),
                  "min_version": "3.0.5",
                  "prompt": params.prompt || "",
                  "video_mode": 2,
                  "fps": params.fps || 24,
                  "duration_ms": totalDuration,
                  "resolution": params.resolution || "720p",
                  "multi_frames": processedFrames,
                  "idip_meta_list": []
                }],
                "video_aspect_ratio": params.video_aspect_ratio || "3:4",
                "seed": Math.floor(Math.random() * 100000000) + 2500000000,
                "model_req_key": actualModel,
                "priority": 0
              },
              "video_task_extra": metricsExtra
            }
          },
          "process_type": 1
        }]
      }),
      "http_common_info": {
        "aid": parseInt("513695")
      }
    };

    const rqParams = this.generateRequestParams();

    // 发送生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      rqData,
      rqParams
    );

    // 使用视频专用轮询获取结果
    const videoUrls = await this.pollTraditionalResultForVideo(result);

    // 提取视频URL
    let videoUrl;
    if (videoUrls && videoUrls.length > 0) {
      videoUrl = videoUrls[0];
      console.log('[DEBUG] 多帧视频生成结果:', videoUrl);
    }

    return videoUrl || '';
  }

  // ============== 视频轮询方法 ==============

  /**
   * 视频生成结果轮询
   */
  private async pollTraditionalResultForVideo(result: any): Promise<string[]> {
    console.log('[DEBUG] 开始视频轮询');
    console.log('[DEBUG] 视频生成响应: submitId=', result?.data?.aigc_data?.task?.submit_id, 'historyId=', result?.data?.aigc_data?.history_record_id);

    // 获取正确的ID用于轮询 - 实际需要使用submit_id
    const submitId = result?.data?.aigc_data?.task?.submit_id ||
                    result?.data?.aigc_data?.submit_id ||
                    result?.data?.submit_id ||
                    result?.submit_id;

    const historyId = result?.data?.aigc_data?.history_record_id;

    if (!submitId) {
      console.error('[ERROR] 未找到有效的submit_id: submitId=', submitId, 'errmsg=', result?.errmsg);
      if (result?.errmsg) {
        throw new Error(result.errmsg);
      } else {
        throw new Error('submit_id不存在');
      }
    }

    console.log('[DEBUG] 使用的submitId:', submitId);
    console.log('[DEBUG] historyId:', historyId);

    // 轮询获取结果
    let pollCount = 0;
    let networkErrorCount = 0;

    const maxPollCount = 30;
    const maxNetworkErrors = 3;
    const overallTimeoutMs = 10 * 60 * 1000; // 10分钟总体超时
    const overallStartTime = Date.now();

    console.log('[DEBUG] 开始视频轮询，submitId:', submitId);

    while (pollCount < maxPollCount && Date.now() - overallStartTime < overallTimeoutMs) {
      // 检查网络错误次数
      if (networkErrorCount >= maxNetworkErrors) {
        console.error(`[ERROR] [VIDEO-ERROR] 网络错误次数达到限制=${networkErrorCount}, 退出视频轮询`);
        break;
      }

      pollCount++;

      // 等待时间：第一次等待久一点，后续缩短
      const waitTime = pollCount === 1 ? 60000 : 5000;

      // [DATA] 视频轮询日志 - 轮询开始
      const pollStartTime = Date.now();
      const elapsedTotal = Math.round((pollStartTime - overallStartTime) / 1000);
      console.log(`[DATA] [VIDEO-START] 轮询=${pollCount}/${maxPollCount}, 等待=${waitTime/1000}s, 总耗时=${elapsedTotal}s, 网络错误=${networkErrorCount}/${maxNetworkErrors}, Submit ID=${submitId}`);

      await new Promise(resolve => setTimeout(resolve, waitTime));

      let pollResult;
      try {
        pollResult = await this.request(
          'POST',
          '/mweb/v1/get_history_by_ids',
          { submit_ids: [submitId] },
          this.generateRequestParams()
        );
        networkErrorCount = 0; // 重置网络错误计数
      } catch (error) {
        networkErrorCount++;
        console.error(`[ERROR] [VIDEO-ERROR] 轮询=${pollCount}, 网络错误=${networkErrorCount}/${maxNetworkErrors}, 错误:`, error instanceof Error ? error.message : String(error));

        continue; // 继续下一轮询
      }

      if (!pollResult?.data || !pollResult.data[submitId]) {
        console.error(`[ERROR] 轮询响应无效，submitId=${submitId}`, 'hasData=', !!pollResult?.data, 'hasSubmitId=', !!pollResult?.data?.[submitId]);
        continue;
      }

      const record = pollResult.data[submitId];
      const status = record.common_attr?.status ?? 'unknown';
      const failCode = record.common_attr?.fail_code ?? null;

      // 获取状态相关数据
      const finishedCount = record.finished_count ?? 0;
      const totalCount = record.total_count ?? 0;
      const itemListLength = record.item_list?.length ?? 0;

      // [DATA] 视频轮询日志 - 状态数据详情
      const apiCallDuration = Date.now() - pollStartTime;
      console.log(`[DATA] [VIDEO-DATA] 轮询=${pollCount}, API耗时=${apiCallDuration}ms, 状态=${status}, 失败码=${failCode || 'null'}, 完成度=${finishedCount}/${totalCount}, 结果数=${itemListLength}`);

      // 检查是否有item_list
      const hasItemList = record.item_list && record.item_list.length > 0;
      console.log(`[DATA] [VIDEO-CHECK] 轮询=${pollCount}, 完成检查={有结果:${hasItemList}, 结果数:${itemListLength}}`);

      // 核心逻辑：如果有结果，尝试提取视频URL
      if (hasItemList) {
        const currentItemList = record.item_list as any[];
        console.log(`[DATA] [VIDEO-EXTRACT-TRY] 轮询=${pollCount}, 尝试提取视频URL, 结果数=${currentItemList.length}`);

        // 尝试提取视频URL
        const videoUrls = this.extractVideoUrls(currentItemList);

        if (videoUrls && videoUrls.length > 0) {
          console.log(`[SUCCESS] [VIDEO-DONE] 轮询=${pollCount}, 成功提取到${videoUrls.length}个视频URL`);
          return videoUrls;
        } else {
          console.log(`[DATA] [VIDEO-NO-URL] 轮询=${pollCount}, 有结果但未提取到URL，继续轮询`);
        }
      }

      // [DATA] 视频轮询日志 - 进度报告
      if (pollCount % 5 === 0) {
        const currentElapsed = Math.round((Date.now() - overallStartTime) / 1000);
        console.log(`[DATA] [VIDEO-PROGRESS] 轮询=${pollCount}/${maxPollCount}, 状态=${status}, 已用时=${currentElapsed}s, 完成度=${finishedCount}/${totalCount}, 网络错误=${networkErrorCount}`);
      }
    }

    // [DATA] 视频轮询日志 - 结束统计
    const elapsedTime = Date.now() - overallStartTime;
    const finalElapsedSec = Math.round(elapsedTime / 1000);
    console.log(`[END] [VIDEO-END] 视频轮询结束, 总轮询=${pollCount}/${maxPollCount}, 总耗时=${finalElapsedSec}s, 网络错误=${networkErrorCount}, Submit ID=${submitId}`);

    // 判断结束原因
    if (pollCount >= maxPollCount) {
      console.warn(`[TIMEOUT] [VIDEO-TIMEOUT] 达到最大轮询次数限制`);
    } else if (Date.now() - overallStartTime > overallTimeoutMs) {
      console.warn(`[TIMEOUT] [VIDEO-TIMEOUT] 达到总体时间限制`);
    } else {
      console.warn(`[TIMEOUT] [VIDEO-TIMEOUT] 网络错误过多，退出轮询`);
    }

    console.log('[DEBUG] 视频轮询结束，未找到视频URL，返回空数组');
    return [];
  }

  /**
   * 从itemList中提取视频URL
   */
  private extractVideoUrls(itemList: any[]): string[] {
    console.log('[DEBUG] 提取视频URL，itemList长度:', itemList?.length || 0);

    const resultList = (itemList || []).map((item, index) => {
      console.log(`[DEBUG] 处理视频第${index}项:`, Object.keys(item || {}));

      // 尝试多种可能的视频URL路径
      let videoUrl = item?.video?.transcoded_video?.origin?.video_url ||
                    item?.video?.video_url ||
                    item?.video?.origin?.video_url ||
                    item?.common_attr?.cover_url ||
                    item?.aigc_video_params?.video_url ||
                    item?.url ||
                    item?.video_url;

      if (videoUrl) {
        console.log(`[DEBUG] 找到视频URL:`, videoUrl.substring(0, 100));
        return videoUrl;
      }

      console.log(`[DEBUG] 第${index}项未找到有效的视频URL`);
      return null;
    }).filter(url => url !== null);

    console.log(`[DEBUG] 提取到${resultList.length}个有效视频URL`);
    return resultList as string[];
  }

  // ============== 视频后处理方法 ==============

  /**
   * 视频后处理统一入口
   * 支持补帧、超分辨率、音效生成
   */
  public async videoPostProcess(params: VideoPostProcessUnifiedParams): Promise<string> {
    console.log(`🎬 开始视频后处理: ${params.operation}`);

    switch (params.operation) {
      case 'frame_interpolation':
        if (!params.targetFps || !params.originFps) {
          throw new Error('补帧操作需要提供 targetFps 和 originFps 参数');
        }
        return await this.performFrameInterpolation({
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          targetFps: params.targetFps,
          originFps: params.originFps,
          duration: params.duration,
          refresh_token: params.refresh_token
        });

      case 'super_resolution':
        if (!params.targetWidth || !params.targetHeight || !params.originWidth || !params.originHeight) {
          throw new Error('分辨率提升操作需要提供 targetWidth, targetHeight, originWidth, originHeight 参数');
        }
        return await this.performSuperResolution({
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          targetWidth: params.targetWidth,
          targetHeight: params.targetHeight,
          originWidth: params.originWidth,
          originHeight: params.originHeight,
          refresh_token: params.refresh_token
        });

      case 'audio_effect':
        return await this.performAudioEffect({
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          refresh_token: params.refresh_token
        });

      default:
        throw new Error(`不支持的操作类型: ${params.operation}`);
    }
  }

  /**
   * 视频补帧方法 - 将低帧率视频提升至30fps或60fps
   */
  private async performFrameInterpolation(params: FrameInterpolationParams): Promise<string> {
    console.log('🎬 开始视频补帧处理...');
    console.log(`📋 补帧参数: ${params.originFps}fps -> ${params.targetFps}fps`);

    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }

    // 生成基础参数
    const submitId = generateUuid();
    const modelKey = this.getModel('jimeng-video-multiframe');
    const metricsExtra = JSON.stringify({
      promptSource: "custom",
      isDefaultSeed: 1,
      originSubmitId: submitId,
      enterFrom: "click",
      isRegenerate: false,
      functionMode: "multi_frame"
    });

    const draftContent = {
      type: "draft",
      id: generateUuid(),
      min_version: "3.1.0",
      min_features: ["AIGC_GenerateType_VideoInsertFrame", "AIGC_GenerateType_VideoMultiFrame"],
      is_from_tsn: true,
      version: "3.2.9",
      main_component_id: generateUuid(),
      component_list: [{
        type: "video_base_component",
        id: generateUuid(),
        min_version: "1.0.0",
        aigc_mode: "workbench",
        metadata: {
          type: "",
          id: generateUuid(),
          created_platform: 3,
          created_platform_version: "",
          created_time_in_ms: Date.now().toString(),
          created_did: ""
        },
        generate_type: "gen_video",
        abilities: {
          type: "",
          id: generateUuid(),
          gen_video: {
            type: "",
            id: generateUuid(),
            text_to_video_params: {
              type: "",
              id: generateUuid(),
              video_gen_inputs: [{
                type: "",
                id: generateUuid(),
                min_version: "3.0.5",
                prompt: "视频补帧处理",
                lens_motion_type: "",
                motion_speed: "",
                vid: params.videoId,
                video_mode: 2,
                fps: params.originFps,
                duration_ms: params.duration || 10000,
                template_id: 0,
                v2v_opt: {
                  type: "",
                  id: generateUuid(),
                  min_version: "3.1.0",
                  insert_frame: {
                    type: "",
                    id: generateUuid(),
                    enable: true,
                    target_fps: params.targetFps,
                    origin_fps: params.originFps,
                    duration_ms: params.duration || 10000
                  }
                },
                origin_history_id: params.originHistoryId,
                resolution: "720p"
              }]
            },
            scene: "insert_frame",
            video_task_extra: metricsExtra,
            video_ref_params: {
              type: "",
              id: generateUuid(),
              generate_type: 0,
              item_id: parseInt(params.videoId.replace('v', '')),
              origin_history_id: params.originHistoryId
            }
          },
          process_type: 3
        }
      }]
    };

    const requestData = {
      extend: {
        root_model: modelKey,
        m_video_commerce_info: {
          benefit_type: "video_frame_interpolation",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        m_video_commerce_info_list: [{
          benefit_type: "video_frame_interpolation",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        }]
      },
      submit_id: submitId,
      metrics_extra: metricsExtra,
      draft_content: JSON.stringify(draftContent),
      http_common_info: { aid: 513695 }
    };

    // 构建请求参数
    const rqParams: any = this.generateRequestParams();

    // 发送补帧请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      requestData,
      rqParams
    );

    console.log('[DEBUG] 开始轮询补帧结果...');
    const imageUrls = await this.pollTraditionalResultForVideo(result);

    // 提取视频URL
    let videoUrl;
    if (imageUrls && imageUrls.length > 0) {
      videoUrl = imageUrls[0];
    }

    console.log('🎬 补帧处理完成:', videoUrl);
    return videoUrl || '';
  }

  /**
   * 视频分辨率提升方法 - 将低分辨率视频提升至更高分辨率
   */
  private async performSuperResolution(params: SuperResolutionParams): Promise<string> {
    console.log('🎨 开始视频分辨率提升处理...');
    console.log(`📋 分辨率提升: ${params.originWidth}x${params.originHeight} -> ${params.targetWidth}x${params.targetHeight}`);

    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }

    // 生成基础参数
    const submitId = generateUuid();
    const modelKey = this.getModel('jimeng-video-multiframe');
    const metricsExtra = JSON.stringify({
      promptSource: "custom",
      isDefaultSeed: 1,
      originSubmitId: submitId,
      enterFrom: "click",
      isRegenerate: false,
      functionMode: "multi_frame"
    });

    const draftContent = {
      type: "draft",
      id: generateUuid(),
      min_version: "3.1.0",
      min_features: ["AIGC_GenerateType_VideoSuperResolution", "AIGC_GenerateType_VideoMultiFrame"],
      is_from_tsn: true,
      version: "3.2.9",
      main_component_id: generateUuid(),
      component_list: [{
        type: "video_base_component",
        id: generateUuid(),
        min_version: "1.0.0",
        aigc_mode: "workbench",
        metadata: {
          type: "",
          id: generateUuid(),
          created_platform: 3,
          created_platform_version: "",
          created_time_in_ms: Date.now().toString(),
          created_did: ""
        },
        generate_type: "gen_video",
        abilities: {
          type: "",
          id: generateUuid(),
          gen_video: {
            type: "",
            id: generateUuid(),
            text_to_video_params: {
              type: "",
              id: generateUuid(),
              video_gen_inputs: [{
                type: "",
                id: generateUuid(),
                min_version: "3.0.5",
                prompt: "视频分辨率提升处理",
                lens_motion_type: "",
                motion_speed: "",
                vid: params.videoId,
                video_mode: 2,
                fps: 24,
                duration_ms: 10000,
                template_id: 0,
                v2v_opt: {
                  type: "",
                  id: generateUuid(),
                  min_version: "3.1.0",
                  super_resolution: {
                    type: "",
                    id: generateUuid(),
                    enable: true,
                    target_width: params.targetWidth,
                    target_height: params.targetHeight,
                    origin_width: params.originWidth,
                    origin_height: params.originHeight
                  }
                },
                origin_history_id: params.originHistoryId,
                resolution: "720p"
              }]
            },
            scene: "super_resolution",
            video_task_extra: metricsExtra,
            video_ref_params: {
              type: "",
              id: generateUuid(),
              generate_type: 0,
              item_id: parseInt(params.videoId.replace('v', '')),
              origin_history_id: params.originHistoryId
            }
          },
          process_type: 2
        }
      }]
    };

    const requestData = {
      extend: {
        root_model: modelKey,
        m_video_commerce_info: {
          benefit_type: "video_upscale",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        m_video_commerce_info_list: [{
          benefit_type: "video_upscale",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        }]
      },
      submit_id: submitId,
      metrics_extra: metricsExtra,
      draft_content: JSON.stringify(draftContent),
      http_common_info: { aid: 513695 }
    };

    // 构建请求参数
    const rqParams: any = this.generateRequestParams();

    // 发送分辨率提升请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      requestData,
      rqParams
    );

    console.log('[DEBUG] 开始轮询分辨率提升结果...');
    const imageUrls = await this.pollTraditionalResultForVideo(result);

    // 提取视频URL
    let videoUrl;
    if (imageUrls && imageUrls.length > 0) {
      videoUrl = imageUrls[0];
    }

    console.log('🎨 分辨率提升完成:', videoUrl);
    return videoUrl || '';
  }

  /**
   * 视频音效生成方法 - 为已生成的视频添加AI背景音效
   */
  private async performAudioEffect(params: AudioEffectGenerationParams): Promise<string> {
    console.log('🎵 开始视频音效生成处理...');
    console.log(`📋 为视频 ${params.videoId} 生成音效`);

    // 检查积分
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }

    // 生成基础参数
    const submitId = generateUuid();
    const modelKey = this.getModel('jimeng-video-multiframe');
    const metricsExtra = JSON.stringify({
      promptSource: "custom",
      isDefaultSeed: 1,
      originSubmitId: submitId,
      enterFrom: "click",
      isRegenerate: true
    });

    // 构建父组件ID和主组件ID
    const parentComponentId = generateUuid();
    const mainComponentId = generateUuid();

    const draftContent = {
      type: "draft",
      id: generateUuid(),
      min_version: "3.1.2",
      min_features: [],
      is_from_tsn: true,
      version: "3.2.9",
      main_component_id: mainComponentId,
      component_list: [
        // 父组件：video_base_component
        {
          type: "video_base_component",
          id: parentComponentId,
          min_version: "1.0.0",
          aigc_mode: "workbench",
          gen_type: 10,
          metadata: {
            type: "",
            id: generateUuid(),
            created_platform: 3,
            created_platform_version: "",
            created_time_in_ms: Date.now().toString(),
            created_did: ""
          },
          generate_type: "gen_video",
          abilities: {
            type: "",
            id: generateUuid(),
            gen_video: {
              type: "",
              id: generateUuid(),
              text_to_video_params: {
                type: "",
                id: generateUuid(),
                video_gen_inputs: [{
                  type: "",
                  id: generateUuid(),
                  min_version: "3.0.5",
                  prompt: "测试多参考图功能",
                  first_frame_image: {
                    type: "image",
                    id: generateUuid(),
                    source_from: "upload",
                    platform_type: 1,
                    name: "",
                    image_uri: "tos-cn-i-tb4s082cfz/25f77f2bcaf64b6786562c4e168ac310",
                    width: 1728,
                    height: 2304,
                    format: "png",
                    uri: "tos-cn-i-tb4s082cfz/25f77f2bcaf64b6786562c4e168ac310"
                  },
                  end_frame_image: {
                    type: "image",
                    id: generateUuid(),
                    source_from: "upload",
                    platform_type: 1,
                    name: "",
                    image_uri: "tos-cn-i-tb4s082cfz/0ff0b4ce831444738d8a0add5b53e4b4",
                    width: 1728,
                    height: 2304,
                    format: "png",
                    uri: "tos-cn-i-tb4s082cfz/0ff0b4ce831444738d8a0add5b53e4b4"
                  },
                  video_mode: 2,
                  fps: 24,
                  duration_ms: 5000,
                  resolution: "720p"
                }],
                video_aspect_ratio: "1:1",
                seed: Math.floor(Math.random() * 100000000) + 2500000000,
                model_req_key: modelKey,
                priority: 0
              },
              video_task_extra: metricsExtra
            }
          }
        },
        // 主组件：音效生成组件
        {
          type: "video_base_component",
          id: mainComponentId,
          min_version: "1.0.0",
          parent_id: parentComponentId,
          aigc_mode: "workbench",
          metadata: {
            type: "",
            id: generateUuid(),
            created_platform: 3,
            created_platform_version: "",
            created_time_in_ms: Date.now().toString(),
            created_did: ""
          },
          generate_type: "video_audio_effect",
          abilities: {
            type: "",
            id: generateUuid(),
            video_audio_effect: {
              type: "",
              id: generateUuid(),
              min_version: "3.1.2",
              origin_history_id: parseInt(params.originHistoryId),
              origin_item_id: parseInt(params.videoId.replace('v', '')),
              video_ref_params: {
                type: "",
                id: generateUuid(),
                generate_type: 0,
                item_id: parseInt(params.videoId.replace('v', '')),
                origin_history_id: parseInt(params.originHistoryId)
              },
              video_resource: {
                type: "video",
                id: generateUuid(),
                source_from: "upload",
                name: "",
                vid: params.videoId,
                fps: 0,
                width: 832,
                height: 1120,
                duration: 5000,
                cover_image_url: ""
              }
            }
          },
          process_type: 12
        }
      ]
    };

    const requestData = {
      extend: {
        root_model: modelKey,
        m_video_commerce_info: {
          benefit_type: "video_audio_effect_generation",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        m_video_commerce_info_list: [{
          benefit_type: "video_audio_effect_generation",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        }]
      },
      submit_id: submitId,
      metrics_extra: metricsExtra,
      draft_content: JSON.stringify(draftContent),
      http_common_info: { aid: 513695 }
    };

    // 构建请求参数
    const rqParams: any = this.generateRequestParams();

    // 发送音效生成请求
    const result = await this.request(
      'POST',
      '/mweb/v1/aigc_draft/generate',
      requestData,
      rqParams
    );

    console.log('[DEBUG] 开始轮询音效生成结果...');
    const imageUrls = await this.pollTraditionalResultForVideo(result);

    // 提取视频URL
    let videoUrl;
    if (imageUrls && imageUrls.length > 0) {
      videoUrl = imageUrls[0];
    }

    console.log('🎵 音效生成完成:', videoUrl);
    return videoUrl || '';
  }

  // ============== 主体参考视频生成 ==============

  /**
   * 主体参考视频生成
   * 组合多个图片主体到一个场景
   */
  /**
   * 异步主体参考视频生成 - 立即返回historyId
   * @param params 主体参考视频生成参数
   * @returns Promise<string> historyId
   */
  public async generateMainReferenceVideoAsync(params: MainReferenceVideoParams): Promise<string> {
    console.log('🚀 [Async] 提交异步主体参考视频生成任务');
    const mainRefGen = new MainReferenceVideoGenerator();
    return await mainRefGen.generateAsync(params);
  }

  /**
   * 同步主体参考视频生成 - 等待生成完成
   */
  public async generateMainReferenceVideo(params: MainReferenceVideoParams): Promise<string> {
    const mainRefGen = new MainReferenceVideoGenerator();
    return await mainRefGen.generate(params);
  }

  /**
   * 异步视频后处理 - 立即返回historyId
   * @param params 统一后处理参数
   * @returns Promise<string> historyId
   */
  public async videoPostProcessAsync(params: VideoPostProcessUnifiedParams): Promise<string> {
    console.log('🚀 [Async] 提交异步视频后处理任务');
    // 复用同步方法的核心逻辑，但不轮询
    const { operation, videoId, originHistoryId } = params;

    // 参数验证
    if (!['frame_interpolation', 'super_resolution', 'audio_effect'].includes(operation)) {
      throw new Error(`无效的operation参数: ${operation}`);
    }

    // 根据operation类型构建请求数据
    let result;
    switch (operation) {
      case 'frame_interpolation':
        if (!params.targetFps || !params.originFps) {
          throw new Error('帧插值需要targetFps和originFps参数');
        }
        result = await this.submitFrameInterpolation(params);
        break;
      case 'super_resolution':
        if (!params.targetWidth || !params.targetHeight || !params.originWidth || !params.originHeight) {
          throw new Error('超分辨率需要targetWidth, targetHeight, originWidth, originHeight参数');
        }
        result = await this.submitSuperResolution(params);
        break;
      case 'audio_effect':
        result = await this.submitAudioEffect(params);
        break;
      default:
        throw new Error(`不支持的operation: ${operation}`);
    }

    // 提取history_record_id并立即返回
    const historyId = result?.data?.aigc_data?.history_record_id;
    if (!historyId) {
      console.error('[ERROR] [Async] 后处理未返回history_record_id', result);
      throw new Error(result?.errmsg || '未返回history_id');
    }

    console.log('[DEBUG] [Async] 后处理返回historyId:', historyId);
    return historyId;
  }

  /**
   * 提交帧插值请求（内部方法）
   */
  private async submitFrameInterpolation(params: VideoPostProcessUnifiedParams): Promise<any> {
    const componentId = generateUuid();
    const submitId = generateUuid();

    const rqData: any = {
      component_list: JSON.stringify([{
        abilities: {
          type: "video_model",
          id: generateUuid(),
          enabled: true,
          video_id: params.videoId,
          target_fps: params.targetFps,
          origin_fps: params.originFps,
          duration: params.duration
        },
        gen_type: 2,
        id: componentId,
        type: "component",
        generate_type: "frame_interpolation",
        metadata: {
          type: "component",
          id: componentId,
          created_platform: 1,
          created_time_in_ms: Date.now()
        }
      }]),
      generate_mode: "v3",
      submit_id: submitId,
      origin_history_id: params.originHistoryId
    };

    return await this.request('POST', '/mweb/v1/aigc_draft/generate', rqData, this.generateRequestParams());
  }

  /**
   * 提交超分辨率请求（内部方法）
   */
  private async submitSuperResolution(params: VideoPostProcessUnifiedParams): Promise<any> {
    const componentId = generateUuid();
    const submitId = generateUuid();

    const rqData: any = {
      component_list: JSON.stringify([{
        abilities: {
          type: "video_model",
          id: generateUuid(),
          enabled: true,
          video_id: params.videoId,
          target_width: params.targetWidth,
          target_height: params.targetHeight,
          origin_width: params.originWidth,
          origin_height: params.originHeight
        },
        gen_type: 2,
        id: componentId,
        type: "component",
        generate_type: "super_resolution",
        metadata: {
          type: "component",
          id: componentId,
          created_platform: 1,
          created_time_in_ms: Date.now()
        }
      }]),
      generate_mode: "v3",
      submit_id: submitId,
      origin_history_id: params.originHistoryId
    };

    return await this.request('POST', '/mweb/v1/aigc_draft/generate', rqData, this.generateRequestParams());
  }

  /**
   * 提交音效生成请求（内部方法）
   */
  private async submitAudioEffect(params: VideoPostProcessUnifiedParams): Promise<any> {
    const componentId = generateUuid();
    const submitId = generateUuid();

    const rqData: any = {
      component_list: JSON.stringify([{
        abilities: {
          type: "video_model",
          id: generateUuid(),
          enabled: true,
          video_id: params.videoId
        },
        gen_type: 2,
        id: componentId,
        type: "component",
        generate_type: "audio_effect",
        metadata: {
          type: "component",
          id: componentId,
          created_platform: 1,
          created_time_in_ms: Date.now()
        }
      }]),
      generate_mode: "v3",
      submit_id: submitId,
      origin_history_id: params.originHistoryId
    };

    return await this.request('POST', '/mweb/v1/aigc_draft/generate', rqData, this.generateRequestParams());
  }

  // ============== 新的视频生成方法 (Feature 005-3-1-2) ==============

  /**
   * 文生视频生成（统一async参数版本）
   *
   * @param options - 文生视频选项
   * @returns Promise<VideoTaskResult>
   *
   * @example
   * // 同步模式
   * const result = await videoGen.generateTextToVideo({
   *   prompt: "一只猫在阳光下奔跑"
   * });
   *
   * @example
   * // 异步模式
   * const result = await videoGen.generateTextToVideo({
   *   prompt: "长视频",
   *   async: true
   * });
   */

  // ============== Feature 005-3-1-2: 新的统一接口 ==============

  /**
   * 文生视频（统一async参数版本）
   *
   * @param options - 文生视频选项
   * @returns Promise<VideoTaskResult>
   *
   * @example
   * // 同步模式
   * const result = await videoGen.generateTextToVideo({
   *   prompt: "一只猫在阳光下奔跑"
   * });
   * console.log(result.videoUrl);
   *
   * @example
   * // 异步模式
   * const result = await videoGen.generateTextToVideo({
   *   prompt: "长视频",
   *   async: true
   * });
   * console.log(result.taskId);
   */
  public async generateTextToVideo(options: import('../../types/api.types.js').TextToVideoOptions): Promise<import('../../types/api.types.js').VideoTaskResult> {
    // 动态导入TextToVideoGenerator
    const { TextToVideoGenerator } = await import('./TextToVideoGenerator.js');
    const textToVideoGen = new TextToVideoGenerator(this.refreshToken);
    return await textToVideoGen.generateTextToVideo(options);
  }

  /**
   * 多帧视频生成（统一async参数版本）
   *
   * @param options - 多帧视频选项
   * @returns Promise<VideoTaskResult>
   *
   * @example
   * const result = await videoGen.generateMultiFrameVideo({
   *   frames: [
   *     { idx: 0, duration_ms: 2000, prompt: "场景A", image_path: "/a.jpg" },
   *     { idx: 1, duration_ms: 2000, prompt: "场景B", image_path: "/b.jpg" }
   *   ]
   * });
   */
  public async generateMultiFrameVideoUnified(options: import('../../types/api.types.js').MultiFrameVideoOptions): Promise<import('../../types/api.types.js').VideoTaskResult> {
    // 动态导入MultiFrameVideoGenerator
    const { MultiFrameVideoGenerator } = await import('./MultiFrameVideoGenerator.js');
    const multiFrameGen = new MultiFrameVideoGenerator(this.refreshToken);
    return await multiFrameGen.generateMultiFrameVideo(options);
  }

  /**
   * 主体参考视频生成（统一async参数版本）
   *
   * @param options - 主体参考视频选项
   * @returns Promise<VideoTaskResult>
   *
   * @example
   * const result = await videoGen.generateMainReferenceVideoUnified({
   *   referenceImages: ["/img0.jpg", "/img1.jpg"],
   *   prompt: "[图0]的猫在[图1]的地板上跑"
   * });
   */
  public async generateMainReferenceVideoUnified(options: import('../../types/api.types.js').MainReferenceVideoOptionsExtended): Promise<import('../../types/api.types.js').VideoTaskResult> {
    // 委托给MainReferenceVideoGenerator的新方法
    const mainRefGen = new MainReferenceVideoGenerator(this.refreshToken);
    return await mainRefGen.generateMainReferenceVideo(options);
  }
}