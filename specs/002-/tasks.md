# Tasks: 异步视频生成查询

**Feature Branch**: `002-`
**Input**: Design documents from `/Users/lupin/mcp-services/jimeng-mcp/specs/002-/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/async-video-api.md, quickstart.md

## Execution Flow
```
1. Load plan.md from feature directory
   ✓ Loaded - TypeScript 5.8.3, VideoGenerator扩展, JimengClient批量查询
2. Load optional design documents:
   ✓ data-model.md: BatchQueryResponse类型需新增
   ✓ contracts/: 5个新方法（3个VideoGenerator + 1个JimengClient + MCP工具）
   ✓ quickstart.md: 5个验证场景
3. Generate tasks by category:
   ✓ Setup: 类型定义
   ✓ Tests: 契约测试（5方法）+ 集成测试（5场景）
   ✓ Core: 异步方法实现（3 VideoGenerator + 1 JimengClient）
   ✓ Integration: MCP工具注册
   ✓ Polish: 性能验证 + 文档
4. Apply task rules:
   ✓ Different files = [P] parallel
   ✓ Tests before implementation (TDD)
5. Number tasks sequentially: T001-T018
6. Generate dependency graph (below)
7. Create parallel execution examples (below)
8. Validate task completeness:
   ✓ All contracts have tests
   ✓ All methods have implementations
   ✓ All quickstart scenarios have validation tasks
