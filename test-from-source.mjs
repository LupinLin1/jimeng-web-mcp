/**
 * 从源码直接测试主体参考视频生成
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// 动态导入ts-node来运行TypeScript代码
async function runTest() {
  console.log('=== 实际主体参考视频生成测试 ===\n');

  // 检查环境变量
  const sessionId = process.env.JIMENG_API_TOKEN;
  if (!sessionId) {
    console.error('❌ 错误: 未设置 JIMENG_API_TOKEN 环境变量');
    process.exit(1);
  }

  console.log('✅ API Token 已配置');
  console.log(`Token 长度: ${sessionId.length} 字符\n`);

  // 使用测试图片
  const testImages = [
    '/Users/lupin/Downloads/videoframe_62680.png',
    '/Users/lupin/Downloads/83ab0d462c16bb2caaf854f98fee3cdc.jpeg'
  ];

  console.log('📸 测试图片:');
  testImages.forEach((img, idx) => {
    console.log(`  [图${idx}] ${img.split('/').pop()}`);
  });
  console.log('');

  try {
    // 使用编译后的代码
    const { getApiClient } = await import('./lib/index.js');

    console.log('🎬 使用getApiClient创建客户端...\n');
    const client = getApiClient(sessionId);

    // 检查是否有generateVideo方法
    if (typeof client.generateVideo !== 'function') {
      throw new Error('client没有generateVideo方法');
    }

    console.log('✅ 客户端创建成功，开始生成视频...\n');
    console.log('参数配置:');
    console.log('  - 使用传统视频生成测试');
    console.log('  - 提示词: 测试视频生成');
    console.log('  - 分辨率: 720p\n');

    const startTime = Date.now();

    const videoUrl = await client.generateVideo({
      prompt: '一只猫在跑步',
      resolution: '720p'
    });

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log('\n\n✅ 视频生成成功!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⏱️  总耗时: ${elapsed}秒`);
    console.log(`🎥 视频URL: ${videoUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 提示: 复制上面的URL到浏览器中可以观看视频\n');

  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(`错误: ${error.message}`);

    if (error.stack) {
      console.error('\n详细错误信息:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// 运行测试
console.log('开始时间:', new Date().toLocaleString('zh-CN'));
console.log('');

runTest()
  .then(() => {
    console.log('结束时间:', new Date().toLocaleString('zh-CN'));
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 测试脚本执行失败:');
    console.error(error);
    process.exit(1);
  });