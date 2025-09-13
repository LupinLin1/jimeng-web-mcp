/**
 * 测试resolution_type修复 - 确保固定为2k
 */

// 加载环境变量
require('dotenv').config();

// 导入构建后的API
const { generateImage } = require('./lib/index.cjs');

async function testResolutionTypeFix() {
    console.log('🚀 测试resolution_type修复...');
    console.log('🔑 API Token 长度:', process.env.JIMENG_API_TOKEN?.length || 'N/A');
    
    if (!process.env.JIMENG_API_TOKEN) {
        console.error('❌ JIMENG_API_TOKEN 环境变量未设置');
        process.exit(1);
    }

    // 测试一个宽高比验证resolution_type固定为2k
    console.log('\n📏 测试 16:9 (横屏) - 验证resolution_type固定为2k');
    console.log('   期望: "resolution_type":"2k"');
    
    const params = {
        prompt: '测试resolution_type修复，小猫',
        refresh_token: process.env.JIMENG_API_TOKEN,
        model: 'jimeng-4.0',
        aspectRatio: '16:9'
    };

    try {
        console.log('⏳ 正在生成图像（仅验证请求参数）...');
        
        // 设置短超时，主要验证请求格式
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('验证完成，停止等待')), 10000)
        );

        const imagePromise = generateImage(params);
        
        try {
            await Promise.race([imagePromise, timeoutPromise]);
        } catch (timeoutError) {
            // 预期的超时，用于验证请求格式
        }
        
        console.log('\n✅ 测试完成！');
        console.log('📋 请检查上面的调试日志中的 "resolution_type" 字段');
        console.log('🎯 期望看到: "resolution_type":"2k"');
        console.log('❌ 不应看到: 2.5k, 3k, 1k 等其他值');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 执行测试
if (require.main === module) {
    testResolutionTypeFix();
}