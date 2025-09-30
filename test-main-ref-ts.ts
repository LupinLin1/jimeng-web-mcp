/**
 * 主体参考视频生成功能 - TypeScript源码测试
 */

import { MainReferenceVideoGenerator } from './src/api/video/MainReferenceVideoGenerator';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function testMainReferenceVideo() {
  console.log('=== 主体参考视频生成功能测试 ===\n');

  // 检查环境变量
  const sessionId = process.env.JIMENG_API_TOKEN;
  if (!sessionId) {
    console.error('❌ 错误: 未设置 JIMENG_API_TOKEN 环境变量');
    process.exit(1);
  }

  console.log('✅ API Token 已配置');
  console.log(`Token 长度: ${sessionId.length} 字符\n`);

  // 准备测试图片
  const testImages = [
    '/Users/lupin/Downloads/videoframe_62680.png',
    '/Users/lupin/Downloads/83ab0d462c16bb2caaf854f98fee3cdc.jpeg'
  ];

  console.log('📸 测试图片:');
  testImages.forEach((img, idx) => {
    const filename = img.split('/').pop();
    console.log(`  [图${idx}] ${filename}`);
  });
  console.log('');

  // 创建生成器实例
  console.log('🔧 创建 MainReferenceVideoGenerator 实例...');
  const generator = new MainReferenceVideoGenerator(sessionId);
  console.log('✅ 实例创建成功\n');

  try {
    console.log('🎬 开始生成主体参考视频...\n');
    console.log('参数配置:');
    console.log('  - 提示词: [图0]中的画面融入[图1]的场景中');
    console.log('  - 分辨率: 720p');
    console.log('  - 视频比例: 16:9');
    console.log('  - 时长: 5秒');
    console.log('  - 帧率: 24fps\n');

    const startTime = Date.now();

    const videoUrl = await generator.generate({
      referenceImages: testImages,
      prompt: '[图0]中的画面融入[图1]的场景中',
      resolution: '720p',
      videoAspectRatio: '16:9',
      duration: 5000,
      fps: 24
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 主体参考视频生成成功!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⏱️  总耗时: ${elapsed}秒 (${Math.round(elapsed/60)}分${elapsed%60}秒)`);
    console.log(`🎥 视频URL:`);
    console.log(`   ${videoUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 复制上面的URL到浏览器中可以观看视频\n');
    console.log('🎉 主体参考功能测试通过！\n');

    process.exit(0);

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ 主体参考视频生成失败');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (error instanceof Error) {
      console.error(`错误: ${error.message}\n`);

      if (error.stack) {
        console.error('错误堆栈:');
        console.error(error.stack);
      }
    } else {
      console.error(`错误: ${String(error)}\n`);
    }

    process.exit(1);
  }
}

// 运行测试
console.log('测试开始时间:', new Date().toLocaleString('zh-CN'));
console.log('');

testMainReferenceVideo().catch(error => {
  console.error('\n💥 测试脚本执行失败:');
  console.error(error);
  process.exit(1);
});