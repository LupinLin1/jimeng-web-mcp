// 调试视频响应数据
process.env.JIMENG_API_TOKEN = 'c3532e8761d37a0946b6913635ed37ca';

const { generateVideo } = require('./lib/index.cjs');
const path = require('path');
const fs = require('fs');

// 修改console.log以捕获响应数据
const originalLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  
  // 如果包含状态为50的响应，保存详细信息
  if (message.includes('轮询状态: status=50')) {
    // 在下次调用中可能包含详细数据
  }
  
  originalLog.apply(console, args);
};

async function debugVideoGeneration() {
  try {
    console.log('🐛 开始调试视频生成响应...\n');
    
    // 使用简单的2帧测试
    const testParams = {
      multiFrames: [
        {
          idx: 0,
          duration_ms: 3000,
          prompt: "中国街道行走",
          image_path: path.resolve("frames/frame1_china.png")
        },
        {
          idx: 1,
          duration_ms: 2000,
          prompt: "日本街道行走",
          image_path: path.resolve("frames/frame2_japan.png")
        }
      ],
      prompt: "简单的两帧测试视频",
      model: "jimeng-video-multiframe",
      duration_ms: 5000,
      fps: 24,
      video_aspect_ratio: "9:16",
      resolution: "720p"
    };
    
    console.log('开始生成测试视频...');
    const result = await generateVideo(testParams);
    
    console.log('\n🔍 最终结果:', result);
    
  } catch (error) {
    console.error('调试过程出错:', error.message);
  }
}

debugVideoGeneration().catch(console.error);