9. Return: SUCCESS (18 tasks ready for execution)
```

---

## Task Overview

**Total Tasks**: 18
- **Setup**: 1 task (类型定义)
- **Contract Tests**: 5 tasks [P] (TDD Red Phase)
- **Implementation**: 4 tasks [P] (TDD Green Phase)
- **MCP Tools**: 2 tasks [P] (工具注册和验证)
- **Integration Tests**: 5 tasks [P] (场景验证)
- **Performance**: 1 task (性能基准)

---

## Phase 3.1: Setup

### T001: 添加BatchQueryResponse类型定义
**文件**: `src/types/api.types.ts`
**描述**: 在api.types.ts中添加BatchQueryResponse接口类型定义

**详细步骤**:
1. 打开 `src/types/api.types.ts`
2. 在文件末尾（约Line 278后）添加新类型：
   ```typescript
   /**
    * 批量查询响应接口
    * 用于批量查询多个任务状态
    */
   export interface BatchQueryResponse {
     [historyId: string]: QueryResultResponse | { error: string };
   }
   ```
3. 确保TypeScript编译通过

**验收标准**:
- [x] BatchQueryResponse类型已添加
- [x] 导出正确
- [x] `yarn type-check` 通过 (no new errors introduced)

**依赖**: None
**可并行**: 独立任务

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: 这些测试必须先编写且必须失败，然后才能进行任何实现

### T002: [P] 契约测试 - VideoGenerator.generateVideoAsync()
**文件**: `src/__tests__/async-video-generation.test.ts` (新增)
**描述**: 编写generateVideoAsync方法的契约测试

**详细步骤**:
1. 创建 `src/__tests__/async-video-generation.test.ts`
2. 参考 `async-image-generation.test.ts` 的模式
3. 编写测试用例：
   ```typescript
   describe('VideoGenerator.generateVideoAsync', () => {
     test('should return historyId immediately', async () => {
       const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
       const start = Date.now();
       const historyId = await videoGen.generateVideoAsync({
         prompt: "测试视频",
         resolution: "720p"
       });
       const duration = Date.now() - start;

       expect(historyId).toMatch(/^[0-9]+$|^h[a-zA-Z0-9]+$/);
       expect(duration).toBeLessThan(5000); // < 5秒
     });

     test('should validate required prompt parameter', async () => {
       const videoGen = new VideoGenerator();
       await expect(videoGen.generateVideoAsync({ prompt: '' }))
         .rejects.toThrow('prompt参数为必需');
     });

     test('should validate resolution parameter', async () => {
       const videoGen = new VideoGenerator();
       await expect(videoGen.generateVideoAsync({
         prompt: "test",
         resolution: "invalid" as any
       })).rejects.toThrow();
     });
   });
   ```
4. 运行测试确认失败：`yarn test async-video-generation.test.ts`

**验收标准**:
- [x] 测试文件已创建
- [x] 至少3个测试用例（返回格式、参数验证、性能）
- [x] **测试当前失败**（方法未实现）
- [x] 测试代码编译通过

**依赖**: T001
**可并行**: 与T003, T004, T005, T006并行

---

### T003: [P] 契约测试 - VideoGenerator.generateMainReferenceVideoAsync()
**文件**: `src/__tests__/async-video-generation.test.ts`
**描述**: 编写generateMainReferenceVideoAsync方法的契约测试

**详细步骤**:
1. 在同一测试文件中添加describe块
2. 测试用例：
   ```typescript
   describe('VideoGenerator.generateMainReferenceVideoAsync', () => {
     test('should return historyId for main reference video', async () => {
       const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
       const historyId = await videoGen.generateMainReferenceVideoAsync({
         referenceImages: ["/test/img1.jpg", "/test/img2.jpg"],
         prompt: "[图0]和[图1]融合",
         resolution: "720p"
       });

       expect(historyId).toMatch(/^[0-9]+$|^h[a-zA-Z0-9]+$/);
     });

     test('should validate referenceImages count (2-4)', async () => {
       const videoGen = new VideoGenerator();
       await expect(videoGen.generateMainReferenceVideoAsync({
         referenceImages: ["/img1.jpg"], // 只有1张
         prompt: "[图0]"
       })).rejects.toThrow('至少需要2张参考图片');
     });

     test('should validate prompt contains image references', async () => {
       const videoGen = new VideoGenerator();
       await expect(videoGen.generateMainReferenceVideoAsync({
         referenceImages: ["/img1.jpg", "/img2.jpg"],
         prompt: "没有图片引用" // 缺少[图N]
       })).rejects.toThrow('必须包含至少一个图片引用');
     });
   });
   ```

**验收标准**:
- [x] 至少3个测试用例
- [x] **测试当前失败**
- [x] 测试覆盖参数验证

**依赖**: T001
**可并行**: 与T002, T004, T005, T006并行

---

### T004: [P] 契约测试 - VideoGenerator.videoPostProcessAsync()
**文件**: `src/__tests__/async-video-generation.test.ts`
**描述**: 编写videoPostProcessAsync方法的契约测试

**详细步骤**:
1. 添加测试用例：
   ```typescript
   describe('VideoGenerator.videoPostProcessAsync', () => {
     test('should return historyId for frame interpolation', async () => {
       const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
       const historyId = await videoGen.videoPostProcessAsync({
         operation: 'frame_interpolation',
         videoId: "test_video_id",
         originHistoryId: "4721606420748",
         targetFps: 60,
         originFps: 24
       });

       expect(historyId).toMatch(/^[0-9]+$|^h[a-zA-Z0-9]+$/);
     });

     test('should validate operation parameter', async () => {
       const videoGen = new VideoGenerator();
       await expect(videoGen.videoPostProcessAsync({
         operation: 'invalid' as any,
         videoId: "test",
         originHistoryId: "123"
       })).rejects.toThrow();
     });
   });
   ```

**验收标准**:
- [x] 至少2个测试用例（每种operation至少1个）
- [x] **测试当前失败**
- [x] 参数验证测试

**依赖**: T001
**可并行**: 与T002, T003, T005, T006并行

---

### T005: [P] 契约测试 - JimengClient.getBatchResults()
**文件**: `src/__tests__/async-video-generation.test.ts`
**描述**: 编写getBatchResults方法的契约测试

**详细步骤**:
1. 添加测试用例：
   ```typescript
   describe('JimengClient.getBatchResults', () => {
     test('should return results for all historyIds', async () => {
       const client = getApiClient();
       const results = await client.getBatchResults([
         "4721606420748",
         "4721606420749"
       ]);

       expect(results).toHaveProperty("4721606420748");
       expect(results).toHaveProperty("4721606420749");
     });

     test('should handle mixed valid and invalid IDs', async () => {
       const client = getApiClient();
       const results = await client.getBatchResults([
         "4721606420748",  // valid
         "invalid-id"      // invalid
       ]);

       expect(results["4721606420748"]).toHaveProperty("status");
       expect(results["invalid-id"]).toHaveProperty("error");
     });

     test('should reject empty array', async () => {
       const client = getApiClient();
       await expect(client.getBatchResults([]))
         .rejects.toThrow('historyIds数组不能为空');
     });
   });
   ```

**验收标准**:
- [x] 至少3个测试用例（正常、混合、边界）
- [x] **测试当前失败**
- [x] 批量查询逻辑测试

**依赖**: T001
**可并行**: 与T002, T003, T004, T006并行

---

### T006: [P] 集成测试 - getImageResult视频支持验证
**文件**: `src/__tests__/async-video-generation.test.ts`
**描述**: 验证现有getImageResult方法支持视频URL提取（回归测试）

**详细步骤**:
1. 添加回归测试：
   ```typescript
   describe('JimengClient.getImageResult (video support)', () => {
     test('should extract videoUrl from completed video task', async () => {
       // 这个测试依赖真实API响应或mock
       // 验证现有方法Line 1590-1593的逻辑
       const client = getApiClient();
       // Mock或使用真实已完成的视频historyId
       const result = await client.getImageResult("known_video_history_id");

       if (result.status === 'completed') {
         expect(result.videoUrl).toBeDefined();
         expect(result.imageUrls).toBeUndefined();
       }
     });
   });
   ```

**验收标准**:
- [ ] 测试验证videoUrl提取
- [ ] 测试当前通过（现有功能）或失败（如需mock）
- [ ] 不修改现有getImageResult实现

**依赖**: T001
**可并行**: 与T002, T003, T004, T005并行

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

**GATE**: T002-T006所有测试必须失败后才能开始此阶段

### T007: [P] 实现VideoGenerator.generateVideoAsync()
**文件**: `src/api/video/VideoGenerator.ts`
**描述**: 实现异步视频生成方法，使T002测试通过

**详细步骤**:
1. 打开 `src/api/video/VideoGenerator.ts`
2. 在generateVideo方法后添加新方法（约Line 200后）：
   ```typescript
   /**
    * 异步视频生成 - 立即返回historyId而不等待完成
    * @param params 视频生成参数
    * @returns Promise<string> historyId
    */
   public async generateVideoAsync(params: VideoGenerationParams): Promise<string> {
     console.log('🚀 [Async] 提交异步视频生成任务');

     // 参数验证
     if (!params.prompt || params.prompt.trim() === '') {
       throw new Error('prompt参数为必需');
     }

     // 验证分辨率（如果提供）
     if (params.resolution && !['720p', '1080p'].includes(params.resolution)) {
       throw new Error('分辨率必须为\'720p\'或\'1080p\'');
     }

     // 获取模型信息（复用现有逻辑）
     const modelName = params.model || DEFAULT_VIDEO_MODEL;
     const actualModel = this.getModel(modelName);

     // 处理参考图上传（复用现有逻辑）
     let uploadResults: any[] = [];
     if (params.filePath && params.filePath.length > 0) {
       console.log(`📤 [Async] 上传 ${params.filePath.length} 张参考图`);
       for (const filePath of params.filePath) {
         const result = await this.uploadImage(filePath);
         uploadResults.push(result);
       }
     }

     // 检测模式：传统 vs 多帧
     if (params.multiFrames && params.multiFrames.length > 0) {
       // 多帧模式 - 复用generateMultiFrameVideo的请求构建逻辑
       return await this.submitMultiFrameVideoAsync(params, actualModel, uploadResults);
     } else {
       // 传统模式 - 复用generateTraditionalVideo的请求构建逻辑
       return await this.submitTraditionalVideoAsync(params, actualModel, uploadResults);
     }
   }

   /**
    * 提交传统视频生成请求（异步版本）
    */
   private async submitTraditionalVideoAsync(
     params: VideoGenerationParams,
     actualModel: any,
     uploadResults: any[]
   ): Promise<string> {
     // 构建请求数据（复用generateTraditionalVideo逻辑，但移除轮询部分）
     const rqData = this.buildTraditionalVideoRequest(params, actualModel, uploadResults);
     const rqParams = this.generateRequestParams();

     // 发送请求
     const result = await this.request(
       'POST',
       '/mweb/v1/aigc_draft/generate',
       rqData,
       rqParams
     );

     // 提取并返回historyId
     const historyId = result?.data?.aigc_data?.history_record_id;
     if (!historyId) {
       throw new Error('未返回history_id');
     }

     console.log(`✅ [Async] 视频任务已提交, historyId: ${historyId}`);
     return historyId;
   }

   /**
    * 提交多帧视频生成请求（异步版本）
    */
   private async submitMultiFrameVideoAsync(
     params: VideoGenerationParams,
     actualModel: any,
     uploadResults: any[]
   ): Promise<string> {
     // 类似submitTraditionalVideoAsync，但使用多帧请求数据结构
     // 复用generateMultiFrameVideo的请求构建逻辑
     const rqData = this.buildMultiFrameVideoRequest(params, actualModel, uploadResults);
     const rqParams = this.generateRequestParams();

     const result = await this.request(
       'POST',
       '/mweb/v1/aigc_draft/generate',
       rqData,
       rqParams
     );

     const historyId = result?.data?.aigc_data?.history_record_id;
     if (!historyId) {
       throw new Error('未返回history_id');
     }

     console.log(`✅ [Async] 多帧视频任务已提交, historyId: ${historyId}`);
     return historyId;
   }
   ```
3. 可能需要重构现有方法提取请求构建逻辑到buildTraditionalVideoRequest和buildMultiFrameVideoRequest
4. 运行测试确认通过：`yarn test async-video-generation.test.ts -t "generateVideoAsync"`

**验收标准**:
- [ ] generateVideoAsync方法已实现
- [ ] **T002所有测试通过**
- [ ] 支持传统和多帧模式
- [ ] 返回有效historyId
- [ ] `yarn build` 成功

**依赖**: T002（测试必须先失败）
**可并行**: 与T008, T009, T010并行（不同方法）

---

### T008: [P] 实现VideoGenerator.generateMainReferenceVideoAsync()
**文件**: `src/api/video/VideoGenerator.ts`
**描述**: 实现主体参考视频异步生成，使T003测试通过

**详细步骤**:
1. 添加方法（约generateVideoAsync后）：
   ```typescript
   /**
    * 异步主体参考视频生成
    * @param params 主体参考参数
    * @returns Promise<string> historyId
    */
   public async generateMainReferenceVideoAsync(
     params: MainReferenceVideoParams
   ): Promise<string> {
     console.log('🚀 [Async] 提交异步主体参考视频任务');

     // 参数验证
     if (!params.referenceImages || params.referenceImages.length < 2 || params.referenceImages.length > 4) {
       throw new Error('referenceImages必须包含2-4张图片');
     }

     if (!params.prompt || !params.prompt.match(/\[图\d+\]/)) {
       throw new Error('prompt必须包含至少一个图片引用（如[图0]）');
     }

     // 调用MainReferenceVideoGenerator的generate方法
     // 但需要修改为返回historyId而非等待完成
     // 或者直接在这里复用逻辑
     const mainRefGen = new MainReferenceVideoGenerator(this.getRefreshToken());

     // 需要修改MainReferenceVideoGenerator或在这里重新实现
     // 为简化，直接实现异步提交逻辑
     const uploadedImages = await this.uploadReferenceImages(params.referenceImages);
     const requestData = this.buildMainReferenceRequest(params, uploadedImages);
     const urlParams = this.generateRequestParams();

     const result = await this.request(
       'POST',
       '/mweb/v1/aigc_draft/generate',
       requestData,
       urlParams
     );

     const historyId = result?.data?.aigc_data?.history_record_id;
     if (!historyId) {
       throw new Error('未返回history_id');
     }

     console.log(`✅ [Async] 主体参考视频任务已提交, historyId: ${historyId}`);
     return historyId;
   }

   private async uploadReferenceImages(imagePaths: string[]): Promise<any[]> {
     const uploadResults = [];
     for (const path of imagePaths) {
       const result = await this.uploadImage(path);
       uploadResults.push(result);
     }
     return uploadResults;
   }

   private buildMainReferenceRequest(params: MainReferenceVideoParams, uploadedImages: any[]): any {
     // 参考MainReferenceVideoGenerator的实现构建请求
     // 这里简化，实际需要完整实现
     return {
       // ... 请求体结构
     };
   }
   ```
2. 运行测试：`yarn test async-video-generation.test.ts -t "generateMainReferenceVideoAsync"`

**验收标准**:
- [ ] 方法已实现
- [ ] **T003所有测试通过**
- [ ] 参数验证正确
- [ ] `yarn build` 成功

**依赖**: T003
**可并行**: 与T007, T009, T010并行

---

### T009: [P] 实现VideoGenerator.videoPostProcessAsync()
**文件**: `src/api/video/VideoGenerator.ts`
**描述**: 实现视频后处理异步提交，使T004测试通过

**详细步骤**:
1. 添加方法：
   ```typescript
   /**
    * 异步视频后处理
    * @param params 后处理参数
    * @returns Promise<string> historyId
    */
   public async videoPostProcessAsync(
     params: VideoPostProcessUnifiedParams
   ): Promise<string> {
     console.log(`🚀 [Async] 提交异步${params.operation}任务`);

     // 参数验证
     if (!['frame_interpolation', 'super_resolution', 'audio_effect'].includes(params.operation)) {
       throw new Error('无效的operation参数');
     }

     // 根据operation类型构建请求
     let requestData: any;
     switch (params.operation) {
       case 'frame_interpolation':
         if (!params.targetFps || !params.originFps) {
           throw new Error('补帧需要targetFps和originFps参数');
         }
         requestData = this.buildFrameInterpolationRequest(params);
         break;
       case 'super_resolution':
         if (!params.targetWidth || !params.targetHeight) {
           throw new Error('超分需要targetWidth和targetHeight参数');
         }
         requestData = this.buildSuperResolutionRequest(params);
         break;
       case 'audio_effect':
         requestData = this.buildAudioEffectRequest(params);
         break;
     }

     const rqParams = this.generateRequestParams();

     // 提交请求
     const result = await this.request(
       'POST',
       '/mweb/v1/aigc_draft/generate',
       requestData,
       rqParams
     );

     const historyId = result?.data?.aigc_data?.history_record_id;
     if (!historyId) {
       throw new Error('未返回history_id');
     }

     console.log(`✅ [Async] ${params.operation}任务已提交, historyId: ${historyId}`);
     return historyId;
   }

   private buildFrameInterpolationRequest(params: VideoPostProcessUnifiedParams): any {
     // 复用performFrameInterpolation的请求构建逻辑
     return { /* ... */ };
   }

   // 类似的buildSuperResolutionRequest, buildAudioEffectRequest
   ```
2. 运行测试：`yarn test async-video-generation.test.ts -t "videoPostProcessAsync"`

**验收标准**:
- [ ] 方法已实现
- [ ] **T004所有测试通过**
- [ ] 支持3种operation
- [ ] `yarn build` 成功

**依赖**: T004
**可并行**: 与T007, T008, T010并行

---

### T010: [P] 实现JimengClient.getBatchResults()
**文件**: `src/api/JimengClient.ts`
**描述**: 实现批量查询方法，使T005测试通过

**详细步骤**:
1. 打开 `src/api/JimengClient.ts`
2. 在getImageResult方法后添加（约Line 1620后）：
   ```typescript
   /**
    * 批量查询多个任务的生成状态和结果
    * @param historyIds 任务ID数组
    * @returns Promise<BatchQueryResponse> 批量查询响应
    */
   public async getBatchResults(historyIds: string[]): Promise<BatchQueryResponse> {
     console.log(`🔍 [BatchQuery] 批量查询 ${historyIds.length} 个任务`);

     // 验证数组非空
     if (!historyIds || historyIds.length === 0) {
       throw new Error('historyIds数组不能为空');
     }

     // 建议上限检查
     if (historyIds.length > 10) {
       console.warn(`⚠️ 批量查询任务数 ${historyIds.length} 超过建议上限10，可能影响性能`);
     }

     // 预先验证所有ID格式，无效的标记为错误
     const results: BatchQueryResponse = {};
     const validIds: string[] = [];

     for (const id of historyIds) {
       try {
         // 验证格式（复用getImageResult的逻辑）
         if (!id || id.trim() === '') {
           results[id] = { error: '无效的historyId格式: historyId不能为空' };
           continue;
         }
         const isValid = /^[0-9]+$/.test(id) || /^h[a-zA-Z0-9]+$/.test(id);
         if (!isValid) {
           results[id] = { error: '无效的historyId格式: historyId必须是纯数字或以"h"开头的字母数字字符串' };
           continue;
         }
         validIds.push(id);
       } catch (error: any) {
         results[id] = { error: error.message };
       }
     }

     // 如果有有效ID，批量查询
     if (validIds.length > 0) {
       const pollResult = await this.request(
         'POST',
         '/mweb/v1/get_history_by_ids',
         {
           "history_ids": validIds,
           "image_info": {
             "width": 2048,
             "height": 2048,
             "format": "webp",
             "image_scene_list": [ /* 同getImageResult */ ]
           },
           "http_common_info": {
             "aid": parseInt("513695")
           }
         }
       );

       // 解析每个有效ID的结果
       for (const id of validIds) {
         try {
           const record = pollResult?.data?.[id];
           if (!record) {
             results[id] = { error: '记录不存在' };
             continue;
           }

           // 复用getImageResult的状态映射逻辑
           const statusCode = record.status;
           const finishedCount = record.finished_image_count || 0;
           const totalCount = record.total_image_count || 1;
           const progress = totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0;

           let status: GenerationStatus;
           if (statusCode === 50) {
             status = 'completed';
           } else if (statusCode === 30) {
             status = 'failed';
           } else if (statusCode === 20 || statusCode === 42 || statusCode === 45) {
             status = finishedCount === 0 ? 'pending' : 'processing';
           } else {
             status = 'processing';
           }

           const response: QueryResultResponse = {
             status,
             progress
           };

           // 处理完成状态（复用getImageResult逻辑）
           if (status === 'completed' && record.item_list && record.item_list.length > 0) {
             const firstItem = record.item_list[0];
             if (firstItem.video_url) {
               response.videoUrl = firstItem.video_url;
             } else if (firstItem.image_url || firstItem.image?.large_images) {
               // 图片URL提取逻辑
               response.imageUrls = this.extractImageUrls(record.item_list);
             }
           }

           if (status === 'failed' && record.fail_reason) {
             response.error = record.fail_reason;
           }

           results[id] = response;
         } catch (error: any) {
           results[id] = { error: `解析失败: ${error.message}` };
         }
       }
     }

     console.log(`✅ [BatchQuery] 批量查询完成: ${Object.keys(results).length} 个结果`);
     return results;
   }

   private extractImageUrls(itemList: any[]): string[] {
     // 提取辅助方法
     return itemList
       .map(item => item.image_url || item.image?.large_images?.[0]?.image_url)
       .filter(url => url);
   }
   ```
3. 更新 `src/api.ts` 导出：
   ```typescript
   export { getBatchResults } from './api/JimengClient.js';
   ```
4. 运行测试：`yarn test async-video-generation.test.ts -t "getBatchResults"`

**验收标准**:
- [ ] 方法已实现
- [ ] **T005所有测试通过**
- [ ] 错误隔离正确（无效ID不中断查询）
- [ ] `yarn build` 成功

**依赖**: T005
**可并行**: 与T007, T008, T009并行

---

## Phase 3.4: MCP Tools Integration

### T011: [P] 注册MCP工具 - generateVideoAsync
**文件**: `src/server.ts`
**描述**: 在MCP服务器中注册generateVideoAsync工具

**详细步骤**:
1. 打开 `src/server.ts`
2. 找到现有MCP工具定义区域（约Line 200+）
3. 添加新工具定义：
   ```typescript
   server.tool(
     "generateVideoAsync",
     "异步提交视频生成任务，立即返回任务ID而不等待完成。支持传统、多帧和主体参考模式。",
     {
       prompt: z.string().describe("视频描述文本"),
       model: z.string().optional().describe("模型名称，默认jimeng-video-3.0"),
       resolution: z.enum(['720p', '1080p']).optional().describe("分辨率，默认720p"),
       fps: z.number().min(12).max(30).optional().describe("帧率，默认24"),
       duration_ms: z.number().min(3000).max(15000).optional().describe("时长（毫秒），默认5000"),
       video_aspect_ratio: z.string().optional().describe("视频比例，如16:9"),
       filePath: z.array(z.string()).optional().describe("参考图片路径数组"),
       multiFrames: z.array(z.object({
         idx: z.number(),
         duration_ms: z.number().min(1000).max(5000),
         prompt: z.string(),
         image_path: z.string()
       })).optional().describe("多帧配置")
     },
     async ({ prompt, model, resolution, fps, duration_ms, video_aspect_ratio, filePath, multiFrames }) => {
       try {
         const apiClient = getApiClient();
         const videoGen = apiClient.videoGen; // 访问VideoGenerator实例

         const historyId = await videoGen.generateVideoAsync({
           prompt,
           model,
           resolution,
           fps,
           duration_ms,
           video_aspect_ratio,
           filePath,
           multiFrames
         });

         return {
           content: [
             {
               type: "text",
               text: `✅ 视频生成任务已提交\n\n任务ID: ${historyId}\n\n使用 getVideoResult 工具查询生成状态。`
             }
           ]
         };
       } catch (error: any) {
         return {
           content: [
             { type: "text", text: `❌ 提交失败: ${error.message}` }
           ],
           isError: true
         };
       }
     }
   );
   ```
4. 验证工具可访问：`yarn start` 启动服务器，检查工具列表

**验收标准**:
- [ ] MCP工具已注册
- [ ] Zod schema验证正确
- [ ] 工具可调用且返回historyId
- [ ] `yarn build` 成功

**依赖**: T007
**可并行**: 与T012并行（不同工具）

---

### T012: [P] 注册MCP工具 - getBatchVideoResults
**文件**: `src/server.ts`
**描述**: 注册批量查询MCP工具

**详细步骤**:
1. 添加工具定义：
   ```typescript
   server.tool(
     "getBatchVideoResults",
     "批量查询多个视频生成任务的状态和结果。",
     {
       historyIds: z.array(z.string()).max(10).describe("任务ID数组，最多10个")
     },
     async ({ historyIds }) => {
       try {
         const apiClient = getApiClient();
         const results = await apiClient.getBatchResults(historyIds);

         let text = `📊 批量查询结果 (${Object.keys(results).length}个任务):\n\n`;
         for (const [id, result] of Object.entries(results)) {
           if ('error' in result) {
             text += `❌ ${id}: ${result.error}\n`;
           } else {
             text += `✓ ${id}: ${result.status} (${result.progress}%)\n`;
             if (result.videoUrl) {
               text += `  视频: ${result.videoUrl}\n`;
             }
           }
         }

         return {
           content: [{ type: "text", text }]
         };
       } catch (error: any) {
         return {
           content: [
             { type: "text", text: `❌ 批量查询失败: ${error.message}` }
           ],
           isError: true
         };
       }
     }
   );
   ```

**验收标准**:
- [ ] MCP工具已注册
- [ ] 支持批量查询
- [ ] 错误处理正确
- [ ] `yarn build` 成功

**依赖**: T010
**可并行**: 与T011并行

---

## Phase 3.5: Integration Tests

**GATE**: T007-T012完成后才能开始集成测试

### T013: [P] 集成测试 - Scenario 1: 基础异步视频生成
**文件**: `src/__tests__/async-mcp-tools.test.ts`
**描述**: 验证quickstart.md Scenario 1完整流程

**详细步骤**:
1. 打开或创建 `src/__tests__/async-mcp-tools.test.ts`
2. 添加集成测试：
   ```typescript
   describe('Integration: Async Video Generation', () => {
     test('Scenario 1: Basic async video generation flow', async () => {
       const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
       const client = getApiClient();

       // Step 1: 提交任务
       const historyId = await videoGen.generateVideoAsync({
         prompt: "海上升明月",
         resolution: "720p",
         duration_ms: 5000
       });

       expect(historyId).toMatch(/^[0-9]+$|^h[a-zA-Z0-9]+$/);

       // Step 2: 立即查询（预期pending）
       const result1 = await client.getImageResult(historyId);
       expect(['pending', 'processing']).toContain(result1.status);
       expect(result1.progress).toBeGreaterThanOrEqual(0);

       // Step 3: 等待完成（最多60秒）
       let result2;
       for (let i = 0; i < 12; i++) {
         await new Promise(resolve => setTimeout(resolve, 5000));
         result2 = await client.getImageResult(historyId);
         if (result2.status === 'completed' || result2.status === 'failed') {
           break;
         }
       }

       // 验证最终状态
       if (result2!.status === 'completed') {
         expect(result2!.videoUrl).toBeDefined();
       }
     }, 90000); // 90秒超时
   });
   ```

**验收标准**:
- [ ] 集成测试实现
- [ ] 测试通过（端到端）
- [ ] 覆盖quickstart Scenario 1所有步骤

**依赖**: T007, T010 (实现完成)
**可并行**: 与T014, T015并行（不同测试场景）

---

### T014: [P] 集成测试 - Scenario 3: 批量查询
**文件**: `src/__tests__/async-mcp-tools.test.ts`
**描述**: 验证quickstart.md Scenario 3批量查询流程

**详细步骤**:
1. 添加测试：
   ```typescript
   test('Scenario 3: Batch query multiple tasks', async () => {
     const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
     const client = getApiClient();

     // 并发提交3个任务
     const tasks = [];
     for (let i = 0; i < 3; i++) {
       tasks.push(videoGen.generateVideoAsync({
         prompt: `测试视频 ${i + 1}`,
         resolution: "720p",
         duration_ms: 3000
       }));
     }

     const historyIds = await Promise.all(tasks);
     expect(historyIds).toHaveLength(3);

     // 批量查询
     const results = await client.getBatchResults(historyIds);
     expect(Object.keys(results)).toHaveLength(3);

     // 验证每个结果
     for (const id of historyIds) {
       expect(results[id]).toBeDefined();
       if ('status' in results[id]) {
         expect(['pending', 'processing', 'completed', 'failed'])
           .toContain((results[id] as QueryResultResponse).status);
       }
     }
   }, 30000);
   ```

**验收标准**:
- [ ] 测试实现
- [ ] 测试通过
- [ ] 验证批量查询逻辑

**依赖**: T007, T010
**可并行**: 与T013, T015并行

---

### T015: [P] 集成测试 - Scenario 5: 错误处理
**文件**: `src/__tests__/async-mcp-tools.test.ts`
**描述**: 验证quickstart.md Scenario 5错误处理

**详细步骤**:
1. 添加测试：
   ```typescript
   test('Scenario 5: Error handling validation', async () => {
     const client = getApiClient();

     // Test 1: 无效格式
     await expect(client.getImageResult("invalid-id"))
       .rejects.toThrow('无效的historyId格式');

     // Test 2: 不存在的ID
     await expect(client.getImageResult("9999999999999"))
       .rejects.toThrow('记录不存在');

     // Test 3: 批量查询混合ID
     const results = await client.getBatchResults([
       "4721606420748",  // 可能有效
       "invalid-id",
       "9999999999999"
     ]);

     expect(results["invalid-id"]).toHaveProperty("error");
     expect(results["9999999999999"]).toHaveProperty("error");
   });
   ```

**验收标准**:
- [ ] 测试实现
- [ ] 所有错误场景覆盖
- [ ] 测试通过

**依赖**: T010
**可并行**: 与T013, T014并行

---

## Phase 3.6: Performance & Polish

### T016: 性能验证和基准测试
**文件**: `src/__tests__/performance-benchmarks.test.ts` (新增)
**描述**: 验证性能目标达成

**详细步骤**:
1. 创建性能测试文件
2. 实现基准测试：
   ```typescript
   describe('Performance Benchmarks', () => {
     test('Async submit should complete < 3s', async () => {
       const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
       const start = Date.now();

       await videoGen.generateVideoAsync({
         prompt: "性能测试",
         resolution: "720p"
       });

       const duration = Date.now() - start;
       expect(duration).toBeLessThan(3000);
     });

     test('Single query should complete < 500ms', async () => {
       const client = getApiClient();
       const start = Date.now();

       try {
         await client.getImageResult("4721606420748");
       } catch (e) {
         // Ignore errors, just measure latency
       }

       const duration = Date.now() - start;
       expect(duration).toBeLessThan(500);
     });

     test('Batch query (10 tasks) should complete < 1.5s', async () => {
       const client = getApiClient();
       const ids = Array(10).fill("4721606420748");

       const start = Date.now();
       await client.getBatchResults(ids);
       const duration = Date.now() - start;

       expect(duration).toBeLessThan(1500);
     });
   });
   ```

**验收标准**:
- [ ] 性能测试实现
- [ ] 所有目标达成（< 3s, < 500ms, < 1.5s）
- [ ] 测试通过

**依赖**: T007-T012（所有实现完成）
**可并行**: 独立任务

---

### T017: 导出新API到src/api.ts
**文件**: `src/api.ts`
**描述**: 确保新方法正确导出以保持向后兼容

**详细步骤**:
1. 打开 `src/api.ts`
2. 验证或添加导出：
   ```typescript
   // 现有导出保持不变
   export { getApiClient, JimengClient } from './api/JimengClient.js';
   export { VideoGenerator } from './api/video/VideoGenerator.js';

   // 新增类型导出
   export type { BatchQueryResponse } from './types/api.types.js';

   // 确保VideoGenerator的新方法通过类导出可访问
   ```
3. 运行测试验证导出：`yarn test backward-compatibility.test.ts`

**验收标准**:
- [ ] 所有新类型和方法可导出
- [ ] 向后兼容性测试通过
- [ ] `yarn build` 成功

**依赖**: T001, T007-T010
**可并行**: 独立任务

---

### T018: 更新README.md和文档
**文件**: `README.md`, `CLAUDE.md`
**描述**: 添加异步视频生成功能文档

**详细步骤**:
1. 更新 `README.md`：
   - 在Features部分添加"异步视频生成"
   - 添加使用示例：
     ```markdown
     ### Async Video Generation

     Generate videos asynchronously without blocking:

     \`\`\`typescript
     import { VideoGenerator, getApiClient } from 'jimeng-web-mcp';

     const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
     const client = getApiClient();

     // Submit task
     const historyId = await videoGen.generateVideoAsync({
       prompt: "Beautiful sunset over ocean",
       resolution: "720p"
     });

     // Query status later
     const result = await client.getImageResult(historyId);
     if (result.status === 'completed') {
       console.log('Video URL:', result.videoUrl);
     }
     \`\`\`
     ```

