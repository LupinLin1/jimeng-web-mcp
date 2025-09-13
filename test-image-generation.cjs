/**
 * 测试真实的图像生成功能
 * 使用最简单的参数生成一张图片
 */

// 加载环境变量
require('dotenv').config();

// 导入原始备份API进行实际测试
const { generateImage } = require('./src/api-original-backup.ts');

async function testImageGeneration() {
    console.log('🚀 开始测试真实的图像生成功能...');
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
            aspectRatio: '1:1'
        };

        console.log('📝 生成参数:');
        console.log('   提示词:', params.prompt);
        console.log('   模型:', params.model);
        console.log('   宽高比:', params.aspectRatio);
        console.log('   Token:', params.refresh_token ? '[已设置]' : '[未设置]');
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
        console.log('✅ 测试完成！重构后的API功能正常工作！');

    } catch (error) {
        console.error('');
        console.error('❌ 图像生成失败:', error.message);
        console.error('📋 完整错误信息:', error);
        
        if (error.message.includes('refresh_token')) {
            console.error('💡 提示: 请检查JIMENG_API_TOKEN是否正确设置');
        } else if (error.message.includes('Network')) {
            console.error('💡 提示: 请检查网络连接');
        } else if (error.message.includes('401') || error.message.includes('403')) {
            console.error('💡 提示: API令牌可能已过期，请重新获取');
        }
        
        process.exit(1);
    }
}

// 执行测试
if (require.main === module) {
    testImageGeneration();
}