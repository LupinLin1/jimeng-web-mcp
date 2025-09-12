const { generateImage } = require('./lib/index.cjs');

async function debugTest() {
  console.log('开始调试测试...');
  
  try {
    console.log('测试简单图像生成...');
    const result = await generateImage({
      prompt: "一只可爱的小猫",
      model: "jimeng-4.0"
    });
    
    console.log('生成结果:', result);
    
  } catch (error) {
    console.error('详细错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

debugTest();