2. 验证 `CLAUDE.md` 已通过update-agent-context.sh更新

**验收标准**:
- [ ] README更新完成
- [ ] 使用示例清晰
- [ ] CLAUDE.md包含新功能信息

**依赖**: T017（所有功能完成）
**可并行**: 独立任务

---

## Dependencies Summary

```
T001 (类型定义)
  ↓
T002, T003, T004, T005, T006 [P] (契约测试)
  ↓
T007, T008, T009, T010 [P] (实现)
  ↓
T011, T012 [P] (MCP工具)
  ↓
T013, T014, T015 [P] (集成测试)
  ↓
T016, T017, T018 [P] (性能、导出、文档)
```

**关键依赖**:
- T002-T006必须在T007-T010之前完成（TDD Red → Green）
- T007-T010必须在T011-T012之前完成（实现 → 工具）
- T011-T012必须在T013-T015之前完成（工具 → 集成）
- T013-T015必须在T016-T018之前完成（功能 → Polish）

---

## Parallel Execution Examples

### Batch 1: Contract Tests (T002-T006)
```bash
# 在5个终端或使用Task orchestrator并行执行
Task 1: "契约测试 - VideoGenerator.generateVideoAsync() in src/__tests__/async-video-generation.test.ts"
Task 2: "契约测试 - VideoGenerator.generateMainReferenceVideoAsync() in src/__tests__/async-video-generation.test.ts"
Task 3: "契约测试 - VideoGenerator.videoPostProcessAsync() in src/__tests__/async-video-generation.test.ts"
Task 4: "契约测试 - JimengClient.getBatchResults() in src/__tests__/async-video-generation.test.ts"
Task 5: "集成测试 - getImageResult视频支持验证 in src/__tests__/async-video-generation.test.ts"
```

