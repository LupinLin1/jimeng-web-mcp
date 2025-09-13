/**
 * 测试多参考图功能 - 使用本地图片文件，非1:1比例
 */

// 加载环境变量
require('dotenv').config();

// 导入构建后的API
const { generateImage } = require('./lib/index.cjs');
const path = require('path');

async function testMultiReferenceWithLocalFiles() {
    console.log('🚀 开始测试多参考图功能（使用本地文件）...');
    console.log('🔑 API Token 长度:', process.env.JIMENG_API_TOKEN?.length || 'N/A');
    
    if (!process.env.JIMENG_API_TOKEN) {
        console.error('❌ JIMENG_API_TOKEN 环境变量未设置');
        process.exit(1);
    }

    // 使用当前目录下的图片文件作为参考图
    const referenceImages = [
        path.resolve('./ref_cat.png'),
        path.resolve('./ref_rose.png')
    ];

    console.log('📁 使用的参考图文件:');
    referenceImages.forEach((img, index) => {
        console.log(`   ${index + 1}. ${img}`);
    });

    try {
        // 多参考图生成参数 - 使用16:9比例（非1:1）
        const params = {
            prompt: '一只优雅的猫咪坐在玫瑰花园中，阳光洒在身上',
            refresh_token: process.env.JIMENG_API_TOKEN,
            model: 'jimeng-4.0',
            aspectRatio: '16:9',  // 用户要求：不要用1:1比例
            filePath: referenceImages
        };

        console.log('\n📝 生成参数:');
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
        console.log('📏 使用的宽高比: 16:9 (非1:1比例)');
        console.log('');

        imageUrls.forEach((url, index) => {
            console.log(`📸 图片 ${index + 1}: ${url}`);
        });

        console.log('');
        console.log('✅ 多参考图测试完成！');
        console.log('✅ 成功使用2张本地参考图');
        console.log('✅ 成功使用非1:1比例 (16:9)');
        console.log('✅ 修复后的API功能完全正常！');

    } catch (error) {
        console.error('');
        console.error('❌ 多参考图生成失败:', error.message);
        console.error('📋 完整错误信息:', error);
        
        // 提供详细的错误分析
        if (error.message && error.message.includes('文件')) {
            console.error('💡 可能的原因: 文件读取或上传问题');
        } else if (error.message && error.message.includes('common error')) {
            console.error('💡 可能的原因: API请求格式问题');
        } else if (error.message && error.message.includes('1002')) {
            console.error('💡 可能的原因: 参数验证失败');
        }
        
        process.exit(1);
    }
}

// 执行测试
if (require.main === module) {
    testMultiReferenceWithLocalFiles();
}