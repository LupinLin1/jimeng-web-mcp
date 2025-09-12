// 专门用于调试轮询返回内容的脚本
process.env.JIMENG_API_TOKEN = 'c3532e8761d37a0946b6913635ed37ca';

const { generateVideo } = require('./lib/index.cjs');
const path = require('path');
const fs = require('fs');

async function debugPollingAnalysis() {
  try {
    console.log('🔍 开始专门的轮询调试分析...\n');
    
    // 使用简单的2帧配置来快速测试
    const testParams = {
      multiFrames: [
        {
          idx: 0,
          duration_ms: 2000,
          prompt: "中国街道行走测试",
          image_path: path.resolve("frames/frame1_china.png")
        },
        {
          idx: 1,
          duration_ms: 3000,
          prompt: "日本街道行走测试",
          image_path: path.resolve("frames/frame2_japan.png")
        }
      ],
      prompt: "调试用两帧视频测试",
      model: "jimeng-video-multiframe",
      duration_ms: 5000,
      fps: 24,
      video_aspect_ratio: "9:16",
      resolution: "720p"
    };
    
    console.log('📋 测试配置:');
    console.log(`- 帧数: ${testParams.multiFrames.length}`);
    console.log(`- 总时长: ${testParams.duration_ms / 1000}秒`);
    console.log(`- 模型: ${testParams.model}`);
    console.log(`- 图片路径1: ${testParams.multiFrames[0].image_path}`);
    console.log(`- 图片路径2: ${testParams.multiFrames[1].image_path}`);
    console.log('');
    
    // 检查图片文件是否存在
    for (let i = 0; i < testParams.multiFrames.length; i++) {
      const imagePath = testParams.multiFrames[i].image_path;
      if (fs.existsSync(imagePath)) {
        const stats = fs.statSync(imagePath);
        console.log(`✅ 图片${i+1}存在: ${imagePath} (${Math.round(stats.size/1024)}KB)`);
      } else {
        console.log(`❌ 图片${i+1}不存在: ${imagePath}`);
      }
    }
    console.log('');
    
    console.log('🚀 开始视频生成和轮询调试...\n');
    
    const startTime = Date.now();
    const result = await generateVideo(testParams);
    const endTime = Date.now();
    
    console.log(`\n⏱️  总耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);
    console.log(`🎯 生成结果: ${result || 'undefined'}`);
    
    // 查找并分析生成的调试文件
    console.log('\n🔍 查找调试文件...');
    const debugFiles = fs.readdirSync('.').filter(file => 
      file.startsWith('debug-jimeng-video-response-') && file.endsWith('.json')
    );
    
    if (debugFiles.length > 0) {
      // 找到最新的调试文件
      const latestDebugFile = debugFiles.sort((a, b) => {
        const timeA = parseInt(a.match(/(\d+)\.json$/)?.[1] || '0');
        const timeB = parseInt(b.match(/(\d+)\.json$/)?.[1] || '0');
        return timeB - timeA;
      })[0];
      
      console.log(`📄 找到最新调试文件: ${latestDebugFile}`);
      
      try {
        const debugData = JSON.parse(fs.readFileSync(latestDebugFile, 'utf8'));
        
        console.log('\n📊 调试数据分析:');
        console.log(`- 时间戳: ${debugData.timestamp}`);
        console.log(`- 请求类型: ${debugData.requestType}`);
        console.log(`- 模型: ${debugData.actualModel}`);
        console.log(`- itemList长度: ${debugData.pollResult?.length || 0}`);
        
        if (debugData.pollResult && debugData.pollResult.length > 0) {
          const firstItem = debugData.pollResult[0];
          console.log('\n🔍 第一个item的顶层keys:');
          console.log(Object.keys(firstItem || {}));
          
          // 深度分析video字段
          if (firstItem.video) {
            console.log('\n🎬 video对象的keys:');
            console.log(Object.keys(firstItem.video));
            
            if (firstItem.video.transcoded_video) {
              console.log('\n📹 transcoded_video对象的keys:');
              console.log(Object.keys(firstItem.video.transcoded_video));
              
              if (firstItem.video.transcoded_video.origin) {
                console.log('\n🎯 origin对象的keys:');
                console.log(Object.keys(firstItem.video.transcoded_video.origin));
                console.log('🔗 video_url存在:', !!firstItem.video.transcoded_video.origin.video_url);
                if (firstItem.video.transcoded_video.origin.video_url) {
                  console.log('📍 实际video_url:', firstItem.video.transcoded_video.origin.video_url);
                }
              }
            }
            
            // 检查其他可能的video URL位置
            console.log('\n🔍 检查其他可能的URL位置:');
            console.log('- video.video_url存在:', !!firstItem.video.video_url);
            console.log('- video.origin存在:', !!firstItem.video.origin);
            console.log('- video.url存在:', !!firstItem.video.url);
          }
          
          // 检查common_attr
          if (firstItem.common_attr) {
            console.log('\n📋 common_attr对象的keys:');
            console.log(Object.keys(firstItem.common_attr));
            console.log('🖼️  cover_url存在:', !!firstItem.common_attr.cover_url);
          }
          
          // 保存详细分析到文件
          const analysisData = {
            timestamp: new Date().toISOString(),
            analysis: {
              itemCount: debugData.pollResult?.length || 0,
              firstItemKeys: Object.keys(firstItem || {}),
              videoExists: !!firstItem?.video,
              videoKeys: firstItem?.video ? Object.keys(firstItem.video) : null,
              transcodedVideoExists: !!firstItem?.video?.transcoded_video,
              originExists: !!firstItem?.video?.transcoded_video?.origin,
              videoUrlFound: !!firstItem?.video?.transcoded_video?.origin?.video_url,
              actualVideoUrl: firstItem?.video?.transcoded_video?.origin?.video_url || null,
              alternativeUrls: {
                'video.video_url': firstItem?.video?.video_url || null,
                'video.origin.video_url': firstItem?.video?.origin?.video_url || null,
                'common_attr.cover_url': firstItem?.common_attr?.cover_url || null,
                'url': firstItem?.url || null,
                'video_url': firstItem?.video_url || null
              }
            },
            fullFirstItem: firstItem
          };
          
          fs.writeFileSync('polling-analysis-result.json', JSON.stringify(analysisData, null, 2));
          console.log('\n💾 详细分析已保存到: polling-analysis-result.json');
        } else {
          console.log('\n⚠️  警告: pollResult为空或不存在');
        }
        
      } catch (error) {
        console.error('解析调试文件时出错:', error.message);
      }
    } else {
      console.log('❌ 未找到调试文件');
    }
    
  } catch (error) {
    console.error('\n❌ 调试过程出错:', error.message);
    console.error('错误详情:', error.stack);
  }
}

debugPollingAnalysis().catch(console.error);