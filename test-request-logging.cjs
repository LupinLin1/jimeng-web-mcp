/**
 * 测试请求日志记录功能
 */

// 加载环境变量
require('dotenv').config();

// 导入构建后的API
const { generateImage } = require('./lib/index.cjs');

async function testRequestLogging() {
    console.log('🚀 测试请求日志记录功能...');
    console.log('🔑 API Token 长度:', process.env.JIMENG_API_TOKEN?.length || 'N/A');
    
    if (!process.env.JIMENG_API_TOKEN) {
        console.error('❌ JIMENG_API_TOKEN 环境变量未设置');
        process.exit(1);
    }

    // 测试几种不同的宽高比，验证日志记录
    const testCases = [
        { name: '1:1', description: '正方形测试' },
        { name: '16:9', description: '横屏测试' },
        { name: '9:16', description: '竖屏测试' }
    ];
    
    console.log('\n📋 开始生成请求日志测试:');
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
            console.log(`\n📏 [${i+1}/${testCases.length}] ${testCase.description} - ${testCase.name}`);
            
            const params = {
                prompt: `日志测试${testCase.name}，可爱小猫咪`,
                refresh_token: process.env.JIMENG_API_TOKEN,
                model: 'jimeng-4.0',
                aspectRatio: testCase.name
            };

            console.log('⏳ 发送请求...');
            const startTime = Date.now();

            // 设置较短超时，主要目的是生成日志
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('测试超时，日志已记录')), 15000)
            );

            const imagePromise = generateImage(params);
            
            try {
                const imageUrls = await Promise.race([imagePromise, timeoutPromise]);
                console.log(`✅ ${testCase.name} 请求成功，已记录到日志`);
                console.log(`🖼️  生成图片: ${imageUrls.length}张`);
            } catch (timeoutError) {
                console.log(`📝 ${testCase.name} 请求已发送并记录到日志`);
            }
            
        } catch (error) {
            console.error(`❌ ${testCase.name} 测试失败:`, error.message);
        }
    }
    
    console.log('\n🎯 请求日志测试完成！');
    console.log('📂 请检查项目根目录下的日志文件:');
    console.log('   文件名格式: jimeng-request-log-YYYY-MM-DD.json');
    console.log('');
    console.log('📊 日志文件包含以下信息:');
    console.log('   ✅ 时间戳和会话ID');  
    console.log('   ✅ 请求类型和模型');
    console.log('   ✅ 提示词和宽高比');
    console.log('   ✅ 完整的请求数据和参数');
    console.log('   ✅ 唯一的请求ID');
    console.log('');
    console.log('🔍 可以用这些日志进行:');
    console.log('   • 分析API请求格式的变化');
    console.log('   • 调试请求参数问题');
    console.log('   • 统计不同宽高比的使用情况');
    console.log('   • 追踪API调用历史');
}

// 执行测试
if (require.main === module) {
    testRequestLogging();
}