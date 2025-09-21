#!/usr/bin/env node

import { startServer } from './server.js';
import { logger } from './utils/logger.js';
// 加载环境变量
import dotenv from 'dotenv';
dotenv.config();

// 导出API函数供测试使用
export { 
  generateImage, 
  generateVideo, 
  videoPostProcess,
  frameInterpolation,
  superResolution,
  generateAudioEffect,
  ASPECT_RATIO_PRESETS, 
  ImageDimensionCalculator 
} from './api.js';

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 启动服务器
const main = async () => {
  try {
    // required: JIMENG_API_TOKEN
    if (!process.env.JIMENG_API_TOKEN) {
      throw new Error('JIMENG_API_TOKEN is required!')
    }

    // 正确等待服务器启动和连接
    await startServer();
    
    // 正常情况下，只有在MCP连接关闭时才会执行到这里
    logger.debug('MCP服务器已正常关闭');
    
  } catch (error) {
    console.error('启动服务器时出错:', error);
    process.exit(1);
  }
};

// 启动服务器（作为MCP服务器运行）
main(); 