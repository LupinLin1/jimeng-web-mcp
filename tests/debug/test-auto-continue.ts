/**
 * 测试：继续生成是否是自动的？
 *
 * 测试假设：
 * 1. 首次请求count=6，但API只接受4张
 * 2. API自动继续生成剩余2张？
 * 3. 我们只需要持续查询原始historyId，直到获得全部6张？
 */

import { NewJimengClient } from '../../src/api/NewJimengClient.js';

async function testAutoContinue() {
  const token = process.env.JIMENG_API_TOKEN || '165fe506411b95d771e619b7d509bb28';
  const client = new NewJimengClient(token);

  console.log('\n🧪 测试：继续生成是否自动？\n');

  try {
    // 提交异步任务，请求6张图
    const params = {
      prompt: '简笔画，几何图形',
      count: 6,
      model: 'jimeng-4.0',
      aspectRatio: '1:1',
      async: true
    };

    console.log('📤 提交异步请求（count=6）...\n');
    const historyId = await client.generateImage(params);
    console.log(`✅ 任务已提交: ${historyId}\n`);

    // 持续查询，看看是否会自动生成6张
    console.log('⏳ 开始轮询查询...\n');

    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const result = await client.getImageResult(historyId);

      console.log(`[${i + 1}] status: ${result.status}, ` +
        `progress: ${result.progress}%, ` +
        `images: ${result.imageUrls?.length || 0}, ` +
        `needs_more: ${result.needs_more || false}`);

      if (result.status === 'completed') {
        console.log('\n✅ 生成完成！');
        console.log(`最终获得图片数量: ${result.imageUrls?.length || 0}`);

        if (result.imageUrls && result.imageUrls.length === 6) {
          console.log('\n🎉 成功！API自动继续生成了全部6张图片！');
        } else if (result.imageUrls && result.imageUrls.length === 4) {
          console.log('\n⚠️  只获得4张图片，没有自动继续生成');
          console.log('需要手动提交继续生成请求');
        }
        break;
      }

      if (result.status === 'failed') {
        console.error('\n❌ 生成失败:', result.error);
        break;
      }

      // 如果检测到needs_more标记
      if (result.needs_more) {
        console.log('  ⚡ 检测到needs_more=true，继续等待...');
      }
    }

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

testAutoContinue();