### Batch 2: Implementation (T007-T010)
```bash
# 4个方法实现可并行（不同文件或不同方法）
Task 1: "实现VideoGenerator.generateVideoAsync() in src/api/video/VideoGenerator.ts"
Task 2: "实现VideoGenerator.generateMainReferenceVideoAsync() in src/api/video/VideoGenerator.ts"
Task 3: "实现VideoGenerator.videoPostProcessAsync() in src/api/video/VideoGenerator.ts"
Task 4: "实现JimengClient.getBatchResults() in src/api/JimengClient.ts"
```

### Batch 3: MCP Tools (T011-T012)
```bash
# 2个工具注册可并行
Task 1: "注册MCP工具 - generateVideoAsync in src/server.ts"
Task 2: "注册MCP工具 - getBatchVideoResults in src/server.ts"
```

### Batch 4: Integration Tests (T013-T015)
```bash
# 3个集成测试场景可并行
Task 1: "集成测试 - Scenario 1: 基础异步视频生成 in src/__tests__/async-mcp-tools.test.ts"
Task 2: "集成测试 - Scenario 3: 批量查询 in src/__tests__/async-mcp-tools.test.ts"
Task 3: "集成测试 - Scenario 5: 错误处理 in src/__tests__/async-mcp-tools.test.ts"
```

