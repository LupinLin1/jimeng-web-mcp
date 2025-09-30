import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { generateImage, generateVideo, videoPostProcess, generateImageAsync, getImageResult, VideoGenerator, getApiClient } from "./api.js";
import { MainReferenceVideoGenerator } from "./api/video/MainReferenceVideoGenerator.js";
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
    "generateMainReferenceVideo",
    "🎬 主体参考视频生成 - 组合多图主体到一个场景，支持[图0]、[图1]语法引用",
    {
      referenceImages: z.array(z.string()).min(2).max(4).describe("参考图片绝对路径数组，2-4张"),
      prompt: z.string().describe("提示词，用[图N]引用图片，如：[图0]中的猫在[图1]的地板上跑"),
      model: z.string().optional().describe("模型名称，默认jimeng-video-3.0"),
      resolution: z.enum(["720p", "1080p"]).optional().describe("分辨率，默认720p"),
      videoAspectRatio: z.enum(["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"]).optional().describe("视频比例，默认16:9"),
      fps: z.number().min(12).max(30).optional().describe("帧率，默认24"),
      duration: z.number().min(3000).max(15000).optional().describe("时长(毫秒)，默认5000")
    },
    async (params) => {
      try {
        // 获取sessionId（从环境变量）
        const sessionId = process.env.JIMENG_API_TOKEN;
        if (!sessionId) {
          return {
            content: [{ type: "text", text: "错误：未设置JIMENG_API_TOKEN环境变量" }],
            isError: true
          };
        }

        const generator = new MainReferenceVideoGenerator(sessionId);
        const videoUrl = await generator.generate({
          referenceImages: params.referenceImages,
          prompt: params.prompt,
          model: params.model,
          resolution: params.resolution,
          videoAspectRatio: params.videoAspectRatio,
          fps: params.fps,
          duration: params.duration
        });

        if (!videoUrl) {
          return {
            content: [{ type: "text", text: "主体参考视频生成失败：未能获取视频URL" }],
            isError: true
          };
        }

        return {
          content: [{ type: "text", text: videoUrl }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `主体参考视频生成失败: ${errorMessage}` }],
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

  // ============== 异步查询工具 ==============

  logger.debug('Registering generateImageAsync tool...');

  server.tool(
    "generateImageAsync",
    "🚀 异步提交图像生成任务（立即返回historyId，不等待完成）",
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
      try {
        logger.debug('generateImageAsync tool called with params:', JSON.stringify(params, null, 2));

        const hasToken = !!process.env.JIMENG_API_TOKEN;
        logger.debug('Environment token available:', hasToken);

        const historyId = await generateImageAsync({
          ...params,
          refresh_token: process.env.JIMENG_API_TOKEN!
        });

        return {
          content: [{
            type: "text",
            text: `异步任务已提交成功！\n\nhistoryId: ${historyId}\n\n请使用 getImageResult 工具查询生成结果。`
          }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('generateImageAsync failed:', errorMessage);
        return {
          content: [{ type: "text", text: `❌ 提交失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  logger.debug('Registering getImageResult tool...');

  server.tool(
    "getImageResult",
    "🔍 查询生成任务的当前状态和结果",
    {
      historyId: z.string().regex(/^([0-9]+|h[a-zA-Z0-9]+)$/).describe("生成任务ID（从generateImageAsync获取）")
    },
    async ({ historyId }) => {
      try {
        logger.debug('getImageResult tool called with historyId:', historyId);

        const result = await getImageResult(historyId);

        logger.debug('Query result:', JSON.stringify(result, null, 2));

        // 格式化响应
        if (result.status === 'completed') {
          // 完成状态
          let resultText = `✅ 生成完成！\n\n状态: completed\n进度: 100%\n\n`;

          if (result.imageUrls && result.imageUrls.length > 0) {
            resultText += `生成结果:\n${result.imageUrls.map((url: string) => `- ${url}`).join('\n')}`;
          } else if (result.videoUrl) {
            resultText += `视频URL: ${result.videoUrl}`;
          }

          return {
            content: [{ type: "text", text: resultText }]
          };
        } else if (result.status === 'failed') {
          // 失败状态
          return {
            content: [{
              type: "text",
              text: `❌ 生成失败\n\n状态: failed\n进度: ${result.progress}%\n错误: ${result.error || '未知错误'}`
            }],
            isError: true
          };
        } else {
          // 进行中状态
          const statusEmoji = result.status === 'pending' ? '⏳' : '🔄';
          return {
            content: [{
              type: "text",
              text: `${statusEmoji} 生成中...\n\n状态: ${result.status}\n进度: ${result.progress}%`
            }]
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('getImageResult failed:', errorMessage);
        return {
          content: [{ type: "text", text: `❌ 查询失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  logger.debug('Registering generateVideoAsync tool...');

  server.tool(
    "generateVideoAsync",
    "🚀 异步视频生成 - 立即返回任务ID，支持首尾帧和多帧模式",
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
        const videoGen = new VideoGenerator(params.refresh_token || process.env.JIMENG_API_TOKEN);
        const historyId = await videoGen.generateVideoAsync({
          filePath: params.filePath,
          multiFrames: params.multiFrames,
          resolution: params.resolution,
          model: params.model,
          prompt: params.prompt,
          fps: params.fps,
          duration_ms: params.duration_ms,
          video_aspect_ratio: params.video_aspect_ratio,
          req_key: params.req_key
        });

        return {
          content: [{
            type: "text",
            text: `✅ 视频生成任务已提交！\n\n任务ID: ${historyId}\n\n使用 getImageResult 工具查询状态:\n- historyId: ${historyId}`
          }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `❌ 提交失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  logger.debug('Registering generateMainReferenceVideoAsync tool...');

  server.tool(
    "generateMainReferenceVideoAsync",
    "🚀 异步主体参考视频生成 - 立即返回任务ID，组合多图主体",
    {
      referenceImages: z.array(z.string()).min(2).max(4).describe("参考图片路径数组(2-4张)"),
      prompt: z.string().describe("提示词，使用[图0][图1]引用图片"),
      model: z.string().optional().default("jimeng-video-3.0").describe("模型名称"),
      resolution: z.enum(["720p", "1080p"]).optional().default("720p").describe("分辨率"),
      videoAspectRatio: z.enum(["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"]).optional().default("16:9").describe("视频比例"),
      fps: z.number().min(12).max(30).optional().default(24).describe("帧率"),
      duration: z.number().min(3000).max(15000).optional().default(5000).describe("时长(毫秒)")
    },
    async (params) => {
      try {
        const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
        const historyId = await videoGen.generateMainReferenceVideoAsync({
          referenceImages: params.referenceImages,
          prompt: params.prompt,
          model: params.model,
          resolution: params.resolution,
          videoAspectRatio: params.videoAspectRatio,
          fps: params.fps,
          duration: params.duration
        });

        return {
          content: [{
            type: "text",
            text: `✅ 主体参考视频任务已提交！\n\n任务ID: ${historyId}\n\n使用 getImageResult 工具查询状态:\n- historyId: ${historyId}`
          }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `❌ 提交失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  logger.debug('Registering videoPostProcessAsync tool...');

  server.tool(
    "videoPostProcessAsync",
    "🚀 异步视频后处理 - 立即返回任务ID，支持补帧/超分/音效",
    {
      operation: z.enum(["frame_interpolation", "super_resolution", "audio_effect"]).describe("操作类型"),
      videoId: z.string().describe("原始视频ID"),
      originHistoryId: z.string().describe("原始生成任务ID"),
      targetFps: z.number().optional().describe("目标帧率(补帧用)"),
      originFps: z.number().optional().describe("原始帧率(补帧用)"),
      targetWidth: z.number().optional().describe("目标宽度(超分用)"),
      targetHeight: z.number().optional().describe("目标高度(超分用)"),
      originWidth: z.number().optional().describe("原始宽度(超分用)"),
      originHeight: z.number().optional().describe("原始高度(超分用)"),
      duration: z.number().optional().describe("视频时长(毫秒)")
    },
    async (params) => {
      try {
        const videoGen = new VideoGenerator(process.env.JIMENG_API_TOKEN);
        const historyId = await videoGen.videoPostProcessAsync({
          operation: params.operation,
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          targetFps: params.targetFps as 30 | 60 | undefined,
          originFps: params.originFps,
          targetWidth: params.targetWidth,
          targetHeight: params.targetHeight,
          originWidth: params.originWidth,
          originHeight: params.originHeight,
          duration: params.duration
        });

        return {
          content: [{
            type: "text",
            text: `✅ 视频后处理任务已提交！\n\n任务ID: ${historyId}\n操作类型: ${params.operation}\n\n使用 getImageResult 工具查询状态:\n- historyId: ${historyId}`
          }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `❌ 提交失败: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );

  logger.debug('Registering getBatchResults tool...');

  server.tool(
    "getBatchResults",
    "🔍 批量查询多个任务状态 - 单次查询多个任务(建议≤10个)",
    {
      historyIds: z.array(z.string().regex(/^([0-9]+|h[a-zA-Z0-9]+)$/)).max(10).describe("任务ID数组，最多10个")
    },
    async ({ historyIds }) => {
      try {
        const client = getApiClient();
        const results = await client.getBatchResults(historyIds);

        // 格式化响应
        let resultText = `📊 批量查询结果 (${Object.keys(results).length}/${historyIds.length})\n\n`;

        for (const [id, result] of Object.entries(results)) {
          if ('error' in result) {
            resultText += `❌ ${id}: ${result.error}\n\n`;
          } else {
            const statusEmoji = result.status === 'completed' ? '✅' : result.status === 'failed' ? '❌' : '🔄';
            resultText += `${statusEmoji} ${id}:\n`;
            resultText += `  状态: ${result.status}\n`;
            resultText += `  进度: ${result.progress}%\n`;

            if (result.videoUrl) {
              resultText += `  视频: ${result.videoUrl}\n`;
            } else if (result.imageUrls && result.imageUrls.length > 0) {
              resultText += `  图片: ${result.imageUrls.length}张\n`;
            }

            if (result.error) {
              resultText += `  错误: ${result.error}\n`;
            }
            resultText += `\n`;
          }
        }

        return {
          content: [{ type: "text", text: resultText }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `❌ 批量查询失败: ${errorMessage}` }],
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