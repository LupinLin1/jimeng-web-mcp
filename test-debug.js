#!/usr/bin/env node

// 调试脚本 - 检查API请求构造
import { generateImage } from './lib/index.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

console.log('环境变量 JIMENG_API_TOKEN:', process.env.JIMENG_API_TOKEN ? '已设置' : '未设置');

async function debugImageGeneration() {
  try {
    console.log('开始调试图像生成...');
    
    const result = await generateImage({
      prompt: "一只小猫",
      model: "jimeng-4.0",
      aspectRatio: "1:1"
    });
    
    console.log('成功结果:', result);
  } catch (error) {
    console.error('错误详情:');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
  }
}

debugImageGeneration();