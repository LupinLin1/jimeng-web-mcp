// 检查视频生成状态
process.env.JIMENG_API_TOKEN = 'c3532e8761d37a0946b6913635ed37ca';

const { generateVideo } = require('./lib/index.cjs');
const path = require('path');

async function checkVideoGeneration() {
  try {
    console.log('🔍 检查多帧视频生成...\n');
    
    const multiFrameParams = {
      multiFrames: [
        {
          idx: 0,
          duration_ms: 2000,
          prompt: "在中国古老胡同街道中行走，红色灯笼和传统建筑环绕，稳定的步伐",
          image_path: path.resolve("frames/frame1_china.png")
        },
        {
          idx: 1,
          duration_ms: 2000,
          prompt: "转场到日本樱花街道，继续相同的行走姿势，背景富士山",
          image_path: path.resolve("frames/frame2_japan.png")
        },
        {
          idx: 2,
          duration_ms: 2000,
          prompt: "来到法国埃菲尔铁塔前石板路，保持相同步伐节奏",
          image_path: path.resolve("frames/frame3_france.png")
        },
        {
          idx: 3,
          duration_ms: 2000,
          prompt: "穿越到意大利古罗马斗兽场前，继续从左到右的行走动作",
          image_path: path.resolve("frames/frame4_italy.png")
        },
        {
          idx: 4,
          duration_ms: 2000,
          prompt: "最终抵达英国伦敦大本钟前，红色电话亭背景，完成环球之旅",
          image_path: path.resolve("frames/frame5_uk.png")
        }
      ],
      prompt: "一个年轻男子的环球行走之旅，从中国到日本到法国到意大利再到英国，保持相同的行走姿势，场景自然流畅过渡",
      model: "jimeng-video-multiframe",
      duration_ms: 10000,
      fps: 24,
      video_aspect_ratio: "9:16",
      resolution: "720p"
    };
    
    console.log('📋 多帧参数检查:');
    console.log(`- 帧数: ${multiFrameParams.multiFrames.length}`);
    console.log(`- 总时长: ${multiFrameParams.duration_ms / 1000}秒`);
    console.log(`- 视频比例: ${multiFrameParams.video_aspect_ratio}`);
    console.log(`- 分辨率: ${multiFrameParams.resolution}`);
    console.log(`- 模型: ${multiFrameParams.model}\n`);
    
    console.log('🔄 开始生成多帧视频...\n');
    
    const startTime = Date.now();
    const videoUrl = await generateVideo(multiFrameParams);
    const endTime = Date.now();
    
    if (videoUrl) {
      console.log('\n🎉 视频生成成功！');
      console.log(`⏱️  生成耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
      console.log(`🎞️  视频URL: ${videoUrl}`);
      console.log('\n✨ 10秒环球行走视频已完成！');
    } else {
      console.log('\n❌ 视频生成失败：没有返回URL');
    }
    
  } catch (error) {
    console.error('\n❌ 视频生成过程中出错:', error.message);
    if (error.stack) {
      console.error('错误详情:', error.stack);
    }
  }
}

checkVideoGeneration().catch(console.error);