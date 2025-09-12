import { generateImage } from './lib/index.js';
import fs from 'fs';

async function test10ImageStorybook() {
  try {
    console.log('🚀 开始测试10张图绘本生成...');
    console.log('📚 主题: 中年男人去钓鱼的故事');
    
    const startTime = Date.now();
    
    const imageUrls = await generateImage({
      prompt: "中年男人去钓鱼为主题的10张图的绘本，温馨画风，连续故事情节，详细描绘每个场景",
      model: "jimeng-4.0",
      width: 1024,
      height: 1024,
      sample_strength: 0.7
    });
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ 绘本生成完成！`);
    console.log(`⏰ 总耗时: ${duration.toFixed(2)} 秒`);
    console.log(`📸 总计生成: ${imageUrls.length} 张图片`);
    
    if (imageUrls.length >= 10) {
      console.log('🎉 成功生成预期数量的绘本图片！');
    } else {
      console.log(`⚠️ 生成数量不足，预期10张，实际${imageUrls.length}张`);
    }
    
    console.log('🔗 生成的绘本图片URLs:');
    imageUrls.forEach((url, index) => {
      console.log(`   第${index + 1}页: ${url}`);
    });
    
    // 保存结果到文件
    const result = {
      timestamp: new Date().toISOString(),
      theme: "中年男人去钓鱼的故事",
      prompt: "中年男人去钓鱼为主题的10张图的绘本，温馨画风，连续故事情节，详细描绘每个场景",
      model: "jimeng-4.0",
      expectedCount: 10,
      actualCount: imageUrls.length,
      success: imageUrls.length >= 10,
      duration: duration,
      imageUrls: imageUrls
    };
    
    const filename = `storybook-test-result-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    console.log(`💾 绘本结果已保存到: ${filename}`);
    
  } catch (error) {
    console.error('❌ 绘本生成测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

test10ImageStorybook();