import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateImage, generateVideo, frameInterpolation, superResolution } from "./api.js";

// 🚀 [MCP DEBUG] Server startup logging
console.error('🚀 [MCP DEBUG] server.ts loaded at:', new Date().toISOString());
console.error('🚀 [MCP DEBUG] Node.js version:', process.version);
console.error('🚀 [MCP DEBUG] Working directory:', process.cwd());
console.error('🚀 [MCP DEBUG] Environment token available:', !!process.env.JIMENG_API_TOKEN);
console.error('🚀 [MCP DEBUG] Environment token length:', process.env.JIMENG_API_TOKEN?.length || 'N/A');

// 定义服务器返回类型接口
export interface ServerInstance {
  server: McpServer;
  transport: StdioServerTransport;
}

// 创建MCP服务器
export const createServer = (): McpServer => {
  console.error('🚀 [MCP DEBUG] Creating MCP server instance...');
  
  const server = new McpServer({
    name: "Jimeng MCP Server",
    version: "1.0.0"
  });
  
  console.error('🚀 [MCP DEBUG] MCP server instance created successfully');

  // 🔧 测试连接工具
  // 功能：测试MCP连接是否正常，验证服务器基本功能
  // 用途：诊断连接问题，确认服务器运行状态
  server.tool(
    "hello",
    { 
      description: "🔧 连接测试工具 - 验证JiMeng MCP服务器连接状态和基本功能。用于诊断连接问题，确认服务器正常运行。返回问候信息表示连接成功。",
      name: z.string().describe("要问候的姓名。可以是任意字符串，用于个性化返回信息") 
    },
    async ({ name }) => ({
      content: [{ type: "text", text: `你好，${name}！JiMeng MCP 服务器运行正常。` }]
    })
  );

  // 🎨 JiMeng AI 图像生成工具
  // 
  // 【核心功能】
  // - 文本到图像生成：基于文字描述生成高质量AI图像
  // - 单参考图混合：使用1张参考图片与文字描述结合生成新图像(##前缀)
  // - 多参考图融合：支持多张图片(最多4张)同时作为参考进行创作(####前缀)
  // - 多模型选择：支持最新jimeng-4.0到经典jimeng-xl-pro等多个模型
  // 
  // 【模型推荐】
  // - jimeng-4.0 (推荐)：最新模型，细节丰富，支持复杂场景和多参考图
  // - jimeng-3.0：艺术风格佳，适合创意插画和概念设计  
  // - jimeng-2.1：平衡性好，适合日常图像生成需求
  // - jimeng-xl-pro：经典模型，生成速度快，质量稳定
  // 
  // 【提示词技巧】
  // ✅ 好的提示词：
  //   "一只橘色小猫坐在阳光透过的窗台上，毛发细腻，眼神温柔，暖色调，电影级光线，高清细节，8K"
  // ❌ 普通提示词：
  //   "猫"
  // 
  // 【参考图混合指南】
  // • 单参考图模式：filePath: "path/to/image.jpg"
  //   - 提示词自动添加##前缀，适合风格转换和图像变体
  // • 多参考图模式：filePath: ["img1.jpg", "img2.jpg", "img3.jpg"]
  //   - 提示词自动添加####前缀，可融合多个图像特征
  //   - 最多支持4张参考图，越多图片融合效果越复杂
  // • sample_strength 参数控制：
  //   - 0.3-0.5：强保留原图特征，适合风格转换
  //   - 0.5-0.7：均衡混合，推荐日常使用
  //   - 0.7-0.9：创意变化大，适合艺术创作
  // 
  // 【宽高比选择指南】
  // • 社交媒体：1:1 (Instagram), 9:16 (抖音/短视频)
  // • 横屏内容：16:9 (视频缩略图), 21:9 (电影感)
  // • 传统摄影：3:2 (相机比例), 4:3 (经典构图)
  // • 竖屏设计：3:4 (肖像), 2:3 (书籍封面)
  console.error('🚀 [MCP DEBUG] Registering generateImage tool...');
  
  server.tool(
    "generateImage",
    {
      description: "🎨 JiMeng AI图像生成工具 - 基于文字描述生成高质量AI图像，支持单/多参考图混合和多种模型。推荐jimeng-4.0模型，支持最多4张参考图同时融合。支持1:1、16:9、9:16等多种宽高比。多参考图模式可创造复杂的视觉融合效果。",
      filePath: z.union([
        z.string(), 
        z.array(z.string())
      ]).optional().describe("参考图片路径或URL（可选）。单参考图：字符串路径；多参考图：字符串数组。支持本地文件和网络URL。单图适合风格转换，多图可实现复杂混合创作。多参考图会在提示词前自动添加####前缀。"),
      prompt: z.string().describe("图像生成的文字描述。详细描述能获得更好效果，建议包含：主体、风格、光线、色彩、质量等要素。如：'一只橘色小猫坐在阳光透过的窗台上，毛发细腻，暖色调，电影级光线，高清细节，8K'"),
      model: z.string().optional().describe("AI模型选择。可选值: jimeng-4.0(最新推荐), jimeng-3.0(艺术风格), jimeng-2.1(平衡性好), jimeng-2.0-pro, jimeng-2.0, jimeng-1.4, jimeng-xl-pro(经典快速)。默认jimeng-4.0"),
      aspectRatio: z.string().optional().default("auto").describe("宽高比预设。选项: auto(智能1024x1024), 1:1(正方形2048x2048), 16:9(宽屏2560x1440), 9:16(竖屏1440x2560), 3:4(肖像1728x2304), 4:3(传统2304x1728), 3:2(摄影2496x1664), 2:3(书籍1664x2496), 21:9(超宽屏3024x1296)"),
      sample_strength: z.number().min(0).max(1).optional().default(0.5).describe("参考图影响强度(0-1)。0.3-0.5保留原图特征适合风格转换，0.5-0.7均衡混合推荐日常使用，0.7-0.9创意变化大适合艺术创作。默认0.5"),
      negative_prompt: z.string().optional().default("").describe("负向提示词，指定不希望出现的内容。如：'模糊，低质量，变形，多余的手指，噪点'。有助于提高生成质量和避免常见问题。"),
    },
    async (params) => {
      // 🔥 [MCP DEBUG] Tool call entry point - this is the CRITICAL debugging point
      console.error('🔥 [MCP DEBUG] =================================');
      console.error('🔥 [MCP DEBUG] generateImage tool called!');
      console.error('🔥 [MCP DEBUG] Timestamp:', new Date().toISOString());
      console.error('🔥 [MCP DEBUG] Raw params received:', JSON.stringify(params, null, 2));
      console.error('🔥 [MCP DEBUG] =================================');
      try {
        // 🔍 Debug logging - 记录MCP接收到的原始参数
        console.log('🔍 [MCP Server] Received raw parameters:', JSON.stringify(params, null, 2));
        
        // 🔍 Debug logging - 记录环境变量状态
        const hasToken = !!process.env.JIMENG_API_TOKEN;
        console.log('🔍 [MCP Server] Environment token available:', hasToken);
        if (hasToken) {
          console.log('🔍 [MCP Server] Token length:', process.env.JIMENG_API_TOKEN?.length);
        }
        
        // 🔍 Debug logging - 记录参数验证后的状态
        console.log('🔍 [MCP Server] Validated parameters for API call:');
        console.log('  - filePath:', params.filePath || 'undefined');
        console.log('  - prompt:', params.prompt ? `"${params.prompt.substring(0, 50)}..."` : 'undefined');
        console.log('  - model:', params.model || 'undefined');
        console.log('  - aspectRatio:', params.aspectRatio || 'undefined');
        console.log('  - sample_strength:', params.sample_strength);
        console.log('  - negative_prompt:', params.negative_prompt || 'empty');

        const imageUrls = await generateImage({
          filePath: params.filePath,
          prompt: params.prompt,
          model: params.model,
          aspectRatio: params.aspectRatio,
          sample_strength: params.sample_strength,
          negative_prompt: params.negative_prompt,
          refresh_token: process.env.JIMENG_API_TOKEN
        });

        // 如果没有返回URL数组，返回错误信息
        if (!imageUrls || (Array.isArray(imageUrls) && imageUrls.length === 0)) {
          return {
            content: [{ type: "text", text: "图像生成失败：未能获取图像URL" }],
            isError: true
          };
        }


        // 将返回的图像URL转换为MCP响应格式
        // 使用单个文本内容，每行一个URL，方便客户端解析
        let responseText = '';
        
        if (typeof imageUrls === 'string') {
          // 单个URL的情况
          responseText = imageUrls;
        } else if (Array.isArray(imageUrls)) {
          // URL数组的情况，每行一个URL
          responseText = imageUrls.join('\n');
        }

        return {
          content: [{
            type: "text",
            text: responseText
          }]
        };
      } catch (error) {
        // 🔍 Debug logging - 记录详细错误信息
        console.error('🔍 [MCP Server] Error caught in generateImage tool:');
        console.error('🔍 [MCP Server] Error type:', error?.constructor?.name);
        console.error('🔍 [MCP Server] Error message:', error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
          console.error('🔍 [MCP Server] Error stack:', error.stack);
        }
        
        // 🔍 记录错误时的参数状态
        console.error('🔍 [MCP Server] Parameters when error occurred:', JSON.stringify({
          filePath: params.filePath,
          prompt: params.prompt ? `${params.prompt.substring(0, 100)}...` : undefined,
          model: params.model,
          aspectRatio: params.aspectRatio,
          sample_strength: params.sample_strength,
          negative_prompt: params.negative_prompt
        }, null, 2));
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `图像生成失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );
  
  console.error('🚀 [MCP DEBUG] generateImage tool registered successfully');

  // 添加即梦AI视频生成工具
  // 功能：生成AI视频，支持传统模式（首尾帧）和智能多帧模式
  // 传统模式：使用1-2张图片作为首尾帧生成视频
  // 智能多帧模式：使用多个关键帧（最多10帧）生成更复杂的视频，每帧可自定义时长和提示词
  // 支持720p/1080p分辨率，9:16/16:9等多种比例
  //
  // 🔥 关键技巧：
  // 1. 多帧模式：合理分配帧时长，建议每帧2-3秒，总时长10秒内效果最佳
  // 2. 提示词一致性：保持主体和风格统一，如"同一个人物，相同的服装和发型"
  // 3. 场景转换：使用过渡词语，如"缓缓转向"、"平滑移动到"，避免突兀跳跃
  // 4. 比例选择：9:16适合短视频平台，16:9适合横屏观看，3:4适合产品展示
  // 5. 运动幅度：避免过大的动作变化，细微的动作更自然流畅
  // 6. 光线一致：保持统一的光照条件，避免明暗变化过大
  server.tool(
    "generateVideo",
    {
      description: "🎬 JiMeng AI视频生成工具 - 支持传统首尾帧模式和智能多帧模式。传统模式适合简单动画，多帧模式支持复杂场景转换。推荐720p分辨率，支持9:16、16:9等多种比例。智能多帧模式最多支持10个关键帧，每帧可自定义时长和提示词。",
      filePath: z.array(z.string()).optional().describe("【传统模式】首帧和尾帧图片路径数组。最多2个元素：[首帧路径, 尾帧路径]。支持本地文件和URL。适合简单的起始-结束动画效果。"),
      multiFrames: z.array(z.object({
        idx: z.number().describe("帧序号，从0开始递增"),
        duration_ms: z.number().min(1000).max(5000).describe("该帧显示时长(毫秒)。范围1000-5000ms(1-5秒)。建议每帧2-3秒，总时长控制在10秒内"),
        prompt: z.string().describe("该帧的动作描述。如：'缓缓转向左侧'、'逐渐放大'、'淡出效果'。保持动作连贯性"),
        image_path: z.string().describe("该帧的参考图片路径。支持本地文件和URL")
      })).max(10).optional().describe("【智能多帧模式】关键帧配置数组，最多10帧。适合复杂场景切换和精确动画控制。每帧包含时长、提示词和参考图。"),
      resolution: z.string().optional().describe("视频分辨率。可选值：720p(推荐，生成快)、1080p(高清，耗时长)。默认720p"),
      model: z.string().optional().describe("AI模型选择。传统模式默认jimeng-video-3.0，多帧模式默认jimeng-video-multiframe。建议使用默认值"),
      prompt: z.string().describe("视频描述文本。传统模式为完整描述，多帧模式为全局风格描述。如：'电影级画质，流畅动画，暖色调'"),
      width: z.number().min(512).max(2560).optional().default(1024).describe("视频宽度(像素)。范围512-2560。常用：1024(1:1)、1280(16:9)、720(9:16)"),
      height: z.number().min(512).max(2560).optional().default(1024).describe("视频高度(像素)。范围512-2560。常用：1024(1:1)、720(16:9)、1280(9:16)"),
      fps: z.number().min(12).max(30).optional().default(24).describe("视频帧率。范围12-30fps。24fps电影感，30fps流畅感。多帧模式专用参数"),
      duration_ms: z.number().min(3000).max(15000).optional().describe("视频总时长(毫秒)。范围3000-15000ms(3-15秒)。多帧模式专用，建议10秒内"),
      video_aspect_ratio: z.string().optional().describe("视频宽高比。如：'3:4'(竖屏)、'16:9'(横屏)、'1:1'(方形)。多帧模式专用参数"),
      refresh_token: z.string().optional().describe("JiMeng API认证令牌。可选，优先从环境变量JIMENG_API_TOKEN读取"),
      req_key: z.string().optional().describe("兼容性参数，保留用于旧版本API接口兼容")
    },
    async (params) => {
      try {
        const videoUrl = await generateVideo({
          filePath: params.filePath,
          multiFrames: params.multiFrames,
          resolution: params.resolution,
          model: params.model,
          prompt: params.prompt,
          width: params.width,
          height: params.height,
          fps: params.fps,
          duration_ms: params.duration_ms,
          video_aspect_ratio: params.video_aspect_ratio,
          refresh_token: params.refresh_token || process.env.JIMENG_API_TOKEN,
          req_key: params.req_key
        });
        if (!videoUrl) {
          return {
            content: [{ type: "text", text: "视频生成失败：未能获取视频URL" }],
            isError: true
          };
        }
        return {
          content: [{ type: "text", text: videoUrl }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `视频生成失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  // 添加视频补帧工具
  // 功能：对已生成的视频进行补帧处理，提升视频流畅度
  // 支持将24fps视频提升至30fps或60fps，让视频播放更加流畅自然
  // 需要提供原始视频的videoId和生成历史ID
  //
  // 🔥 关键技巧：
  // 1. 帧率选择：30fps适合常规观看，60fps适合运动场景或高要求场景
  // 2. 原视频质量：确保原视频动作连贯，避免跳跃式变化影响补帧效果
  // 3. 处理顺序：建议先完成分辨率提升，再进行补帧处理，效果更佳
  // 4. 适用场景：人物动作、相机移动、自然场景变化等连续性强的视频效果最好
  server.tool(
    "frameInterpolation",
    {
      description: "🚀 视频补帧工具 - 将已生成的视频提升至更高帧率，增强播放流畅度。支持24fps→30fps/60fps转换。适用于人物动作、相机移动等连续性强的视频。需要原视频的videoId和生成历史记录ID。",
      videoId: z.string().describe("待处理视频的唯一标识ID。格式通常为'v' + 数字，如'v123456789'。可从视频生成返回结果中获取"),
      originHistoryId: z.string().describe("原始视频生成时的历史记录ID。用于追溯原始生成参数和状态。可从视频生成日志中获取"),
      targetFps: z.union([z.literal(30), z.literal(60)]).describe("目标帧率选择。30fps适合常规观看体验，60fps适合运动场景或高要求场景。原始帧率通常为24fps"),
      originFps: z.number().describe("原始视频帧率。通常为24fps。需与实际原视频帧率匹配以获得最佳补帧效果"),
      duration: z.number().optional().describe("视频总时长(毫秒)。可选参数，通常自动从原视频获取。范围建议3000-15000ms")
    },
    async (params) => {
      try {
        const videoUrl = await frameInterpolation({
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          targetFps: params.targetFps,
          originFps: params.originFps,
          duration: params.duration
        });
        
        if (!videoUrl) {
          return {
            content: [{ type: "text", text: "视频补帧失败：未能获取处理后的视频URL" }],
            isError: true
          };
        }
        
        return {
          content: [{ type: "text", text: videoUrl }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `视频补帧失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  // 添加视频分辨率提升工具
  // 功能：对已生成的视频进行分辨率提升处理，增强视频画质和清晰度
  // 可将低分辨率视频提升至更高分辨率（如704x1248 → 1408x2496），提供更清晰的视觉效果
  // 需要提供原始视频的videoId、生成历史ID以及原始和目标分辨率参数
  //
  // 🔥 关键技巧：
  // 1. 分辨率限制：目标分辨率范围768-2560像素（宽或高）
  // 2. 倍数关系：建议按2倍提升，如720p→1440p，效果最佳，避免奇数倍
  // 3. 比例保持：确保目标分辨率与原始比例一致，避免画面拉伸变形
  // 4. 原视频质量：原视频越清晰，分辨率提升效果越好，模糊视频提升有限
  // 5. 内容适用性：人物、风景、产品展示类视频提升效果明显，抽象内容效果有限
  server.tool(
    "superResolution",
    {
      description: "📈 视频分辨率提升工具 - 将已生成的视频提升至更高分辨率，增强画质和清晰度。建议按2倍提升(如720p→1440p)效果最佳。保持宽高比一致避免变形。适用于人物、风景、产品展示类视频。",
      videoId: z.string().describe("待处理视频的唯一标识ID。格式通常为'v' + 数字，如'v123456789'。可从视频生成返回结果中获取"),
      originHistoryId: z.string().describe("原始视频生成时的历史记录ID。用于追溯原始生成参数和状态。可从视频生成日志中获取"),
      targetWidth: z.number().min(768).max(2560).describe("目标分辨率宽度(像素)。范围768-2560。建议设置为原宽度的2倍。如：原720px→目标1440px"),
      targetHeight: z.number().min(768).max(2560).describe("目标分辨率高度(像素)。范围768-2560。建议设置为原高度的2倍。需保持与原视频相同宽高比"),
      originWidth: z.number().describe("原始视频宽度(像素)。需与实际原视频尺寸匹配。可从视频生成信息中获取"),
      originHeight: z.number().describe("原始视频高度(像素)。需与实际原视频尺寸匹配。可从视频生成信息中获取")
    },
    async (params) => {
      try {
        const videoUrl = await superResolution({
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          targetWidth: params.targetWidth,
          targetHeight: params.targetHeight,
          originWidth: params.originWidth,
          originHeight: params.originHeight
        });
        
        if (!videoUrl) {
          return {
            content: [{ type: "text", text: "视频分辨率提升失败：未能获取处理后的视频URL" }],
            isError: true
          };
        }
        
        return {
          content: [{ type: "text", text: videoUrl }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `视频分辨率提升失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  // 添加一个问候资源
  server.resource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: undefined }),
    async (uri, { name }) => ({
      contents: [{
        uri: uri.href,
        text: `欢迎使用Jimeng MCP服务器，${name}！`
      }]
    })
  );

  // 添加一个静态信息资源
  server.resource(
    "info",
    "info://server",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: `
            Jimeng MCP 服务器
            版本: 1.0.0
            运行于: ${process.platform}
            Node版本: ${process.version}
        `
      }]
    })
  );

  // 添加即梦AI图像生成服务信息资源
  server.resource(
    "jimeng-ai",
    "jimeng-ai://info",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: `
          即梦AI图像生成服务
          -----------------
          通过使用 generateImage 工具提交图像生成请求

          需要在环境变量中设置:
          JIMENG_API_TOKEN - 即梦API令牌（从即梦网站获取的sessionid）

          参数说明:
          - filePath: 本地图片路径或图片URL（可选，若填写则为图片混合/参考图生成功能）
          - prompt: 生成图像的文本描述（必填）
          - model: 模型名称，可选值: jimeng-3.0, jimeng-2.1, jimeng-2.0-pro, jimeng-2.0, jimeng-1.4, jimeng-xl-pro（可选）
          - width: 图像宽度，默认值：1024（可选）
          - height: 图像高度，默认值：1024（可选）
          - sample_strength: 精细度，默认值：0.5，范围0-1（可选）
          - negative_prompt: 反向提示词，告诉模型不要生成什么内容（可选）

          示例:
          generateImage({
            "filePath": "./test.png",
            "prompt": "一只可爱的猫咪",
            "model": "jimeng-2.1",
            "width": 1024,
            "height": 1024,
            "sample_strength": 0.7,
            "negative_prompt": "模糊，扭曲，低质量"
          })
        `
      }]
    })
  );

  // 添加即梦AI视频生成服务信息资源
  server.resource(
    "jimeng-ai-video",
    "jimeng-ai-video://info",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: `
          即梦AI视频生成服务
          -----------------
          通过使用 generateVideo 工具提交视频生成请求
          支持传统首尾帧模式和智能多帧模式

          需要在环境变量中设置:
          JIMENG_API_TOKEN - 即梦API令牌（从即梦网站获取的sessionid）

          🎬 传统模式参数:
          - filePath: 首帧和尾帧图片路径，支持数组，最多2个元素，分别为首帧和尾帧（可选）
          - prompt: 生成视频的文本描述（必填）
          - model: 模型名称，默认jimeng-video-3.0（可选）

          🎭 智能多帧模式参数:
          - multiFrames: 智能多帧配置，支持多个关键帧（数组，最多10帧）
            - idx: 帧索引
            - duration_ms: 帧持续时间（毫秒，范围：1000-5000ms，即1-5秒）
            - prompt: 该帧的提示词
            - image_path: 该帧的图片路径
          - model: 模型名称，默认jimeng-video-multiframe（可选）
          - fps: 帧率，默认24（可选）
          - duration_ms: 总时长（毫秒，可选）
          - video_aspect_ratio: 视频比例，如"3:4"（可选）

          🔧 通用参数:
          - resolution: 分辨率，可选720p或1080p，默认720p（可选）
          - width: 视频宽度，默认1024（可选）
          - height: 视频高度，默认1024（可选）
          - refresh_token: 即梦API令牌（可选，通常从环境变量读取）
          - req_key: 自定义参数，兼容旧接口（可选）

          📝 传统模式示例:
          generateVideo({
            "filePath": ["./first.png", "./last.png"],
            "prompt": "一只小狗在草地上奔跑，阳光明媚，高清",
            "model": "jimeng-video-3.0",
            "resolution": "720p"
          })

          📝 智能多帧模式示例:
          generateVideo({
            "multiFrames": [
              {
                "idx": 0,
                "duration_ms": 3000,
                "prompt": "前推",
                "image_path": "./frame1.png"
              },
              {
                "idx": 1,
                "duration_ms": 2000,
                "prompt": "后推",
                "image_path": "./frame2.png"
              }
            ],
            "prompt": "场景切换动画",
            "model": "jimeng-video-multiframe",
            "duration_ms": 5000,
            "video_aspect_ratio": "3:4"
          })
        `
      }]
    })
  );

  return server;
};

// 启动服务器
export const startServer = async (): Promise<ServerInstance> => {
  const server = createServer();
  const transport = new StdioServerTransport();

  console.log("Jimeng MCP Server 正在启动...");

  await server.connect(transport);

  console.log("Jimeng MCP Server 已启动");

  return { server, transport };
}; 