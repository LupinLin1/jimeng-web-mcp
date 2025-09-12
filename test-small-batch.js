import { generateImage } from './lib/index.js';
import fs from 'fs';

async function testSmallBatch() {
  try {
    console.log('🚀 开始测试6张图小批量生成...');
    console.log('📚 主题: 中年男人钓鱼故事');
    
    const startTime = Date.now();
    
    const imageUrls = await generateImage({
      prompt: "中年男人钓鱼故事，6张连续图片，温馨画风，详细描绘",
      model: "jimeng-4.0",
      width: 1024,
      height: 1024,
      sample_strength: 0.7
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ 小批量生成完成！`);
    console.log(`⏰ 总耗时: ${duration.toFixed(2)} 秒`);
    console.log(`📸 总计生成: ${imageUrls.length} 张图片`);
    
    if (imageUrls.length >= 6) {
      console.log('🎉 成功生成预期数量的图片！');
    } else {
      console.log(`⚠️ 生成数量不足，预期6张，实际${imageUrls.length}张`);
    }
    
    console.log('🔗 生成的图片URLs:');
    imageUrls.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });
    
    // 保存结果到文件
    const result = {
      timestamp: new Date().toISOString(),
      prompt: "中年男人钓鱼故事，6张连续图片，温馨画风，详细描绘",
      model: "jimeng-4.0",
      expectedCount: 6,
      actualCount: imageUrls.length,
      success: imageUrls.length >= 6,
      duration: duration,
      imageUrls: imageUrls
    };
    
    const filename = `small-batch-test-result-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    console.log(`💾 结果已保存到: ${filename}`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

testSmallBatch();