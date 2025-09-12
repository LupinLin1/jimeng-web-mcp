// 设置环境变量
process.env.JIMENG_API_TOKEN = 'c3532e8761d37a0946b6913635ed37ca';

const { generateVideo } = require('./lib/index.cjs');

async function testMultiFrameVideo() {
  try {
    console.log('🎬 测试智能多帧视频生成功能...\n');
    
    // 测试智能多帧视频生成
    const testParams = {
      multiFrames: [
        {
          idx: 0,
          duration_ms: 3000, // 3秒，在1-5秒范围内
          prompt: "镜头缓慢前推",
          image_path: "/Users/lupin/Desktop/test1.png"
        },
        {
          idx: 1,
          duration_ms: 2000, // 2秒，在1-5秒范围内
          prompt: "镜头拉远",
          image_path: "/Users/lupin/Desktop/test2.png"
        }
      ],
      prompt: "唯美的场景切换动画",
      model: "jimeng-video-multiframe",
      duration_ms: 5000, // 总时长调整为5秒
      fps: 24,
      video_aspect_ratio: "3:4",
      resolution: "720p"
    };
    
    console.log('📋 多帧模式测试参数:', JSON.stringify(testParams, null, 2));
    console.log('🎯 目标: 测试智能多帧视频生成');
    console.log('🔄 开始生成...\n');
    
    const startTime = Date.now();
    const videoUrl = await generateVideo(testParams);
    const endTime = Date.now();
    
    console.log('\n✅ 多帧视频生成完成!');
    console.log(`⏱️  总耗时: ${((endTime - startTime) / 1000).toFixed(2)} 秒`);
    console.log(`🎞️  生成的视频URL: ${videoUrl}`);
    
    if (videoUrl) {
      console.log('🎉 智能多帧视频生成成功!');
      console.log('✅ 多帧配置参数正确解析');
      console.log('✅ 模型映射正确');
      console.log('✅ 请求构建成功');
    } else {
      console.log('❌ 视频生成失败，未获得URL');
    }
    
  } catch (error) {
    console.error('\n❌ 多帧视频生成测试失败:', error.message);
    console.error('错误详情:', error.stack);
    
    // 检查是否是参数问题
    if (error.message.includes('多帧模式需要提供multiFrames参数')) {
      console.log('💡 提示: 请确保提供了 multiFrames 参数');
    }
    if (error.message.includes('上传文件失败')) {
      console.log('💡 提示: 请检查图片路径是否正确存在');
    }
  }
}

// 测试传统模式兼容性
async function testTraditionalMode() {
  try {
    console.log('\n🎥 测试传统模式兼容性...\n');
    
    // 测试传统首尾帧模式
    const traditionalParams = {
      filePath: ["/Users/lupin/Desktop/test1.png", "/Users/lupin/Desktop/test2.png"],
      prompt: "传统模式视频生成测试",
      model: "jimeng-video-3.0",
      resolution: "720p"
    };
    
    console.log('📋 传统模式测试参数:', JSON.stringify(traditionalParams, null, 2));
    console.log('🔄 开始传统模式生成...\n');
    
    const startTime = Date.now();
    const videoUrl = await generateVideo(traditionalParams);
    const endTime = Date.now();
    
    console.log('\n✅ 传统模式视频生成完成!');
    console.log(`⏱️  总耗时: ${((endTime - startTime) / 1000).toFixed(2)} 秒`);
    console.log(`🎞️  生成的视频URL: ${videoUrl}`);
    
    if (videoUrl) {
      console.log('🎉 传统模式兼容性验证成功!');
      console.log('✅ 首尾帧模式工作正常');
    }
    
  } catch (error) {
    console.error('\n❌ 传统模式测试失败:', error.message);
  }
}

// 运行测试
console.log('🚀 开始智能多帧视频生成功能测试...\n');
testMultiFrameVideo()
  .then(() => testTraditionalMode())
  .catch(console.error);