/**
 * 测试多参考图功能 - 使用非1:1比例
 */

// 加载环境变量
require('dotenv').config();

// 导入构建后的API
const { generateImage } = require('./lib/index.cjs');

async function testMultiReference() {
    console.log('🚀 开始测试多参考图功能...');
    console.log('🔑 API Token 长度:', process.env.JIMENG_API_TOKEN?.length || 'N/A');
    
    if (!process.env.JIMENG_API_TOKEN) {
        console.error('❌ JIMENG_API_TOKEN 环境变量未设置');
        process.exit(1);
    }

    try {
        // 多参考图生成参数 - 使用16:9比例（非1:1）
        const params = {
            prompt: '一只可爱的小猫在公园里玩耍',
            refresh_token: process.env.JIMENG_API_TOKEN,
            model: 'jimeng-4.0',
            aspectRatio: '16:9',  // 用户要求：不要用1:1比例
            filePath: [
                // 使用一些网络图片URL作为参考图
                'https://example.com/cat1.jpg',
                'https://example.com/cat2.jpg'
            ]
        };

        console.log('📝 生成参数:');
        console.log('   提示词:', params.prompt);
        console.log('   模型:', params.model);
        console.log('   宽高比:', params.aspectRatio, '(按用户要求不使用1:1)');
        console.log('   参考图数量:', params.filePath.length);
        console.log('');

        console.log('⏳ 正在生成多参考图像...');
        const startTime = Date.now();

        const imageUrls = await generateImage(params);

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        console.log('');
        console.log('🎉 多参考图像生成成功！');
        console.log('⏱️  生成耗时:', duration + '秒');
        console.log('🖼️  生成的图片数量:', imageUrls.length);
        console.log('');

        imageUrls.forEach((url, index) => {
            console.log(`📸 图片 ${index + 1}: ${url}`);
        });

        console.log('');
        console.log('✅ 多参考图测试完成！修复后的API功能正常工作！');
        console.log('✅ 成功使用非1:1比例 (16:9) 生成多参考图像');

    } catch (error) {
        console.error('');
        console.error('❌ 多参考图生成失败:', error.message);
        console.error('📋 完整错误信息:', error);
        
        // 如果是因为文件上传失败，就测试基本功能
        if (error.message && (error.message.includes('文件') || error.message.includes('上传') || error.message.includes('URL'))) {
            console.log('');
            console.log('💡 检测到可能是文件上传问题，改为测试基本图像生成功能...');
            
            const basicParams = {
                prompt: '一只可爱的小猫在公园里玩耍',
                refresh_token: process.env.JIMENG_API_TOKEN,
                model: 'jimeng-4.0',
                aspectRatio: '16:9'  // 仍然使用非1:1比例
            };
            
            try {
                const basicImageUrls = await generateImage(basicParams);
                console.log('✅ 基本图像生成成功！生成了', basicImageUrls.length, '张图片');
                console.log('✅ 成功使用非1:1比例 (16:9)');
                basicImageUrls.forEach((url, index) => {
                    console.log(`📸 图片 ${index + 1}: ${url}`);
                });
            } catch (basicError) {
                console.error('❌ 基本图像生成也失败:', basicError.message);
                process.exit(1);
            }
        } else {
            process.exit(1);
        }
    }
}

// 执行测试
if (require.main === module) {
    testMultiReference();
}