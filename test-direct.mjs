import dotenv from 'dotenv';
dotenv.config();

import { generateVideo } from './lib/index.js';

console.log('Token available:', !!process.env.JIMENG_API_TOKEN);
console.log('\n🎬 开始生成传统视频测试...\n');

try {
  const videoUrl = await generateVideo({
    prompt: '一只可爱的猫在草地上奔跑，阳光明媚',
    resolution: '720p',
    refresh_token: process.env.JIMENG_API_TOKEN
  });
  
  console.log('\n✅ 视频生成成功!');
  console.log('视频URL:', videoUrl);
} catch (error) {
  console.error('❌ 失败:', error.message);
  console.error(error.stack);
}
