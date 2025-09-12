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

  // 添加一个简单的问候工具
  // 功能：测试连接和基本功能
  server.tool(
    "hello",
    { name: z.string().describe("要问候的姓名") },
    async ({ name }) => ({
      content: [{ type: "text", text: `你好，${name}！` }]
    })
  );

  // 添加即梦AI图像生成工具
  // 功能：使用即梦AI生成高质量图像，支持多种模型和参考图混合
  // 支持的模型：jimeng-4.0(最新), jimeng-3.0, jimeng-2.1, jimeng-2.0-pro, jimeng-2.0, jimeng-1.4, jimeng-xl-pro
  // 
  // 🔥 关键技巧：
  // 1. 在提示词中明确指定需要生成的图片数量，如"生成4张不同角度的猫咪图片"
  // 2. 使用详细的描述词提高质量：风格、光线、构图、色彩等，如"电影级光线，高清细节"
  // 3. jimeng-4.0模型效果最佳，适合复杂场景；jimeng-3.0适合艺术风格
  // 4. 参考图混合时，sample_strength控制参考程度：0.3-0.5保留原图特征，0.7-0.9创意变化大
  // 5. 反向提示词避免不需要的元素，如"模糊，低质量，变形，多余的手指"
  // 
  // 📏 宽高比预设使用指南：
  // • 'auto' (智能): 系统自动选择最适合的尺寸 (1024x1024)
  // • '21:9': 超宽屏幕比例，适合电影级横向场景 (3024x1296)
  // • '16:9': 标准宽屏比例，适合横向风景、视频缩略图 (2560x1440)
  // • '3:2': 传统摄影比例，适合相机拍摄效果 (2496x1664)
  // • '4:3': 经典显示器比例，适合传统构图 (2304x1728)
  // • '1:1': 方形比例，适合头像、Instagram图片 (2048x2048)
  // • '3:4': 竖向传统比例，适合肖像摄影 (1728x2304)
  // • '2:3': 经典竖向比例，适合书籍封面 (1664x2496)
  // • '9:16': 竖屏比例，适合手机壁纸、抖音视频 (1440x2560)
  console.error('🚀 [MCP DEBUG] Registering generateImage tool...');
  
  server.tool(
    "generateImage",
    {
      filePath: z.string().optional().describe("本地图片路径或图片URL（可选，若填写则为图片混合/参考图生成功能）"),
      prompt: z.string().describe("生成图像的文本描述"),
      model: z.string().optional().describe("模型名称，可选值: jimeng-4.0,jimeng-3.0, jimeng-2.1, jimeng-2.0-pro, jimeng-2.0, jimeng-1.4, jimeng-xl-pro"),
      aspectRatio: z.string().optional().default("auto").describe("宽高比预设，支持以下选项: auto(智能), 21:9(超宽屏), 16:9(标准宽屏), 3:2(摄影), 4:3(传统), 1:1(正方形), 3:4(竖屏), 2:3(书籍), 9:16(手机竖屏)"),
      sample_strength: z.number().min(0).max(1).optional().default(0.5).describe("精细度，范围0-1，默认0.5。数值越小越接近参考图"),
      negative_prompt: z.string().optional().default("").describe("反向提示词，告诉模型不要生成什么内容"),
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
          negative_prompt: params.negative_prompt
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
      filePath: z.array(z.string()).optional().describe("首帧和尾帧图片路径，支持数组，最多2个元素，分别为首帧和尾帧（传统模式）"),
      multiFrames: z.array(z.object({
        idx: z.number().describe("帧索引"),
        duration_ms: z.number().min(1000).max(5000).describe("帧持续时间（毫秒，范围：1000-5000ms，即1-5秒）"),
        prompt: z.string().describe("该帧的提示词"),
        image_path: z.string().describe("该帧的图片路径")
      })).max(10).optional().describe("智能多帧配置，支持多个关键帧（最多10帧）"),
      resolution: z.string().optional().describe("分辨率，可选720p或1080p，默认720p"),
      model: z.string().optional().describe("模型名称，传统模式默认jimeng-video-3.0，多帧模式默认jimeng-video-multiframe"),
      prompt: z.string().describe("生成视频的文本描述（传统模式）或全局提示词（多帧模式）"),
      width: z.number().min(512).max(2560).optional().default(1024).describe("视频宽度，范围512-2560，默认1024"),
      height: z.number().min(512).max(2560).optional().default(1024).describe("视频高度，范围512-2560，默认1024"),
      fps: z.number().min(12).max(30).optional().default(24).describe("帧率，范围12-30，默认24（多帧模式）"),
      duration_ms: z.number().min(3000).max(15000).optional().describe("总时长（毫秒，范围3000-15000ms，多帧模式）"),
      video_aspect_ratio: z.string().optional().describe("视频比例，如'3:4'（多帧模式）"),
      refresh_token: z.string().optional().describe("即梦API令牌（可选，通常从环境变量读取）"),
      req_key: z.string().optional().describe("自定义参数，兼容旧接口")
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
          refresh_token: params.refresh_token,
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
      videoId: z.string().describe("视频ID"),
      originHistoryId: z.string().describe("原始生成历史ID"),
      targetFps: z.union([z.literal(30), z.literal(60)]).describe("目标帧率：30或60fps"),
      originFps: z.number().describe("原始帧率"),
      duration: z.number().optional().describe("视频时长（毫秒），可选")
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
      videoId: z.string().describe("视频ID"),
      originHistoryId: z.string().describe("原始生成历史ID"),
      targetWidth: z.number().min(768).max(2560).describe("目标宽度，范围768-2560像素"),
      targetHeight: z.number().min(768).max(2560).describe("目标高度，范围768-2560像素"),
      originWidth: z.number().describe("原始宽度"),
      originHeight: z.number().describe("原始高度")
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