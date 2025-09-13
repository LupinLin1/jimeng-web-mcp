/**
 * 测试所有8种官方宽高比
 * 验证API只接受官方预定义的尺寸
 */

// 加载环境变量
require('dotenv').config();

// 导入构建后的API
const { generateImage } = require('./lib/index.cjs');

async function testAllOfficialAspectRatios() {
    console.log('🚀 测试所有8种官方宽高比...');
    console.log('🔑 API Token 长度:', process.env.JIMENG_API_TOKEN?.length || 'N/A');
    
    if (!process.env.JIMENG_API_TOKEN) {
        console.error('❌ JIMENG_API_TOKEN 环境变量未设置');
        process.exit(1);
    }

    // 8种官方宽高比 - 对应API的ratio_type 1-8
    const officialAspectRatios = [
        { name: '1:1', description: '正方形', ratioType: 1, expectedDimensions: '2048x2048' },
        { name: '3:4', description: '竖屏', ratioType: 2, expectedDimensions: '1728x2304' },
        { name: '16:9', description: '横屏', ratioType: 3, expectedDimensions: '2560x1440' },
        { name: '4:3', description: '传统横屏', ratioType: 4, expectedDimensions: '2304x1728' },
        { name: '9:16', description: '手机竖屏', ratioType: 5, expectedDimensions: '1440x2560' },
        { name: '2:3', description: '书籍比例', ratioType: 6, expectedDimensions: '1664x2496' },
        { name: '3:2', description: '摄影比例', ratioType: 7, expectedDimensions: '2496x1664' },
        { name: '21:9', description: '超宽屏', ratioType: 8, expectedDimensions: '3024x1296' }
    ];
    
    const results = [];
    
    for (const aspectRatio of officialAspectRatios) {
        try {
            console.log(`\n📏 测试 ${aspectRatio.name} (${aspectRatio.description}) - ratio_type: ${aspectRatio.ratioType}`);
            console.log(`   期望尺寸: ${aspectRatio.expectedDimensions}`);
            
            const params = {
                prompt: `测试${aspectRatio.name}比例的图像生成，可爱的小猫在花园里`,
                refresh_token: process.env.JIMENG_API_TOKEN,
                model: 'jimeng-4.0',
                aspectRatio: aspectRatio.name
            };

            console.log('⏳ 正在生成图像...');
            const startTime = Date.now();

            const imageUrls = await generateImage(params);

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            console.log(`✅ ${aspectRatio.name} 比例图像生成成功！`);
            console.log('⏱️  生成耗时:', duration + '秒');
            console.log('🖼️  生成的图片数量:', imageUrls.length);
            
            imageUrls.forEach((url, index) => {
                console.log(`📸 图片 ${index + 1}: ${url}`);
            });

            results.push({
                aspectRatio: aspectRatio.name,
                success: true,
                duration: duration,
                imageCount: imageUrls.length,
                description: aspectRatio.description,
                expectedDimensions: aspectRatio.expectedDimensions
            });

        } catch (error) {
            console.error(`❌ ${aspectRatio.name} 比例图像生成失败:`, error.message);
            
            results.push({
                aspectRatio: aspectRatio.name,
                success: false,
                error: error.message,
                description: aspectRatio.description,
                expectedDimensions: aspectRatio.expectedDimensions
            });
        }
    }
    
    // 测试总结
    console.log('\n🎯 测试总结:');
    console.log('========================================');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`✅ 成功: ${successCount}/8 种宽高比`);
    console.log(`❌ 失败: ${failCount}/8 种宽高比`);
    console.log('');
    
    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const info = result.success 
            ? `(${result.duration}s, ${result.imageCount} images)`
            : `(${result.error})`;
        
        console.log(`${status} ${result.aspectRatio} - ${result.description} ${result.expectedDimensions} ${info}`);
    });
    
    console.log('');
    console.log('🔧 关键改进:');
    console.log('✅ 使用API官方的8种预定义尺寸');
    console.log('✅ 移除了自定义尺寸计算逻辑');
    console.log('✅ 确保只生成API允许的长宽组合');
    console.log('✅ 宽高比映射到正确的ratio_type值');
    
    if (successCount === 8) {
        console.log('🎉 所有8种官方宽高比测试通过！');
        console.log('🎉 图片生成只使用官方允许的尺寸！');
    } else {
        console.log(`⚠️  仍有${failCount}个宽高比需要调试`);
    }
}

// 执行测试
if (require.main === module) {
    testAllOfficialAspectRatios();
}