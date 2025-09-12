// 设置环境变量
process.env.JIMENG_API_TOKEN = 'c3532e8761d37a0946b6913635ed37ca';

const { generateImage } = require('./lib/index.cjs');

async function testBatchMoreThan4() {
  try {
    console.log('🧪 测试生成4张以上图片的批量生成...\n');
    
    // 测试生成多张图片 - 明确要求5张图片
    const testParams = {
      prompt: '请生成5张可爱的动物朋友们图片，包含不同的小动物，彩色背景，每张图片都应该不同',  // 明确要求5张图片
      model: 'jimeng-4.0',
      width: 1024,
      height: 1024,
      sample_strength: 0.8
    };
    
    console.log('📋 测试参数:', JSON.stringify(testParams, null, 2));
    console.log('🎯 目标: 测试生成超过4张图片的情况');
    console.log('🔄 开始生成...\n');
    
    const startTime = Date.now();
    const imageUrls = await generateImage(testParams);
    const endTime = Date.now();
    
    console.log('\n✅ 生成完成!');
    console.log(`⏱️  总耗时: ${((endTime - startTime) / 1000).toFixed(2)} 秒`);
    console.log(`📸 返回的图片数量: ${imageUrls.length} 张`);
    
    if (imageUrls.length <= 4) {
      console.log('⚠️  注意: 只生成了4张或更少图片，可能需要调整prompt或参数');
      console.log('💡 建议: 尝试更复杂的prompt或不同的参数');
    } else {
      console.log(`🎉 成功生成超过4张图片! 实际生成: ${imageUrls.length} 张`);
    }
    
    // 详细分析图片ID和重复情况
    const imageIds = imageUrls.map((url, index) => {
      const match = url.match(/([a-f0-9]{32})/);
      const id = match ? match[1] : `unknown_${index}`;
      return { index: index + 1, id, url };
    });
    
    const uniqueIds = [...new Set(imageIds.map(item => item.id))];
    
    console.log('\n🔍 重复检查结果:');
    console.log(`原始URL数量: ${imageUrls.length}`);
    console.log(`唯一图片ID数: ${uniqueIds.length}`);
    
    if (uniqueIds.length === imageUrls.length) {
      console.log('✅ 完美! 没有发现重复的图片');
      console.log('✅ 批量生成和继续生成逻辑工作正常');
    } else {
      console.log('❌ 发现重复图片，需要进一步调试:');
      
      // 详细分析重复情况
      const duplicateGroups = {};
      imageIds.forEach(item => {
        if (!duplicateGroups[item.id]) {
          duplicateGroups[item.id] = [];
        }
        duplicateGroups[item.id].push(item);
      });
      
      Object.entries(duplicateGroups).forEach(([id, items]) => {
        if (items.length > 1) {
          console.log(`\n🔴 重复的图片ID: ${id} (出现${items.length}次)`);
          items.forEach(item => {
            console.log(`   位置${item.index}: ${item.url.substring(0, 100)}...`);
          });
        }
      });
    }
    
    console.log('\n🔗 所有生成的图片ID:');
    imageIds.forEach(item => {
      console.log(`${item.index}: ${item.id}`);
    });
    
    // 分析批次信息
    if (imageUrls.length > 4) {
      const batchCount = Math.ceil(imageUrls.length / 4);
      console.log(`\n📊 批次分析:`);
      console.log(`总批次数: ${batchCount} 批`);
      console.log(`第1批: 图片1-4`);
      for (let i = 2; i <= batchCount; i++) {
        const start = (i - 1) * 4 + 1;
        const end = Math.min(i * 4, imageUrls.length);
        console.log(`第${i}批: 图片${start}-${end}`);
      }
    }
    
    // 保存测试结果
    const results = {
      timestamp: new Date().toISOString(),
      testType: 'batch_more_than_4',
      params: testParams,
      totalTime: (endTime - startTime) / 1000,
      urlCount: imageUrls.length,
      uniqueIdCount: uniqueIds.length,
      hasDuplicates: uniqueIds.length !== imageUrls.length,
      isMoreThan4: imageUrls.length > 4,
      imageDetails: imageIds
    };
    
    require('fs').writeFileSync('batch-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n📄 测试结果已保存到: batch-test-results.json');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error.stack);
  }
}

// 运行测试
console.log('🚀 开始测试生成4张以上图片的批量生成功能...\n');
testBatchMoreThan4().catch(console.error);