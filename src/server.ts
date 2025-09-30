import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateImage, generateVideo, videoPostProcess } from "./api.js";
import { logger } from './utils/logger.js';

// 服务器启动调试信息
logger.debug('server.ts loaded at:', new Date().toISOString());
logger.debug('Node.js version:', process.version);
logger.debug('Working directory:', process.cwd());
logger.debug('Environment token available:', !!process.env.JIMENG_API_TOKEN);
logger.debug('Environment token length:', process.env.JIMENG_API_TOKEN?.length || 'N/A');

// 定义服务器返回类型接口
export interface ServerInstance {
  server: McpServer;
  transport: StdioServerTransport;
}

// 创建MCP服务器
export const createServer = (): McpServer => {
  logger.debug('Creating MCP server instance...');
  
  const server = new McpServer({
    name: "Jimeng MCP Server",
    version: "1.0.0"
  });
  
  logger.debug('MCP server instance created successfully');

  server.tool(
    "hello",
    "🔧 测试服务器连接",
    {
      name: z.string().describe("姓名")
    },
    async ({ name }) => ({
      content: [{ type: "text", text: `你好，${name}！JiMeng MCP 服务器运行正常。` }]
    })
  );

  logger.debug('Registering generateImage tool...');

  server.tool(
    "generateImage",
    "🎨 文本生成图像，支持多参考图(最多4张)。推荐jimeng-4.0模型",
    {
      filePath: z.array(z.string()).optional().describe("参考图绝对路径数组，最多4张"),
      prompt: z.string().describe("图像描述文本"),
      model: z.string().optional().describe("模型名称，默认jimeng-4.0"),
      aspectRatio: z.string().optional().default("auto").describe("宽高比: auto/1:1/16:9/9:16/3:4/4:3/3:2/2:3/21:9"),
      sample_strength: z.number().min(0).max(1).optional().default(0.5).describe("参考图影响强度0-1，默认0.5"),
      negative_prompt: z.string().optional().default("").describe("负向提示词"),
      reference_strength: z.array(z.number().min(0).max(1)).optional().describe("每张参考图的独立强度数组"),
    },
    async (params) => {
      // 🔥 [MCP DEBUG] Tool call entry point - this is the CRITICAL debugging point
      logger.debug('=================================');
      logger.debug('generateImage tool called!');
      logger.debug('Timestamp:', new Date().toISOString());
      logger.debug('Raw params received:', JSON.stringify(params, null, 2));
      logger.debug('=================================');
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
        console.log('  - reference_strength:', params.reference_strength ? `[${params.reference_strength.join(', ')}]` : 'undefined');

        const imageUrls = await generateImage({
          filePath: params.filePath,
          prompt: params.prompt,
          model: params.model,
          aspectRatio: params.aspectRatio,
          sample_strength: params.sample_strength,
          negative_prompt: params.negative_prompt,
          reference_strength: params.reference_strength,
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
  
  logger.debug('generateImage tool registered successfully');

  server.tool(
    "generateVideo",
    "🎬 视频生成，支持首尾帧和多帧模式(最多10帧)。推荐720p",
    {
      filePath: z.array(z.string()).optional().describe("首尾帧路径，最多2张"),
      multiFrames: z.array(z.object({
        idx: z.number().describe("帧序号"),
        duration_ms: z.number().min(1000).max(5000).describe("帧时长(毫秒)"),
        prompt: z.string().describe("动作描述"),
        image_path: z.string().describe("参考图路径")
      })).max(10).optional().describe("多帧配置数组，最多10帧"),
      resolution: z.enum(["720p", "1080p"]).optional().describe("分辨率"),
      model: z.string().optional().describe("模型名称"),
      prompt: z.string().describe("视频描述文本"),
      fps: z.number().min(12).max(30).optional().default(24).describe("帧率"),
      duration_ms: z.number().min(3000).max(15000).optional().default(5000).describe("总时长(毫秒)"),
      video_aspect_ratio: z.string().optional().describe("宽高比"),
      refresh_token: z.string().optional().describe("API令牌"),
      req_key: z.string().optional().describe("兼容性参数")
    },
    async (params) => {
      try {
        const videoUrl = await generateVideo({
          filePath: params.filePath,
          multiFrames: params.multiFrames,
          resolution: params.resolution,
          model: params.model,
          prompt: params.prompt,
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

  server.tool(
    "videoPostProcess",
    "🎬 视频后处理: 补帧/超分辨率/音效生成",
    {
      operation: z.enum(["frame_interpolation", "super_resolution", "audio_effect"]).describe("操作类型"),
      videoId: z.string().describe("视频ID"),
      originHistoryId: z.string().describe("原始历史记录ID"),
      targetFps: z.union([z.literal(30), z.literal(60)]).optional().describe("目标帧率(补帧用)"),
      originFps: z.number().optional().describe("原始帧率(补帧用)"),
      targetWidth: z.number().min(768).max(2560).optional().describe("目标宽度(超分用)"),
      targetHeight: z.number().min(768).max(2560).optional().describe("目标高度(超分用)"),
      originWidth: z.number().optional().describe("原始宽度(超分用)"),
      originHeight: z.number().optional().describe("原始高度(超分用)"),
      duration: z.number().optional().describe("时长(毫秒)")
    },
    async (params) => {
      try {
        const videoUrl = await videoPostProcess({
          operation: params.operation,
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          targetFps: params.targetFps,
          originFps: params.originFps,
          targetWidth: params.targetWidth,
          targetHeight: params.targetHeight,
          originWidth: params.originWidth,
          originHeight: params.originHeight,
          duration: params.duration
        });
        
        if (!videoUrl) {
          return {
            content: [{ type: "text", text: `视频后处理失败：未能获取处理后的视频URL` }],
            isError: true
          };
        }
        
        return {
          content: [{ type: "text", text: videoUrl }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `视频后处理失败: ${errorMessage}` }],
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


  return server;
};

// 启动服务器
export const startServer = async (): Promise<void> => {
  const server = createServer();
  const transport = new StdioServerTransport();

  logger.debug("Jimeng MCP Server 正在启动...");
  logger.debug("stdin.isTTY:", process.stdin.isTTY);
  logger.debug("stdout.isTTY:", process.stdout.isTTY);
  
  // 正确等待连接 - 这会阻塞直到连接关闭
  await server.connect(transport);
  
  // 正常情况下，只有在连接关闭时才会执行到这里
  logger.debug("MCP服务器连接已关闭");
};

// 如果直接运行此文件，则启动服务器
// 使用可靠的文件名检测，支持ESM和CommonJS环境
const isMainModule = (() => {
  try {
    // 优先使用文件名检查 - 在所有环境中都可靠工作
    const scriptPath = process.argv[1];
    if (scriptPath && (
      scriptPath.endsWith('server.cjs') ||
      scriptPath.endsWith('server.js') ||
      scriptPath.endsWith('server.ts')
    )) {
      return true;
    }

    // 备用：检查require.main（在某些环境中可能不可靠）
    if (typeof require !== 'undefined' && require.main === module) {
      return true;
    }

    return false;
  } catch (error) {
    // 错误时只依赖文件名检查
    const scriptPath = process.argv[1];
    return scriptPath && (
      scriptPath.endsWith('server.cjs') ||
      scriptPath.endsWith('server.js') ||
      scriptPath.endsWith('server.ts')
    );
  }
})();

if (isMainModule) {
  startServer().catch((error) => {
    logger.error("启动MCP服务器失败:", error);
    process.exit(1);
  });
} 