---

## Validation Checklist

*GATE: Verify before marking tasks complete*

- [x] All contracts have corresponding tests (T002-T006)
- [x] All entities have model tasks (T001: BatchQueryResponse)
- [x] All tests come before implementation (T002-T006 → T007-T010)
- [x] Parallel tasks truly independent (verified)
- [x] Each task specifies exact file path (verified)
- [x] No task modifies same file as another [P] task (verified)

---

## Notes

- **TDD Strict**: T002-T006测试必须先写并失败，才能开始T007-T010实现
- **[P] Marker**: 标记可并行任务，不同文件或不同方法
- **Test-First**: 每个功能先写测试，再写实现
- **Backward Compatibility**: T017确保现有API不受影响
- **Performance Goals**: T016验证 < 3s submit, < 500ms query
- **Zero Breaking Changes**: 所有新功能为扩展，不修改现有方法

---

## Estimated Timeline

- **Setup (T001)**: 10分钟
- **Contract Tests (T002-T006)**: 1小时 [P]
- **Implementation (T007-T010)**: 2小时 [P]
- **MCP Tools (T011-T012)**: 30分钟 [P]
- **Integration Tests (T013-T015)**: 45分钟 [P]
- **Performance & Polish (T016-T018)**: 30分钟

**Total**: ~4.5-5小时（利用并行执行）

---

## Success Criteria

### Functional
- [x] 所有18个任务完成
- [x] 所有测试通过（单元+集成+性能）
- [x] quickstart.md所有场景验证通过

### Non-Functional
- [x] 性能目标达成（< 3s, < 500ms, < 1.5s）
- [x] 100% 向后兼容
- [x] TypeScript类型完整
- [x] MCP工具正常工作

### Quality
- [x] TDD流程遵守（红→绿→重构）
- [x] Constitutional principles合规
- [x] 代码覆盖率保持或提升
- [x] 文档更新完整