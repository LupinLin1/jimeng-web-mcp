/**
 * 测试图像生成功能 - 使用已构建的库
 */

// 加载环境变量
require('dotenv').config();

// 导入构建后的API
const { generateImage } = require('./lib/index.cjs');

async function testImageGeneration() {
    console.log('🚀 开始测试图像生成功能...');
    console.log('🔑 API Token 长度:', process.env.JIMENG_API_TOKEN?.length || 'N/A');
    
    if (!process.env.JIMENG_API_TOKEN) {
        console.error('❌ JIMENG_API_TOKEN 环境变量未设置');
        process.exit(1);
    }

    try {
        // 最简单的图像生成参数
        const params = {
            prompt: '一只可爱的小猫坐在阳光下',
            refresh_token: process.env.JIMENG_API_TOKEN,
            model: 'jimeng-4.0',
            aspectRatio: '16:9'  // 不使用1:1，按用户要求
        };

        console.log('📝 生成参数:');
        console.log('   提示词:', params.prompt);
        console.log('   模型:', params.model);
        console.log('   宽高比:', params.aspectRatio);
        console.log('');

        console.log('⏳ 正在生成图像...');
        const startTime = Date.now();

        const imageUrls = await generateImage(params);

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('');
        console.log('🎉 图像生成成功！');
        console.log('⏱️  生成耗时:', duration + '秒');
        console.log('🖼️  生成的图片数量:', imageUrls.length);
        console.log('');

        imageUrls.forEach((url, index) => {
            console.log(`📸 图片 ${index + 1}: ${url}`);
        });

        console.log('');
        console.log('✅ 测试完成！基础图像生成正常工作！');

    } catch (error) {
        console.error('');
        console.error('❌ 图像生成失败:', error.message);
        console.error('📋 完整错误信息:', error);
        
        process.exit(1);
    }
}

// 执行测试
if (require.main === module) {
    testImageGeneration();
}