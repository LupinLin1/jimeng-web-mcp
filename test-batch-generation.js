import { generateImage } from './lib/index.js';
import fs from 'fs';

async function testBatchGeneration() {
  try {
    console.log('🚀 开始测试10张图绘本生成（增强版）...');
    console.log('📚 主题: 中年男人去钓鱼');
    console.log('⏰ 预计耗时: 5-10分钟');
    
    const startTime = Date.now();
    
    const imageUrls = await generateImage({
      prompt: "中年男人去钓鱼，10张连续的绘本图片，画风温馨，细节丰富，高清画质",
      model: "jimeng-4.0",
      width: 1024,
      height: 1024,
      sample_strength: 0.7
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ 批量生成完成！`);
    console.log(`⏰ 总耗时: ${duration.toFixed(2)} 秒`);
    console.log(`📸 总计生成: ${imageUrls.length} 张图片`);
    console.log('🔗 生成的图片URLs:');
    
    imageUrls.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });
    
    // 保存结果到文件
    const result = {
      timestamp: new Date().toISOString(),
      prompt: "中年男人去钓鱼，10张连续的绘本图片，画风温馨，细节丰富，高清画质",
      model: "jimeng-4.0",
      totalImages: imageUrls.length,
      duration: duration,
      imageUrls: imageUrls
    };
    
    const filename = `batch-generation-result-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    console.log(`💾 结果已保存到: ${filename}`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

testBatchGeneration();