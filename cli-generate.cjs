#!/usr/bin/env node

const { z } = require('zod');

async function generateImage(prompt, aspectRatio = 'auto', model = 'jimeng-4.0') {
  console.log('🎨 即梦AI图像生成工具');
  console.log('========================');
  console.log(`📝 提示词: ${prompt}`);
  console.log(`📐 宽高比: ${aspectRatio}`);
  console.log(`🤖 模型: ${model}`);
  console.log('');
  
  try {
    // 导入API
    const { generateImage: apiGenerateImage } = require('./lib/index.cjs');
    
    // 调用生成
    console.log('⏳ 正在生成图片...');
    const result = await apiGenerateImage({
      prompt,
      aspectRatio,
      model,
      sample_strength: 0.5,
      negative_prompt: ''
    });
    
    console.log('✅ 生成成功！');
    console.log(`📊 共生成 ${result.length} 张图片:`);
    console.log('');
    
    result.forEach((url, index) => {
      console.log(`🖼️  图片 ${index + 1}: ${url}`);
    });
    
  } catch (error) {
    console.error('❌ 生成失败:', error.message);
  }
}

// 获取命令行参数
const args = process.argv.slice(2);
const prompt = args[0];
const aspectRatio = args[1] || 'auto';
const model = args[2] || 'jimeng-4.0';

if (!prompt) {
  console.log('用法: node -r dotenv/config cli-generate.cjs "提示词" [宽高比] [模型]');
  console.log('');
  console.log('宽高比选项:');
  console.log('  auto    - 智能 (1024x1024)');
  console.log('  21:9    - 超宽屏 (3024x1296)');
  console.log('  16:9    - 标准宽屏 (2560x1440)');
  console.log('  3:2     - 摄影 (2496x1664)');
  console.log('  4:3     - 传统 (2304x1728)');
  console.log('  1:1     - 正方形 (2048x2048)');
  console.log('  3:4     - 竖屏 (1728x2304)');
  console.log('  2:3     - 书籍 (1664x2496)');
  console.log('  9:16    - 手机竖屏 (1440x2560)');
  console.log('');
  console.log('示例:');
  console.log('  node -r dotenv/config cli-generate.cjs "一只可爱的猫" "16:9" "jimeng-4.0"');
  process.exit(1);
}

generateImage(prompt, aspectRatio, model).catch(console.error);