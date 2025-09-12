// 设置环境变量
process.env.JIMENG_API_TOKEN = 'c3532e8761d37a0946b6913635ed37ca';

const { generateImage, generateVideo } = require('./lib/index.cjs');
const fs = require('fs');
const https = require('https');
const path = require('path');

// 下载图片到本地的辅助函数
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ 图片已保存到: ${filepath}`);
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // 删除失败的文件
      reject(err);
    });
  });
}

async function testCompleteWorkflow() {
  try {
    console.log('🎬 完整工作流测试：图片生成 -> 智能多帧视频生成\n');
    
    // ====== 第一步：生成3张图片 ======
    console.log('📸 第一步：生成3张主题相关的图片...\n');
    
    const imagePrompts = [
      "一只可爱的小狗在公园草地上奔跑，阳光明媚，远景镜头，高清画质",
      "同一只小狗在草地上玩球，中景镜头，动态姿势，高清画质", 
      "小狗坐在草地上休息，近景镜头，温馨画面，高清画质"
    ];
    
    const imageUrls = [];
    const localImagePaths = [];
    
    for (let i = 0; i < imagePrompts.length; i++) {
      console.log(`🖼️  正在生成第${i + 1}张图片...`);
      console.log(`提示词: ${imagePrompts[i]}`);
      
      const startTime = Date.now();
      const urls = await generateImage({
        prompt: imagePrompts[i],
        model: 'jimeng-4.0',
        width: 1024,
        height: 1024,
        sample_strength: 0.7
      });
      const endTime = Date.now();
      
      if (urls && urls.length > 0) {
        const imageUrl = Array.isArray(urls) ? urls[0] : urls;
        imageUrls.push(imageUrl);
        
        // 下载图片到本地
        const localPath = path.join(__dirname, `frame_${i + 1}.png`);
        await downloadImage(imageUrl, localPath);
        localImagePaths.push(localPath);
        
        console.log(`✅ 第${i + 1}张图片生成完成 (耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒)`);
        console.log(`🔗 图片URL: ${imageUrl}\n`);
      } else {
        throw new Error(`第${i + 1}张图片生成失败`);
      }
      
      // 等待一下，避免请求太频繁
      if (i < imagePrompts.length - 1) {
        console.log('⏳ 等待5秒后继续...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`🎉 所有图片生成完成！共生成${imageUrls.length}张图片\n`);
    
    // ====== 第二步：使用生成的图片进行智能多帧视频生成 ======
    console.log('🎬 第二步：使用生成的图片进行智能多帧视频生成...\n');
    
    const multiFrameParams = {
      multiFrames: [
        {
          idx: 0,
          duration_ms: 3000, // 3秒
          prompt: "小狗奔跑的动态画面，镜头跟随",
          image_path: localImagePaths[0]
        },
        {
          idx: 1,
          duration_ms: 2000, // 2秒
          prompt: "小狗玩球的快乐瞬间，动态切换",
          image_path: localImagePaths[1]
        },
        {
          idx: 2,
          duration_ms: 2000, // 2秒
          prompt: "小狗休息的温馨画面，柔和过渡",
          image_path: localImagePaths[2]
        }
      ],
      prompt: "小狗在公园里的快乐时光，画面自然流畅过渡",
      model: "jimeng-video-multiframe",
      duration_ms: 7000, // 总时长7秒
      fps: 24,
      video_aspect_ratio: "16:9",
      resolution: "720p"
    };
    
    console.log('📋 智能多帧视频参数:');
    console.log(`- 使用帧数: ${multiFrameParams.multiFrames.length}帧`);
    console.log(`- 总时长: ${multiFrameParams.duration_ms / 1000}秒`);
    console.log(`- 视频比例: ${multiFrameParams.video_aspect_ratio}`);
    console.log(`- 分辨率: ${multiFrameParams.resolution}`);
    
    multiFrameParams.multiFrames.forEach((frame, index) => {
      console.log(`- 第${index + 1}帧: ${frame.duration_ms / 1000}秒 - ${frame.prompt}`);
    });
    
    console.log('\n🔄 开始生成智能多帧视频...\n');
    
    const videoStartTime = Date.now();
    const videoUrl = await generateVideo(multiFrameParams);
    const videoEndTime = Date.now();
    
    console.log('\n🎉 智能多帧视频生成完成！');
    console.log(`⏱️  视频生成耗时: ${((videoEndTime - videoStartTime) / 1000).toFixed(2)}秒`);
    console.log(`🎞️  生成的视频URL: ${videoUrl}`);
    
    // ====== 第三步：总结和清理 ======
    console.log('\n📊 完整工作流程总结:');
    console.log(`✅ 图片生成: ${imageUrls.length}张图片成功生成`);
    console.log(`✅ 视频生成: 智能多帧视频生成${videoUrl ? '成功' : '失败'}`);
    console.log(`⏱️  总耗时: ${((videoEndTime - Date.now() + (videoStartTime - Date.now())) / 1000).toFixed(2)}秒`);
    
    if (videoUrl) {
      console.log('\n🎊 完整工作流测试成功！');
      console.log('✅ 图片生成功能正常');
      console.log('✅ 智能多帧视频生成功能正常');
      console.log('✅ 工作流程整合成功');
    }
    
    // 保存测试结果
    const testResults = {
      timestamp: new Date().toISOString(),
      imageGeneration: {
        count: imageUrls.length,
        prompts: imagePrompts,
        urls: imageUrls,
        localPaths: localImagePaths
      },
      videoGeneration: {
        success: !!videoUrl,
        url: videoUrl,
        params: multiFrameParams
      },
      summary: {
        totalSuccess: !!videoUrl && imageUrls.length === 3,
        imageCount: imageUrls.length,
        videoGenerated: !!videoUrl
      }
    };
    
    fs.writeFileSync('complete-workflow-test-results.json', JSON.stringify(testResults, null, 2));
    console.log('\n📄 测试结果已保存到: complete-workflow-test-results.json');
    
    // 询问是否清理本地图片文件
    console.log('\n🧹 清理本地图片文件...');
    localImagePaths.forEach(imagePath => {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`🗑️  已删除: ${imagePath}`);
      }
    });
    
  } catch (error) {
    console.error('\n❌ 完整工作流测试失败:', error.message);
    console.error('错误详情:', error.stack);
    
    // 提供调试建议
    if (error.message.includes('图片生成失败')) {
      console.log('💡 建议检查图片生成API和网络连接');
    }
    if (error.message.includes('多帧')) {
      console.log('💡 建议检查多帧参数配置和图片路径');
    }
    if (error.message.includes('duration_ms')) {
      console.log('💡 建议检查帧持续时间是否在1000-5000ms范围内');
    }
  }
}

// 运行完整工作流测试
console.log('🚀 开始完整工作流测试：图片生成 -> 智能多帧视频生成\n');
testCompleteWorkflow().catch(console.error);