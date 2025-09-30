import dotenv from 'dotenv';
dotenv.config();

console.log('Token available:', !!process.env.JIMENG_API_TOKEN);
console.log('Token length:', process.env.JIMENG_API_TOKEN?.length);

// 测试导入
const { getApiClient } = await import('./lib/index.js');
const client = getApiClient(process.env.JIMENG_API_TOKEN);

console.log('\n🎬 开始生成传统视频测试...\n');

try {
  const videoUrl = await client.generateVideo({
    prompt: '一只猫在奔跑，阳光明媚',
    resolution: '720p'
  });
  
  console.log('\n✅ 视频生成成功!');
  console.log('视频URL:', videoUrl);
} catch (error) {
  console.error('❌ 失败:', error.message);
}
